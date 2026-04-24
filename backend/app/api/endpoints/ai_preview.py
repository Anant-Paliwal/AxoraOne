"""
AI Preview and Execute Endpoints

Implements the human verification loop for BUILD and PLAN modes:
1. /preview - Generate preview of actions without executing
2. /execute - Execute confirmed actions from preview
3. /undo - Undo executed actions
4. /feedback - Record user feedback on actions
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, validator
from typing import List, Dict, Any, Optional
from app.services.ai_agent import ai_agent_service, MAX_QUERY_LENGTH
from app.api.dependencies import get_current_user
from app.core.supabase import supabase_admin
from datetime import datetime
import uuid
import logging
import json

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory store for previews (in production, use Redis or database)
preview_store: Dict[str, Dict[str, Any]] = {}


class PreviewRequest(BaseModel):
    query: str
    mode: str = "agent"  # agent or plan
    workspace_id: Optional[str] = None
    session_id: Optional[str] = None
    model: Optional[str] = None
    mentioned_items: Optional[List[Dict[str, str]]] = None
    enabled_sources: Optional[List[str]] = None
    
    @validator('query')
    def validate_query_length(cls, v):
        if len(v) > MAX_QUERY_LENGTH:
            raise ValueError(f'Query must be {MAX_QUERY_LENGTH} characters or less')
        if len(v.strip()) == 0:
            raise ValueError('Query cannot be empty')
        return v.strip()
    
    @validator('mode')
    def validate_mode(cls, v):
        valid_modes = ['agent', 'plan']
        if v not in valid_modes:
            raise ValueError(f'Preview mode must be one of: {", ".join(valid_modes)}')
        return v


class PreviewAction(BaseModel):
    id: str
    type: str  # page, skill, task, quiz, flashcard
    operation: str  # create, update, delete
    title: str
    preview: str
    data: Dict[str, Any]
    selected: bool = True


class PreviewResponse(BaseModel):
    preview_id: str
    mode: str
    query: str
    response: str
    actions: List[PreviewAction]
    sources: List[Dict[str, Any]]
    suggested_actions: List[Any]
    expires_at: str


class ExecuteRequest(BaseModel):
    preview_id: str
    selected_actions: List[str]  # List of action IDs to execute


class ExecuteResult(BaseModel):
    id: str
    type: str
    title: str
    operation: str
    success: bool
    created_id: Optional[str] = None
    error: Optional[str] = None


class ExecuteResponse(BaseModel):
    success: bool
    executed_actions: List[ExecuteResult]
    message: str


class UndoRequest(BaseModel):
    preview_id: str
    action_ids: Optional[List[str]] = None  # If None, undo all


class FeedbackRequest(BaseModel):
    preview_id: str
    rating: str  # helpful, not_helpful
    comment: Optional[str] = None
    executed_actions: List[str]


@router.post("/preview", response_model=PreviewResponse)
async def generate_preview(
    request: PreviewRequest,
    user_id: str = Depends(get_current_user)
):
    """
    Generate a preview of actions without executing them.
    Returns a preview_id that can be used to execute confirmed actions.
    """
    try:
        logger.info(f"Generating preview for mode={request.mode}, query={request.query[:50]}...")
        
        # Process query through AI agent in preview mode
        result = await ai_agent_service.process_query_preview(
            query=request.query,
            user_id=user_id,
            mode=request.mode,
            workspace_id=request.workspace_id,
            model=request.model,
            mentioned_items=request.mentioned_items,
            enabled_sources=request.enabled_sources
        )
        
        # Generate preview ID
        preview_id = str(uuid.uuid4())
        
        # Extract actions from result
        actions = []
        action_data = result.get("planned_actions", {})
        
        # Process pages
        for page in action_data.get("pages", []):
            action_id = str(uuid.uuid4())
            actions.append(PreviewAction(
                id=action_id,
                type="page",
                operation="create",
                title=page.get("title", "Untitled Page"),
                preview=page.get("content", "")[:200] + "..." if len(page.get("content", "")) > 200 else page.get("content", ""),
                data=page,
                selected=True
            ))
        
        # Process skills
        for skill in action_data.get("skills", []):
            action_id = str(uuid.uuid4())
            actions.append(PreviewAction(
                id=action_id,
                type="skill",
                operation="create",
                title=skill.get("name", "Untitled Skill"),
                preview=f"Level: {skill.get('level', 'Beginner')} - {skill.get('description', '')[:100]}",
                data=skill,
                selected=True
            ))
        
        # Process tasks
        for task in action_data.get("tasks", []):
            action_id = str(uuid.uuid4())
            actions.append(PreviewAction(
                id=action_id,
                type="task",
                operation="create",
                title=task.get("title", "Untitled Task"),
                preview=f"Priority: {task.get('priority', 'medium')} - {task.get('description', '')[:100]}",
                data=task,
                selected=True
            ))
        
        # Process quizzes
        for quiz in action_data.get("quizzes", []):
            action_id = str(uuid.uuid4())
            questions = quiz.get("questions", [])
            actions.append(PreviewAction(
                id=action_id,
                type="quiz",
                operation="create",
                title=quiz.get("title", "Untitled Quiz"),
                preview=f"{len(questions)} questions",
                data=quiz,
                selected=True
            ))
        
        # Process flashcards
        for deck in action_data.get("flashcards", []):
            action_id = str(uuid.uuid4())
            cards = deck.get("cards", [])
            actions.append(PreviewAction(
                id=action_id,
                type="flashcard",
                operation="create",
                title=deck.get("title", "Untitled Deck"),
                preview=f"{len(cards)} cards",
                data=deck,
                selected=True
            ))
        
        # Store preview for later execution
        expires_at = datetime.utcnow().isoformat() + "Z"
        preview_store[preview_id] = {
            "user_id": user_id,
            "workspace_id": request.workspace_id,
            "mode": request.mode,
            "query": request.query,
            "response": result.get("response", ""),
            "actions": [a.dict() for a in actions],
            "sources": result.get("sources", []),
            "suggested_actions": result.get("suggested_actions", []),
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": expires_at,
            "executed": False,
            "executed_results": []
        }
        
        logger.info(f"Preview generated: {preview_id} with {len(actions)} actions")
        
        return PreviewResponse(
            preview_id=preview_id,
            mode=request.mode,
            query=request.query,
            response=result.get("response", ""),
            actions=actions,
            sources=result.get("sources", []),
            suggested_actions=result.get("suggested_actions", []),
            expires_at=expires_at
        )
        
    except Exception as e:
        logger.error(f"Preview generation error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating preview: {str(e)}")


@router.post("/execute", response_model=ExecuteResponse)
async def execute_actions(
    request: ExecuteRequest,
    user_id: str = Depends(get_current_user)
):
    """
    Execute confirmed actions from a preview.
    Only executes actions that were selected by the user.
    """
    try:
        # Get preview from store
        preview = preview_store.get(request.preview_id)
        if not preview:
            raise HTTPException(status_code=404, detail="Preview not found or expired")
        
        # Verify user owns this preview
        if preview["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to execute this preview")
        
        # Check if already executed
        if preview.get("executed"):
            raise HTTPException(status_code=400, detail="Preview already executed")
        
        workspace_id = preview["workspace_id"]
        executed_results: List[ExecuteResult] = []
        
        # Filter actions to only selected ones
        selected_action_ids = set(request.selected_actions)
        actions_to_execute = [
            a for a in preview["actions"] 
            if a["id"] in selected_action_ids
        ]
        
        logger.info(f"Executing {len(actions_to_execute)} of {len(preview['actions'])} actions")
        
        for action in actions_to_execute:
            try:
                created_id = None
                
                if action["type"] == "page":
                    # Create page
                    page_data = {
                        "user_id": user_id,
                        "workspace_id": workspace_id,
                        "title": action["data"].get("title", "Untitled"),
                        "content": action["data"].get("content", ""),
                        "icon": action["data"].get("icon", "📄"),
                        "tags": action["data"].get("tags", [])
                    }
                    result = supabase_admin.table("pages").insert(page_data).execute()
                    if result.data:
                        created_id = result.data[0]["id"]
                
                elif action["type"] == "skill":
                    # Create skill
                    skill_data = {
                        "user_id": user_id,
                        "workspace_id": workspace_id,
                        "name": action["data"].get("name", "Untitled"),
                        "level": action["data"].get("level", "Beginner"),
                        "description": action["data"].get("description", "")
                    }
                    result = supabase_admin.table("skills").insert(skill_data).execute()
                    if result.data:
                        created_id = result.data[0]["id"]
                
                elif action["type"] == "task":
                    # Create task
                    task_data = {
                        "user_id": user_id,
                        "workspace_id": workspace_id,
                        "title": action["data"].get("title", "Untitled"),
                        "priority": action["data"].get("priority", "medium"),
                        "status": "todo",
                        "description": action["data"].get("description", "")
                    }
                    if action["data"].get("due_date"):
                        task_data["due_date"] = action["data"]["due_date"]
                    result = supabase_admin.table("tasks").insert(task_data).execute()
                    if result.data:
                        created_id = result.data[0]["id"]
                
                elif action["type"] == "quiz":
                    # Create quiz
                    quiz_data = {
                        "user_id": user_id,
                        "workspace_id": workspace_id,
                        "title": action["data"].get("title", "Untitled Quiz"),
                        "questions": action["data"].get("questions", []),
                        "source_page_id": action["data"].get("source_page_id"),
                        "linked_skill_id": action["data"].get("linked_skill_id")
                    }
                    result = supabase_admin.table("quizzes").insert(quiz_data).execute()
                    if result.data:
                        created_id = result.data[0]["id"]
                
                elif action["type"] == "flashcard":
                    # Create flashcard deck
                    deck_data = {
                        "user_id": user_id,
                        "workspace_id": workspace_id,
                        "title": action["data"].get("title", "Untitled Deck"),
                        "cards": action["data"].get("cards", []),
                        "source_page_id": action["data"].get("source_page_id"),
                        "linked_skill_id": action["data"].get("linked_skill_id")
                    }
                    result = supabase_admin.table("flashcard_decks").insert(deck_data).execute()
                    if result.data:
                        created_id = result.data[0]["id"]
                
                executed_results.append(ExecuteResult(
                    id=action["id"],
                    type=action["type"],
                    title=action["data"].get("title") or action["data"].get("name", "Untitled"),
                    operation=action["operation"],
                    success=True,
                    created_id=created_id
                ))
                
            except Exception as action_error:
                logger.error(f"Failed to execute action {action['id']}: {action_error}")
                executed_results.append(ExecuteResult(
                    id=action["id"],
                    type=action["type"],
                    title=action["data"].get("title") or action["data"].get("name", "Untitled"),
                    operation=action["operation"],
                    success=False,
                    error=str(action_error)
                ))
        
        # Mark preview as executed
        preview["executed"] = True
        preview["executed_results"] = [r.dict() for r in executed_results]
        preview["executed_at"] = datetime.utcnow().isoformat()
        
        success_count = sum(1 for r in executed_results if r.success)
        fail_count = len(executed_results) - success_count
        
        return ExecuteResponse(
            success=fail_count == 0,
            executed_actions=executed_results,
            message=f"Executed {success_count} actions successfully" + (f", {fail_count} failed" if fail_count > 0 else "")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Execute error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error executing actions: {str(e)}")


@router.post("/undo")
async def undo_actions(
    request: UndoRequest,
    user_id: str = Depends(get_current_user)
):
    """
    Undo executed actions from a preview.
    Deletes created items.
    """
    try:
        preview = preview_store.get(request.preview_id)
        if not preview:
            raise HTTPException(status_code=404, detail="Preview not found")
        
        if preview["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        if not preview.get("executed"):
            raise HTTPException(status_code=400, detail="Preview was not executed")
        
        executed_results = preview.get("executed_results", [])
        action_ids_to_undo = set(request.action_ids) if request.action_ids else None
        
        undone_count = 0
        errors = []
        
        for result in executed_results:
            if not result.get("success") or not result.get("created_id"):
                continue
            
            if action_ids_to_undo and result["id"] not in action_ids_to_undo:
                continue
            
            try:
                table_map = {
                    "page": "pages",
                    "skill": "skills",
                    "task": "tasks",
                    "quiz": "quizzes",
                    "flashcard": "flashcard_decks"
                }
                table = table_map.get(result["type"])
                if table:
                    supabase_admin.table(table).delete().eq("id", result["created_id"]).execute()
                    undone_count += 1
            except Exception as undo_error:
                errors.append(f"Failed to undo {result['type']} {result['title']}: {undo_error}")
        
        return {
            "success": len(errors) == 0,
            "undone_count": undone_count,
            "errors": errors,
            "message": f"Undone {undone_count} actions" + (f" with {len(errors)} errors" if errors else "")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Undo error: {e}")
        raise HTTPException(status_code=500, detail=f"Error undoing actions: {str(e)}")


@router.post("/feedback")
async def record_feedback(
    request: FeedbackRequest,
    user_id: str = Depends(get_current_user)
):
    """
    Record user feedback on executed actions.
    Used to improve AI suggestions over time.
    """
    try:
        preview = preview_store.get(request.preview_id)
        
        # Store feedback in database using admin client (bypasses RLS)
        feedback_data = {
            "user_id": user_id,
            "preview_id": request.preview_id,
            "rating": request.rating,
            "comment": request.comment,
            "executed_actions": request.executed_actions,
            "query": preview.get("query") if preview else None,
            "mode": preview.get("mode") if preview else None,
            "workspace_id": preview.get("workspace_id") if preview else None
        }
        
        # Use admin client to insert feedback
        try:
            result = supabase_admin.table("ai_action_feedback").insert(feedback_data).execute()
            logger.info(f"Feedback recorded: {result.data}")
            return {"success": True, "message": "Feedback recorded", "id": result.data[0]["id"] if result.data else None}
        except Exception as db_error:
            logger.error(f"Could not store feedback in database: {db_error}")
            import traceback
            traceback.print_exc()
            return {"success": False, "message": f"Database error: {str(db_error)}"}
        
    except Exception as e:
        logger.error(f"Feedback error: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "message": str(e)}


@router.get("/preview/{preview_id}")
async def get_preview(
    preview_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get a preview by ID"""
    preview = preview_store.get(preview_id)
    if not preview:
        raise HTTPException(status_code=404, detail="Preview not found or expired")
    
    if preview["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return preview


@router.get("/feedback/stats")
async def get_feedback_stats(
    workspace_id: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """
    Get feedback statistics for learning and improvement.
    Shows helpful vs not_helpful ratio and common issues.
    """
    try:
        from app.core.supabase import supabase_admin
        
        # Build query
        query = supabase_admin.table("ai_action_feedback").select("*").eq("user_id", user_id)
        
        if workspace_id:
            query = query.eq("workspace_id", workspace_id)
        
        result = query.order("created_at", desc=True).limit(100).execute()
        
        feedback_list = result.data or []
        
        # Calculate stats
        total = len(feedback_list)
        helpful = sum(1 for f in feedback_list if f.get("rating") == "helpful")
        not_helpful = sum(1 for f in feedback_list if f.get("rating") == "not_helpful")
        
        # Get recent comments for improvement
        recent_comments = [
            {"comment": f.get("comment"), "query": f.get("query"), "mode": f.get("mode")}
            for f in feedback_list 
            if f.get("comment") and f.get("rating") == "not_helpful"
        ][:5]
        
        return {
            "total_feedback": total,
            "helpful": helpful,
            "not_helpful": not_helpful,
            "helpful_rate": round(helpful / total * 100, 1) if total > 0 else 0,
            "recent_issues": recent_comments
        }
        
    except Exception as e:
        logger.error(f"Feedback stats error: {e}")
        return {
            "total_feedback": 0,
            "helpful": 0,
            "not_helpful": 0,
            "helpful_rate": 0,
            "recent_issues": [],
            "error": str(e)
        }
