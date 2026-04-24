from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.core.supabase import supabase_admin
from app.api.dependencies import get_current_user
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Pydantic models
class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correctAnswer: int
    explanation: Optional[str] = None

class CreateQuizRequest(BaseModel):
    workspace_id: str
    title: str
    description: Optional[str] = None
    source_page_id: Optional[str] = None
    linked_skill_id: Optional[str] = None
    questions: List[QuizQuestion]

class QuizAttemptRequest(BaseModel):
    quiz_id: str
    score: int
    total_questions: int

class FlashcardItem(BaseModel):
    front: str
    back: str
    category: Optional[str] = None

class CreateFlashcardDeckRequest(BaseModel):
    workspace_id: str
    title: str
    description: Optional[str] = None
    source_page_id: Optional[str] = None
    linked_skill_id: Optional[str] = None
    cards: List[FlashcardItem]

class FlashcardProgressUpdate(BaseModel):
    deck_id: str
    card_index: int
    status: str  # 'known', 'unknown', 'learning'

# Quiz endpoints
@router.post("/quizzes")
async def create_quiz(request: CreateQuizRequest, user_id: str = Depends(get_current_user)):
    """Create a new quiz"""
    try:
        # Convert questions to JSON format
        questions_json = [q.dict() for q in request.questions]
        
        response = supabase_admin.table("quizzes").insert({
            "user_id": user_id,
            "workspace_id": request.workspace_id,
            "title": request.title,
            "description": request.description,
            "source_page_id": request.source_page_id,
            "linked_skill_id": request.linked_skill_id,
            "questions": questions_json
        }).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create quiz")
        
        return response.data[0]
    except Exception as e:
        logger.error(f"Error creating quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/quizzes")
async def get_quizzes(
    workspace_id: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """Get all quizzes for a user, optionally filtered by workspace"""
    try:
        query = supabase_admin.table("quizzes").select("*").eq("user_id", user_id)
        
        if workspace_id:
            query = query.eq("workspace_id", workspace_id)
        
        response = query.order("created_at", desc=True).execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error fetching quizzes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/quizzes")
async def get_quizzes(
    workspace_id: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """Get all quizzes for the current user, optionally filtered by workspace"""
    try:
        query = supabase_admin.table("quizzes").select("*").eq("user_id", user_id)
        
        if workspace_id:
            query = query.eq("workspace_id", workspace_id)
        
        response = query.order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/flashcard-decks")
async def get_flashcard_decks(
    workspace_id: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """Get all flashcard decks for the current user, optionally filtered by workspace"""
    try:
        query = supabase_admin.table("flashcard_decks").select("*").eq("user_id", user_id)
        
        if workspace_id:
            query = query.eq("workspace_id", workspace_id)
        
        response = query.order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_learning_stats(
    workspace_id: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """Get learning statistics for the current user"""
    try:
        # Get quizzes
        quiz_query = supabase_admin.table("quizzes").select("*").eq("user_id", user_id)
        if workspace_id:
            quiz_query = quiz_query.eq("workspace_id", workspace_id)
        quizzes = quiz_query.execute().data or []
        
        # Get flashcard decks
        deck_query = supabase_admin.table("flashcard_decks").select("*").eq("user_id", user_id)
        if workspace_id:
            deck_query = deck_query.eq("workspace_id", workspace_id)
        decks = deck_query.execute().data or []
        
        # Calculate stats
        total_quizzes = len(quizzes)
        total_flashcards = len(decks)
        
        # Count completed quizzes (those with attempts)
        quizzes_completed = sum(1 for q in quizzes if q.get("last_attempt"))
        
        # Calculate average score
        scores = [q.get("best_score", 0) for q in quizzes if q.get("best_score") is not None]
        average_score = sum(scores) / len(scores) if scores else 0
        
        # Study streak (placeholder - would need activity tracking)
        study_streak = 0
        
        # Total study time (placeholder)
        total_study_time = 0
        
        return {
            "total_quizzes": total_quizzes,
            "total_flashcards": total_flashcards,
            "quizzes_completed": quizzes_completed,
            "average_score": average_score,
            "study_streak": study_streak,
            "total_study_time": total_study_time
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/quizzes/{quiz_id}")
async def get_quiz(quiz_id: str, user_id: str = Depends(get_current_user)):
    """Get a specific quiz by ID"""
    try:
        response = supabase_admin.table("quizzes").select("*").eq("id", quiz_id).eq("user_id", user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Quiz not found")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/quizzes/attempts")
async def record_quiz_attempt(request: QuizAttemptRequest, user_id: str = Depends(get_current_user)):
    """Record a quiz attempt"""
    try:
        percentage = (request.score / request.total_questions) * 100 if request.total_questions > 0 else 0
        
        response = supabase_admin.table("quiz_attempts").insert({
            "quiz_id": request.quiz_id,
            "user_id": user_id,
            "score": request.score,
            "total_questions": request.total_questions,
            "percentage": percentage
        }).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to record quiz attempt")
        
        return response.data[0]
    except Exception as e:
        logger.error(f"Error recording quiz attempt: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/quizzes/{quiz_id}/attempts")
async def get_quiz_attempts(quiz_id: str, user_id: str = Depends(get_current_user)):
    """Get all attempts for a quiz"""
    try:
        response = supabase_admin.table("quiz_attempts").select("*").eq("quiz_id", quiz_id).eq("user_id", user_id).order("completed_at", desc=True).execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error fetching quiz attempts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/quizzes/{quiz_id}")
async def delete_quiz(quiz_id: str, user_id: str = Depends(get_current_user)):
    """Delete a quiz"""
    try:
        response = supabase_admin.table("quizzes").delete().eq("id", quiz_id).eq("user_id", user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Quiz not found")
        
        return {"message": "Quiz deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Flashcard endpoints
@router.post("/flashcards")
async def create_flashcard_deck(request: CreateFlashcardDeckRequest, user_id: str = Depends(get_current_user)):
    """Create a new flashcard deck"""
    try:
        # Convert cards to JSON format
        cards_json = [c.dict() for c in request.cards]
        
        response = supabase_admin.table("flashcard_decks").insert({
            "user_id": user_id,
            "workspace_id": request.workspace_id,
            "title": request.title,
            "description": request.description,
            "source_page_id": request.source_page_id,
            "linked_skill_id": request.linked_skill_id,
            "cards": cards_json
        }).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create flashcard deck")
        
        return response.data[0]
    except Exception as e:
        logger.error(f"Error creating flashcard deck: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/flashcards")
async def get_flashcard_decks(
    workspace_id: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """Get all flashcard decks for a user, optionally filtered by workspace"""
    try:
        query = supabase_admin.table("flashcard_decks").select("*").eq("user_id", user_id)
        
        if workspace_id:
            query = query.eq("workspace_id", workspace_id)
        
        response = query.order("created_at", desc=True).execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error fetching flashcard decks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/flashcards/{deck_id}")
async def get_flashcard_deck(deck_id: str, user_id: str = Depends(get_current_user)):
    """Get a specific flashcard deck by ID"""
    try:
        response = supabase_admin.table("flashcard_decks").select("*").eq("id", deck_id).eq("user_id", user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Flashcard deck not found")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching flashcard deck: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/flashcards/progress")
async def update_flashcard_progress(request: FlashcardProgressUpdate, user_id: str = Depends(get_current_user)):
    """Update progress for a flashcard"""
    try:
        # Upsert progress
        response = supabase_admin.table("flashcard_progress").upsert({
            "deck_id": request.deck_id,
            "user_id": user_id,
            "card_index": request.card_index,
            "status": request.status,
            "review_count": 1
        }, on_conflict="deck_id,user_id,card_index").execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to update flashcard progress")
        
        return response.data[0]
    except Exception as e:
        logger.error(f"Error updating flashcard progress: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/flashcards/{deck_id}/progress")
async def get_flashcard_progress(deck_id: str, user_id: str = Depends(get_current_user)):
    """Get progress for a flashcard deck"""
    try:
        response = supabase_admin.table("flashcard_progress").select("*").eq("deck_id", deck_id).eq("user_id", user_id).execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error fetching flashcard progress: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/flashcards/{deck_id}")
async def delete_flashcard_deck(deck_id: str, user_id: str = Depends(get_current_user)):
    """Delete a flashcard deck"""
    try:
        response = supabase_admin.table("flashcard_decks").delete().eq("id", deck_id).eq("user_id", user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Flashcard deck not found")
        
        return {"message": "Flashcard deck deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting flashcard deck: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Get learning objects by page
@router.get("/pages/{page_id}/learning-objects")
async def get_page_learning_objects(page_id: str, user_id: str = Depends(get_current_user)):
    """Get all learning objects (quizzes, flashcards) for a specific page"""
    try:
        # Get quizzes
        quizzes_response = supabase_admin.table("quizzes").select("*").eq("source_page_id", page_id).eq("user_id", user_id).execute()
        
        # Get flashcards
        flashcards_response = supabase_admin.table("flashcard_decks").select("*").eq("source_page_id", page_id).eq("user_id", user_id).execute()
        
        return {
            "quizzes": quizzes_response.data or [],
            "flashcards": flashcards_response.data or []
        }
    except Exception as e:
        logger.error(f"Error fetching page learning objects: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Get learning objects by skill
@router.get("/skills/{skill_id}/learning-objects")
async def get_skill_learning_objects(skill_id: str, user_id: str = Depends(get_current_user)):
    """Get all learning objects (quizzes, flashcards) for a specific skill"""
    try:
        # Get quizzes
        quizzes_response = supabase_admin.table("quizzes").select("*").eq("linked_skill_id", skill_id).eq("user_id", user_id).execute()
        
        # Get flashcards
        flashcards_response = supabase_admin.table("flashcard_decks").select("*").eq("linked_skill_id", skill_id).eq("user_id", user_id).execute()
        
        return {
            "quizzes": quizzes_response.data or [],
            "flashcards": flashcards_response.data or []
        }
    except Exception as e:
        logger.error(f"Error fetching skill learning objects: {e}")
        raise HTTPException(status_code=500, detail=str(e))
