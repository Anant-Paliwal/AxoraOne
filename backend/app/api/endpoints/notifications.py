from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.core.supabase import supabase_admin
from app.api.dependencies import get_current_user
from app.services.notification_service import notification_service

router = APIRouter()

class NotificationCreate(BaseModel):
    title: str
    message: Optional[str] = None
    type: str = "info"  # info, success, warning, error, task, page, skill, quiz, reminder
    workspace_id: Optional[str] = None
    link: Optional[str] = None
    link_label: Optional[str] = None
    icon: Optional[str] = None
    metadata: Optional[dict] = {}

class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None
    is_archived: Optional[bool] = None

@router.get("")
async def get_notifications(
    user_id: str = Depends(get_current_user),
    workspace_id: Optional[str] = None,
    is_read: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """Get notifications for the current user (includes workspace invitations)"""
    try:
        # Get user's notifications - NOT filtered by workspace_id for global notifications
        query = supabase_admin.table("notifications").select("*").eq("user_id", user_id).eq("is_archived", False)
        
        # Only filter by workspace if specified AND not looking for invitations
        if workspace_id:
            # Include both workspace-specific and global (null workspace_id) notifications
            query = query.or_(f"workspace_id.eq.{workspace_id},workspace_id.is.null")
        
        if is_read is not None:
            query = query.eq("is_read", is_read)
        
        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
        
        response = query.execute()
        return response.data
    except Exception as e:
        print(f"Error fetching notifications: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/unread-count")
async def get_unread_count(
    user_id: str = Depends(get_current_user),
    workspace_id: Optional[str] = None
):
    """Get count of unread notifications"""
    try:
        query = supabase_admin.table("notifications").select("id", count="exact").eq("user_id", user_id).eq("is_read", False).eq("is_archived", False)
        
        if workspace_id:
            query = query.eq("workspace_id", workspace_id)
        
        response = query.execute()
        return {"count": response.count or 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
async def create_notification(
    notification: NotificationCreate,
    user_id: str = Depends(get_current_user)
):
    """Create a new notification"""
    try:
        data = {
            "user_id": user_id,
            "title": notification.title,
            "message": notification.message,
            "type": notification.type,
            "workspace_id": notification.workspace_id,
            "link": notification.link,
            "link_label": notification.link_label,
            "icon": notification.icon,
            "metadata": notification.metadata or {}
        }
        
        response = supabase_admin.table("notifications").insert(data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create notification")
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{notification_id}")
async def update_notification(
    notification_id: str,
    update: NotificationUpdate,
    user_id: str = Depends(get_current_user)
):
    """Update a notification (mark as read/archived)"""
    try:
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        
        if update_data.get("is_read"):
            update_data["read_at"] = datetime.utcnow().isoformat()
        
        response = supabase_admin.table("notifications").update(update_data).eq("id", notification_id).eq("user_id", user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/mark-all-read")
async def mark_all_read(
    user_id: str = Depends(get_current_user),
    workspace_id: Optional[str] = None
):
    """Mark all notifications as read"""
    try:
        query = supabase_admin.table("notifications").update({
            "is_read": True,
            "read_at": datetime.utcnow().isoformat()
        }).eq("user_id", user_id).eq("is_read", False)
        
        if workspace_id:
            query = query.eq("workspace_id", workspace_id)
        
        response = query.execute()
        return {"updated": len(response.data) if response.data else 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    user_id: str = Depends(get_current_user)
):
    """Delete a notification"""
    try:
        response = supabase_admin.table("notifications").delete().eq("id", notification_id).eq("user_id", user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return {"message": "Notification deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/clear-all")
async def clear_all_notifications(
    user_id: str = Depends(get_current_user),
    workspace_id: Optional[str] = None
):
    """Archive all notifications"""
    try:
        query = supabase_admin.table("notifications").update({"is_archived": True}).eq("user_id", user_id)
        
        if workspace_id:
            query = query.eq("workspace_id", workspace_id)
        
        response = query.execute()
        return {"archived": len(response.data) if response.data else 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/check-due")
async def check_due_notifications(
    user_id: str = Depends(get_current_user),
    workspace_id: Optional[str] = None
):
    """Check for due tasks/events and create notifications"""
    try:
        notifications = await notification_service.check_and_create_task_notifications(
            user_id=user_id,
            workspace_id=workspace_id
        )
        return {
            "created": len(notifications),
            "notifications": notifications
        }
    except Exception as e:
        print(f"Error checking due notifications: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send-reminder")
async def send_learning_reminder(
    user_id: str = Depends(get_current_user),
    workspace_id: Optional[str] = None
):
    """Send a learning reminder notification"""
    try:
        notification = await notification_service.notify_learning_reminder(
            user_id=user_id,
            workspace_id=workspace_id
        )
        return notification
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
