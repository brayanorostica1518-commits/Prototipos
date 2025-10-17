from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import tempfile
import shutil
from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
import openpyxl
from docx import Document
import csv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Models
class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    file_names: Optional[List[str]] = None

class ChatMessageCreate(BaseModel):
    session_id: str
    content: str
    frameworks: List[str]  # ['ISO 27001', 'NIST', 'COBIT']

class AnalysisResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    frameworks: List[str]
    analysis: str
    compliance_scores: dict  # {"ISO 27001": 85, "NIST": 78, "COBIT": 92}
    gaps: List[dict]  # [{"framework": "ISO 27001", "gap": "...", "recommendation": "..."}]
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Session(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Temporary storage for uploaded files (in production, use cloud storage)
UPLOAD_DIR = Path("/tmp/assessment_uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

def extract_text_from_excel(file_path: Path) -> str:
    """Extract text content from Excel file"""
    try:
        wb = openpyxl.load_workbook(file_path, data_only=True)
        text_content = []
        
        for sheet_name in wb.sheetnames:
            sheet = wb[sheet_name]
            text_content.append(f"\\n=== Hoja: {sheet_name} ===\\n")
            
            for row in sheet.iter_rows(values_only=True):
                row_text = " | ".join([str(cell) if cell is not None else "" for cell in row])
                if row_text.strip():
                    text_content.append(row_text)
        
        return "\\n".join(text_content)
    except Exception as e:
        logger.error(f"Error extracting Excel: {str(e)}")
        return f"Error al leer archivo Excel: {str(e)}"

def extract_text_from_word(file_path: Path) -> str:
    """Extract text content from Word file"""
    try:
        doc = Document(file_path)
        text_content = []
        
        for para in doc.paragraphs:
            if para.text.strip():
                text_content.append(para.text)
        
        # Also extract text from tables
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join([cell.text for cell in row.cells])
                if row_text.strip():
                    text_content.append(row_text)
        
        return "\\n".join(text_content)
    except Exception as e:
        logger.error(f"Error extracting Word: {str(e)}")
        return f"Error al leer archivo Word: {str(e)}"

@api_router.get("/")
async def root():
    return {"message": "Assessment AI API Ready"}

@api_router.post("/sessions", response_model=Session)
async def create_session():
    """Create a new chat session"""
    session = Session(title="Nueva Evaluación")
    doc = session.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.sessions.insert_one(doc)
    return session

@api_router.get("/sessions", response_model=List[Session])
async def get_sessions():
    """Get all chat sessions"""
    sessions = await db.sessions.find({}, {"_id": 0}).sort("updated_at", -1).to_list(100)
    
    for session in sessions:
        if isinstance(session['created_at'], str):
            session['created_at'] = datetime.fromisoformat(session['created_at'])
        if isinstance(session['updated_at'], str):
            session['updated_at'] = datetime.fromisoformat(session['updated_at'])
    
    return sessions

@api_router.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    """Upload assessment files (PDF, Excel, Word, CSV)"""
    uploaded_files = []
    
    for file in files:
        # Generate unique filename
        file_id = str(uuid.uuid4())
        file_ext = Path(file.filename).suffix
        unique_filename = f"{file_id}{file_ext}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        uploaded_files.append({
            "id": file_id,
            "original_name": file.filename,
            "stored_name": unique_filename,
            "path": str(file_path),
            "size": os.path.getsize(file_path)
        })
    
    return {"files": uploaded_files}

@api_router.post("/analyze")
async def analyze_assessment(data: dict):
    """Analyze assessment files against selected frameworks"""
    try:
        session_id = data['session_id']
        message_content = data['message']
        frameworks = data['frameworks']
        file_ids = data.get('file_ids', [])
        
        # Prepare file attachments and extracted text
        file_contents = []
        file_names = []
        extracted_texts = []
        
        # Gemini-supported mime types for direct file upload
        gemini_supported = {'.pdf', '.csv', '.txt'}
        
        for file_info in file_ids:
            file_path = Path(file_info['path'])
            if file_path.exists():
                ext = file_path.suffix.lower()
                file_names.append(file_info['original_name'])
                
                # Handle files based on type
                if ext in gemini_supported:
                    # Direct upload for supported formats
                    mime_map = {
                        '.pdf': 'application/pdf',
                        '.csv': 'text/csv',
                        '.txt': 'text/plain'
                    }
                    mime_type = mime_map.get(ext, 'text/plain')
                    
                    file_contents.append(FileContentWithMimeType(
                        file_path=str(file_path),
                        mime_type=mime_type
                    ))
                elif ext in ['.xlsx', '.xls']:
                    # Extract text from Excel
                    text = extract_text_from_excel(file_path)
                    extracted_texts.append(f"\\n=== Contenido de {file_info['original_name']} ===\\n{text}")
                elif ext in ['.docx', '.doc']:
                    # Extract text from Word
                    text = extract_text_from_word(file_path)
                    extracted_texts.append(f"\\n=== Contenido de {file_info['original_name']} ===\\n{text}")
                else:
                    extracted_texts.append(f"\\nArchivo no soportado: {file_info['original_name']}")
        
        # Build system message with framework context
        frameworks_text = ", ".join(frameworks)
        system_message = f"""Eres un experto auditor en seguridad de la información y cumplimiento normativo. 
Tu tarea es analizar documentos de assessment y evaluarlos contra los siguientes marcos normativos: {frameworks_text}.

FORMATO DE RESPUESTA OBLIGATORIO:

1. RESUMEN EJECUTIVO
[Breve resumen de 2-3 párrafos sobre el estado general del cumplimiento]

2. NIVELES DE CUMPLIMIENTO
Para cada framework solicitado, indica:
- Nombre del Framework: [Porcentaje]%
Justificación breve

3. GAPS CRÍTICOS IDENTIFICADOS
Framework: [Nombre]
Gap: [Descripción específica del gap]
Control/Cláusula: [Referencia al control o cláusula específica]
Impacto: [Alto/Medio/Bajo]
Recomendación: [Acción específica a tomar]

[Repetir para cada gap encontrado]

4. RECOMENDACIONES PRIORIZADAS
Prioridad Alta:
- [Recomendación 1]
- [Recomendación 2]

Prioridad Media:
- [Recomendación 1]

Prioridad Baja:
- [Recomendación 1]

5. PLAN DE ACCIÓN SUGERIDO
Corto Plazo (0-3 meses):
- [Acción 1]

Mediano Plazo (3-6 meses):
- [Acción 1]

Largo Plazo (6-12 meses):
- [Acción 1]

IMPORTANTE: 
- NO uses formato markdown (nada de **, ##, ###, etc.)
- Usa MAYÚSCULAS solo para títulos de secciones
- Usa guiones (-) para listas
- Sé específico con números de controles y cláusulas
- Responde en español profesional y claro"""
        
        # Initialize LLM Chat with Gemini
        chat = LlmChat(
            api_key=os.environ['EMERGENT_LLM_KEY'],
            session_id=session_id,
            system_message=system_message
        ).with_model("gemini", "gemini-2.0-flash")
        
        # Build user message
        user_text = f"{message_content}\\n\\nMarcos a evaluar: {frameworks_text}"
        if file_names:
            user_text += f"\\n\\nArchivos adjuntos: {', '.join(file_names)}"
        
        # Add extracted text if any
        if extracted_texts:
            user_text += "\\n\\n" + "\\n".join(extracted_texts)
        
        user_message = UserMessage(
            text=user_text,
            file_contents=file_contents if file_contents else None
        )
        
        # Get AI response
        ai_response = await chat.send_message(user_message)
        
        # Save user message
        user_msg = ChatMessage(
            session_id=session_id,
            role="user",
            content=message_content,
            file_names=file_names if file_names else None
        )
        user_doc = user_msg.model_dump()
        user_doc['timestamp'] = user_doc['timestamp'].isoformat()
        await db.messages.insert_one(user_doc)
        
        # Save AI response
        ai_msg = ChatMessage(
            session_id=session_id,
            role="assistant",
            content=ai_response
        )
        ai_doc = ai_msg.model_dump()
        ai_doc['timestamp'] = ai_doc['timestamp'].isoformat()
        await db.messages.insert_one(ai_doc)
        
        # Extract compliance scores and gaps from AI response (simple heuristic)
        compliance_scores = extract_compliance_scores(ai_response, frameworks)
        gaps = extract_gaps(ai_response, frameworks)
        
        # Save analysis result
        analysis = AnalysisResult(
            session_id=session_id,
            frameworks=frameworks,
            analysis=ai_response,
            compliance_scores=compliance_scores,
            gaps=gaps
        )
        analysis_doc = analysis.model_dump()
        analysis_doc['timestamp'] = analysis_doc['timestamp'].isoformat()
        await db.analysis_results.insert_one(analysis_doc)
        
        # Update session timestamp
        await db.sessions.update_one(
            {"id": session_id},
            {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {
            "user_message": user_msg.model_dump(),
            "ai_response": ai_msg.model_dump(),
            "compliance_scores": compliance_scores,
            "gaps": gaps
        }
        
    except Exception as e:
        logger.error(f"Error analyzing assessment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/sessions/{session_id}/messages", response_model=List[ChatMessage])
async def get_session_messages(session_id: str):
    """Get all messages for a session"""
    messages = await db.messages.find({"session_id": session_id}, {"_id": 0}).sort("timestamp", 1).to_list(1000)
    
    for msg in messages:
        if isinstance(msg['timestamp'], str):
            msg['timestamp'] = datetime.fromisoformat(msg['timestamp'])
    
    return messages

@api_router.get("/sessions/{session_id}/analysis")
async def get_session_analysis(session_id: str):
    """Get latest analysis for a session"""
    analysis = await db.analysis_results.find_one(
        {"session_id": session_id},
        {"_id": 0},
        sort=[("timestamp", -1)]
    )
    
    if analysis and isinstance(analysis['timestamp'], str):
        analysis['timestamp'] = datetime.fromisoformat(analysis['timestamp'])
    
    return analysis or {}

def extract_compliance_scores(ai_response: str, frameworks: List[str]) -> dict:
    """Extract compliance scores from AI response with better pattern matching"""
    scores = {}
    
    import re
    for framework in frameworks:
        # Try multiple patterns to find the score
        patterns = [
            rf"{re.escape(framework)}[:\s]+([0-9]+)%",
            rf"{re.escape(framework)}.*?([0-9]+)%",
            # Handle abbreviated versions
            rf"{framework.split()[0]}[:\s]+([0-9]+)%"
        ]
        
        found = False
        for pattern in patterns:
            match = re.search(pattern, ai_response, re.IGNORECASE)
            if match:
                scores[framework] = int(match.group(1))
                found = True
                break
        
        if not found:
            # Try to find any percentage in the vicinity of the framework name
            framework_pos = ai_response.lower().find(framework.lower())
            if framework_pos != -1:
                # Look in the next 100 characters
                snippet = ai_response[framework_pos:framework_pos+100]
                percentage_match = re.search(r'([0-9]+)%', snippet)
                if percentage_match:
                    scores[framework] = int(percentage_match.group(1))
                else:
                    scores[framework] = 75  # Default
            else:
                scores[framework] = 75  # Default
    
    return scores

def extract_gaps(ai_response: str, frameworks: List[str]) -> List[dict]:
    """Extract gaps from AI response with better parsing"""
    gaps = []
    
    # Split by sections and find gaps section
    lines = ai_response.split('\n')
    in_gaps_section = False
    current_gap = {}
    
    for line in lines:
        stripped = line.strip()
        
        # Detect gaps section
        if 'GAPS' in stripped.upper() or 'CRÍTICOS' in stripped.upper():
            in_gaps_section = True
            continue
        
        # Exit gaps section on next major section
        if in_gaps_section and stripped.match(r'^[0-9]+\.\s+[A-Z]') and 'GAP' not in stripped.upper():
            in_gaps_section = False
        
        if in_gaps_section and stripped:
            # Parse gap details
            if stripped.startswith('Framework:'):
                if current_gap:
                    gaps.append(current_gap)
                current_gap = {"framework": stripped.replace('Framework:', '').strip()}
            elif stripped.startswith('Gap:'):
                current_gap["description"] = stripped.replace('Gap:', '').strip()
            elif stripped.startswith('Impacto:'):
                impact = stripped.replace('Impacto:', '').strip().lower()
                current_gap["severity"] = "high" if "alto" in impact else "medium" if "medio" in impact else "low"
            elif stripped.startswith('Recomendación:') or stripped.startswith('Recomendacion:'):
                current_gap["recommendation"] = stripped.split(':', 1)[1].strip()
    
    # Add last gap if exists
    if current_gap and "description" in current_gap:
        gaps.append(current_gap)
    
    # If no gaps found with structured parsing, fall back to keyword search
    if not gaps:
        for line in lines:
            if any(keyword in line.lower() for keyword in ['gap', 'deficiencia', 'falta', 'crítico']):
                for framework in frameworks:
                    if framework.lower() in line.lower() or framework.split()[0].lower() in line.lower():
                        gaps.append({
                            "framework": framework,
                            "description": line.strip(),
                            "severity": "medium"
                        })
                        break
    
    return gaps[:15]  # Limit to 15 gaps
    
    # If no gaps found, add generic ones
    if not gaps:
        for framework in frameworks:
            gaps.append({
                "framework": framework,
                "description": f"Análisis detallado requerido para {framework}",
                "severity": "low"
            })
    
    return gaps[:10]  # Limit to 10 gaps

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
