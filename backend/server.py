"""
Secure FastAPI Backend for Assessment AI Platform

Security Features Implemented:
- Rate limiting on all endpoints
- Input sanitization and validation
- Security headers (CSP, X-Frame-Options, etc.)
- File upload validation
- Error handling with safe messages
- Security event logging
- CORS protection
"""

from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Request, status, Depends
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.gzip import GZipMiddleware
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, validator
from typing import List, Optional, Dict, Annotated
import uuid
from datetime import datetime, timezone, timedelta
import tempfile
import shutil
from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
import openpyxl
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
import csv
import re
import io

# Import security utilities
from security_utils import (
    sanitize_text,
    sanitize_filename,
    validate_file_type,
    validate_file_content_safety,
    validate_frameworks,
    validate_session_id,
    SECURITY_HEADERS,
    get_safe_error_message,
    log_security_event,
    MAX_FILE_SIZE
)

# Import template system
from prompt_templates import (
    get_all_templates,
    get_template_by_id,
    fill_template,
    get_categories,
    TemplateCategory,
    PromptTemplate
)

# Import ISO controls database
from iso_controls import get_all_framework_controls_for_prompt

# Import authentication
from auth import auth_router, get_current_user, User

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ==================== CONFIGURATION ====================

# Environment variables with defaults
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'assessment_db')
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')
DEBUG_MODE = os.environ.get('DEBUG', 'False').lower() == 'true'

# MongoDB connection
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Rate limiter setup
limiter = Limiter(key_func=get_remote_address)

# Create the main app
app = FastAPI(
    title="Assessment AI API",
    description="Secure API for compliance assessment analysis",
    version="1.0.0",
    docs_url="/api/docs" if DEBUG_MODE else None,  # Disable in production
    redoc_url="/api/redoc" if DEBUG_MODE else None
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Include auth router
api_router.include_router(auth_router)

# Configure logging with security focus
logging.basicConfig(
    level=logging.INFO if not DEBUG_MODE else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        # In production, add file handler for audit logs
    ]
)
logger = logging.getLogger(__name__)

# ==================== PYDANTIC MODELS WITH VALIDATION ====================

class ChatMessage(BaseModel):
    """Chat message model with validation"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: str
    content: str = Field(max_length=100000)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    file_names: Optional[List[str]] = None
    
    @validator('role')
    def validate_role(cls, v):
        if v not in ['user', 'assistant']:
            raise ValueError('Role must be user or assistant')
        return v
    
    @validator('content')
    def sanitize_content(cls, v):
        return sanitize_text(v, max_length=100000)
    
    @validator('session_id')
    def validate_session(cls, v):
        if not validate_session_id(v):
            raise ValueError('Invalid session ID format')
        return v


class AnalysisRequest(BaseModel):
    """Validated request for analysis"""
    session_id: str = Field(max_length=100)
    message: str = Field(max_length=50000)
    frameworks: List[str] = Field(min_items=1, max_items=10)
    file_ids: List[Dict] = Field(default=[])
    
    @validator('message')
    def sanitize_message(cls, v):
        return sanitize_text(v, max_length=50000)
    
    @validator('frameworks')
    def validate_frameworks_list(cls, v):
        if not validate_frameworks(v):
            raise ValueError('Invalid frameworks selection')
        return v
    
    @validator('session_id')
    def validate_session(cls, v):
        if not validate_session_id(v):
            raise ValueError('Invalid session ID')
        return v


class AnalysisResult(BaseModel):
    """Analysis result model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    user_id: str  # Owner of the analysis
    frameworks: List[str]
    analysis: str
    compliance_scores: dict
    gaps: List[dict]
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SessionUpdate(BaseModel):
    """Session update request body"""
    title: Optional[str] = None
    retention_policy: Optional[str] = None


    """Session model with data retention policy"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Owner of the session
    title: str = Field(max_length=200)
    retention_policy: str = Field(default="72h")  # "none", "72h", "permanent"
    expires_at: Optional[datetime] = None  # Auto-calculated based on retention_policy
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    @validator('title')
    def sanitize_title(cls, v):
        return sanitize_text(v, max_length=200)
    
    @validator('retention_policy')
    def validate_retention(cls, v):
        allowed = ["none", "72h", "permanent"]
        if v not in allowed:
            raise ValueError(f"retention_policy must be one of {allowed}")
        return v


# ==================== MIDDLEWARE ====================

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses"""
    response = await call_next(request)
    
    # Add all security headers
    for header, value in SECURITY_HEADERS.items():
        response.headers[header] = value
    
    return response


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests for security monitoring"""
    # Log request details (excluding sensitive data)
    log_security_event(
        "API_REQUEST",
        {
            "method": request.method,
            "path": request.url.path,
            "client": get_remote_address(request)
        }
    )
    
    response = await call_next(request)
    return response


# Add middlewares
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=3600,
)


# ==================== DATA RETENTION ====================

async def check_session_expired(session_id: str, user_id: str) -> bool:
    """
    Check if a session has expired based on retention policy
    
    Args:
        session_id: Session ID to check
        user_id: User ID (for authorization)
        
    Returns:
        True if expired, False otherwise
    """
    session = await db.sessions.find_one(
        {"id": session_id, "user_id": user_id},
        {"_id": 0, "expires_at": 1}
    )
    
    if not session:
        return True  # Session not found = expired
    
    expires_at = session.get('expires_at')
    if expires_at is None:
        return False  # Permanent retention
    
    # Parse expiration date
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
    
    now = datetime.now(timezone.utc)
    return now > expires_at


# ==================== FILE HANDLING ====================

# Secure temporary storage
UPLOAD_DIR = Path("/tmp/assessment_uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


def extract_text_from_excel(file_path: Path) -> str:
    """Extract text content from Excel file with error handling"""
    try:
        logger.info(f"Attempting to load Excel file: {file_path}")
        wb = openpyxl.load_workbook(file_path, data_only=True)
        text_content = []
        
        logger.info(f"Excel file loaded. Found {len(wb.sheetnames)} sheets")
        
        for sheet_name in wb.sheetnames[:10]:  # Limit sheets
            sheet = wb[sheet_name]
            text_content.append(f"\n=== Hoja: {sanitize_text(sheet_name, 100)} ===\n")
            
            # Limit rows to prevent DoS
            row_count = 0
            for idx, row in enumerate(sheet.iter_rows(values_only=True)):
                if idx > 10000:  # Max 10k rows
                    break
                row_text = " | ".join([str(cell)[:500] if cell is not None else "" for cell in row])
                if row_text.strip():
                    text_content.append(row_text[:2000])  # Limit row length
                    row_count += 1
            
            logger.info(f"Processed {row_count} rows from sheet: {sheet_name}")
        
        result = "\n".join(text_content)[:100000]  # Limit total size
        logger.info(f"Excel extraction complete. Extracted {len(result)} characters")
        return result
        
    except openpyxl.utils.exceptions.InvalidFileException as e:
        logger.error(f"Invalid Excel file format: {str(e)}")
        raise HTTPException(
            status_code=400, 
            detail=f"El archivo no es un Excel válido (.xlsx). Error: {str(e)}"
        )
    except PermissionError as e:
        logger.error(f"Permission error reading Excel: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error de permisos al leer el archivo"
        )
    except Exception as e:
        logger.error(f"Error extracting Excel: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=400, 
            detail=f"Error al procesar el archivo Excel: {str(e)}"
        )


def extract_text_from_word(file_path: Path) -> str:
    """Extract text content from Word file with error handling"""
    try:
        doc = Document(file_path)
        text_content = []
        
        # Limit paragraphs
        for idx, para in enumerate(doc.paragraphs):
            if idx > 5000:  # Max 5k paragraphs
                break
            if para.text.strip():
                text_content.append(para.text[:2000])  # Limit para length
        
        # Limit tables
        for idx, table in enumerate(doc.tables):
            if idx > 100:  # Max 100 tables
                break
            for row in table.rows:
                row_text = " | ".join([cell.text[:500] for cell in row.cells])
                if row_text.strip():
                    text_content.append(row_text[:2000])
        
        return "\n".join(text_content)[:100000]  # Limit total size
        
    except Exception as e:
        logger.error(f"Error extracting Word: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid Word file format")


# ==================== API ENDPOINTS ====================

@api_router.get("/")
@limiter.limit("60/minute")
async def root(request: Request):
    """Health check endpoint"""
    return {"message": "Assessment AI API Ready", "status": "operational"}


@api_router.post("/sessions", response_model=Session)
@limiter.limit("10/minute")  # Limit session creation
async def create_session(
    request: Request,
    retention_policy: str = "72h",  # Default: 72 hours retention
    current_user: User = Depends(get_current_user)
):
    """
    Create a new chat session for authenticated user with configurable retention
    
    Args:
        retention_policy: "none" (delete after 1h), "72h" (3 days), "permanent"
    
    Rate limited to prevent abuse
    """
    try:
        # Validate retention policy
        allowed_policies = ["none", "72h", "permanent"]
        if retention_policy not in allowed_policies:
            retention_policy = "72h"
        
        # Calculate expiration date
        created_at = datetime.now(timezone.utc)
        if retention_policy == "none":
            expires_at = created_at + timedelta(hours=1)
        elif retention_policy == "72h":
            expires_at = created_at + timedelta(hours=72)
        else:  # permanent
            expires_at = None
        
        session = Session(
            title="Nueva Evaluación",
            user_id=current_user.id,
            retention_policy=retention_policy,
            expires_at=expires_at
        )
        doc = session.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        if doc.get('expires_at'):
            doc['expires_at'] = doc['expires_at'].isoformat()
        
        await db.sessions.insert_one(doc)
        
        log_security_event("SESSION_CREATED", {
            "session_id": session.id,
            "user_id": current_user.id,
            "retention_policy": retention_policy,
            "expires_at": expires_at.isoformat() if expires_at else None
        })
        return session
        
    except Exception as e:
        logger.error(f"Error creating session: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=get_safe_error_message(e, DEBUG_MODE)
        )


@api_router.get("/sessions", response_model=List[Session])
@limiter.limit("20/minute")
async def get_sessions(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Get all chat sessions for authenticated user"""
    try:
        # Filter sessions by user_id
        sessions = await db.sessions.find(
            {"user_id": current_user.id}, 
            {"_id": 0}
        ).sort("updated_at", -1).limit(100).to_list(100)
        
        for session in sessions:
            if isinstance(session['created_at'], str):
                session['created_at'] = datetime.fromisoformat(session['created_at'])
            if isinstance(session['updated_at'], str):
                session['updated_at'] = datetime.fromisoformat(session['updated_at'])
        
        logger.info(f"Retrieved {len(sessions)} sessions for user {current_user.id}")
        return sessions
        
    except Exception as e:
        logger.error(f"Error fetching sessions: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=get_safe_error_message(e, DEBUG_MODE)
        )


@api_router.delete("/sessions/{session_id}")
@limiter.limit("10/minute")
async def delete_session(
    session_id: str,
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a session and all associated data (messages, analysis, files)
    Only the owner can delete their session
    """
    try:
        # Verify session belongs to user
        session = await db.sessions.find_one({
            "id": session_id,
            "user_id": current_user.id
        }, {"_id": 0})
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found or access denied")
        
        # Delete associated analysis results
        deleted_analysis = await db.analysis_results.delete_many({"session_id": session_id})
        
        # Delete associated files metadata
        deleted_files = await db.uploaded_files.delete_many({"session_id": session_id})
        
        # Delete the session itself
        result = await db.sessions.delete_one({"id": session_id, "user_id": current_user.id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        
        log_security_event("SESSION_DELETED", {
            "session_id": session_id,
            "user_id": current_user.id,
            "analysis_deleted": deleted_analysis.deleted_count,
            "files_deleted": deleted_files.deleted_count
        })
        
        return {"message": "Session deleted successfully", "session_id": session_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting session: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=get_safe_error_message(e, DEBUG_MODE)
        )


@api_router.patch("/sessions/{session_id}")
@limiter.limit("10/minute")
async def update_session(
    session_id: str,
    request: Request,
    body: SessionUpdate,
    current_user: User = Depends(get_current_user)
):
    """
    Update session properties (title, retention_policy)
    Only the owner can update their session
    """
    try:
        session = await db.sessions.find_one({
            "id": session_id,
            "user_id": current_user.id
        }, {"_id": 0})
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found or access denied")
        
        update_doc = {"updated_at": datetime.now(timezone.utc).isoformat()}
        
        if body.title is not None and body.title.strip():
            update_doc["title"] = sanitize_text(body.title.strip(), max_length=200)
        
        if body.retention_policy is not None:
            if body.retention_policy not in ["none", "72h", "permanent"]:
                raise HTTPException(status_code=400, detail="Invalid retention_policy")
            
            update_doc["retention_policy"] = body.retention_policy
            
            created_at = session.get('created_at')
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            
            if body.retention_policy == "none":
                update_doc["expires_at"] = (created_at + timedelta(hours=1)).isoformat()
            elif body.retention_policy == "72h":
                update_doc["expires_at"] = (created_at + timedelta(hours=72)).isoformat()
            else:
                update_doc["expires_at"] = None
        
        result = await db.sessions.update_one(
            {"id": session_id, "user_id": current_user.id},
            {"$set": update_doc}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        
        log_security_event("SESSION_UPDATED", {
            "session_id": session_id,
            "user_id": current_user.id,
            "updates": list(update_doc.keys())
        })
        
        return {"message": "Session updated successfully", "session_id": session_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating session: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=get_safe_error_message(e, DEBUG_MODE)
        )


@api_router.post("/upload")
@limiter.limit("5/minute")  # Strict limit on file uploads
async def upload_files(request: Request, files: List[UploadFile] = File(...)):
    """
    Upload assessment files with security validation
    - File type validation
    - Size limits
    - Content scanning
    - Filename sanitization
    """
    try:
        # Limit number of files
        if len(files) > 10:
            raise HTTPException(
                status_code=400,
                detail="Maximum 10 files allowed per upload"
            )
        
        uploaded_files = []
        
        for file in files:
            # Validate file size from content length
            if file.size and file.size > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=f"File {file.filename} exceeds maximum size of 50MB"
                )
            
            # Sanitize filename
            safe_filename = sanitize_filename(file.filename)
            
            # Generate unique filename
            file_id = str(uuid.uuid4())
            file_ext = Path(safe_filename).suffix
            unique_filename = f"{file_id}{file_ext}"
            file_path = UPLOAD_DIR / unique_filename
            
            # Save file with size check
            bytes_written = 0
            with open(file_path, "wb") as buffer:
                while chunk := await file.read(8192):
                    bytes_written += len(chunk)
                    if bytes_written > MAX_FILE_SIZE:
                        file_path.unlink()  # Delete oversized file
                        raise HTTPException(
                            status_code=400,
                            detail="File exceeds maximum size"
                        )
                    buffer.write(chunk)
            
            # Validate file type and content
            if not validate_file_type(file_path):
                file_path.unlink()
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid or disallowed file type: {safe_filename}"
                )
            
            if not validate_file_content_safety(file_path):
                file_path.unlink()
                raise HTTPException(
                    status_code=400,
                    detail=f"File contains suspicious content: {safe_filename}"
                )
            
            uploaded_files.append({
                "id": file_id,
                "original_name": safe_filename,
                "stored_name": unique_filename,
                "path": str(file_path),
                "size": bytes_written
            })
            
            log_security_event(
                "FILE_UPLOADED",
                {
                    "file_id": file_id,
                    "filename": safe_filename,
                    "size": bytes_written
                }
            )
        
        return {"files": uploaded_files}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading files: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=get_safe_error_message(e, DEBUG_MODE)
        )


@api_router.post("/analyze")
@limiter.limit("3/minute")  # Conservative limit for AI analysis
async def analyze_assessment(
    request: Request,
    data: AnalysisRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Analyze assessment files against selected frameworks
    With comprehensive security validations and user authentication
    """
    try:
        session_id = data.session_id
        message_content = data.message
        frameworks = data.frameworks
        file_ids = data.file_ids
        
        # Verify session belongs to current user
        session = await db.sessions.find_one({
            "id": session_id,
            "user_id": current_user.id
        })
        if not session:
            logger.error(f"Session {session_id} not found or access denied for user {current_user.id}")
            raise HTTPException(
                status_code=403,
                detail="Session not found or access denied"
            )
        
        # Prepare file attachments and extracted text
        file_contents = []
        file_names = []
        extracted_texts = []
        
        # Gemini-supported mime types
        gemini_supported = {'.pdf', '.csv', '.txt'}
        
        # Limit number of files in analysis
        if len(file_ids) > 10:
            raise HTTPException(
                status_code=400,
                detail="Maximum 10 files allowed for analysis"
            )
        
        for file_info in file_ids:
            file_path = Path(file_info['path'])
            
            # Security check: ensure file is in upload directory
            if not file_path.is_relative_to(UPLOAD_DIR):
                log_security_event(
                    "PATH_TRAVERSAL_ATTEMPT",
                    {"path": str(file_path)},
                    severity="WARNING"
                )
                raise HTTPException(
                    status_code=400,
                    detail="Invalid file path"
                )
            
            if file_path.exists():
                ext = file_path.suffix.lower()
                safe_filename = sanitize_filename(file_info['original_name'])
                file_names.append(safe_filename)
                
                # Handle files based on type
                if ext in gemini_supported:
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
                    text = extract_text_from_excel(file_path)
                    extracted_texts.append(
                        f"\n=== Contenido de {safe_filename} ===\n{text}"
                    )
                elif ext in ['.docx', '.doc']:
                    text = extract_text_from_word(file_path)
                    extracted_texts.append(
                        f"\n=== Contenido de {safe_filename} ===\n{text}"
                    )
        
        # Build system message with framework-specific controls
        frameworks_text = ", ".join(frameworks)
        controls_info = get_all_framework_controls_for_prompt(frameworks)
        
        system_message = f"""Eres un auditor senior certificado en seguridad de la información y cumplimiento normativo, con experiencia en ISO/IEC 27001:2022, NIST CSF, OWASP, GDPR y otros marcos.

Tu tarea es generar un INFORME DE AUDITORÍA PROFESIONAL evaluando documentos contra: {frameworks_text}.

{controls_info}

═══════════════════════════════════════════════════════════════════
ESTRUCTURA DEL INFORME (OBLIGATORIA - ESTILO AUDITORÍA FORMAL)
═══════════════════════════════════════════════════════════════════

1. RESUMEN EJECUTIVO

[Redactar 3-4 párrafos técnicos profesionales que incluyan:]
- Alcance de la evaluación y marcos normativos aplicados
- Hallazgos principales identificados
- Nivel de madurez general del control evaluado (usar escala CMMI: 1-Inicial, 2-Gestionado, 3-Definido, 4-Cuantitativo, 5-Optimizado)
- Estado global de cumplimiento (porcentaje agregado)
- Conclusión ejecutiva sobre postura de seguridad

2. CONTEXTO NORMATIVO Y CONTROLES EVALUADOS

[Para cada framework en {frameworks_text}:]

Framework: [Nombre completo del marco normativo]
Versión: [Especificar versión, ej: ISO/IEC 27001:2022, NIST CSF v1.1]
Controles Específicos Evaluados:
- Control X.X.X: [Nombre completo del control]
- Control Y.Y.Y: [Nombre completo del control]
[Listar todos los controles relevantes evaluados]

Objetivo del Marco: [Breve descripción del propósito del marco]

3. ANÁLISIS DETALLADO POR FRAMEWORK

[Para cada framework:]

══════════════════════════════════════════════════════════════
FRAMEWORK: {frameworks[0] if frameworks else '[Framework]'}
══════════════════════════════════════════════════════════════

A) CONTROLES EVALUADOS Y HALLAZGOS

Control: [Número y nombre completo, ej: A.8.5 Autenticación Segura - ISO 27001:2022]
Referencia Normativa: [Cita exacta del control/cláusula]

EVIDENCIA ANALIZADA:
[Citar fragmentos ESPECÍFICOS del documento que fundamentan el hallazgo]
- "Extracto textual relevante del documento..."
- "Otra evidencia documental identificada..."

FUNDAMENTACIÓN TÉCNICA:
[Descripción técnica detallada del hallazgo, sin frases genéricas]
Estado Actual Identificado: [Qué se encontró implementado]
Requisito del Control: [Qué exige específicamente el control]
Gap Identificado: [Diferencia precisa entre estado actual y requerido]

IMPACTO EN TRIADA CIA:
- Confidencialidad: [BAJO/MEDIO/ALTO] - Justificación técnica
- Integridad: [BAJO/MEDIO/ALTO] - Justificación técnica
- Disponibilidad: [BAJO/MEDIO/ALTO] - Justificación técnica

NIVEL DE RIESGO: [CRÍTICO/ALTO/MEDIO/BAJO]
Justificación del Riesgo: [Análisis técnico fundamentado considerando:
- Probabilidad de materialización
- Impacto potencial en operaciones
- Exposición actual de activos
- Contexto organizacional]

RECOMENDACIÓN TÉCNICA ESPECÍFICA:
Acción Inmediata: [Medida concreta, específica y medible]
Alineación Normativa: [ISO/IEC 27002:2022 cláusula X / NIST CSF función Y / etc.]
Justificación de la Recomendación: [Por qué esta medida mitiga efectivamente el riesgo]

PLAN DE IMPLEMENTACIÓN:
Fase 1 (0-30 días): [Acciones inmediatas priorizadas]
Fase 2 (30-90 días): [Implementaciones a mediano plazo]
Fase 3 (90+ días): [Mejoras continuas y optimización]

Prioridad de Implementación: [P1-Crítica / P2-Alta / P3-Media / P4-Baja]
Esfuerzo Estimado: [Bajo/Medio/Alto]
Recursos Necesarios: [Personal, herramientas, presupuesto estimado]

B) NIVEL DE CUMPLIMIENTO DEL FRAMEWORK
Porcentaje de Cumplimiento: [X]%
Estado: [Crítico (<40%) / Deficiente (40-60%) / Aceptable (60-75%) / Bueno (75-85%) / Excelente (>85%)]
Controles Implementados: [X de Y]
Controles Parcialmente Implementados: [X de Y]
Controles No Implementados: [X de Y]

C) NIVEL DE MADUREZ (Modelo CMMI)
Nivel Actual: [1-5] - [Nombre del nivel]
Justificación: [Análisis técnico del por qué se asigna este nivel]
Nivel Objetivo Recomendado: [1-5]
Brecha de Madurez: [Gap entre actual y objetivo]

4. MATRIZ CONSOLIDADA DE CUMPLIMIENTO

TABLA DE CUMPLIMIENTO:
|| Framework | Cumplimiento % | Controles OK | Controles Gap | Estado Global | Madurez | Prioridad ||
||-----------|----------------|--------------|---------------|---------------|---------|-----------|
|| [Nombre Framework] | [X]% | [X/Y] | [Z] | [Estado] | Nivel [N] | [P1/P2/P3] |

5. TABLA RESUMEN DE GAPS CRÍTICOS

TABLA DE GAPS PRIORIZADOS:
|| GAP ID | Framework | Control Afectado | Gap Detectado | Riesgo | Impacto CIA | Prioridad | Plazo ||
||--------|-----------|------------------|---------------|--------|-------------|-----------|-------|
|| GAP-001 | ISO 27001 | A.X.Y [Nombre] | [Descripción técnica] | ALTO | C:Alto I:Medio D:Bajo | P1 | 30 días |
|| GAP-002 | [Framework] | [Control] | [Gap] | [Nivel] | [CIA] | [P#] | [Días] |

[Generar mínimo 5-10 gaps priorizados por severidad]

6. RECOMENDACIONES PRIORIZADAS CON FUNDAMENTACIÓN

PRIORIDAD CRÍTICA (P1) - Implementación Inmediata (0-30 días):

R-001: [Control ISO 27001:2022 A.X.Y - Nombre del Control]
Recomendación: [Acción específica, medible y técnica]
Fundamentación: [Por qué es crítica, qué riesgo mitiga]
Alineación: ISO/IEC 27002:2022 cláusula [X]
KPI de Éxito: [Métrica cuantificable]
Responsable Sugerido: [Rol/Departamento]

R-002: [Siguiente recomendación crítica]
[Mismo formato]

PRIORIDAD ALTA (P2) - Implementación Corto Plazo (30-90 días):
[Mismo formato para cada recomendación]

PRIORIDAD MEDIA (P3) - Implementación Mediano Plazo (3-6 meses):
[Mismo formato]

7. MATRIZ DE CONTROLES TÉCNICOS

TABLA DE CONTROLES:
|| Control | Framework | Estado | Efectividad | Evidencia | Riesgo Residual | Acción Requerida ||
||---------|-----------|--------|-------------|-----------|-----------------|------------------|
|| A.X.Y [Nombre] | ISO 27001 | Parcial | Media | [Ref doc] | Medio | [Acción específica] |

8. ROADMAP DE REMEDIACIÓN (PLAN DE ACCIÓN)

FASE 1: REMEDIACIÓN URGENTE (Días 0-30)
Objetivo: Mitigar riesgos críticos inmediatos
Entregables:
- [Entregable 1 específico]
- [Entregable 2 específico]
Controles a Implementar: [GAP-001, GAP-003, GAP-005]
Recursos: [Equipo, presupuesto, herramientas]
Hito de Validación: [Criterio de éxito medible]

FASE 2: IMPLEMENTACIÓN ESTRUCTURAL (Días 30-90)
[Mismo formato]

FASE 3: OPTIMIZACIÓN Y MEJORA CONTINUA (Días 90-180)
[Mismo formato]

9. MÉTRICAS DE SEGUIMIENTO (KPIs)

TABLA DE KPIs:
|| Métrica | Valor Actual | Valor Objetivo | Frecuencia | Responsable | Método de Medición ||
||---------|--------------|----------------|------------|-------------|-------------------|
|| % Cumplimiento ISO 27001 | [X]% | >85% | Trimestral | CISO | Auditoría interna |
|| Tiempo Medio Remediación Gaps | [X días] | <30 días | Mensual | Seguridad | Ticketing |

10. NIVEL DE MADUREZ CONSOLIDADO

Framework: [Nombre]
Nivel de Madurez Actual: [1-5] - [Descripción del nivel]
Análisis de Capacidad: [Evaluación detallada de procesos, documentación, controles]
Nivel de Madurez Objetivo: [1-5]
Gap de Madurez: [Análisis de la brecha]
Ruta de Evolución: [Pasos para alcanzar nivel objetivo]

═══════════════════════════════════════════════════════════════════
REQUISITOS DE FORMATO Y ESTILO
═══════════════════════════════════════════════════════════════════

LENGUAJE:
- Técnico y formal (estilo informe de auditoría profesional)
- Sin frases genéricas o placeholders
- Fundamentación normativa en cada recomendación
- Datos cuantitativos siempre que sea posible
- Citas exactas de controles y cláusulas

TABLAS:
- Usar formato con || (doble pipe) para columnas
- Headers claros y datos alineados
- No usar markdown (**, ##, etc.)

ESTRUCTURA:
- MAYÚSCULAS para títulos principales
- Guiones (-) para listas
- Referencias específicas (ej: "ISO/IEC 27001:2022 Anexo A.8.5" no "Control de autenticación")

NOTA LEGAL:
Este informe ha sido generado mediante análisis de inteligencia artificial y constituye una evaluación orientativa. 
Debe ser revisado y validado por un auditor certificado (CISA, CISSP, ISO 27001 LA) antes de uso oficial o toma de decisiones críticas.
No constituye una certificación de cumplimiento ni asesoramiento legal vinculante."""
        
        # Initialize LLM Chat
        chat = LlmChat(
            api_key=os.environ['EMERGENT_LLM_KEY'],
            session_id=session_id,
            system_message=system_message
        ).with_model("gemini", "gemini-2.0-flash")
        
        # Build user message
        user_text = f"{message_content}\n\nMarcos a evaluar: {frameworks_text}"
        if file_names:
            user_text += f"\n\nArchivos adjuntos: {', '.join(file_names)}"
        
        if extracted_texts:
            user_text += "\n\n" + "\n".join(extracted_texts)
        
        user_message = UserMessage(
            text=user_text,
            file_contents=file_contents if file_contents else None
        )
        
        # Get AI response with timeout
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
        
        # Extract compliance scores and gaps
        compliance_scores = extract_compliance_scores(ai_response, frameworks)
        gaps = extract_gaps(ai_response, frameworks)
        
        # Save analysis result with user_id
        analysis = AnalysisResult(
            session_id=session_id,
            user_id=current_user.id,
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
        
        log_security_event(
            "ANALYSIS_COMPLETED",
            {
                "session_id": session_id,
                "frameworks": frameworks,
                "file_count": len(file_names)
            }
        )
        
        return {
            "user_message": user_msg.model_dump(),
            "ai_response": ai_msg.model_dump(),
            "compliance_scores": compliance_scores,
            "gaps": gaps
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing assessment: {type(e).__name__}: {str(e)}", exc_info=True)
        log_security_event(
            "ANALYSIS_ERROR",
            {
                "error": str(e),
                "error_type": type(e).__name__,
                "session_id": session_id,
                "frameworks": frameworks
            },
            severity="ERROR"
        )
        raise HTTPException(
            status_code=500,
            detail=f"Error al analizar: {str(e)}"
        )


@api_router.get("/sessions/{session_id}/messages", response_model=List[ChatMessage])
@limiter.limit("30/minute")
async def get_session_messages(
    request: Request,
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all messages for a session with validation and user authorization"""
    try:
        # Validate session ID
        if not validate_session_id(session_id):
            raise HTTPException(status_code=400, detail="Invalid session ID")
        
        # Verify session belongs to user
        session = await db.sessions.find_one({
            "id": session_id,
            "user_id": current_user.id
        })
        if not session:
            logger.error(f"Session {session_id} not found for user {current_user.id} when getting messages")
            raise HTTPException(status_code=403, detail="Session not found or access denied")
        
        messages = await db.messages.find(
            {"session_id": session_id},
            {"_id": 0}
        ).sort("timestamp", 1).limit(1000).to_list(1000)
        
        for msg in messages:
            if isinstance(msg['timestamp'], str):
                msg['timestamp'] = datetime.fromisoformat(msg['timestamp'])
        
        return messages
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching messages: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=get_safe_error_message(e, DEBUG_MODE)
        )


@api_router.get("/sessions/{session_id}/analysis")
@limiter.limit("30/minute")
async def get_session_analysis(
    request: Request,
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get latest analysis for a session with validation and user authorization"""
    try:
        # Validate session ID
        if not validate_session_id(session_id):
            raise HTTPException(status_code=400, detail="Invalid session ID")
        
        # Find analysis for user's session only
        analysis = await db.analysis_results.find_one(
            {
                "session_id": session_id,
                "user_id": current_user.id
            },
            {"_id": 0},
            sort=[("timestamp", -1)]
        )
        
        if analysis and isinstance(analysis['timestamp'], str):
            analysis['timestamp'] = datetime.fromisoformat(analysis['timestamp'])
        
        return analysis or {}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching analysis: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=get_safe_error_message(e, DEBUG_MODE)
        )


# ==================== TEMPLATE ENDPOINTS ====================

@api_router.get("/templates")
@limiter.limit("20/minute")
async def list_templates(request: Request, category: Optional[str] = None):
    """
    Get all available prompt templates
    Optionally filter by category
    """
    try:
        cat_filter = None
        if category:
            try:
                cat_filter = TemplateCategory(category)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid category")
        
        templates = get_all_templates(cat_filter)
        
        # Convert to dict for JSON response
        result = []
        for t in templates:
            result.append({
                "id": t.id,
                "name": t.name,
                "category": t.category.value,
                "description": t.description,
                "frameworks": t.frameworks,
                "icon": t.icon,
                "variable_count": len(t.variables)
            })
        
        log_security_event("TEMPLATES_LISTED", {"count": len(result), "category": category})
        return {"templates": result}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing templates: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=get_safe_error_message(e, DEBUG_MODE)
        )


@api_router.get("/templates/categories")
@limiter.limit("20/minute")
async def list_categories(request: Request):
    """Get all template categories"""
    try:
        categories = get_categories()
        return {"categories": categories}
    except Exception as e:
        logger.error(f"Error fetching categories: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=get_safe_error_message(e, DEBUG_MODE)
        )


@api_router.get("/templates/{template_id}")
@limiter.limit("20/minute")
async def get_template_detail(request: Request, template_id: str):
    """Get full template details including variables"""
    try:
        template = get_template_by_id(template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        log_security_event("TEMPLATE_ACCESSED", {"template_id": template_id})
        return template.model_dump()
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching template: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=get_safe_error_message(e, DEBUG_MODE)
        )


@api_router.post("/templates/{template_id}/fill")
@limiter.limit("10/minute")
async def fill_template_endpoint(request: Request, template_id: str, variables: Dict[str, str]):
    """
    Fill template with user-provided variables
    Returns the complete prompt ready to send to AI
    """
    try:
        template = get_template_by_id(template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Validate that all required variables are provided
        required_vars = [v.name for v in template.variables if v.required]
        missing_vars = [v for v in required_vars if v not in variables or not variables[v].strip()]
        
        if missing_vars:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required variables: {', '.join(missing_vars)}"
            )
        
        # Sanitize all variable values
        sanitized_vars = {
            key: sanitize_text(value, max_length=10000)
            for key, value in variables.items()
        }
        
        # Fill template
        filled_prompt = fill_template(template.template, sanitized_vars)
        
        log_security_event(
            "TEMPLATE_FILLED",
            {"template_id": template_id, "template_name": template.name}
        )
        
        return {
            "filled_prompt": filled_prompt,
            "template_name": template.name,
            "frameworks": template.frameworks,
            "output_format": template.output_format
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error filling template: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=get_safe_error_message(e, DEBUG_MODE)
        )


@api_router.post("/export/word")
@limiter.limit("5/minute")
async def export_to_word(request: Request, data: Dict):
    """
    Export analysis to Microsoft Word document
    Formatted with proper structure
    """
    try:
        session_id = data.get('session_id')
        if not session_id or not validate_session_id(session_id):
            raise HTTPException(status_code=400, detail="Invalid session ID")
        
        # Get analysis data
        analysis = await db.analysis_results.find_one(
            {"session_id": session_id},
            {"_id": 0},
            sort=[("timestamp", -1)]
        )
        
        if not analysis:
            raise HTTPException(status_code=404, detail="No analysis found for this session")
        
        # Create Word document
        doc = Document()
        
        # Set document margins
        sections = doc.sections
        for section in sections:
            section.top_margin = Inches(1)
            section.bottom_margin = Inches(1)
            section.left_margin = Inches(1)
            section.right_margin = Inches(1)
        
        # Title
        title = doc.add_heading('Reporte de Assessment', 0)
        title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        # Subtitle
        subtitle = doc.add_paragraph()
        subtitle.add_run('Análisis de Cumplimiento Normativo').bold = True
        subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        # Date
        doc.add_paragraph(f"Fecha de generación: {datetime.now().strftime('%d de %B de %Y')}")
        doc.add_paragraph(f"ID de sesión: {session_id[:8]}...")
        doc.add_paragraph()
        
        # Frameworks
        doc.add_heading('Marcos Normativos Evaluados', level=2)
        for fw in analysis.get('frameworks', []):
            doc.add_paragraph(fw, style='List Bullet')
        
        doc.add_page_break()
        
        # Compliance Scores
        doc.add_heading('Niveles de Cumplimiento', level=2)
        table = doc.add_table(rows=1, cols=2)
        table.style = 'Light Grid Accent 1'
        hdr_cells = table.rows[0].cells
        hdr_cells[0].text = 'Marco Normativo'
        hdr_cells[1].text = 'Cumplimiento'
        
        for framework, score in analysis.get('compliance_scores', {}).items():
            row_cells = table.add_row().cells
            row_cells[0].text = framework
            row_cells[1].text = f"{score}%"
        
        doc.add_paragraph()
        
        # Gaps
        if analysis.get('gaps'):
            doc.add_heading('Gaps Identificados', level=2)
            gaps_table = doc.add_table(rows=1, cols=3)
            gaps_table.style = 'Light Grid Accent 1'
            hdr_cells = gaps_table.rows[0].cells
            hdr_cells[0].text = 'Framework'
            hdr_cells[1].text = 'Descripción'
            hdr_cells[2].text = 'Severidad'
            
            for gap in analysis.get('gaps', []):
                row_cells = gaps_table.add_row().cells
                row_cells[0].text = gap.get('framework', '')
                row_cells[1].text = gap.get('description', '')[:200]  # Limit length
                severity = gap.get('severity', 'medium')
                row_cells[2].text = {'high': 'Alta', 'medium': 'Media', 'low': 'Baja'}.get(severity, 'Media')
        
        doc.add_page_break()
        
        # Detailed Analysis
        doc.add_heading('Análisis Detallado', level=2)
        analysis_text = analysis.get('analysis', '')
        
        # Parse analysis text into structured paragraphs
        lines = analysis_text.split('\\n')
        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
            
            # Section headers (numbered or all caps)
            if re.match(r'^[0-9]+\\.\\s+[A-ZÁÉÍÓÚÑ]', stripped) or re.match(r'^[A-ZÁÉÍÓÚÑ\\s]{10,}$', stripped):
                doc.add_heading(stripped, level=3)
            # Subsection headers
            elif stripped.endswith(':') and len(stripped) < 100:
                p = doc.add_paragraph()
                p.add_run(stripped).bold = True
            # List items
            elif stripped.startswith('- '):
                doc.add_paragraph(stripped[2:], style='List Bullet')
            # Regular text
            else:
                doc.add_paragraph(stripped)
        
        # Footer
        doc.add_paragraph()
        footer = doc.add_paragraph('Assessment AI - Reporte Confidencial')
        footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        # Save to bytes
        file_stream = io.BytesIO()
        doc.save(file_stream)
        file_stream.seek(0)
        
        log_security_event("WORD_EXPORT", {"session_id": session_id})
        
        # Return as downloadable file
        filename = f"Reporte-Assessment-{datetime.now().strftime('%Y-%m-%d')}.docx"
        return StreamingResponse(
            file_stream,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting to Word: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=get_safe_error_message(e, DEBUG_MODE)
        )


# ==================== HELPER FUNCTIONS ====================

def extract_compliance_scores(ai_response: str, frameworks: List[str]) -> dict:
    """Extract compliance scores from AI response"""
    scores = {}
    
    for framework in frameworks:
        patterns = [
            rf"{re.escape(framework)}[:\s]+([0-9]+)%",
            rf"{re.escape(framework)}.*?([0-9]+)%",
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
            framework_pos = ai_response.lower().find(framework.lower())
            if framework_pos != -1:
                snippet = ai_response[framework_pos:framework_pos+100]
                percentage_match = re.search(r'([0-9]+)%', snippet)
                if percentage_match:
                    scores[framework] = int(percentage_match.group(1))
                else:
                    scores[framework] = 75
            else:
                scores[framework] = 75
    
    return scores


def extract_gaps(ai_response: str, frameworks: List[str]) -> List[dict]:
    """Extract gaps from AI response"""
    gaps = []
    lines = ai_response.split('\n')
    in_gaps_section = False
    current_gap = {}
    
    for line in lines:
        stripped = line.strip()
        
        if 'GAPS' in stripped.upper() or 'CRÍTICOS' in stripped.upper():
            in_gaps_section = True
            continue
        
        if in_gaps_section and re.match(r'^[0-9]+\.\s+[A-Z]', stripped) and 'GAP' not in stripped.upper():
            in_gaps_section = False
        
        if in_gaps_section and stripped:
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
    
    if current_gap and "description" in current_gap:
        gaps.append(current_gap)
    
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
    
    return gaps[:15]


# ==================== APP INITIALIZATION ====================

# Include the router
app.include_router(api_router)


@app.on_event("startup")
async def startup_event():
    """Startup tasks"""
    logger.info("Assessment AI API starting up...")
    logger.info(f"Debug mode: {DEBUG_MODE}")
    log_security_event("API_STARTUP", {"debug": DEBUG_MODE})


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    client.close()
    logger.info("Assessment AI API shutting down...")
    log_security_event("API_SHUTDOWN", {})


# ==================== ERROR HANDLERS ====================

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    """Custom 404 handler"""
    return JSONResponse(
        status_code=404,
        content={"detail": "Resource not found"}
    )


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    """Custom 500 handler"""
    logger.error(f"Internal server error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )
