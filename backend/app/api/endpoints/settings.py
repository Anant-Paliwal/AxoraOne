from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.core.supabase import supabase_admin
from app.api.dependencies import get_current_user

router = APIRouter()

class UserSettingsUpdate(BaseModel):
    # Profile
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    
    # Appearance
    theme: Optional[str] = None
    accent_color: Optional[str] = None
    font_size: Optional[str] = None
    
    # Notifications
    email_notifications: Optional[bool] = None
    task_reminders: Optional[bool] = None
    skill_updates: Optional[bool] = None
    ai_suggestions: Optional[bool] = None
    weekly_digest: Optional[bool] = None
    mentions: Optional[bool] = None
    
    # AI
    default_ai_model: Optional[str] = None
    auto_suggest: Optional[bool] = None
    context_awareness: Optional[bool] = None
    streaming_responses: Optional[bool] = None
    
    # Privacy
    profile_visibility: Optional[str] = None
    show_activity_status: Optional[bool] = None
    
    # Workspace
    default_workspace_id: Optional[str] = None
    sidebar_collapsed: Optional[bool] = None

class WorkspaceSettingsUpdate(BaseModel):
    is_public: Optional[bool] = None
    allow_invites: Optional[bool] = None
    default_page_icon: Optional[str] = None
    default_page_template_id: Optional[str] = None
    workspace_ai_model: Optional[str] = None
    ai_context_scope: Optional[str] = None
    mute_notifications: Optional[bool] = None


@router.get("")
async def get_user_settings(user_id: str = Depends(get_current_user)):
    """Get user settings, creating default if not exists"""
    try:
        response = supabase_admin.table("user_settings").select("*").eq("user_id", user_id).execute()
        
        if not response.data:
            # Create default settings
            default_settings = {
                "user_id": user_id,
                "theme": "dark",
                "accent_color": "#8B5CF6",
                "font_size": "medium",
                "email_notifications": True,
                "task_reminders": True,
                "skill_updates": True,
                "ai_suggestions": True,
                "weekly_digest": False,
                "mentions": True,
                "default_ai_model": "gpt-4o-mini",
                "auto_suggest": True,
                "context_awareness": True,
                "streaming_responses": True,
                "profile_visibility": "private",
                "show_activity_status": True,
                "sidebar_collapsed": False
            }
            
            insert_response = supabase_admin.table("user_settings").insert(default_settings).execute()
            return insert_response.data[0] if insert_response.data else default_settings
        
        return response.data[0]
    except Exception as e:
        print(f"Error getting user settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("")
async def update_user_settings(settings: UserSettingsUpdate, user_id: str = Depends(get_current_user)):
    """Update user settings"""
    try:
        # Get existing settings or create new
        existing = supabase_admin.table("user_settings").select("id").eq("user_id", user_id).execute()
        
        update_data = {k: v for k, v in settings.dict().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        if existing.data:
            # Update existing
            response = supabase_admin.table("user_settings").update(update_data).eq("user_id", user_id).execute()
        else:
            # Insert new with defaults
            update_data["user_id"] = user_id
            response = supabase_admin.table("user_settings").insert(update_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to update settings")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating user settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/workspace/{workspace_id}")
async def get_workspace_settings(workspace_id: str, user_id: str = Depends(get_current_user)):
    """Get workspace-specific settings"""
    try:
        response = supabase_admin.table("workspace_settings").select("*").eq("workspace_id", workspace_id).eq("user_id", user_id).execute()
        
        if not response.data:
            # Return default settings
            return {
                "workspace_id": workspace_id,
                "user_id": user_id,
                "is_public": False,
                "allow_invites": True,
                "default_page_icon": "📄",
                "ai_context_scope": "workspace",
                "mute_notifications": False
            }
        
        return response.data[0]
    except Exception as e:
        print(f"Error getting workspace settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/workspace/{workspace_id}")
async def update_workspace_settings(
    workspace_id: str, 
    settings: WorkspaceSettingsUpdate, 
    user_id: str = Depends(get_current_user)
):
    """Update workspace-specific settings"""
    try:
        # Verify workspace ownership
        workspace_check = supabase_admin.table("workspaces").select("id").eq("id", workspace_id).eq("user_id", user_id).execute()
        if not workspace_check.data:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        existing = supabase_admin.table("workspace_settings").select("id").eq("workspace_id", workspace_id).eq("user_id", user_id).execute()
        
        update_data = {k: v for k, v in settings.dict().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        if existing.data:
            response = supabase_admin.table("workspace_settings").update(update_data).eq("workspace_id", workspace_id).eq("user_id", user_id).execute()
        else:
            update_data["workspace_id"] = workspace_id
            update_data["user_id"] = user_id
            response = supabase_admin.table("workspace_settings").insert(update_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to update workspace settings")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating workspace settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/avatar")
async def update_avatar(data: dict, user_id: str = Depends(get_current_user)):
    """Update user avatar URL"""
    try:
        avatar_url = data.get("avatar_url", "")
        
        # Update in user_settings
        existing = supabase_admin.table("user_settings").select("id").eq("user_id", user_id).execute()
        
        if existing.data:
            response = supabase_admin.table("user_settings").update({"avatar_url": avatar_url}).eq("user_id", user_id).execute()
        else:
            response = supabase_admin.table("user_settings").insert({
                "user_id": user_id,
                "avatar_url": avatar_url
            }).execute()
        
        return {"avatar_url": avatar_url, "success": True}
    except Exception as e:
        print(f"Error updating avatar: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/avatar")
async def delete_avatar(user_id: str = Depends(get_current_user)):
    """Remove user avatar"""
    try:
        supabase_admin.table("user_settings").update({"avatar_url": None}).eq("user_id", user_id).execute()
        return {"success": True}
    except Exception as e:
        print(f"Error deleting avatar: {e}")
        raise HTTPException(status_code=500, detail=str(e))
