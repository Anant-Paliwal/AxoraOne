from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.core.supabase import supabase_admin
from app.services.vector_store import vector_store_service
from app.services.subscription_service import SubscriptionService
from app.api.dependencies import get_current_user
from bs4 import BeautifulSoup
import re

router = APIRouter()

def convert_html_to_blocks(html_content: str) -> List[dict]:
    """
    Convert HTML content to structured blocks
    This ensures old pages with HTML content are properly converted to blocks
    """
    if not html_content or html_content.strip() == "":
        return [{
            "id": f"text-{datetime.now().timestamp()}",
            "type": "text",
            "position": 0,
            "data": {"content": ""}
        }]
    
    blocks = []
    position = 0
    
    try:
        # Parse HTML
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Get all top-level elements
        elements = soup.find_all(recursive=False) if soup.find_all(recursive=False) else [soup]
        
        for element in elements:
            text_content = element.get_text(strip=True)
            
            if not text_content:
                continue
            
            tag_name = element.name.lower() if element.name else 'p'
            
            # Convert based on HTML tag
            if tag_name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                # Heading block
                level = int(tag_name[1])
                blocks.append({
                    "id": f"heading-{datetime.now().timestamp()}-{position}",
                    "type": "heading",
                    "position": position,
                    "data": {
                        "content": text_content,
                        "level": level
                    }
                })
                position += 1
                
            elif tag_name in ['ul', 'ol']:
                # Extract list items
                items = element.find_all('li', recursive=False)
                for idx, li in enumerate(items):
                    item_text = li.get_text(strip=True)
                    if item_text:
                        blocks.append({
                            "id": f"text-{datetime.now().timestamp()}-{position}-{idx}",
                            "type": "text",
                            "position": position,
                            "data": {"content": f"• {item_text}"}
                        })
                        position += 1
                        
            elif tag_name == 'blockquote':
                # Quote block
                blocks.append({
                    "id": f"quote-{datetime.now().timestamp()}-{position}",
                    "type": "quote",
                    "position": position,
                    "data": {"content": text_content}
                })
                position += 1
                
            elif tag_name == 'pre' or tag_name == 'code':
                # Code block
                blocks.append({
                    "id": f"code-{datetime.now().timestamp()}-{position}",
                    "type": "code",
                    "position": position,
                    "data": {
                        "content": text_content,
                        "language": "text"
                    }
                })
                position += 1
                
            else:
                # Default text block
                blocks.append({
                    "id": f"text-{datetime.now().timestamp()}-{position}",
                    "type": "text",
                    "position": position,
                    "data": {"content": text_content}
                })
                position += 1
        
        # If no blocks were created, create a default text block with plain text
        if not blocks:
            plain_text = soup.get_text(strip=True)
            blocks.append({
                "id": f"text-{datetime.now().timestamp()}",
                "type": "text",
                "position": 0,
                "data": {"content": plain_text}
            })
            
    except Exception as e:
        print(f"Error converting HTML to blocks: {e}")
        # Fallback: create single text block with plain text
        plain_text = re.sub('<[^<]+?>', '', html_content).strip()
        blocks.append({
            "id": f"text-{datetime.now().timestamp()}",
            "type": "text",
            "position": 0,
            "data": {"content": plain_text}
        })
    
    return blocks

class PageCreate(BaseModel):
    title: str
    content: str = ""
    icon: str = "📄"
    tags: List[str] = []
    workspace_id: Optional[str] = None
    parent_page_id: Optional[str] = None
    page_order: Optional[int] = 0
    blocks: Optional[List[dict]] = []
    metadata: Optional[dict] = {}
    is_template: Optional[bool] = False
    cover_image: Optional[str] = None
    page_type: Optional[str] = "blank"
    view_type: Optional[str] = "page"
    database_config: Optional[dict] = {}
    
    @validator('title')
    def title_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Title cannot be empty')
        return v.strip()

class PageUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    icon: Optional[str] = None
    tags: Optional[List[str]] = None
    is_favorite: Optional[bool] = None
    is_archived: Optional[bool] = None
    parent_page_id: Optional[str] = None
    page_order: Optional[int] = None
    blocks: Optional[List[dict]] = None
    metadata: Optional[dict] = None
    cover_image: Optional[str] = None
    page_type: Optional[str] = None
    view_type: Optional[str] = None
    database_config: Optional[dict] = None
    
    @validator('title')
    def title_not_empty(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Title cannot be empty')
        return v.strip() if v else None

class PageResponse(BaseModel):
    id: str
    user_id: str
    workspace_id: Optional[str]
    title: str
    content: str
    icon: str
    tags: List[str]
    is_favorite: bool
    is_archived: bool
    is_template: bool
    view_count: int
    word_count: int
    estimated_reading_time: int
    parent_page_id: Optional[str]
    page_order: int
    cover_image: Optional[str]
    created_at: datetime
    updated_at: datetime
    last_viewed_at: Optional[datetime]

class PaginatedResponse(BaseModel):
    items: List[Dict[Any, Any]]
    total: int
    page: int
    page_size: int
    total_pages: int

@router.get("")
async def get_pages(
    user_id: str = Depends(get_current_user),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("updated_at", description="Field to sort by"),
    order: str = Query("desc", regex="^(asc|desc)$", description="Sort order"),
    workspace_id: Optional[str] = Query(None, description="Filter by workspace"),
    is_archived: bool = Query(False, description="Include archived pages"),
    is_favorite: Optional[bool] = Query(None, description="Filter by favorite status"),
    search: Optional[str] = Query(None, description="Search query")
):
    """Get paginated pages for the current user with filtering and search"""
    try:
        # Build base query
        query = supabase_admin.table("pages").select("*", count="exact")
        query = query.eq("user_id", user_id)
        
        # CRITICAL: Exclude deleted pages
        query = query.is_("deleted_at", "null")
        
        # Apply filters
        if not is_archived:
            query = query.eq("is_archived", False)
        
        if workspace_id:
            query = query.eq("workspace_id", workspace_id)
        
        if is_favorite is not None:
            query = query.eq("is_favorite", is_favorite)
        
        # Apply search if provided
        if search:
            # Use full-text search
            query = query.text_search("search_vector", f"'{search}'")
        
        # Apply sorting
        if order == "desc":
            query = query.order(sort_by, desc=True)
        else:
            query = query.order(sort_by)
        
        # Apply pagination
        offset = (page - 1) * page_size
        query = query.range(offset, offset + page_size - 1)
        
        response = query.execute()
        
        total = response.count if hasattr(response, 'count') else len(response.data)
        total_pages = (total + page_size - 1) // page_size
        
        return PaginatedResponse(
            items=response.data,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    except Exception as e:
        print(f"Error fetching pages: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch pages: {str(e)}")

@router.post("")
async def create_page(
    page: PageCreate, 
    user_id: str = Depends(get_current_user)
):
    """Create a new page"""
    try:
        print(f"Creating page for user {user_id}: {page.dict()}")
        
        # Validate workspace access if provided (owner OR member)
        if page.workspace_id:
            from app.api.helpers.workspace_access import check_workspace_access, can_edit
            access = await check_workspace_access(user_id, page.workspace_id)
            
            if not access["has_access"]:
                raise HTTPException(status_code=404, detail="Workspace not found")
            
            # Check if user can edit (member, admin, or owner)
            if not can_edit(access["role"]):
                raise HTTPException(status_code=403, detail="You don't have permission to create pages in this workspace")
            
            # ✅ PAGES ARE UNLIMITED - No subscription limit check needed
        
        # Validate parent page exists if provided (owner OR workspace member)
        if page.parent_page_id:
            parent_page = supabase_admin.table("pages").select("id, user_id, workspace_id").eq("id", page.parent_page_id).execute()
            if not parent_page.data:
                raise HTTPException(status_code=404, detail="Parent page not found")
            
            parent = parent_page.data[0]
            # Check if user owns parent OR has workspace access
            if parent.get("user_id") != user_id:
                if parent.get("workspace_id"):
                    from app.api.helpers.workspace_access import check_workspace_access
                    parent_access = await check_workspace_access(user_id, parent["workspace_id"])
                    if not parent_access["has_access"]:
                        raise HTTPException(status_code=403, detail="Not authorized to use this parent page")
                else:
                    raise HTTPException(status_code=403, detail="Not authorized to use this parent page")
        
        # Convert HTML content to blocks if no blocks provided
        blocks_to_save = page.blocks or []
        if not blocks_to_save and page.content:
            # Check if content contains HTML tags
            if '<' in page.content and '>' in page.content:
                print(f"Converting HTML content to blocks for page: {page.title}")
                blocks_to_save = convert_html_to_blocks(page.content)
                print(f"Converted to {len(blocks_to_save)} blocks")
        
        # Insert into database
        page_data = {
            "user_id": user_id,
            "title": page.title,
            "content": page.content,
            "icon": page.icon,
            "tags": page.tags,
            "workspace_id": page.workspace_id,
            "parent_page_id": page.parent_page_id,
            "page_order": page.page_order or 0,
            "blocks": blocks_to_save,
            "metadata": page.metadata or {},
            "is_template": page.is_template or False,
            "cover_image": page.cover_image
        }
        print(f"Inserting page data: {page_data}")
        
        response = supabase_admin.table("pages").insert(page_data).execute()
        
        print(f"Supabase response: {response}")
        
        if not response.data:
            print("ERROR: No data returned from Supabase")
            raise HTTPException(status_code=500, detail="Failed to create page - no data returned")
        
        page_result = response.data[0]
        print(f"Page created successfully: {page_result}")
        
        # Add to vector store (async, non-blocking)
        try:
            await vector_store_service.add_page(
                page_id=page_result["id"],
                title=page.title,
                content=page.content,
                metadata={
                    "title": page.title,
                    "tags": page.tags,
                    "user_id": user_id,
                    "workspace_id": page_result.get("workspace_id")
                }
            )
        except Exception as vector_error:
            print(f"Vector store error (non-fatal): {vector_error}")
        
        # Emit signal to intelligence engine (async, non-blocking)
        try:
            if page_result.get("workspace_id"):
                from app.services.intelligence_engine import intelligence_engine, Signal, SignalType
                await intelligence_engine.emit_signal(Signal(
                    type=SignalType.PAGE_CREATED,
                    source_id=page_result["id"],
                    source_type="page",
                    workspace_id=page_result["workspace_id"],
                    user_id=user_id,
                    data={
                        "id": page_result["id"],
                        "title": page.title,
                        "content": page.content,
                        "tags": page.tags,
                        "icon": page.icon
                    },
                    priority=5
                ))
        except Exception as signal_error:
            print(f"Intelligence signal error (non-fatal): {signal_error}")
        
        # AUTO-LINK to skills (async, non-blocking)
        try:
            if page_result.get("workspace_id"):
                from app.services.skill_auto_linker import auto_linker
                
                links = await auto_linker.analyze_and_link_page(
                    page_id=page_result["id"],
                    page_title=page.title,
                    page_content=page.content or "",
                    page_tags=page.tags or [],
                    workspace_id=page_result["workspace_id"],
                    user_id=user_id
                )
                
                if links:
                    print(f"✅ Auto-linked page '{page.title}' to {len(links)} skills")
                    for link in links:
                        print(f"   - {link['skill_name']} ({link['confidence']:.0%} confidence)")
        except Exception as auto_link_error:
            print(f"⚠️ Auto-linking error (non-fatal): {auto_link_error}")
        
        return page_result
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR creating page: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create page: {str(e)}")

@router.get("/by-workspace/{workspace_id}")
async def get_pages_by_workspace(workspace_id: str, user_id: str = Depends(get_current_user)):
    """Get all pages for a specific workspace (owner or member)"""
    try:
        # Check workspace access
        from app.api.helpers import check_workspace_access
        access = await check_workspace_access(user_id, workspace_id)
        
        if not access["has_access"]:
            raise HTTPException(status_code=403, detail="Not authorized to access this workspace")
        
        # Get all pages in workspace (not filtered by user_id)
        response = supabase_admin.table("pages")\
            .select("*")\
            .eq("workspace_id", workspace_id)\
            .eq("is_archived", False)\
            .is_("deleted_at", "null")\
            .order("page_order")\
            .execute()
        return response.data
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting pages by workspace: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{page_id}")
async def get_page(page_id: str, user_id: str = Depends(get_current_user), track_view: bool = Query(True, description="Track page view")):
    """Get a specific page (owner or workspace member)"""
    try:
        # First get the page
        response = supabase_admin.table("pages")\
            .select("*")\
            .eq("id", page_id)\
            .is_("deleted_at", "null")\
            .execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Page not found")
        
        page = response.data[0]
        
        # Check if user owns the page OR has workspace access
        has_access = False
        if page.get("user_id") == user_id:
            has_access = True
        else:
            # Check workspace access
            if page.get("workspace_id"):
                from app.api.helpers import check_workspace_access
                access = await check_workspace_access(user_id, page["workspace_id"])
                if access["has_access"]:
                    has_access = True
        
        if not has_access:
            raise HTTPException(status_code=403, detail="Not authorized to access this page")
        
        # Track view count if requested
        if track_view:
            try:
                current_count = page.get("view_count") or 0
                supabase_admin.table("pages").update({
                    "view_count": current_count + 1,
                    "last_viewed_at": datetime.utcnow().isoformat()
                }).eq("id", page_id).execute()
            except Exception as view_err:
                # Don't fail the request if view tracking fails
                print(f"View tracking failed: {view_err}")
        
        return page
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching page {page_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{page_id}")
async def update_page(page_id: str, page: PageUpdate, user_id: str = Depends(get_current_user)):
    """Update a page"""
    try:
        # Get the page to check workspace access
        page_check = supabase_admin.table("pages")\
            .select("id, user_id, workspace_id, blocks")\
            .eq("id", page_id)\
            .is_("deleted_at", "null")\
            .execute()
        if not page_check.data:
            raise HTTPException(status_code=404, detail="Page not found")
        
        existing_page = page_check.data[0]
        
        # Check if user owns page OR has workspace access
        if existing_page.get("user_id") != user_id:
            if existing_page.get("workspace_id"):
                from app.api.helpers.workspace_access import check_workspace_access, can_edit
                access = await check_workspace_access(user_id, existing_page["workspace_id"])
                if not access["has_access"] or not can_edit(access["role"]):
                    raise HTTPException(status_code=403, detail="Not authorized to update this page")
            else:
                raise HTTPException(status_code=403, detail="Not authorized to update this page")
        
        update_data = {k: v for k, v in page.dict().items() if v is not None}
        
        # Convert HTML content to blocks if content is being updated and no blocks exist
        if page.content is not None and (not existing_page.get("blocks") or len(existing_page.get("blocks", [])) == 0):
            if '<' in page.content and '>' in page.content:
                print(f"Converting HTML content to blocks for page update: {page_id}")
                update_data["blocks"] = convert_html_to_blocks(page.content)
                print(f"Converted to {len(update_data['blocks'])} blocks")
        
        response = supabase_admin.table("pages").update(update_data).eq("id", page_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Page not found")
        
        page_data = response.data[0]
        
        # Update vector store if content changed
        if page.content is not None or page.title is not None:
            await vector_store_service.add_page(
                page_id=page_id,
                title=page_data["title"],
                content=page_data["content"],
                metadata={
                    "title": page_data["title"],
                    "tags": page_data["tags"],
                    "user_id": user_id,
                    "workspace_id": page_data.get("workspace_id")
                }
            )
        
        # Emit signal to intelligence engine - SKILLS OBSERVE PAGE EDITS
        try:
            if page_data.get("workspace_id"):
                from app.services.intelligence_engine import intelligence_engine, Signal, SignalType
                await intelligence_engine.emit_signal(Signal(
                    type=SignalType.PAGE_EDITED,
                    source_id=page_id,
                    source_type="page",
                    workspace_id=page_data["workspace_id"],
                    user_id=user_id,
                    data={
                        "id": page_id,
                        "title": page_data.get("title"),
                        "content": page_data.get("content", ""),
                        "tags": page_data.get("tags", []),
                        "blocks": page_data.get("blocks", []),
                        "updated_fields": list(update_data.keys())
                    },
                    priority=5
                ))
        except Exception as signal_error:
            print(f"Intelligence signal error (non-fatal): {signal_error}")
        
        return page_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{page_id}")
async def delete_page(page_id: str, user_id: str = Depends(get_current_user)):
    """Delete a page"""
    try:
        # Get the page to check workspace access
        page_check = supabase_admin.table("pages").select("id, user_id, workspace_id").eq("id", page_id).execute()
        if not page_check.data:
            raise HTTPException(status_code=404, detail="Page not found")
        
        existing_page = page_check.data[0]
        
        # Check if user owns page OR is workspace admin/owner
        if existing_page.get("user_id") != user_id:
            if existing_page.get("workspace_id"):
                from app.api.helpers.workspace_access import check_workspace_access, can_admin
                access = await check_workspace_access(user_id, existing_page["workspace_id"])
                if not access["has_access"] or not can_admin(access["role"]):
                    raise HTTPException(status_code=403, detail="Not authorized to delete this page")
            else:
                raise HTTPException(status_code=403, detail="Not authorized to delete this page")
        
        # Delete from database
        response = supabase_admin.table("pages").delete().eq("id", page_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Page not found")
        
        # Delete from vector store
        try:
            await vector_store_service.delete_page(page_id)
            print(f"Deleted page {page_id} from vector store")
        except Exception as vector_error:
            print(f"Vector store deletion error (non-fatal): {vector_error}")
        
        return {"message": "Page deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{page_id}/subpages")
async def get_subpages(page_id: str, user_id: str = Depends(get_current_user)):
    """Get all sub-pages for a specific page"""
    try:
        response = supabase_admin.table("pages")\
            .select("*")\
            .eq("parent_page_id", page_id)\
            .eq("user_id", user_id)\
            .is_("deleted_at", "null")\
            .order("page_order")\
            .execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search")
async def search_pages(
    query: str,
    user_id: str = Depends(get_current_user),
    workspace_id: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100)
):
    """Full-text search across pages"""
    try:
        # Build search query
        search_query = supabase_admin.table("pages")\
            .select("id, title, content, icon, tags, workspace_id, updated_at, word_count, estimated_reading_time")
        search_query = search_query.eq("user_id", user_id)\
            .eq("is_archived", False)\
            .is_("deleted_at", "null")
        
        if workspace_id:
            search_query = search_query.eq("workspace_id", workspace_id)
        
        # Use full-text search
        search_query = search_query.text_search("search_vector", f"'{query}'")
        search_query = search_query.limit(limit)
        
        response = search_query.execute()
        
        # Add relevance score and snippet
        results = []
        for page in response.data:
            # Create snippet from content
            content = page.get("content", "")
            snippet = content[:200] + "..." if len(content) > 200 else content
            
            results.append({
                **page,
                "snippet": snippet
            })
        
        return {
            "query": query,
            "results": results,
            "count": len(results)
        }
    except Exception as e:
        print(f"Search error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.post("/bulk-update")
async def bulk_update_pages(
    page_ids: List[str],
    updates: PageUpdate,
    user_id: str = Depends(get_current_user)
):
    """Bulk update multiple pages"""
    try:
        if not page_ids:
            raise HTTPException(status_code=400, detail="No page IDs provided")
        
        update_data = {k: v for k, v in updates.dict().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No updates provided")
        
        # Update all pages
        response = supabase_admin.table("pages").update(update_data).in_("id", page_ids).eq("user_id", user_id).execute()
        
        return {
            "updated_count": len(response.data),
            "page_ids": [p["id"] for p in response.data]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bulk update failed: {str(e)}")

@router.post("/bulk-delete")
async def bulk_delete_pages(
    page_ids: List[str],
    user_id: str = Depends(get_current_user),
    permanent: bool = False
):
    """Bulk delete (archive) multiple pages"""
    try:
        if not page_ids:
            raise HTTPException(status_code=400, detail="No page IDs provided")
        
        if permanent:
            # Permanent delete
            response = supabase_admin.table("pages").delete().in_("id", page_ids).eq("user_id", user_id).execute()
            
            # Delete from vector store
            for page_id in page_ids:
                try:
                    await vector_store_service.delete_page(page_id)
                except Exception as vector_error:
                    print(f"Vector store deletion error (non-fatal): {vector_error}")
        else:
            # Soft delete (archive)
            response = supabase_admin.table("pages").update({"is_archived": True}).in_("id", page_ids).eq("user_id", user_id).execute()
        
        return {
            "deleted_count": len(response.data),
            "page_ids": [p["id"] for p in response.data],
            "permanent": permanent
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bulk delete failed: {str(e)}")

@router.post("/{page_id}/duplicate")
async def duplicate_page(
    page_id: str,
    user_id: str = Depends(get_current_user),
    title_suffix: str = " (Copy)"
):
    """Duplicate a page"""
    try:
        # Get original page
        original = supabase_admin.table("pages").select("*").eq("id", page_id).eq("user_id", user_id).execute()
        
        if not original.data:
            raise HTTPException(status_code=404, detail="Page not found")
        
        page_data = original.data[0]
        
        # Create duplicate
        duplicate_data = {
            "user_id": user_id,
            "workspace_id": page_data.get("workspace_id"),
            "title": page_data["title"] + title_suffix,
            "content": page_data.get("content", ""),
            "icon": page_data.get("icon", "📄"),
            "tags": page_data.get("tags", []),
            "blocks": page_data.get("blocks", []),
            "metadata": page_data.get("metadata", {}),
            "cover_image": page_data.get("cover_image")
        }
        
        response = supabase_admin.table("pages").insert(duplicate_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to duplicate page")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Duplication failed: {str(e)}")

@router.post("/{page_id}/view")
async def track_page_view(page_id: str, user_id: str = Depends(get_current_user)):
    """Track page view for analytics"""
    try:
        # Increment view count and update last viewed timestamp
        response = supabase_admin.rpc(
            "increment_page_view",
            {"page_id_param": page_id, "user_id_param": user_id}
        ).execute()
        
        # If RPC doesn't exist, fallback to manual update
        if not response.data:
            current = supabase_admin.table("pages").select("view_count").eq("id", page_id).eq("user_id", user_id).execute()
            if current.data:
                new_count = (current.data[0].get("view_count", 0) or 0) + 1
                supabase_admin.table("pages").update({
                    "view_count": new_count,
                    "last_viewed_at": datetime.utcnow().isoformat()
                }).eq("id", page_id).eq("user_id", user_id).execute()
        
        return {"success": True}
    except Exception as e:
        print(f"View tracking error (non-fatal): {str(e)}")
        return {"success": False, "error": str(e)}

@router.get("/{page_id}/analytics")
async def get_page_analytics(page_id: str, user_id: str = Depends(get_current_user)):
    """Get analytics for a specific page"""
    try:
        page = supabase_admin.table("pages").select("view_count, word_count, estimated_reading_time, created_at, updated_at, last_viewed_at").eq("id", page_id).eq("user_id", user_id).execute()
        
        if not page.data:
            raise HTTPException(status_code=404, detail="Page not found")
        
        page_data = page.data[0]
        
        # Get related learning objects count
        quizzes = supabase_admin.table("quizzes").select("id", count="exact").eq("source_page_id", page_id).execute()
        flashcards = supabase_admin.table("flashcard_decks").select("id", count="exact").eq("source_page_id", page_id).execute()
        
        return {
            "page_id": page_id,
            "view_count": page_data.get("view_count", 0),
            "word_count": page_data.get("word_count", 0),
            "estimated_reading_time": page_data.get("estimated_reading_time", 0),
            "created_at": page_data.get("created_at"),
            "updated_at": page_data.get("updated_at"),
            "last_viewed_at": page_data.get("last_viewed_at"),
            "learning_objects": {
                "quizzes": quizzes.count if hasattr(quizzes, 'count') else 0,
                "flashcards": flashcards.count if hasattr(flashcards, 'count') else 0
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get analytics: {str(e)}")

@router.get("/templates")
async def get_page_templates(user_id: str = Depends(get_current_user)):
    """Get all page templates"""
    try:
        response = supabase_admin.table("pages").select("*").eq("user_id", user_id).eq("is_template", True).eq("is_archived", False).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{page_id}/make-template")
async def make_page_template(page_id: str, user_id: str = Depends(get_current_user)):
    """Convert a page to a template"""
    try:
        response = supabase_admin.table("pages").update({"is_template": True}).eq("id", page_id).eq("user_id", user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Page not found")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# Database Properties Endpoints (for database pages)
@router.get("/{page_id}/properties")
async def get_database_properties(
    page_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get all properties for a database page"""
    try:
        # Verify page belongs to user
        page_response = supabase_admin.table("pages").select("*").eq("id", page_id).eq("user_id", user_id).execute()
        if not page_response.data:
            raise HTTPException(status_code=404, detail="Page not found")
        
        # Get properties
        response = supabase_admin.table("database_properties")\
            .select("*")\
            .eq("page_id", page_id)\
            .order("property_order")\
            .execute()
        
        return response.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get properties: {str(e)}")

@router.post("/{page_id}/properties")
async def create_database_property(
    page_id: str,
    property: Dict[str, Any],
    user_id: str = Depends(get_current_user)
):
    """Create a new property for a database page"""
    try:
        # Verify page belongs to user
        page_response = supabase_admin.table("pages").select("*").eq("id", page_id).eq("user_id", user_id).execute()
        if not page_response.data:
            raise HTTPException(status_code=404, detail="Page not found")
        
        # Create property
        response = supabase_admin.table("database_properties").insert({
            "page_id": page_id,
            "name": property.get("name"),
            "property_type": property.get("property_type"),
            "config": property.get("config", {}),
            "property_order": property.get("property_order", 0)
        }).execute()
        
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create property")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create property: {str(e)}")

# Database Rows Endpoints (for database pages)
@router.get("/{page_id}/rows")
async def get_database_rows(
    page_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get all rows for a database page"""
    try:
        # Verify page belongs to user
        page_response = supabase_admin.table("pages").select("*").eq("id", page_id).eq("user_id", user_id).execute()
        if not page_response.data:
            raise HTTPException(status_code=404, detail="Page not found")
        
        # Get rows
        response = supabase_admin.table("database_rows")\
            .select("*")\
            .eq("database_page_id", page_id)\
            .order("row_order")\
            .execute()
        
        return response.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get rows: {str(e)}")

@router.post("/{page_id}/rows")
async def create_database_row(
    page_id: str,
    row: Dict[str, Any],
    user_id: str = Depends(get_current_user)
):
    """Create a new row in a database page"""
    try:
        # Verify page belongs to user
        page_response = supabase_admin.table("pages").select("*").eq("id", page_id).eq("user_id", user_id).execute()
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
            "properties": row.get("properties", {}),
            "row_order": row_order,
            "created_by": user_id
        }).execute()
        
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create row")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create row: {str(e)}")


# ============================================
# NESTED SUB-PAGES / HIERARCHY ENDPOINTS
# ============================================

@router.get("/{page_id}/ancestors")
async def get_page_ancestors(page_id: str, user_id: str = Depends(get_current_user)):
    """Get all ancestor pages (breadcrumb) for a page"""
    try:
        # Get the page first (without user_id filter to support shared workspaces)
        page = supabase_admin.table("pages").select("id, parent_page_id, workspace_id, user_id").eq("id", page_id).execute()
        if not page.data:
            raise HTTPException(status_code=404, detail="Page not found")
        
        page_data = page.data[0]
        
        # Check access - user owns page OR has workspace access
        if page_data.get("user_id") != user_id:
            if page_data.get("workspace_id"):
                from app.api.helpers import check_workspace_access
                access = await check_workspace_access(user_id, page_data["workspace_id"])
                if not access["has_access"]:
                    raise HTTPException(status_code=403, detail="Not authorized to access this page")
            else:
                raise HTTPException(status_code=403, detail="Not authorized to access this page")
        
        ancestors = []
        current_parent_id = page_data.get("parent_page_id")
        
        # Walk up the tree (max 20 levels to prevent infinite loops)
        visited = set()
        while current_parent_id and len(ancestors) < 20:
            if current_parent_id in visited:
                break  # Prevent circular reference
            visited.add(current_parent_id)
            
            # Get parent without user_id filter (same workspace)
            parent = supabase_admin.table("pages").select("id, title, icon, parent_page_id").eq("id", current_parent_id).execute()
            if not parent.data:
                break
            
            ancestors.insert(0, parent.data[0])  # Insert at beginning for correct order
            current_parent_id = parent.data[0].get("parent_page_id")
        
        return {
            "page_id": page_id,
            "ancestors": ancestors,
            "depth": len(ancestors)
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting ancestors: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get ancestors: {str(e)}")

@router.get("/{page_id}/descendants")
async def get_page_descendants(page_id: str, user_id: str = Depends(get_current_user), max_depth: int = Query(10, ge=1, le=20)):
    """Get all descendant pages (recursive sub-pages) for a page"""
    try:
        # Verify page exists
        page = supabase_admin.table("pages").select("id, depth").eq("id", page_id).eq("user_id", user_id).execute()
        if not page.data:
            raise HTTPException(status_code=404, detail="Page not found")
        
        base_depth = page.data[0].get("depth", 0) or 0
        
        # Get all descendants using recursive query simulation
        all_descendants = []
        current_level = [page_id]
        
        for level in range(max_depth):
            if not current_level:
                break
            
            children = supabase_admin.table("pages").select("id, title, icon, parent_page_id, depth, page_order, updated_at").in_("parent_page_id", current_level).eq("user_id", user_id).eq("is_archived", False).order("page_order").execute()
            
            if children.data:
                for child in children.data:
                    child["relative_depth"] = level + 1
                all_descendants.extend(children.data)
                current_level = [c["id"] for c in children.data]
            else:
                break
        
        return {
            "page_id": page_id,
            "descendants": all_descendants,
            "total_count": len(all_descendants)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get descendants: {str(e)}")

@router.get("/tree/{workspace_id}")
async def get_page_tree(workspace_id: str, user_id: str = Depends(get_current_user)):
    """Get hierarchical page tree for a workspace"""
    try:
        # Get all pages for workspace
        response = supabase_admin.table("pages").select("id, title, icon, parent_page_id, depth, page_order, updated_at, is_favorite, page_type").eq("workspace_id", workspace_id).eq("user_id", user_id).eq("is_archived", False).order("page_order").execute()
        
        pages = response.data or []
        
        # Build tree structure
        page_map = {p["id"]: {**p, "children": []} for p in pages}
        root_pages = []
        
        for page in pages:
            parent_id = page.get("parent_page_id")
            if parent_id and parent_id in page_map:
                page_map[parent_id]["children"].append(page_map[page["id"]])
            elif not parent_id:
                root_pages.append(page_map[page["id"]])
        
        # Sort children by page_order
        def sort_children(node):
            node["children"].sort(key=lambda x: (x.get("page_order", 0), x.get("title", "")))
            for child in node["children"]:
                sort_children(child)
        
        for root in root_pages:
            sort_children(root)
        
        root_pages.sort(key=lambda x: (x.get("page_order", 0), x.get("title", "")))
        
        return {
            "workspace_id": workspace_id,
            "tree": root_pages,
            "total_pages": len(pages)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get page tree: {str(e)}")

@router.post("/{page_id}/move")
async def move_page(
    page_id: str,
    new_parent_id: Optional[str] = None,
    new_order: int = 0,
    user_id: str = Depends(get_current_user)
):
    """Move a page to a new parent (or to root if new_parent_id is None)"""
    try:
        # Verify page exists
        page = supabase_admin.table("pages").select("*").eq("id", page_id).eq("user_id", user_id).execute()
        if not page.data:
            raise HTTPException(status_code=404, detail="Page not found")
        
        # Prevent moving to self
        if new_parent_id == page_id:
            raise HTTPException(status_code=400, detail="Cannot move page to itself")
        
        # If moving to a parent, verify it exists and isn't a descendant
        new_depth = 0
        if new_parent_id:
            parent = supabase_admin.table("pages").select("id, depth").eq("id", new_parent_id).eq("user_id", user_id).execute()
            if not parent.data:
                raise HTTPException(status_code=404, detail="Parent page not found")
            
            new_depth = (parent.data[0].get("depth", 0) or 0) + 1
            
            # Check if new_parent is a descendant of page_id (would create circular reference)
            descendants_response = await get_page_descendants(page_id, user_id, max_depth=20)
            descendant_ids = [d["id"] for d in descendants_response["descendants"]]
            if new_parent_id in descendant_ids:
                raise HTTPException(status_code=400, detail="Cannot move page to its own descendant")
        
        # Update the page
        update_data = {
            "parent_page_id": new_parent_id,
            "page_order": new_order,
            "depth": new_depth
        }
        
        response = supabase_admin.table("pages").update(update_data).eq("id", page_id).eq("user_id", user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to move page")
        
        # Update depths of all descendants
        old_depth = page.data[0].get("depth", 0) or 0
        depth_diff = new_depth - old_depth
        
        if depth_diff != 0:
            descendants_response = await get_page_descendants(page_id, user_id, max_depth=20)
            for desc in descendants_response["descendants"]:
                desc_new_depth = (desc.get("depth", 0) or 0) + depth_diff
                supabase_admin.table("pages").update({"depth": desc_new_depth}).eq("id", desc["id"]).execute()
        
        return {
            "success": True,
            "page": response.data[0],
            "new_parent_id": new_parent_id,
            "new_depth": new_depth
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to move page: {str(e)}")

@router.post("/{page_id}/reorder")
async def reorder_subpages(
    page_id: str,
    page_orders: List[Dict[str, Any]],
    user_id: str = Depends(get_current_user)
):
    """Reorder sub-pages within a parent page"""
    try:
        # page_orders should be list of {id: string, order: number}
        for item in page_orders:
            supabase_admin.table("pages").update({"page_order": item["order"]}).eq("id", item["id"]).eq("user_id", user_id).eq("parent_page_id", page_id).execute()
        
        return {"success": True, "updated_count": len(page_orders)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reorder pages: {str(e)}")


# ============================================
# PAGE SHARING ENDPOINTS
# ============================================

class PageSharingUpdate(BaseModel):
    is_public: bool

@router.post("/{page_id}/share")
async def update_page_sharing(
    page_id: str,
    sharing: PageSharingUpdate,
    user_id: str = Depends(get_current_user)
):
    """Update page sharing settings (private/public)"""
    try:
        # Get the page to check ownership
        page_check = supabase_admin.table("pages")\
            .select("id, user_id, workspace_id")\
            .eq("id", page_id)\
            .is_("deleted_at", "null")\
            .execute()
        
        if not page_check.data:
            raise HTTPException(status_code=404, detail="Page not found")
        
        existing_page = page_check.data[0]
        
        # Check if user owns page OR has workspace admin access
        if existing_page.get("user_id") != user_id:
            if existing_page.get("workspace_id"):
                from app.api.helpers.workspace_access import check_workspace_access, can_admin
                access = await check_workspace_access(user_id, existing_page["workspace_id"])
                if not access["has_access"] or not can_admin(access["role"]):
                    raise HTTPException(status_code=403, detail="Not authorized to change sharing settings")
            else:
                raise HTTPException(status_code=403, detail="Not authorized to change sharing settings")
        
        # Update sharing settings
        response = supabase_admin.table("pages")\
            .update({"is_public": sharing.is_public})\
            .eq("id", page_id)\
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Page not found")
        
        return {
            "success": True,
            "page_id": page_id,
            "is_public": sharing.is_public,
            "message": f"Page is now {'public' if sharing.is_public else 'private'}"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update sharing: {str(e)}")


@router.get("/{page_id}/share-status")
async def get_page_sharing_status(
    page_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get current sharing status of a page"""
    try:
        response = supabase_admin.table("pages")\
            .select("id, is_public")\
            .eq("id", page_id)\
            .is_("deleted_at", "null")\
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Page not found")
        
        page = response.data[0]
        
        return {
            "page_id": page_id,
            "is_public": page.get("is_public", False)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get sharing status: {str(e)}")


@router.get("/public/{page_id}")
async def get_public_page(page_id: str):
    """Get a public page without authentication - for blog-style sharing"""
    try:
        # Get page and check if it's public
        response = supabase_admin.table("pages")\
            .select("*")\
            .eq("id", page_id)\
            .eq("is_public", True)\
            .is_("deleted_at", "null")\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=404, 
                detail="Page not found or not publicly accessible"
            )
        
        page = response.data[0]
        
        # Increment view count
        try:
            current_count = page.get("view_count") or 0
            supabase_admin.table("pages").update({
                "view_count": current_count + 1,
                "last_viewed_at": datetime.utcnow().isoformat()
            }).eq("id", page_id).execute()
        except Exception as view_err:
            print(f"View tracking failed: {view_err}")
        
        return page
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching public page: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch public page: {str(e)}")
