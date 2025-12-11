"""
Authentication module for Assessment AI
Handles Google OAuth, session management, and user authentication
"""

from fastapi import APIRouter, HTTPException, Request, Response, Cookie, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Annotated
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid
import httpx
import logging

logger = logging.getLogger(__name__)

# Database setup
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'assessment_db')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Router
auth_router = APIRouter(prefix="/auth", tags=["authentication"])

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    class Config:
        populate_by_name = True


class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SessionDataResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str]
    session_token: str


# Helper functions
async def get_current_user_from_token(session_token: str) -> Optional[User]:
    """Get user from session token"""
    try:
        # Find session
        session = await db.user_sessions.find_one({
            "session_token": session_token,
            "expires_at": {"$gt": datetime.now(timezone.utc)}
        })
        
        if not session:
            logger.warning(f"Session not found or expired for token: {session_token[:10]}...")
            return None
        
        # Find user
        user_doc = await db.users.find_one({"id": session["user_id"]})
        if not user_doc:
            logger.warning(f"User not found for session user_id: {session['user_id']}")
            return None
        
        # Remove MongoDB's _id
        user_doc.pop("_id", None)
        return User(**user_doc)
        
    except Exception as e:
        logger.error(f"Error getting user from token: {str(e)}")
        return None


async def get_current_user(
    request: Request,
    session_token: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None)
) -> User:
    """
    Get current authenticated user from cookie or Authorization header
    Priority: Cookie > Authorization header
    """
    token = None
    
    # Try cookie first
    if session_token:
        token = session_token
        logger.info("Using session token from cookie")
    # Fallback to Authorization header
    elif authorization:
        if authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "")
            logger.info("Using session token from Authorization header")
        else:
            token = authorization
    
    if not token:
        logger.warning("No session token provided")
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user = await get_current_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    return user


async def create_or_get_user(email: str, name: str, picture: Optional[str] = None) -> User:
    """Create new user or get existing user by email"""
    # Check if user exists
    existing_user = await db.users.find_one({"email": email})
    
    if existing_user:
        logger.info(f"User already exists: {email}")
        existing_user.pop("_id", None)
        return User(**existing_user)
    
    # Create new user
    new_user = User(
        email=email,
        name=name,
        picture=picture
    )
    
    await db.users.insert_one(new_user.dict())
    logger.info(f"Created new user: {email}")
    return new_user


async def create_session(user_id: str) -> str:
    """Create new session for user"""
    session_token = f"session_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session = UserSession(
        user_id=user_id,
        session_token=session_token,
        expires_at=expires_at
    )
    
    await db.user_sessions.insert_one(session.dict())
    logger.info(f"Created session for user: {user_id}")
    return session_token


# Routes
@auth_router.post("/session-data")
async def process_session_id(
    request: Request,
    response: Response,
    x_session_id: str = Header(..., alias="X-Session-ID")
):
    """
    Process session ID from Emergent Auth and create local session
    """
    # Get auth API URL from environment
    auth_api_url = os.getenv('AUTH_API_URL', 'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data')
    
    try:
        # Call Emergent Auth API to get user data
        async with httpx.AsyncClient() as client:
            logger.info(f"Calling Emergent Auth API: {auth_api_url}")
            auth_response = await client.get(
                auth_api_url,
                headers={"X-Session-ID": x_session_id},
                timeout=10.0
            )
            
            if auth_response.status_code != 200:
                logger.error(f"Emergent Auth API error: {auth_response.status_code}")
                raise HTTPException(status_code=401, detail="Invalid session ID")
            
            user_data = auth_response.json()
            logger.info(f"Received user data from Emergent Auth: {user_data.get('email')}")
        
        # Create or get user
        user = await create_or_get_user(
            email=user_data["email"],
            name=user_data["name"],
            picture=user_data.get("picture")
        )
        
        # Create session
        session_token = await create_session(user.id)
        
        # Set httpOnly cookie
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=False,  # Set to True in production with HTTPS
            samesite="lax",
            max_age=7 * 24 * 60 * 60,  # 7 days
            path="/"
        )
        
        return SessionDataResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            picture=user.picture,
            session_token=session_token
        )
        
    except httpx.RequestError as e:
        logger.error(f"Error calling Emergent Auth API: {str(e)}")
        raise HTTPException(status_code=503, detail="Authentication service unavailable")
    except Exception as e:
        logger.error(f"Error processing session ID: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@auth_router.get("/me")
async def get_current_user_info(
    current_user: User = Annotated[User, get_current_user]
):
    """Get current authenticated user info"""
    return current_user


@auth_router.post("/logout")
async def logout(
    response: Response,
    session_token: Optional[str] = Cookie(None)
):
    """Logout user and invalidate session"""
    if session_token:
        # Delete session from database
        result = await db.user_sessions.delete_one({"session_token": session_token})
        logger.info(f"Deleted {result.deleted_count} session(s)")
    
    # Clear cookie
    response.delete_cookie(key="session_token", path="/")
    
    return {"message": "Logged out successfully"}


@auth_router.get("/check")
async def check_auth(
    session_token: Optional[str] = Cookie(None)
):
    """Check if user is authenticated (without raising error)"""
    if not session_token:
        return {"authenticated": False}
    
    user = await get_current_user_from_token(session_token)
    if not user:
        return {"authenticated": False}
    
    return {
        "authenticated": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "picture": user.picture
        }
    }
