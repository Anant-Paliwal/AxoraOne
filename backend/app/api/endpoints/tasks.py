from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.core.supabase import supabase_admin
from app.api.dependencies import get_current_user
from app.services.notification_service import notification_service
from app.services.skill_engine import skill_engine
import asyncio

router = APIRouter()

async def _update_skill_on_task_completion(skill_id: str, task_id: str):
    """Update skill metrics when a task is completed"""
    try:
        # Get current skill data
        skill_response = supabase_admin.table("skills")\
            .select("confidence_score, activation_count")\
            .eq("id", skill_id)\
            .single()\
            .execute()
        
        if not skill_response.data:
            return
        
        current_confidence = skill_response.data.get("confidence_score", 0) or 0
        current_activations = skill_response.data.get("activation_count", 0) or 0
        
        # Boost confidence by 5% for task completion (max 1.0)
        new_confidence = min(1.0, current_confidence + 0.05)
        
        # Update skill
        supabase_admin.table("skills").update({
            "confidence_score": new_confidence,
            "activation_count": current_activations + 1,
            "last_activated_at": datetime.utcnow().isoformat()
        }).eq("id", skill_id).execute()
        
        print(f"✅ Skill {skill_id} updated: confidence {current_confidence:.2f} → {new_confidence:.2f}")
    except Exception as e:
        print(f"Error updating skill on task completion: {e}")

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "todo"
    priority: str = "medium"
    due_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    linked_page_id: Optional[str] = None
    linked_skill_id: Optional[str] = None
    is_recurring: Optional[bool] = False
    workspace_id: Optional[str] = None
    parent_task_id: Optional[str] = None
    event_type: str = "task"  # task, event, birthday, reminder, milestone
    created_from: str = "manual"  # page, skill, ask, manual, calendar
    blocked_reason: Optional[str] = None
    all_day: bool = True
    color: Optional[str] = None
    location: Optional[str] = None
    recurrence_rule: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    linked_page_id: Optional[str] = None
    linked_skill_id: Optional[str] = None
    is_recurring: Optional[bool] = None
    workspace_id: Optional[str] = None
    parent_task_id: Optional[str] = None
    event_type: Optional[str] = None
    created_from: Optional[str] = None
    blocked_reason: Optional[str] = None
    all_day: Optional[bool] = None
    color: Optional[str] = None
    location: Optional[str] = None
    recurrence_rule: Optional[str] = None
    order_index: Optional[int] = None

@router.get("")
async def get_tasks(
    workspace_id: Optional[str] = None, 
    event_type: Optional[str] = None,
    parent_task_id: Optional[str] = None,
    include_subtasks: bool = True,
    user_id: str = Depends(get_current_user)
):
    """Get all tasks for a workspace (owner or member)"""
    try:
        # If workspace_id provided, check access and get all workspace tasks
        if workspace_id:
            from app.api.helpers import check_workspace_access
            access = await check_workspace_access(user_id, workspace_id)
            
            if not access["has_access"]:
                raise HTTPException(status_code=403, detail="Not authorized to access this workspace")
            
            # Get all tasks in workspace (not filtered by user_id)
            query = supabase_admin.table("tasks").select("*").eq("workspace_id", workspace_id)
        else:
            # No workspace specified, get user's own tasks
            query = supabase_admin.table("tasks").select("*").eq("user_id", user_id)
        
        if event_type:
            query = query.eq("event_type", event_type)
        if parent_task_id:
            query = query.eq("parent_task_id", parent_task_id)
        elif not include_subtasks:
            query = query.is_("parent_task_id", "null")
        
        query = query.order("order_index", desc=False).order("created_at", desc=True)
        response = query.execute()
        return response.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{task_id}/subtasks")
async def get_subtasks(task_id: str, user_id: str = Depends(get_current_user)):
    """Get all subtasks for a specific task"""
    try:
        response = supabase_admin.table("tasks").select("*").eq("parent_task_id", task_id).eq("user_id", user_id).order("order_index").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
async def create_task(task: TaskCreate, user_id: str = Depends(get_current_user)):
    """Create a new task, event, birthday, or reminder"""
    try:
        print(f"Creating task for user {user_id}")
        print(f"Task data: {task.dict()}")
        
        # Validate workspace access if provided (owner OR member)
        if task.workspace_id:
            from app.api.helpers.workspace_access import check_workspace_access, can_edit
            access = await check_workspace_access(user_id, task.workspace_id)
            
            if not access["has_access"]:
                raise HTTPException(status_code=404, detail="Workspace not found")
            
            # Check if user can edit (member, admin, or owner)
            if not can_edit(access["role"]):
                raise HTTPException(status_code=403, detail="You don't have permission to create tasks in this workspace")
            
            # ✅ CHECK SUBSCRIPTION LIMIT (User-level)
            from app.services.user_subscription_service import UserSubscriptionService
            user_sub_service = UserSubscriptionService(supabase_admin)
            
            # Check user-level limit for tasks
            await user_sub_service.enforce_user_limit(user_id, "max_tasks", 1)
        
        # Convert task data and handle datetime serialization
        task_dict = task.dict()
        for date_field in ['due_date', 'start_date', 'end_date']:
            if task_dict.get(date_field):
                task_dict[date_field] = task_dict[date_field].isoformat()
        
        task_data = {
            "user_id": user_id,
            **task_dict
        }
        print(f"Inserting task data: {task_data}")
        
        response = supabase_admin.table("tasks").insert(task_data).execute()
        
        print(f"Supabase response: {response}")
        
        if not response.data:
            print("ERROR: No data returned from Supabase")
            raise HTTPException(status_code=500, detail="Failed to create task - no data returned")
        
        created_task = response.data[0]
        print(f"Task created successfully: {created_task}")
        
        # ✅ Increment user task usage after successful creation
        if task.workspace_id:
            try:
                await user_sub_service.increment_user_usage(user_id, "max_tasks", 1)
            except Exception as usage_error:
                print(f"Warning: Failed to increment usage (non-fatal): {usage_error}")
        
        # AUTO-LINK to skill if not manually linked
        if not created_task.get("linked_skill_id") and created_task.get("workspace_id"):
            try:
                from app.services.skill_auto_linker import auto_linker
                
                link = await auto_linker.analyze_and_link_task(
                    task_id=created_task["id"],
                    task_title=created_task["title"],
                    task_description=created_task.get("description", ""),
                    workspace_id=created_task["workspace_id"]
                )
                
                if link:
                    # Update task with linked skill
                    supabase_admin.table("tasks").update({
                        "linked_skill_id": link["skill_id"]
                    }).eq("id", created_task["id"]).execute()
                    
                    created_task["linked_skill_id"] = link["skill_id"]
                    print(f"✅ Auto-linked task to skill: {link['skill_name']} ({link['confidence']:.0%} confidence)")
            except Exception as auto_link_error:
                print(f"⚠️ Auto-linking task error (non-fatal): {auto_link_error}")
        
        # Create notification for new task
        try:
            await notification_service.notify_task_created(created_task)
        except Exception as notif_error:
            print(f"Notification error (non-fatal): {notif_error}")
        
        return created_task
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR creating task: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{task_id}/subtasks")
async def create_subtask(task_id: str, task: TaskCreate, user_id: str = Depends(get_current_user)):
    """Create a subtask for a specific task"""
    try:
        # Verify parent task exists and belongs to user
        parent = supabase_admin.table("tasks").select("id").eq("id", task_id).eq("user_id", user_id).execute()
        if not parent.data:
            raise HTTPException(status_code=404, detail="Parent task not found")
        
        task_dict = task.dict()
        task_dict['parent_task_id'] = task_id
        for date_field in ['due_date', 'start_date', 'end_date']:
            if task_dict.get(date_field):
                task_dict[date_field] = task_dict[date_field].isoformat()
        
        task_data = {
            "user_id": user_id,
            **task_dict
        }
        
        response = supabase_admin.table("tasks").insert(task_data).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create subtask")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{task_id}")
async def update_task(task_id: str, task: TaskUpdate, user_id: str = Depends(get_current_user)):
    """Update a task"""
    try:
        # Get the task to check workspace access
        task_check = supabase_admin.table("tasks").select("id, user_id, workspace_id").eq("id", task_id).execute()
        if not task_check.data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        existing_task = task_check.data[0]
        
        # Check if user owns task OR has workspace access
        if existing_task.get("user_id") != user_id:
            if existing_task.get("workspace_id"):
                from app.api.helpers.workspace_access import check_workspace_access, can_edit
                access = await check_workspace_access(user_id, existing_task["workspace_id"])
                if not access["has_access"] or not can_edit(access["role"]):
                    raise HTTPException(status_code=403, detail="Not authorized to update this task")
            else:
                raise HTTPException(status_code=403, detail="Not authorized to update this task")
        
        update_data = {k: v for k, v in task.dict().items() if v is not None}
        
        # Handle datetime serialization
        for date_field in ['due_date', 'start_date', 'end_date']:
            if date_field in update_data and update_data[date_field]:
                update_data[date_field] = update_data[date_field].isoformat()
        
        print(f"Updating task {task_id} with data: {update_data}")
        
        response = supabase_admin.table("tasks").update(update_data).eq("id", task_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        updated_task = response.data[0]
        
        # Update linked skill when task is completed
        if update_data.get('status') == 'completed' and updated_task.get('linked_skill_id'):
            try:
                await _update_skill_on_task_completion(updated_task['linked_skill_id'], task_id)
            except Exception as skill_error:
                print(f"Skill update error (non-fatal): {skill_error}")
        
        # ==================== SKILL ENGINE EVENT PROCESSING ====================
        # Process task events through the advanced skill engine
        workspace_id = existing_task.get('workspace_id')
        if workspace_id:
            try:
                # Determine event type
                event_type = "updated"
                if update_data.get('status') == 'completed':
                    event_type = "completed"
                    # Process completion through skill engine
                    asyncio.create_task(skill_engine.process_task_completion(
                        task_id=task_id,
                        workspace_id=workspace_id,
                        user_id=user_id
                    ))
                elif update_data.get('status') == 'blocked':
                    event_type = "blocked"
                
                # Process general task event
                asyncio.create_task(skill_engine.process_task_event(
                    task_id=task_id,
                    event_type=event_type,
                    workspace_id=workspace_id,
                    user_id=user_id
                ))
                print(f"✅ Skill engine processing task event: {event_type}")
            except Exception as engine_error:
                print(f"⚠️ Skill engine error (non-fatal): {engine_error}")
        # ======================================================================
        
        # TRACK CONTRIBUTION when task completed
        if update_data.get('status') == 'completed' and updated_task.get('linked_skill_id'):
            try:
                from app.services.skill_contribution_tracker import contribution_tracker
                from datetime import datetime
                
                # Calculate if task was completed faster than expected
                created_at = updated_task.get("created_at")
                if created_at:
                    if isinstance(created_at, str):
                        created_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    else:
                        created_date = created_at
                    
                    actual_days = (datetime.utcnow() - created_date.replace(tzinfo=None)).days
                    expected_days = 7  # Default estimate
                    days_saved = max(0, expected_days - actual_days)
                    
                    if days_saved > 0:
                        await contribution_tracker.track_task_accelerated(
                            skill_id=updated_task["linked_skill_id"],
                            task_id=task_id,
                            workspace_id=updated_task.get("workspace_id"),
                            days_saved=days_saved
                        )
                        print(f"✅ Tracked task acceleration: {days_saved} days saved for skill")
            except Exception as contrib_error:
                print(f"⚠️ Contribution tracking error (non-fatal): {contrib_error}")
        
        # Emit signal if task was completed
        if update_data.get('status') in ['completed', 'done'] and existing_task.get('workspace_id'):
            try:
                from app.services.intelligence_engine import intelligence_engine, Signal, SignalType
                await intelligence_engine.emit_signal(Signal(
                    type=SignalType.TASK_COMPLETED,
                    source_id=task_id,
                    source_type="task",
                    workspace_id=existing_task['workspace_id'],
                    user_id=user_id,
                    data=updated_task,
                    priority=7
                ))
            except Exception as signal_error:
                print(f"Intelligence signal error (non-fatal): {signal_error}")
        
        # Emit signal if task became blocked
        if update_data.get('status') == 'blocked' and existing_task.get('workspace_id'):
            try:
                from app.services.intelligence_engine import intelligence_engine, Signal, SignalType
                await intelligence_engine.emit_signal(Signal(
                    type=SignalType.TASK_BLOCKED,
                    source_id=task_id,
                    source_type="task",
                    workspace_id=existing_task['workspace_id'],
                    user_id=user_id,
                    data=updated_task,
                    priority=8
                ))
            except Exception as signal_error:
                print(f"Intelligence signal error (non-fatal): {signal_error}")
        
        return updated_task
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR updating task: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{task_id}")
async def delete_task(task_id: str, user_id: str = Depends(get_current_user)):
    """Delete a task"""
    try:
        # Get the task to check workspace access
        task_check = supabase_admin.table("tasks").select("id, user_id, workspace_id").eq("id", task_id).execute()
        if not task_check.data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        existing_task = task_check.data[0]
        
        # Check if user owns task OR is workspace admin/owner
        if existing_task.get("user_id") != user_id:
            if existing_task.get("workspace_id"):
                from app.api.helpers.workspace_access import check_workspace_access, can_admin
                access = await check_workspace_access(user_id, existing_task["workspace_id"])
                if not access["has_access"] or not can_admin(access["role"]):
                    raise HTTPException(status_code=403, detail="Not authorized to delete this task")
            else:
                raise HTTPException(status_code=403, detail="Not authorized to delete this task")
        
        response = supabase_admin.table("tasks").delete().eq("id", task_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Task not found")
        return {"message": "Task deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
