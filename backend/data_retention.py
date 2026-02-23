"""
Data Retention and Cleanup Service
Manages automatic deletion of expired sessions according to retention policies
"""

import asyncio
import os
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

# MongoDB connection
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'assessment_db')


async def cleanup_expired_sessions():
    """
    Delete sessions that have exceeded their retention period
    This runs as a scheduled job
    """
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        now = datetime.now(timezone.utc)
        
        # Find sessions that have expired
        expired_sessions = await db.sessions.find({
            "expires_at": {"$lte": now, "$ne": None}
        }).to_list(None)
        
        if not expired_sessions:
            logger.info("No expired sessions found")
            return
        
        logger.info(f"Found {len(expired_sessions)} expired sessions")
        
        for session in expired_sessions:
            session_id = session.get('id')
            
            # Delete associated analysis results
            deleted_analysis = await db.analysis_results.delete_many({
                "session_id": session_id
            })
            logger.info(f"Deleted {deleted_analysis.deleted_count} analysis results for session {session_id}")
            
            # Delete uploaded files metadata
            deleted_files = await db.uploaded_files.delete_many({
                "session_id": session_id
            })
            logger.info(f"Deleted {deleted_files.deleted_count} files for session {session_id}")
            
            # Delete the session itself
            await db.sessions.delete_one({"id": session_id})
            logger.info(f"Deleted session {session_id}")
        
        logger.info(f"Cleanup completed: {len(expired_sessions)} sessions and associated data deleted")
        
    except Exception as e:
        logger.error(f"Error during cleanup: {str(e)}")
    finally:
        client.close()


async def calculate_expiration_date(retention_policy: str, created_at: datetime) -> datetime:
    """
    Calculate expiration date based on retention policy
    
    Args:
        retention_policy: "none", "72h", or "permanent"
        created_at: Session creation timestamp
        
    Returns:
        Expiration datetime or None for permanent retention
    """
    if retention_policy == "none":
        # Immediate expiration (delete right after use)
        return created_at + timedelta(hours=1)
    elif retention_policy == "72h":
        return created_at + timedelta(hours=72)
    elif retention_policy == "permanent":
        return None
    else:
        # Default to 72 hours
        return created_at + timedelta(hours=72)


async def update_session_expiration(session_id: str, retention_policy: str):
    """
    Update a session's expiration date based on retention policy
    
    Args:
        session_id: ID of the session
        retention_policy: New retention policy
    """
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
        if not session:
            logger.warning(f"Session {session_id} not found")
            return
        
        created_at = session.get('created_at')
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        
        expires_at = await calculate_expiration_date(retention_policy, created_at)
        
        await db.sessions.update_one(
            {"id": session_id},
            {
                "$set": {
                    "retention_policy": retention_policy,
                    "expires_at": expires_at
                }
            }
        )
        
        logger.info(f"Updated session {session_id} with retention policy '{retention_policy}', expires_at: {expires_at}")
        
    except Exception as e:
        logger.error(f"Error updating session expiration: {str(e)}")
    finally:
        client.close()


async def cleanup_job():
    """
    Main cleanup job that runs periodically
    Recommended: Run every hour via cron or scheduler
    """
    logger.info("Starting scheduled cleanup job...")
    await cleanup_expired_sessions()
    logger.info("Cleanup job completed")


if __name__ == "__main__":
    # Run cleanup once
    asyncio.run(cleanup_job())
