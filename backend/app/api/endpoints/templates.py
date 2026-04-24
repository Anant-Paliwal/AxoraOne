from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.core.supabase import supabase_admin
from app.api.dependencies import get_current_user

router = APIRouter()

class TemplateResponse(BaseModel):
    id: str
    title: str
    content: str
    icon: str
    tags: List[str]
    template_category: str
    template_description: str
    template_preview_image: Optional[str]
    use_count: int
    is_public_template: bool
    metadata: Dict[str, Any]
    created_at: datetime

class TemplateCreate(BaseModel):
    page_id: str
    template_category: str
    template_description: str
    is_public: bool = False

@router.get("/categories")
async def get_template_categories():
    """Get all available template categories"""
    return {
        "categories": [
            {
                "id": "work",
                "name": "Work & Business",
                "icon": "Briefcase",
                "description": "Templates for professional work and business"
            },
            {
                "id": "education",
                "name": "Education & Learning",
                "icon": "GraduationCap",
                "description": "Templates for studying and teaching"
            },
            {
                "id": "personal",
                "name": "Personal",
                "icon": "User",
                "description": "Templates for personal use and journaling"
            },
            {
                "id": "writing",
                "name": "Writing & Content",
                "icon": "PenTool",
                "description": "Templates for blogs, articles, and creative writing"
            },
            {
                "id": "technical",
                "name": "Technical & Development",
                "icon": "Code",
                "description": "Templates for software development and documentation"
            },
            {
                "id": "business",
                "name": "Business & Strategy",
                "icon": "Building",
                "description": "Templates for business planning and strategy"
            }
        ]
    }

@router.get("")
async def get_templates(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search templates"),
    user_id: str = Depends(get_current_user)
):
    """Get all available templates (public + user's custom templates)"""
    try:
        # Build query for public templates
        public_query = supabase_admin.table("pages").select("*")
        public_query = public_query.eq("is_template", True).eq("is_public_template", True)
        
        if category:
            public_query = public_query.eq("template_category", category)
        
        if search:
            public_query = public_query.ilike("title", f"%{search}%")
        
        public_templates = public_query.execute()
        
        # Build query for user's custom templates
        user_query = supabase_admin.table("pages").select("*")
        user_query = user_query.eq("is_template", True).eq("user_id", user_id).eq("is_public_template", False)
        
        if category:
            user_query = user_query.eq("template_category", category)
        
        if search:
            user_query = user_query.ilike("title", f"%{search}%")
        
        user_templates = user_query.execute()
        
        # Combine and sort by use_count
        all_templates = (public_templates.data if public_templates.data else []) + (user_templates.data if user_templates.data else [])
        all_templates.sort(key=lambda x: x.get("use_count", 0), reverse=True)
        
        # Group by category
        grouped = {}
        for template in all_templates:
            cat = template.get("template_category", "other")
            if cat not in grouped:
                grouped[cat] = []
            grouped[cat].append(template)
        
        return {
            "templates": all_templates,
            "grouped": grouped,
            "total": len(all_templates)
        }
    except Exception as e:
        print(f"Error fetching templates: {str(e)}")
        # Return empty results instead of error
        return {
            "templates": [],
            "grouped": {},
            "total": 0
        }

@router.get("/{template_id}")
async def get_template(template_id: str, user_id: str = Depends(get_current_user)):
    """Get a specific template"""
    try:
        response = supabase_admin.table("pages").select("*").eq("id", template_id).eq("is_template", True).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Template not found")
        
        template = response.data[0]
        
        # Check if user has access (public or owned by user)
        if not template.get("is_public_template") and template.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return template
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class UseTemplateRequest(BaseModel):
    workspace_id: str
    title: Optional[str] = None

@router.post("/{template_id}/use")
async def use_template(
    template_id: str,
    request: UseTemplateRequest,
    user_id: str = Depends(get_current_user)
):
    """Create a new page from a template"""
    try:
        # Get template
        template_response = supabase_admin.table("pages").select("*").eq("id", template_id).eq("is_template", True).execute()
        
        if not template_response.data:
            raise HTTPException(status_code=404, detail="Template not found")
        
        template = template_response.data[0]
        
        # Check access
        if not template.get("is_public_template") and template.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Create new page from template
        new_page_data = {
            "user_id": user_id,
            "workspace_id": request.workspace_id,
            "title": request.title or template["title"],
            "content": template["content"],
            "icon": template["icon"],
            "tags": template.get("tags", []),
            "blocks": template.get("blocks", []),
            "metadata": {
                **template.get("metadata", {}),
                "created_from_template": template_id,
                "template_name": template["title"]
            }
        }
        
        new_page = supabase_admin.table("pages").insert(new_page_data).execute()
        
        if not new_page.data:
            raise HTTPException(status_code=500, detail="Failed to create page from template")
        
        # Increment template usage count
        try:
            supabase_admin.rpc("increment_template_usage", {"template_id_param": template_id}).execute()
        except Exception as e:
            print(f"Failed to increment template usage: {e}")
        
        return {
            "page": new_page.data[0],
            "template_id": template_id,
            "message": "Page created from template successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error using template: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to use template: {str(e)}")

@router.post("/create")
async def create_custom_template(
    template: TemplateCreate,
    user_id: str = Depends(get_current_user)
):
    """Convert an existing page into a custom template"""
    try:
        # Get the page
        page_response = supabase_admin.table("pages").select("*").eq("id", template.page_id).eq("user_id", user_id).execute()
        
        if not page_response.data:
            raise HTTPException(status_code=404, detail="Page not found")
        
        # Update page to be a template
        update_data = {
            "is_template": True,
            "is_public_template": template.is_public,
            "template_category": template.template_category,
            "template_description": template.template_description
        }
        
        updated = supabase_admin.table("pages").update(update_data).eq("id", template.page_id).eq("user_id", user_id).execute()
        
        if not updated.data:
            raise HTTPException(status_code=500, detail="Failed to create template")
        
        return {
            "template": updated.data[0],
            "message": "Template created successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create template: {str(e)}")

@router.delete("/{template_id}")
async def delete_custom_template(template_id: str, user_id: str = Depends(get_current_user)):
    """Delete a custom template (only user's own templates)"""
    try:
        # Check if template exists and belongs to user
        template = supabase_admin.table("pages").select("*").eq("id", template_id).eq("user_id", user_id).eq("is_template", True).execute()
        
        if not template.data:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Don't allow deleting public templates
        if template.data[0].get("is_public_template"):
            raise HTTPException(status_code=403, detail="Cannot delete public templates")
        
        # Convert back to regular page or delete
        supabase_admin.table("pages").update({
            "is_template": False,
            "template_category": None,
            "template_description": None
        }).eq("id", template_id).eq("user_id", user_id).execute()
        
        return {"message": "Template removed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/popular")
async def get_popular_templates(
    limit: int = Query(10, ge=1, le=50),
    user_id: str = Depends(get_current_user)
):
    """Get most popular templates"""
    try:
        response = supabase_admin.table("pages").select("*").eq("is_template", True).eq("is_public_template", True).order("use_count", desc=True).limit(limit).execute()
        
        return {
            "templates": response.data if response.data else [],
            "count": len(response.data) if response.data else 0
        }
    except Exception as e:
        print(f"Error fetching popular templates: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return empty list instead of error
        return {
            "templates": [],
            "count": 0
        }

@router.get("/recent")
async def get_recent_templates(
    limit: int = Query(10, ge=1, le=50),
    user_id: str = Depends(get_current_user)
):
    """Get recently added templates"""
    try:
        response = supabase_admin.table("pages").select("*").eq("is_template", True).eq("is_public_template", True).order("created_at", desc=True).limit(limit).execute()
        
        return {
            "templates": response.data if response.data else [],
            "count": len(response.data) if response.data else 0
        }
    except Exception as e:
        print(f"Error fetching recent templates: {str(e)}")
        # Return empty list instead of error
        return {
            "templates": [],
            "count": 0
        }
