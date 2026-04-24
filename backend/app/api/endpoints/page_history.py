"""
Page History API Endpoints
Notion-style version history with 7-day auto-cleanup
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.core.supabase import supabase_admin
from app.api.dependencies import get_current_user

router = APIRouter()


class HistoryEntry(BaseModel):
    id: str
    version_number: int
    user_id: str
    user_email: Optional[str]
    change_type: str
    change_summary: Optional[str]
    created_at: str
    expires_at: str
    is_current: bool
    days_until_expiry: int


class RestoreRequest(BaseModel):
    history_id: str


@router.get("/{page_id}")
async def get_page_history(
    page_id: str,
    user_id: str = Depends(get_current_user),
    limit: int = 50
):
    """Get version history for a page with enhanced tracking"""
    try:
        print(f"Fetching enhanced history for page {page_id}")
        
        # ✅ SECURITY: Verify user has access to the page
        page_response = supabase_admin.table("pages").select("id, workspace_id").eq("id", page_id).execute()
        if not page_response.data:
            raise HTTPException(status_code=404, detail="Page not found")
        
        page = page_response.data[0]
        workspace_id = page.get("workspace_id")
        
        # Check workspace access
        if workspace_id:
            from app.api.helpers import check_workspace_access
            access = await check_workspace_access(user_id, workspace_id)
            if not access["has_access"]:
                raise HTTPException(status_code=403, detail="Not authorized to access this page")
        else:
            # Personal page - verify ownership
            page_owner_check = supabase_admin.table("pages").select("user_id").eq("id", page_id).eq("user_id", user_id).execute()
            if not page_owner_check.data:
                raise HTTPException(status_code=403, detail="Not authorized to access this page")
        
        # Try enhanced function first
        try:
            response = supabase_admin.rpc(
                'get_page_history_enhanced',
                {
                    'page_id_param': page_id,
                    'limit_param': limit
                }
            ).execute()
            
            if response.data:
                print(f"Found {len(response.data)} history entries via enhanced function")
                return {
                    "success": True,
                    "history": response.data,
                    "count": len(response.data)
                }
        except Exception as func_error:
            print(f"Enhanced function call failed: {func_error}, trying standard function")
        
        # Fallback to standard function
        try:
            response = supabase_admin.rpc(
                'get_page_history_with_diff',
                {
                    'page_id_param': page_id,
                    'limit_param': limit
                }
            ).execute()
            
            if response.data:
                print(f"Found {len(response.data)} history entries via standard function")
                return {
                    "success": True,
                    "history": response.data,
                    "count": len(response.data)
                }
        except Exception as func_error2:
            print(f"Standard function call failed: {func_error2}, falling back to direct query")
        
        # Final fallback to direct query
        response = supabase_admin.table("page_history")\
            .select("*")\
            .eq("page_id", page_id)\
            .order("version_number", desc=True)\
            .limit(limit)\
            .execute()
        
        print(f"Found {len(response.data or [])} history entries via direct query")
        
        # Format the data
        history = []
        for item in (response.data or []):
            history.append({
                "id": item["id"],
                "version_number": item["version_number"],
                "user_id": item["user_id"],
                "user_email": item.get("edited_by_email"),
                "user_name": item.get("edited_by_name"),
                "change_type": item["change_type"],
                "change_summary": item.get("change_summary"),
                "snapshot_type": item.get("snapshot_type", "manual"),
                "blocks_changed": item.get("blocks_changed", 0),
                "chars_added": item.get("chars_added", 0),
                "chars_removed": item.get("chars_removed", 0),
                "created_at": item["created_at"],
                "expires_at": item["expires_at"],
                "is_current": False,
                "days_until_expiry": 7
            })
        
        return {
            "success": True,
            "history": history,
            "count": len(history)
        }
    except Exception as e:
        print(f"Error fetching page history: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{page_id}/version/{version_number}")
async def get_specific_version(
    page_id: str,
    version_number: int,
    user_id: str = Depends(get_current_user)
):
    """Get a specific version of a page"""
    try:
        response = supabase_admin.table("page_history")\
            .select("*")\
            .eq("page_id", page_id)\
            .eq("version_number", version_number)\
            .single()\
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Version not found")
        
        return {
            "success": True,
            "version": response.data
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching version: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{page_id}/restore")
async def restore_page_version(
    page_id: str,
    restore_data: RestoreRequest,
    user_id: str = Depends(get_current_user)
):
    """Restore a page to a previous version (creates pre-restore snapshot)"""
    try:
        # ✅ SECURITY: Verify user has edit access to the page
        page_response = supabase_admin.table("pages").select("id, workspace_id, user_id").eq("id", page_id).execute()
        if not page_response.data:
            raise HTTPException(status_code=404, detail="Page not found")
        
        page = page_response.data[0]
        workspace_id = page.get("workspace_id")
        
        # Check workspace access and edit permission
        if workspace_id:
            from app.api.helpers.workspace_access import check_workspace_access, can_edit
            access = await check_workspace_access(user_id, workspace_id)
            if not access["has_access"] or not can_edit(access["role"]):
                raise HTTPException(status_code=403, detail="Not authorized to restore this page")
        else:
            # Personal page - verify ownership
            if page.get("user_id") != user_id:
                raise HTTPException(status_code=403, detail="Not authorized to restore this page")
        
        # ✅ SECURITY: Verify history_id belongs to this page_id
        history_check = supabase_admin.table("page_history").select("id, page_id").eq("id", restore_data.history_id).execute()
        if not history_check.data:
            raise HTTPException(status_code=404, detail="History entry not found")
        
        if history_check.data[0]["page_id"] != page_id:
            raise HTTPException(status_code=400, detail="History entry does not belong to this page")
        # Try enhanced restore function first
        try:
            response = supabase_admin.rpc(
                'restore_page_from_history_enhanced',
                {'history_id_param': restore_data.history_id}
            ).execute()
            
            if response.data and response.data.get('success'):
                return {
                    "success": True,
                    "message": f"Page restored to version {response.data.get('restored_version')}",
                    "page_id": page_id,
                    "restored_version": response.data.get('restored_version'),
                    "pre_restore_snapshot": response.data.get('pre_restore_version')
                }
        except Exception as enhanced_error:
            print(f"Enhanced restore failed: {enhanced_error}, trying standard restore")
        
        # Fallback to standard restore
        response = supabase_admin.rpc(
            'restore_page_from_history',
            {'history_id_param': restore_data.history_id}
        ).execute()
        
        if response.data and response.data.get('success'):
            return {
                "success": True,
                "message": f"Page restored to version {response.data.get('restored_version')}",
                "page_id": page_id,
                "restored_version": response.data.get('restored_version')
            }
        else:
            raise HTTPException(
                status_code=400,
                detail=response.data.get('error', 'Failed to restore page')
            )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error restoring page: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{page_id}/snapshot")
async def create_manual_snapshot(
    page_id: str,
    user_id: str = Depends(get_current_user),
    summary: Optional[str] = None
):
    """Create a manual snapshot of the current page state"""
    try:
        # Get current page state
        page_response = supabase_admin.table("pages")\
            .select("*")\
            .eq("id", page_id)\
            .single()\
            .execute()
        
        if not page_response.data:
            raise HTTPException(status_code=404, detail="Page not found")
        
        page = page_response.data
        
        # ✅ SECURITY: Verify user has edit access to the page
        workspace_id = page.get("workspace_id")
        if workspace_id:
            from app.api.helpers.workspace_access import check_workspace_access, can_edit
            access = await check_workspace_access(user_id, workspace_id)
            if not access["has_access"] or not can_edit(access["role"]):
                raise HTTPException(status_code=403, detail="Not authorized to create snapshots for this page")
        else:
            # Personal page - verify ownership
            if page.get("user_id") != user_id:
                raise HTTPException(status_code=403, detail="Not authorized to create snapshots for this page")
        
        # Get next version number
        version_response = supabase_admin.table("page_history")\
            .select("version_number")\
            .eq("page_id", page_id)\
            .order("version_number", desc=True)\
            .limit(1)\
            .execute()
        
        next_version = 1
        if version_response.data:
            next_version = version_response.data[0]["version_number"] + 1
        
        # Create snapshot
        snapshot_data = {
            "page_id": page_id,
            "workspace_id": page["workspace_id"],
            "user_id": user_id,
            "title": page["title"],
            "content": page.get("content", []),
            "blocks": page.get("blocks", []),
            "icon": page.get("icon"),
            "cover_image": page.get("cover_image"),
            "change_type": "snapshot",
            "change_summary": summary or "Manual snapshot",
            "version_number": next_version,
            "expires_at": (datetime.utcnow() + timedelta(days=7)).isoformat()
        }
        
        response = supabase_admin.table("page_history")\
            .insert(snapshot_data)\
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create snapshot")
        
        return {
            "success": True,
            "message": "Snapshot created",
            "snapshot": response.data[0]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating snapshot: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{page_id}/history/{history_id}")
async def delete_history_entry(
    page_id: str,
    history_id: str,
    user_id: str = Depends(get_current_user)
):
    """Delete a specific history entry (admin only)"""
    try:
        # ✅ SECURITY: Verify user has admin access to the page
        page_response = supabase_admin.table("pages").select("id, workspace_id, user_id").eq("id", page_id).execute()
        if not page_response.data:
            raise HTTPException(status_code=404, detail="Page not found")
        
        page = page_response.data[0]
        workspace_id = page.get("workspace_id")
        
        # Check workspace access and admin permission
        if workspace_id:
            from app.api.helpers.workspace_access import check_workspace_access, can_admin
            access = await check_workspace_access(user_id, workspace_id)
            if not access["has_access"] or not can_admin(access["role"]):
                raise HTTPException(status_code=403, detail="Not authorized to delete history for this page")
        else:
            # Personal page - verify ownership
            if page.get("user_id") != user_id:
                raise HTTPException(status_code=403, detail="Not authorized to delete history for this page")
        
        # ✅ SECURITY: Verify history_id belongs to this page_id
        history_check = supabase_admin.table("page_history").select("id, page_id").eq("id", history_id).execute()
        if not history_check.data:
            raise HTTPException(status_code=404, detail="History entry not found")
        
        if history_check.data[0]["page_id"] != page_id:
            raise HTTPException(status_code=400, detail="History entry does not belong to this page")
        
        response = supabase_admin.table("page_history")\
            .delete()\
            .eq("id", history_id)\
            .eq("page_id", page_id)\
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="History entry not found")
        
        return {
            "success": True,
            "message": "History entry deleted"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cleanup")
async def cleanup_expired_history(
    user_id: str = Depends(get_current_user)
):
    """Manually trigger cleanup of expired history (admin only)"""
    try:
        response = supabase_admin.rpc('cleanup_expired_page_history').execute()
        
        if response.data:
            return {
                "success": True,
                "deleted_count": response.data.get('deleted_count', 0),
                "cleaned_at": response.data.get('cleaned_at')
            }
        
        # Fallback: Direct delete
        delete_response = supabase_admin.table("page_history")\
            .delete()\
            .lt("expires_at", datetime.utcnow().isoformat())\
            .execute()
        
        return {
            "success": True,
            "deleted_count": len(delete_response.data) if delete_response.data else 0,
            "cleaned_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        print(f"Error cleaning up history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{page_id}/stats")
async def get_history_stats(
    page_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get statistics about page history"""
    try:
        # Get total versions
        count_response = supabase_admin.table("page_history")\
            .select("id", count="exact")\
            .eq("page_id", page_id)\
            .execute()
        
        # Get oldest and newest
        history_response = supabase_admin.table("page_history")\
            .select("created_at, version_number, change_type")\
            .eq("page_id", page_id)\
            .order("version_number", desc=False)\
            .execute()
        
        stats = {
            "total_versions": count_response.count or 0,
            "oldest_version": None,
            "newest_version": None,
            "change_types": {}
        }
        
        if history_response.data:
            stats["oldest_version"] = history_response.data[0]
            stats["newest_version"] = history_response.data[-1]
            
            # Count change types
            for entry in history_response.data:
                change_type = entry.get("change_type", "unknown")
                stats["change_types"][change_type] = stats["change_types"].get(change_type, 0) + 1
        
        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        print(f"Error fetching history stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
