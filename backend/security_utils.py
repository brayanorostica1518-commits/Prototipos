"""
Security utilities module for input validation, sanitization and security checks
"""

import re
import bleach
from typing import Optional, List, Dict
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# ==================== INPUT SANITIZATION ====================

def sanitize_text(text: str, max_length: int = 50000) -> str:
    """
    Sanitize text input to prevent XSS and injection attacks
    
    Args:
        text: Input text to sanitize
        max_length: Maximum allowed length
        
    Returns:
        Sanitized text
    """
    if not text:
        return ""
    
    # Trim to max length
    text = text[:max_length]
    
    # Remove any HTML tags and potentially dangerous content
    allowed_tags = []  # No HTML allowed in plain text
    cleaned = bleach.clean(text, tags=allowed_tags, strip=True)
    
    # Remove null bytes
    cleaned = cleaned.replace('\x00', '')
    
    return cleaned.strip()


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent directory traversal attacks
    
    Args:
        filename: Original filename
        
    Returns:
        Sanitized filename
    """
    # Remove path components
    filename = Path(filename).name
    
    # Remove any characters that aren't alphanumeric, dash, underscore or dot
    filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
    
    # Prevent hidden files
    if filename.startswith('.'):
        filename = '_' + filename
    
    # Limit length
    if len(filename) > 255:
        name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
        filename = name[:250] + ('.' + ext if ext else '')
    
    return filename


def validate_uuid(uuid_string: str) -> bool:
    """
    Validate UUID format
    
    Args:
        uuid_string: String to validate as UUID
        
    Returns:
        True if valid UUID format
    """
    uuid_pattern = re.compile(
        r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
        re.IGNORECASE
    )
    return bool(uuid_pattern.match(uuid_string))


# ==================== FILE VALIDATION ====================

# Allowed file types with their magic numbers
ALLOWED_FILE_SIGNATURES = {
    'application/pdf': [b'%PDF'],
    'text/plain': [],  # Text files don't have reliable magic numbers
    'text/csv': [],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
        b'PK\x03\x04'  # ZIP format (xlsx is ZIP)
    ],
    'application/vnd.ms-excel': [
        b'\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1'  # OLE format
    ],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
        b'PK\x03\x04'  # ZIP format (docx is ZIP)
    ],
    'application/msword': [
        b'\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1'  # OLE format
    ]
}

ALLOWED_EXTENSIONS = {
    '.pdf', '.txt', '.csv', '.xlsx', '.xls', '.docx', '.doc'
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


def validate_file_type(file_path: Path) -> bool:
    """
    Validate file type using magic numbers (file signature)
    
    Args:
        file_path: Path to file to validate
        
    Returns:
        True if file type is allowed
    """
    try:
        # Check extension
        if file_path.suffix.lower() not in ALLOWED_EXTENSIONS:
            logger.warning(f"Invalid file extension: {file_path.suffix}")
            return False
        
        # Check file size
        if file_path.stat().st_size > MAX_FILE_SIZE:
            logger.warning(f"File too large: {file_path.stat().st_size} bytes")
            return False
        
        # For text/csv, we can't reliably check magic numbers
        if file_path.suffix.lower() in {'.txt', '.csv'}:
            return True
        
        # Check magic number for binary files
        with open(file_path, 'rb') as f:
            file_start = f.read(8)
        
        # PDF check
        if file_path.suffix.lower() == '.pdf':
            return file_start.startswith(b'%PDF')
        
        # Office documents (ZIP-based or OLE)
        if file_path.suffix.lower() in {'.xlsx', '.docx'}:
            return file_start.startswith(b'PK\x03\x04')
        
        if file_path.suffix.lower() in {'.xls', '.doc'}:
            return file_start.startswith(b'\xD0\xCF\x11\xE0')
        
        return True
        
    except Exception as e:
        logger.error(f"Error validating file type: {str(e)}")
        return False


def validate_file_content_safety(file_path: Path) -> bool:
    """
    Additional safety checks for file content
    
    Args:
        file_path: Path to file
        
    Returns:
        True if file passes safety checks
    """
    try:
        # Check for executable content in filename
        dangerous_extensions = {
            '.exe', '.bat', '.cmd', '.sh', '.ps1', '.js', '.vbs', 
            '.app', '.deb', '.rpm', '.dmg', '.pkg'
        }
        
        if file_path.suffix.lower() in dangerous_extensions:
            logger.warning(f"Dangerous file extension detected: {file_path.suffix}")
            return False
        
        # For text-based files, check for suspicious content
        if file_path.suffix.lower() in {'.txt', '.csv'}:
            with open(file_path, 'rb') as f:
                content = f.read(1024)  # Check first 1KB
                
                # Look for executable signatures
                dangerous_signatures = [
                    b'MZ',  # Windows executable
                    b'\x7fELF',  # Linux executable
                    b'#!',  # Script shebang
                ]
                
                for sig in dangerous_signatures:
                    if sig in content:
                        logger.warning(f"Suspicious content detected in {file_path}")
                        return False
        
        return True
        
    except Exception as e:
        logger.error(f"Error checking file safety: {str(e)}")
        return False


# ==================== DATA VALIDATION ====================

def validate_frameworks(frameworks: List[str]) -> bool:
    """
    Validate framework selections
    
    Args:
        frameworks: List of framework names
        
    Returns:
        True if all frameworks are valid
    """
    VALID_FRAMEWORKS = {
        "ISO 27001", "ISO 9001", "ISO 45001", "NIST CSF", "COBIT",
        "SOC 2", "GDPR", "PCI DSS", "OWASP Top 10", "OWASP ASVS",
        "OWASP Mobile", "MITRE ATT&CK", "CIS Controls", "SANS Top 25"
    }
    
    if not frameworks or len(frameworks) > 10:
        return False
    
    return all(fw in VALID_FRAMEWORKS for fw in frameworks)


def validate_session_id(session_id: str) -> bool:
    """
    Validate session ID format
    
    Args:
        session_id: Session ID to validate
        
    Returns:
        True if valid
    """
    return validate_uuid(session_id)


# ==================== SECURITY HEADERS ====================

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Content-Security-Policy": (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://fonts.googleapis.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https:; "
        "frame-ancestors 'none';"
    )
}


# ==================== ERROR MESSAGES ====================

def get_safe_error_message(error: Exception, debug: bool = False) -> str:
    """
    Get safe error message to send to client
    
    Args:
        error: Exception object
        debug: If True, include detailed error (dev mode only)
        
    Returns:
        Safe error message
    """
    if debug:
        return str(error)
    
    # Generic messages for production
    error_messages = {
        "ValueError": "Invalid input provided",
        "FileNotFoundError": "Resource not found",
        "PermissionError": "Access denied",
        "TimeoutError": "Request timeout",
    }
    
    error_type = type(error).__name__
    return error_messages.get(error_type, "An error occurred processing your request")


# ==================== LOGGING ====================

def log_security_event(event_type: str, details: Dict, severity: str = "INFO"):
    """
    Log security-related events
    
    Args:
        event_type: Type of security event
        details: Event details
        severity: Log severity (INFO, WARNING, ERROR)
    """
    log_message = f"SECURITY_EVENT: {event_type} - {details}"
    
    if severity == "ERROR":
        logger.error(log_message)
    elif severity == "WARNING":
        logger.warning(log_message)
    else:
        logger.info(log_message)
