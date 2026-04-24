from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

from app.api.dependencies import get_current_user
from app.core.supabase import supabase_admin

router = APIRouter()

# Pydantic models
class PropertyCreate(BaseModel):
    name: str
    property_type: str
    config: Optional[Dict[str, Any]] = {}
    property_order: Optional[int] = 0

class PropertyUpdate(BaseModel):
    name: Optional[str] = None
    property_type: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    property_order: Optional[int] = None

class RowCreate(BaseModel):
    properties: Dict[str, Any]

class RowUpdate(BaseModel):
    properties: Dict[str, Any]

# Database Properties Endpoints
@router.get("/pages/{page_id}/properties")
async def get_database_properties(
    page_id: str,
    current_user: str = Depends(get_current_user)
):
    """Get all properties for a database page"""
    # Verify page belongs to user
    page_response = supabase_admin.table("pages").select("*").eq("id", page_id).eq("user_id", current_user).execute()
    if not page_response.data:
        raise HTTPException(status_code=404, detail="Page not found")
    
    # Get properties
    response = supabase_admin.table("database_properties")\
        .select("*")\
        .eq("page_id", page_id)\
        .order("property_order")\
        .execute()
    
    return response.data

@router.post("/pages/{page_id}/properties")
async def create_database_property(
    page_id: str,
    property: PropertyCreate,
    current_user: str = Depends(get_current_user)
):
    """Create a new property for a database page"""
    # Verify page belongs to user
    page_response = supabase_admin.table("pages").select("*").eq("id", page_id).eq("user_id", current_user).execute()
    if not page_response.data:
        raise HTTPException(status_code=404, detail="Page not found")
    
    # Create property
    response = supabase_admin.table("database_properties").insert({
        "page_id": page_id,
        "name": property.name,
        "property_type": property.property_type,
        "config": property.config,
        "property_order": property.property_order
    }).execute()
    
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to create property")
    
    return response.data[0]

@router.patch("/database/properties/{property_id}")
async def update_database_property(
    property_id: str,
    updates: PropertyUpdate,
    current_user: str = Depends(get_current_user)
):
    """Update a database property"""
    # Verify property belongs to user's page
    property_response = supabase_admin.table("database_properties")\
        .select("*, pages!inner(user_id)")\
        .eq("id", property_id)\
        .execute()
    
    if not property_response.data or property_response.data[0]["pages"]["user_id"] != current_user:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Update property
    update_data = {k: v for k, v in updates.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow().isoformat()
    
    response = supabase_admin.table("database_properties")\
        .update(update_data)\
        .eq("id", property_id)\
        .execute()
    
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to update property")
    
    return response.data[0]

@router.delete("/database/properties/{property_id}")
async def delete_database_property(
    property_id: str,
    current_user: str = Depends(get_current_user)
):
    """Delete a database property"""
    # Verify property belongs to user's page
    property_response = supabase_admin.table("database_properties")\
        .select("*, pages!inner(user_id)")\
        .eq("id", property_id)\
        .execute()
    
    if not property_response.data or property_response.data[0]["pages"]["user_id"] != current_user:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Delete property
    supabase_admin.table("database_properties")\
        .delete()\
        .eq("id", property_id)\
        .execute()
    
    return {"message": "Property deleted successfully"}

# Database Rows Endpoints
@router.get("/pages/{page_id}/rows")
async def get_database_rows(
    page_id: str,
    current_user: str = Depends(get_current_user)
):
    """Get all rows for a database page"""
    # Verify page belongs to user
    page_response = supabase_admin.table("pages").select("*").eq("id", page_id).eq("user_id", current_user).execute()
    if not page_response.data:
        raise HTTPException(status_code=404, detail="Page not found")
    
    # Get rows
    response = supabase_admin.table("database_rows")\
        .select("*")\
        .eq("database_page_id", page_id)\
        .order("row_order")\
        .execute()
    
    return response.data

@router.post("/pages/{page_id}/rows")
async def create_database_row(
    page_id: str,
    row: RowCreate,
    current_user: str = Depends(get_current_user)
):
    """Create a new row in a database page"""
    # Verify page belongs to user
    page_response = supabase_admin.table("pages").select("*").eq("id", page_id).eq("user_id", current_user).execute()
    if not page_response.data:
        raise HTTPException(status_code=404, detail="Page not found")
    
    # Get current row count for ordering
    count_response = supabase_admin.table("database_rows")\
        .select("id", count="exact")\
        .eq("database_page_id", page_id)\
        .execute()
    
    row_order = count_response.count if count_response.count else 0
    
    # Create row
    response = supabase_admin.table("database_rows").insert({
        "database_page_id": page_id,
        "properties": row.properties,
        "row_order": row_order,
        "created_by": current_user
    }).execute()
    
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to create row")
    
    return response.data[0]

@router.patch("/database/rows/{row_id}")
async def update_database_row(
    row_id: str,
    updates: RowUpdate,
    current_user: str = Depends(get_current_user)
):
    """Update a database row"""
    # Verify row belongs to user's page
    row_response = supabase_admin.table("database_rows")\
        .select("*, pages!database_rows_database_page_id_fkey(user_id)")\
        .eq("id", row_id)\
        .execute()
    
    if not row_response.data or row_response.data[0]["pages"]["user_id"] != current_user:
        raise HTTPException(status_code=404, detail="Row not found")
    
    # Update row
    update_data = {
        "properties": updates.properties,
        "updated_at": datetime.utcnow().isoformat()
    }
    
    response = supabase_admin.table("database_rows")\
        .update(update_data)\
        .eq("id", row_id)\
        .execute()
    
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to update row")
    
    return response.data[0]

@router.delete("/database/rows/{row_id}")
async def delete_database_row(
    row_id: str,
    current_user: str = Depends(get_current_user)
):
    """Delete a database row"""
    # Verify row belongs to user's page
    row_response = supabase_admin.table("database_rows")\
        .select("*, pages!database_rows_database_page_id_fkey(user_id)")\
        .eq("id", row_id)\
        .execute()
    
    if not row_response.data or row_response.data[0]["pages"]["user_id"] != current_user:
        raise HTTPException(status_code=404, detail="Row not found")
    
    # Delete row
    supabase_admin.table("database_rows")\
        .delete()\
        .eq("id", row_id)\
        .execute()
    
    return {"message": "Row deleted successfully"}
