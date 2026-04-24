from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime
from app.core.supabase import supabase_admin
from app.api.dependencies import get_current_user

router = APIRouter()

class ColumnConfig(BaseModel):
    id: str
    name: str
    type: str  # text, number, select, multi_select, date, checkbox, url, email
    width: Optional[int] = None
    hidden: Optional[bool] = False
    config: Optional[dict] = None  # For select options, etc.

class BlockDatabaseCreate(BaseModel):
    block_id: str
    page_id: Optional[str] = None
    workspace_id: Optional[str] = None
    name: Optional[str] = "Untitled Database"
    columns: Optional[List[dict]] = []
    rows: Optional[List[dict]] = []

class BlockDatabaseUpdate(BaseModel):
    name: Optional[str] = None
    columns: Optional[List[dict]] = None
    rows: Optional[List[dict]] = None
    view_type: Optional[str] = None
    sort_config: Optional[List[dict]] = None
    filter_config: Optional[List[dict]] = None
    hidden_columns: Optional[List[str]] = None
    column_widths: Optional[dict] = None

@router.get("/{block_id}")
async def get_block_database(block_id: str, user_id: str = Depends(get_current_user)):
    """Get a block database by block_id"""
    try:
        response = supabase_admin.table("block_databases").select("*").eq("block_id", block_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Block database not found")
        
        db = response.data[0]
        
        # Check access - user owns it or has workspace access
        if db.get("user_id") != user_id:
            if db.get("workspace_id"):
                from app.api.helpers.workspace_access import check_workspace_access
                access = await check_workspace_access(user_id, db["workspace_id"])
                if not access["has_access"]:
                    raise HTTPException(status_code=403, detail="Not authorized")
            else:
                raise HTTPException(status_code=403, detail="Not authorized")
        
        return db
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting block database: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
async def create_block_database(data: BlockDatabaseCreate, user_id: str = Depends(get_current_user)):
    """Create a new block database"""
    try:
        # Check if block database already exists
        existing = supabase_admin.table("block_databases").select("id").eq("block_id", data.block_id).execute()
        if existing.data:
            # Return existing one
            return existing.data[0]
        
        # Validate workspace access if provided
        if data.workspace_id:
            from app.api.helpers.workspace_access import check_workspace_access, can_edit
            access = await check_workspace_access(user_id, data.workspace_id)
            if not access["has_access"] or not can_edit(access["role"]):
                raise HTTPException(status_code=403, detail="Not authorized to create in this workspace")
        
        db_data = {
            "block_id": data.block_id,
            "page_id": data.page_id,
            "workspace_id": data.workspace_id,
            "user_id": user_id,
            "name": data.name or "Untitled Database",
            "columns": data.columns or [],
            "rows": data.rows or [],
            "row_count": len(data.rows) if data.rows else 0
        }
        
        response = supabase_admin.table("block_databases").insert(db_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create block database")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating block database: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{block_id}")
async def update_block_database(block_id: str, data: BlockDatabaseUpdate, user_id: str = Depends(get_current_user)):
    """Update a block database"""
    try:
        # Get existing database
        existing = supabase_admin.table("block_databases").select("*").eq("block_id", block_id).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Block database not found")
        
        db = existing.data[0]
        
        # Check access
        if db.get("user_id") != user_id:
            if db.get("workspace_id"):
                from app.api.helpers.workspace_access import check_workspace_access, can_edit
                access = await check_workspace_access(user_id, db["workspace_id"])
                if not access["has_access"] or not can_edit(access["role"]):
                    raise HTTPException(status_code=403, detail="Not authorized")
            else:
                raise HTTPException(status_code=403, detail="Not authorized")
        
        update_data = {k: v for k, v in data.dict().items() if v is not None}
        
        if not update_data:
            return db
        
        response = supabase_admin.table("block_databases").update(update_data).eq("block_id", block_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to update block database")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating block database: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{block_id}")
async def delete_block_database(block_id: str, user_id: str = Depends(get_current_user)):
    """Delete a block database"""
    try:
        # Get existing database
        existing = supabase_admin.table("block_databases").select("*").eq("block_id", block_id).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Block database not found")
        
        db = existing.data[0]
        
        # Check access - only owner or workspace admin can delete
        if db.get("user_id") != user_id:
            if db.get("workspace_id"):
                from app.api.helpers.workspace_access import check_workspace_access, can_admin
                access = await check_workspace_access(user_id, db["workspace_id"])
                if not access["has_access"] or not can_admin(access["role"]):
                    raise HTTPException(status_code=403, detail="Not authorized")
            else:
                raise HTTPException(status_code=403, detail="Not authorized")
        
        response = supabase_admin.table("block_databases").delete().eq("block_id", block_id).execute()
        
        return {"message": "Block database deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting block database: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/by-page/{page_id}")
async def get_block_databases_by_page(page_id: str, user_id: str = Depends(get_current_user)):
    """Get all block databases for a page"""
    try:
        response = supabase_admin.table("block_databases").select("*").eq("page_id", page_id).execute()
        return response.data
    except Exception as e:
        print(f"Error getting block databases by page: {e}")
        raise HTTPException(status_code=500, detail=str(e))
