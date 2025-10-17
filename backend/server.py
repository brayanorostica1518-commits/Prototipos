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
        
        # Prepare file attachments
        file_contents = []
        file_names = []
        
        for file_info in file_ids:
            file_path = Path(file_info['path'])
            if file_path.exists():
                # Determine mime type
                ext = file_path.suffix.lower()
                mime_map = {
                    '.pdf': 'application/pdf',
                    '.csv': 'text/csv',
                    '.txt': 'text/plain',
                    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    '.xls': 'application/vnd.ms-excel',
                    '.doc': 'application/msword'
                }
                mime_type = mime_map.get(ext, 'application/octet-stream')
                
                file_contents.append(FileContentWithMimeType(
                    file_path=str(file_path),
                    mime_type=mime_type
                ))
                file_names.append(file_info['original_name'])
        
        # Build system message with framework context
        frameworks_text = ", ".join(frameworks)
        system_message = f"""Eres un experto auditor en seguridad de la información y cumplimiento normativo. 
        Tu tarea es analizar documentos de assessment y evaluarlos contra los siguientes marcos normativos: {frameworks_text}.
        
        Para cada análisis debes:
        1. Identificar el nivel de cumplimiento actual (0-100%) para cada marco normativo solicitado
        2. Listar gaps específicos encontrados con referencias a controles o cláusulas
        3. Proporcionar recomendaciones accionables priorizadas
        4. Generar un resumen ejecutivo claro
        
        Responde en español de forma estructurada y profesional."""
        
        # Initialize LLM Chat with Gemini (supports file attachments)
        chat = LlmChat(
            api_key=os.environ['EMERGENT_LLM_KEY'],
            session_id=session_id,
            system_message=system_message
        ).with_model("gemini", "gemini-2.0-flash")
        
        # Build user message
        user_text = f"{message_content}\n\nMarcos a evaluar: {frameworks_text}"
        if file_names:
            user_text += f"\n\nArchivos adjuntos: {', '.join(file_names)}"
        
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
    """Extract compliance scores from AI response (simple heuristic)"""
    scores = {}
    
    # Simple pattern matching for percentages
    import re
    for framework in frameworks:
        pattern = rf"{framework}[:\s]+([0-9]+)%"
        match = re.search(pattern, ai_response, re.IGNORECASE)
        if match:
            scores[framework] = int(match.group(1))
        else:
            # Default to 70 if not found
            scores[framework] = 70
    
    return scores

def extract_gaps(ai_response: str, frameworks: List[str]) -> List[dict]:
    """Extract gaps from AI response (simple heuristic)"""
    gaps = []
    
    # Look for gap-related keywords
    lines = ai_response.split('\n')
    for line in lines:
        if any(keyword in line.lower() for keyword in ['gap', 'deficiencia', 'falta', 'ausencia', 'recomendación', 'recommendation']):
            for framework in frameworks:
                if framework.lower() in line.lower():
                    gaps.append({
                        "framework": framework,
                        "description": line.strip(),
                        "severity": "medium"
                    })
                    break
    
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
