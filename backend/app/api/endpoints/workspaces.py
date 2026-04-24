from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.core.supabase import supabase_admin
from app.api.dependencies import get_current_user

router = APIRouter()

class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    icon: str = "📁"
    color: Optional[str] = "#6366f1"

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    is_default: Optional[bool] = None
    is_public: Optional[bool] = None

@router.get("")
async def get_workspaces(user_id: str = Depends(get_current_user)):
    """Get all workspaces for the current user (owned + shared)"""
    try:
        print(f"Getting workspaces for user: {user_id}")
        
        # Get workspaces owned by user
        owned_response = supabase_admin.table("workspaces").select("*").eq("user_id", user_id).execute()
        owned_workspaces = owned_response.data or []
        print(f"Owned workspaces: {len(owned_workspaces)}")
        
        # Get workspaces where user is a member (shared workspaces)
        member_response = supabase_admin.table("workspace_members").select("workspace_id, role").eq("user_id", user_id).execute()
        print(f"Member records: {member_response.data}")
        
        # Create a map of workspace_id -> role for quick lookup
        member_roles = {m["workspace_id"]: m["role"] for m in (member_response.data or [])}
        member_workspace_ids = list(member_roles.keys())
        
        # Fetch shared workspace details (exclude already owned ones)
        owned_ids = {w["id"] for w in owned_workspaces}
        shared_workspace_ids = [wid for wid in member_workspace_ids if wid not in owned_ids]
        print(f"Shared workspace IDs (excluding owned): {shared_workspace_ids}")
        
        shared_workspaces = []
        if shared_workspace_ids:
            shared_response = supabase_admin.table("workspaces").select("*").in_("id", shared_workspace_ids).execute()
            shared_workspaces = shared_response.data or []
            # Mark shared workspaces with is_shared flag AND member_role
            for ws in shared_workspaces:
                ws["is_shared"] = True
                ws["member_role"] = member_roles.get(ws["id"], "viewer")
            print(f"Shared workspaces fetched: {len(shared_workspaces)}")
        
        # Combine and sort by created_at
        all_workspaces = owned_workspaces + shared_workspaces
        all_workspaces.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        print(f"Total workspaces returning: {len(all_workspaces)}")
        
        return all_workspaces
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
async def create_workspace(workspace: WorkspaceCreate, user_id: str = Depends(get_current_user)):
    """Create a new workspace"""
    try:
        print(f"Creating workspace for user: {user_id}")
        print(f"Workspace data: {workspace.dict()}")
        
        # ✅ SECURITY: Check user-level workspace limit before creation
        from app.services.user_subscription_service import UserSubscriptionService
        user_sub_service = UserSubscriptionService(supabase_admin)
        await user_sub_service.enforce_user_limit(user_id, "max_workspaces", 1)
        
        response = supabase_admin.table("workspaces").insert({
            "user_id": user_id,
            "name": workspace.name,
            "description": workspace.description,
            "icon": workspace.icon,
            "color": workspace.color
        }).execute()
        
        print(f"Response: {response}")
        
        if not response.data:
            raise HTTPException(status_code=500, detail="No data returned from database")
        
        # ✅ SECURITY: Increment user workspace usage after successful creation
        try:
            await user_sub_service.increment_user_usage(user_id, "max_workspaces", 1)
        except Exception as usage_error:
            print(f"Warning: Failed to increment usage (non-fatal): {usage_error}")
            
        return response.data[0]
    except Exception as e:
        print(f"Error creating workspace: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{workspace_id}")
async def get_workspace(workspace_id: str, user_id: str = Depends(get_current_user)):
    """Get a specific workspace (owned or shared)"""
    try:
        # First check if user owns the workspace
        response = supabase_admin.table("workspaces").select("*").eq("id", workspace_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        workspace = response.data[0]
        
        # Check if user owns it or is a member
        is_owner = workspace.get("user_id") == user_id
        
        if not is_owner:
            # Check if user is a member
            member_check = supabase_admin.table("workspace_members").select("id, role").eq("workspace_id", workspace_id).eq("user_id", user_id).execute()
            if not member_check.data:
                raise HTTPException(status_code=403, detail="Not authorized to access this workspace")
            workspace["is_shared"] = True
            workspace["member_role"] = member_check.data[0]["role"]
        
        return workspace
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{workspace_id}")
async def update_workspace(workspace_id: str, workspace: WorkspaceUpdate, user_id: str = Depends(get_current_user)):
    """Update a workspace"""
    try:
        # First verify the workspace belongs to the user
        workspace_check = supabase_admin.table("workspaces").select("id").eq("id", workspace_id).eq("user_id", user_id).execute()
        if not workspace_check.data:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        update_data = {k: v for k, v in workspace.dict().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
            
        response = supabase_admin.table("workspaces").update(update_data).eq("id", workspace_id).eq("user_id", user_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Workspace not found")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating workspace: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{workspace_id}")
async def delete_workspace(workspace_id: str, user_id: str = Depends(get_current_user)):
    """Delete a workspace and all related data"""
    try:
        # First verify the workspace belongs to the user
        workspace_check = supabase_admin.table("workspaces").select("id").eq("id", workspace_id).eq("user_id", user_id).execute()
        if not workspace_check.data:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        # Delete related data first (order matters due to foreign keys)
        # List of all tables with workspace_id foreign key
        tables_to_clean = [
            "learning_memory",           # AI memory
            "chat_messages",             # Chat messages
            "chat_sessions",             # Chat sessions
            "ai_action_feedback",        # AI feedback
            "quiz_attempts",             # Quiz attempts
            "quizzes",                   # Quizzes
            "flashcard_progress",        # Flashcard progress
            "flashcard_decks",           # Flashcard decks
            "graph_edges",               # Knowledge graph edges
            "skill_evidence",            # Skill evidence
            "tasks",                     # Tasks
            "skills",                    # Skills
            "page_templates",            # Page templates
            "block_templates",           # Block templates
            "usage_metrics",             # Usage metrics
            "workspace_subscriptions",   # Subscriptions
            "workspace_members",         # Members
        ]
        
        # Delete from each table
        for table in tables_to_clean:
            try:
                supabase_admin.table(table).delete().eq("workspace_id", workspace_id).execute()
                print(f"Deleted from {table}")
            except Exception as e:
                print(f"Could not delete from {table}: {e}")
                pass
        
        # Delete pages (sub-pages first due to parent_page_id)
        try:
            # Delete sub-pages first (pages with parent)
            supabase_admin.table("pages").delete().eq("workspace_id", workspace_id).not_.is_("parent_page_id", "null").execute()
        except Exception as e:
            print(f"Could not delete sub-pages: {e}")
            pass
        
        try:
            # Then delete all remaining pages
            supabase_admin.table("pages").delete().eq("workspace_id", workspace_id).execute()
            print("Deleted pages")
        except Exception as e:
            print(f"Could not delete pages: {e}")
            pass
        
        # Finally delete the workspace
        response = supabase_admin.table("workspaces").delete().eq("id", workspace_id).eq("user_id", user_id).execute()
        
        return {"message": "Workspace deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting workspace: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{workspace_id}/insights")
async def get_workspace_insights(workspace_id: str, user_id: str = Depends(get_current_user)):
    """Get workspace insights including task counts, page counts, and overdue tasks"""
    try:
        # Check if user owns the workspace OR is a member
        workspace_response = supabase_admin.table("workspaces").select("*").eq("id", workspace_id).execute()
        if not workspace_response.data:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        workspace = workspace_response.data[0]
        is_owner = workspace.get("user_id") == user_id
        
        if not is_owner:
            # Check if user is a member
            member_check = supabase_admin.table("workspace_members").select("id").eq("workspace_id", workspace_id).eq("user_id", user_id).execute()
            if not member_check.data:
                raise HTTPException(status_code=403, detail="Not authorized to access this workspace")
        
        # Get task counts - for shared workspaces, get all tasks in workspace
        tasks_response = supabase_admin.table("tasks").select("*").eq("workspace_id", workspace_id).execute()
        tasks = tasks_response.data or []
        
        total_tasks = len(tasks)
        overdue_tasks = [t for t in tasks if t.get('status') != 'done' and t.get('priority') == 'high']
        completed_tasks = [t for t in tasks if t.get('status') == 'done']
        
        # Get page count
        pages_response = supabase_admin.table("pages").select("id").eq("workspace_id", workspace_id).execute()
        total_pages = len(pages_response.data or [])
        
        # Get skill count
        skills_response = supabase_admin.table("skills").select("id").eq("workspace_id", workspace_id).execute()
        total_skills = len(skills_response.data or [])
        
        return {
            "total_tasks": total_tasks,
            "overdue_tasks": len(overdue_tasks),
            "completed_tasks": len(completed_tasks),
            "total_pages": total_pages,
            "total_skills": total_skills,
            "overdue_task_details": overdue_tasks[:3]  # Return top 3 overdue tasks
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting workspace insights: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
