"""
AI Feedback API Endpoints
Handles user feedback for AI responses
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging

from app.api.dependencies import get_current_user
from app.services.feedback_learning import feedback_learning_service

logger = logging.getLogger(__name__)

router = APIRouter()


class FeedbackRequest(BaseModel):
    """Request model for submitting feedback"""
    workspace_id: str
    preview_id: str
    query: str
    mode: str
    rating: str  # "helpful" or "not_helpful"
    comment: Optional[str] = None
    executed_actions: Optional[List[Dict[str, Any]]] = None


class FeedbackResponse(BaseModel):
    """Response model for feedback submission"""
    success: bool
    feedback_id: Optional[str] = None
    message: str


@router.post("/feedback/submit", response_model=FeedbackResponse)
async def submit_feedback(
    feedback: FeedbackRequest,
    user_id: str = Depends(get_current_user)
):
    """
    Submit feedback for an AI response
    
    - Stores rating (helpful/not_helpful)
    - Captures optional comment
    - Records executed actions
    - Updates learning model
    """
    try:
        # Validate rating
        if feedback.rating not in ["helpful", "not_helpful"]:
            raise HTTPException(
                status_code=400,
                detail="Rating must be 'helpful' or 'not_helpful'"
            )
        
        # Store feedback
        result = await feedback_learning_service.store_feedback(
            user_id=user_id,
            workspace_id=feedback.workspace_id,
            preview_id=feedback.preview_id,
            query=feedback.query,
            mode=feedback.mode,
            rating=feedback.rating,
            comment=feedback.comment,
            executed_actions=feedback.executed_actions
        )
        
        if result.get("success"):
            return FeedbackResponse(
                success=True,
                feedback_id=result.get("feedback_id"),
                message="Thank you for your feedback! This helps improve the AI."
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to store feedback: {result.get('error')}"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting feedback: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error submitting feedback: {str(e)}"
        )


@router.get("/feedback/insights/{workspace_id}")
async def get_feedback_insights(
    workspace_id: str,
    days_back: int = 30,
    user_id: str = Depends(get_current_user)
):
    """
    Get aggregated feedback insights for a workspace
    
    Returns:
    - Success rate
    - Common failure patterns
    - Successful response types
    - Performance by mode
    """
    try:
        insights = await feedback_learning_service.analyze_feedback(
            workspace_id=workspace_id,
            days_back=days_back
        )
        
        return {
            "success": True,
            "insights": insights
        }
    
    except Exception as e:
        logger.error(f"Error getting feedback insights: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting insights: {str(e)}"
        )


@router.get("/feedback/preferences")
async def get_user_preferences(
    workspace_id: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """
    Get learned user preferences from feedback history
    
    Returns:
    - Preferred mode
    - Response style preferences
    - Common topics
    """
    try:
        preferences = await feedback_learning_service.get_user_preferences(
            user_id=user_id,
            workspace_id=workspace_id
        )
        
        return {
            "success": True,
            "preferences": preferences
        }
    
    except Exception as e:
        logger.error(f"Error getting user preferences: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting preferences: {str(e)}"
        )


@router.get("/feedback/history")
async def get_feedback_history(
    workspace_id: Optional[str] = None,
    limit: int = 50,
    user_id: str = Depends(get_current_user)
):
    """
    Get user's feedback history
    """
    try:
        from app.core.supabase import supabase_admin
        
        query = supabase_admin.table("ai_action_feedback")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .limit(limit)
        
        if workspace_id:
            query = query.eq("workspace_id", workspace_id)
        
        response = query.execute()
        
        return {
            "success": True,
            "feedback_history": response.data,
            "total": len(response.data)
        }
    
    except Exception as e:
        logger.error(f"Error getting feedback history: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting history: {str(e)}"
        )
