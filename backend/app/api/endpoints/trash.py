"""
Trash/Bin API Endpoints
Handles soft delete, restore, and permanent deletion of pages
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime

from app.core.supabase import supabase_admin
from app.api.dependencies import get_current_user

router = APIRouter()


@router.get("")
async def get_trash_items(
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get all items in trash for a workspace"""
    try:
        # Direct query using service role to bypass RLS
        response = supabase_admin.table("pages")\
            .select("id, title, icon, page_type, deleted_at, deleted_by, parent_page_id, created_at")\
            .eq("workspace_id", workspace_id)\
            .not_.is_("deleted_at", "null")\
            .order("deleted_at", desc=True)\
            .execute()
        
        return {
            "success": True,
            "items": response.data or [],
            "count": len(response.data) if response.data else 0
        }
    except Exception as e:
        print(f"Error fetching trash items: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/move/{page_id}")
async def move_to_trash(
    page_id: str,
    user_id: str = Depends(get_current_user)
):
    """Move a page to trash (soft delete)"""
    try:
        
        # Get page to check if it exists (using service role to bypass RLS)
        page_response = supabase_admin.table("pages")\
            .select("id, title, parent_page_id")\
            .eq("id", page_id)\
            .single()\
            .execute()
        
        if not page_response.data:
            raise HTTPException(status_code=404, detail="Page not found")
        
        # Soft delete the page (using service role to bypass RLS)
        update_response = supabase_admin.table("pages")\
            .update({
                "deleted_at": datetime.utcnow().isoformat(),
                "deleted_by": user_id
            })\
            .eq("id", page_id)\
            .execute()
        
        # Also soft delete subpages (using service role to bypass RLS)
        supabase_admin.table("pages")\
            .update({
                "deleted_at": datetime.utcnow().isoformat(),
                "deleted_by": user_id
            })\
            .eq("parent_page_id", page_id)\
            .execute()
        
        return {
            "success": True,
            "message": f"Moved '{page_response.data.get('title')}' to trash",
            "page_id": page_id
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error moving to trash: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/restore/{page_id}")
async def restore_from_trash(
    page_id: str,
    user_id: str = Depends(get_current_user)
):
    """Restore a page from trash"""
    try:
        # Get page (using service role to bypass RLS)
        page_response = supabase_admin.table("pages")\
            .select("id, title")\
            .eq("id", page_id)\
            .single()\
            .execute()
        
        if not page_response.data:
            raise HTTPException(status_code=404, detail="Page not found in trash")
        
        # Restore the page (using service role to bypass RLS)
        supabase_admin.table("pages")\
            .update({
                "deleted_at": None,
                "deleted_by": None
            })\
            .eq("id", page_id)\
            .execute()
        
        # Also restore subpages (using service role to bypass RLS)
        supabase_admin.table("pages")\
            .update({
                "deleted_at": None,
                "deleted_by": None
            })\
            .eq("parent_page_id", page_id)\
            .execute()
        
        return {
            "success": True,
            "message": f"Restored '{page_response.data.get('title')}' from trash",
            "page_id": page_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/permanent/{page_id}")
async def delete_permanently(
    page_id: str,
    user_id: str = Depends(get_current_user)
):
    """Permanently delete a page from trash"""
    try:
        # Try using the function
        try:
            response = supabase_admin.rpc(
                'permanently_delete_page',
                {'page_id_param': page_id}
            ).execute()
            
            if response.data:
                return response.data
        except:
            pass
        
        # Fallback: Direct delete
        # Verify page is in trash
        page_response = supabase_admin.table("pages")\
            .select("id, title, deleted_at")\
            .eq("id", page_id)\
            .single()\
            .execute()
        
        if not page_response.data:
            raise HTTPException(status_code=404, detail="Page not found")
        
        if not page_response.data.get("deleted_at"):
            raise HTTPException(status_code=400, detail="Page is not in trash")
        
        # Delete subpages first
        supabase_admin.table("pages")\
            .delete()\
            .eq("parent_page_id", page_id)\
            .execute()
        
        # Delete the page
        supabase_admin.table("pages")\
            .delete()\
            .eq("id", page_id)\
            .execute()
        
        return {
            "success": True,
            "message": f"Permanently deleted '{page_response.data.get('title')}'",
            "page_id": page_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/empty")
async def empty_trash(
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """Empty entire trash for a workspace"""
    try:
        # Try using the function
        try:
            response = supabase_admin.rpc(
                'empty_trash',
                {'workspace_id_param': workspace_id}
            ).execute()
            
            if response.data:
                return response.data
        except:
            pass
        
        # Fallback: Direct delete
        response = supabase_admin.table("pages")\
            .delete()\
            .eq("workspace_id", workspace_id)\
            .not_.is_("deleted_at", "null")\
            .execute()
        
        return {
            "success": True,
            "message": "Trash emptied successfully",
            "deleted_count": len(response.data) if response.data else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/count")
async def get_trash_count(
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get count of items in trash"""
    try:
        response = supabase_admin.table("pages")\
            .select("id", count="exact")\
            .eq("workspace_id", workspace_id)\
            .not_.is_("deleted_at", "null")\
            .execute()
        
        return {
            "success": True,
            "count": response.count or 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
