from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.core.supabase import supabase_admin
from app.api.dependencies import get_current_user

router = APIRouter()

class PageLinkCreate(BaseModel):
    target_page_id: str
    relation_type: str = "references"
    context: Optional[str] = None
    workspace_id: Optional[str] = None

class PageMentionCreate(BaseModel):
    mention_type: str  # page, skill, task, concept
    mention_id: Optional[str] = None
    mention_text: str
    position_start: Optional[int] = None
    position_end: Optional[int] = None

class ConceptCreate(BaseModel):
    name: str
    description: Optional[str] = None
    workspace_id: Optional[str] = None

class SuggestionResponse(BaseModel):
    status: str  # accepted, rejected
    target_page_id: Optional[str] = None  # For temp suggestions
    relation_type: Optional[str] = "related_to"


# ============================================
# PAGE LINKS ENDPOINTS
# ============================================

@router.get("/{page_id}/links")
async def get_page_links(page_id: str, workspace_id: Optional[str] = None, user_id: str = Depends(get_current_user)):
    """Get all links for a page (both outgoing and backlinks) with workspace isolation"""
    try:
        # Get the page's workspace if not provided
        if not workspace_id:
            page_response = supabase_admin.table("pages").select("workspace_id").eq("id", page_id).eq("user_id", user_id).single().execute()
            if page_response.data:
                workspace_id = page_response.data.get("workspace_id")
        
        # Get outgoing links with workspace filter
        outlinks_query = supabase_admin.table("page_links")\
            .select("*, target:pages!page_links_target_page_id_fkey(id, title, icon)")\
            .eq("source_page_id", page_id)\
            .eq("user_id", user_id)
        
        if workspace_id:
            outlinks_query = outlinks_query.eq("workspace_id", workspace_id)
        
        outlinks_response = outlinks_query.execute()
        
        # Get backlinks with workspace filter
        backlinks_query = supabase_admin.table("page_links")\
            .select("*, source:pages!page_links_source_page_id_fkey(id, title, icon)")\
            .eq("target_page_id", page_id)\
            .eq("user_id", user_id)
        
        if workspace_id:
            backlinks_query = backlinks_query.eq("workspace_id", workspace_id)
        
        backlinks_response = backlinks_query.execute()
        
        return {
            "outlinks": outlinks_response.data or [],
            "backlinks": backlinks_response.data or [],
            "total_links": len(outlinks_response.data or []) + len(backlinks_response.data or [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{page_id}/links")
async def create_page_link(page_id: str, link: PageLinkCreate, user_id: str = Depends(get_current_user)):
    """Create a link from this page to another page with workspace isolation"""
    try:
        print(f"[DEBUG] Creating link from {page_id} to {link.target_page_id} for user {user_id}")
        
        # Skip if target is a temp ID (AI suggestion not yet created)
        if link.target_page_id.startswith("temp-"):
            print(f"[DEBUG] Skipping temp target page: {link.target_page_id}")
            return {"message": "Cannot link to temporary suggestion", "skipped": True}
        
        # Verify source page exists and get workspace_id
        source_check = supabase_admin.table("pages").select("id, workspace_id").eq("id", page_id).execute()
        print(f"[DEBUG] Source check: {source_check.data}")
        if not source_check.data:
            raise HTTPException(status_code=404, detail="Source page not found")
        
        workspace_id = link.workspace_id or source_check.data[0].get("workspace_id")
        
        # Verify target page exists
        target_check = supabase_admin.table("pages").select("id, workspace_id").eq("id", link.target_page_id).execute()
        print(f"[DEBUG] Target check: {target_check.data}")
        if not target_check.data:
            raise HTTPException(status_code=404, detail="Target page not found")
        
        # Ensure both pages are in the same workspace
        target_workspace = target_check.data[0].get("workspace_id")
        if workspace_id and target_workspace and workspace_id != target_workspace:
            raise HTTPException(status_code=400, detail="Cannot link pages from different workspaces")
        
        # Create link with workspace_id
        print(f"[DEBUG] Inserting link with relation_type: {link.relation_type}, workspace_id: {workspace_id}")
        response = supabase_admin.table("page_links").insert({
            "source_page_id": page_id,
            "target_page_id": link.target_page_id,
            "user_id": user_id,
            "relation_type": link.relation_type,
            "context": link.context,
            "workspace_id": workspace_id
        }).execute()
        
        print(f"[DEBUG] Link created successfully: {response.data}")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Failed to create link: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        if "duplicate key" in str(e).lower():
            raise HTTPException(status_code=400, detail="Link already exists")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@router.patch("/{page_id}/links/{link_id}")
async def update_page_link(page_id: str, link_id: str, link: PageLinkCreate, user_id: str = Depends(get_current_user)):
    """Update a page link's relation type or context"""
    try:
        response = supabase_admin.table("page_links")\
            .update({
                "relation_type": link.relation_type,
                "context": link.context
            })\
            .eq("id", link_id)\
            .eq("source_page_id", page_id)\
            .eq("user_id", user_id)\
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Link not found")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{page_id}/links/{link_id}")
async def delete_page_link(page_id: str, link_id: str, user_id: str = Depends(get_current_user)):
    """Delete a page link"""
    try:
        response = supabase_admin.table("page_links")\
            .delete()\
            .eq("id", link_id)\
            .eq("source_page_id", page_id)\
            .eq("user_id", user_id)\
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Link not found")
        
        return {"message": "Link deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# BACKLINKS ENDPOINTS
# ============================================

@router.get("/{page_id}/backlinks")
async def get_backlinks(page_id: str, workspace_id: Optional[str] = None, user_id: str = Depends(get_current_user)):
    """Get all pages that link TO this page with workspace isolation"""
    try:
        # Get workspace_id from page if not provided
        if not workspace_id:
            page_response = supabase_admin.table("pages").select("workspace_id").eq("id", page_id).eq("user_id", user_id).single().execute()
            if page_response.data:
                workspace_id = page_response.data.get("workspace_id")
        
        query = supabase_admin.table("page_links")\
            .select("*, source:pages!page_links_source_page_id_fkey(id, title, icon, content)")\
            .eq("target_page_id", page_id)\
            .eq("user_id", user_id)
        
        if workspace_id:
            query = query.eq("workspace_id", workspace_id)
        
        response = query.execute()
        
        backlinks = []
        for link in response.data or []:
            source = link.get("source", {})
            backlinks.append({
                "link_id": link["id"],
                "page_id": source.get("id"),
                "title": source.get("title"),
                "icon": source.get("icon"),
                "relation_type": link["relation_type"],
                "context": link.get("context"),
                "preview": (source.get("content") or "")[:200] + "..." if source.get("content") else None
            })
        
        return {
            "backlinks": backlinks,
            "count": len(backlinks)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# MENTIONS ENDPOINTS
# ============================================

@router.get("/{page_id}/mentions")
async def get_page_mentions(page_id: str, user_id: str = Depends(get_current_user)):
    """Get all mentions in a page"""
    try:
        response = supabase_admin.table("page_mentions")\
            .select("*")\
            .eq("source_page_id", page_id)\
            .eq("user_id", user_id)\
            .execute()
        
        # Enrich mentions with target info
        mentions = []
        for mention in response.data or []:
            enriched = {**mention}
            
            if mention["mention_type"] == "page" and mention.get("mention_id"):
                page_data = supabase_admin.table("pages").select("title, icon").eq("id", mention["mention_id"]).single().execute()
                if page_data.data:
                    enriched["target_title"] = page_data.data["title"]
                    enriched["target_icon"] = page_data.data["icon"]
            elif mention["mention_type"] == "skill" and mention.get("mention_id"):
                skill_data = supabase_admin.table("skills").select("name").eq("id", mention["mention_id"]).single().execute()
                if skill_data.data:
                    enriched["target_title"] = skill_data.data["name"]
            elif mention["mention_type"] == "task" and mention.get("mention_id"):
                task_data = supabase_admin.table("tasks").select("title").eq("id", mention["mention_id"]).single().execute()
                if task_data.data:
                    enriched["target_title"] = task_data.data["title"]
            
            mentions.append(enriched)
        
        return mentions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{page_id}/mentions")
async def add_page_mention(page_id: str, mention: PageMentionCreate, user_id: str = Depends(get_current_user)):
    """Add a mention to a page"""
    try:
        response = supabase_admin.table("page_mentions").insert({
            "source_page_id": page_id,
            "mention_type": mention.mention_type,
            "mention_id": mention.mention_id,
            "mention_text": mention.mention_text,
            "user_id": user_id,
            "position_start": mention.position_start,
            "position_end": mention.position_end
        }).execute()
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{page_id}/mentions/sync")
async def sync_page_mentions(page_id: str, mentions: List[PageMentionCreate], user_id: str = Depends(get_current_user)):
    """Sync all mentions for a page (replaces existing)"""
    try:
        # Delete existing mentions
        supabase_admin.table("page_mentions")\
            .delete()\
            .eq("source_page_id", page_id)\
            .eq("user_id", user_id)\
            .execute()
        
        # Insert new mentions
        if mentions:
            mention_data = [{
                "source_page_id": page_id,
                "mention_type": m.mention_type,
                "mention_id": m.mention_id,
                "mention_text": m.mention_text,
                "user_id": user_id,
                "position_start": m.position_start,
                "position_end": m.position_end
            } for m in mentions]
            
            supabase_admin.table("page_mentions").insert(mention_data).execute()
        
        return {"message": f"Synced {len(mentions)} mentions"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# AI SUGGESTIONS ENDPOINTS
# ============================================

@router.get("/{page_id}/suggestions")
async def get_related_suggestions(page_id: str, workspace_id: Optional[str] = None, user_id: str = Depends(get_current_user)):
    """Get AI-suggested related pages"""
    try:
        # First check if the ai_suggested_relations table exists and has data
        try:
            pending = supabase_admin.table("ai_suggested_relations")\
                .select("*")\
                .eq("page_id", page_id)\
                .eq("user_id", user_id)\
                .eq("status", "pending")\
                .execute()
        except Exception as table_error:
            # Table might not exist or have different schema
            print(f"ai_suggested_relations query failed: {table_error}")
            return {"suggestions": [], "count": 0}
        
        # If we have pending suggestions, enrich with page data
        if pending.data:
            enriched = []
            for suggestion in pending.data:
                try:
                    page_info = supabase_admin.table("pages")\
                        .select("id, title, icon")\
                        .eq("id", suggestion.get("suggested_page_id"))\
                        .execute()
                    if page_info.data:
                        suggestion["suggested"] = page_info.data[0]
                    enriched.append(suggestion)
                except:
                    enriched.append(suggestion)
            return {"suggestions": enriched, "count": len(enriched)}
        
        # No pending suggestions - generate new ones based on tags/title similarity
        try:
            # Get current page
            page_response = supabase_admin.table("pages").select("*").eq("id", page_id).execute()
            if not page_response.data:
                return {"suggestions": [], "count": 0}
            
            current_page = page_response.data[0]
            
            # Check access
            if current_page.get("user_id") != user_id:
                if current_page.get("workspace_id"):
                    from app.api.helpers import check_workspace_access
                    access = await check_workspace_access(user_id, current_page["workspace_id"])
                    if not access["has_access"]:
                        return {"suggestions": [], "count": 0}
                else:
                    return {"suggestions": [], "count": 0}
            
            ws_id = workspace_id or current_page.get("workspace_id")
            
            # Find related pages in same workspace
            if ws_id:
                related_pages = supabase_admin.table("pages")\
                    .select("id, title, icon, tags")\
                    .eq("workspace_id", ws_id)\
                    .neq("id", page_id)\
                    .limit(20)\
                    .execute()
            else:
                related_pages = supabase_admin.table("pages")\
                    .select("id, title, icon, tags")\
                    .eq("user_id", user_id)\
                    .neq("id", page_id)\
                    .limit(20)\
                    .execute()
            
            # Score and filter related pages
            suggestions = []
            current_tags = set(current_page.get("tags") or [])
            current_title_words = set(current_page.get("title", "").lower().split())
            
            for page in related_pages.data or []:
                page_tags = set(page.get("tags") or [])
                page_title_words = set(page.get("title", "").lower().split())
                
                # Calculate similarity
                tag_overlap = len(current_tags & page_tags)
                title_overlap = len(current_title_words & page_title_words)
                
                if tag_overlap > 0 or title_overlap > 0:
                    confidence = min(0.9, 0.3 + (tag_overlap * 0.2) + (title_overlap * 0.1))
                    reason = []
                    if tag_overlap > 0:
                        reason.append(f"Shares {tag_overlap} tag(s)")
                    if title_overlap > 0:
                        reason.append("Similar title words")
                    
                    suggestions.append({
                        "id": f"temp-{page['id']}",
                        "page_id": page_id,
                        "suggested_page_id": page["id"],
                        "confidence": confidence,
                        "reason": ", ".join(reason),
                        "status": "pending",
                        "suggested": page
                    })
            
            # Sort by confidence and take top 5
            suggestions.sort(key=lambda x: x["confidence"], reverse=True)
            suggestions = suggestions[:5]
            
            return {"suggestions": suggestions, "count": len(suggestions)}
            
        except Exception as gen_error:
            print(f"Error generating suggestions: {gen_error}")
            return {"suggestions": [], "count": 0}
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Suggestions endpoint error: {e}")
        return {"suggestions": [], "count": 0}


@router.post("/{page_id}/suggestions/{suggestion_id}")
async def respond_to_suggestion(
    page_id: str, 
    suggestion_id: str, 
    response: SuggestionResponse,
    user_id: str = Depends(get_current_user)
):
    """Accept or reject an AI suggestion"""
    try:
        # Handle temporary suggestions (generated on-the-fly, not stored in DB)
        if suggestion_id.startswith("temp-"):
            # For temp suggestions, we need the target page ID from the request body
            if response.status == "accepted" and hasattr(response, 'target_page_id') and response.target_page_id:
                try:
                    supabase_admin.table("page_links").insert({
                        "source_page_id": page_id,
                        "target_page_id": response.target_page_id,
                        "user_id": user_id,
                        "relation_type": response.relation_type if hasattr(response, 'relation_type') else "related_to",
                        "context": f"AI suggested link"
                    }).execute()
                    return {"message": "Link created successfully"}
                except Exception as link_error:
                    # Link might already exist
                    return {"message": "Link already exists or could not be created"}
            return {"message": f"Suggestion {response.status}"}
        
        # Get suggestion from database
        suggestion = supabase_admin.table("ai_suggested_relations")\
            .select("*")\
            .eq("id", suggestion_id)\
            .eq("page_id", page_id)\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        if not suggestion.data:
            raise HTTPException(status_code=404, detail="Suggestion not found")
        
        # Update status
        supabase_admin.table("ai_suggested_relations")\
            .update({"status": response.status})\
            .eq("id", suggestion_id)\
            .execute()
        
        # If accepted, create the link
        if response.status == "accepted":
            try:
                supabase_admin.table("page_links").insert({
                    "source_page_id": page_id,
                    "target_page_id": suggestion.data["suggested_page_id"],
                    "user_id": user_id,
                    "relation_type": suggestion.data.get("relation_type", "related_to"),
                    "context": f"AI suggested: {suggestion.data.get('reason', '')}"
                }).execute()
            except:
                pass  # Link might already exist
        
        return {"message": f"Suggestion {response.status}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# PAGE PREVIEW ENDPOINT
# ============================================

@router.get("/{page_id}/preview")
async def get_page_preview(page_id: str, user_id: str = Depends(get_current_user)):
    """Get a quick preview of a page for hover cards"""
    try:
        response = supabase_admin.table("pages")\
            .select("id, title, icon, content, tags, updated_at")\
            .eq("id", page_id)\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Page not found")
        
        page = response.data
        content = page.get("content") or ""
        
        # Extract first paragraph or first 300 chars
        preview_text = content[:300]
        if len(content) > 300:
            preview_text += "..."
        
        # Get backlink count
        backlinks = supabase_admin.table("page_links")\
            .select("id")\
            .eq("target_page_id", page_id)\
            .eq("user_id", user_id)\
            .execute()
        
        return {
            "id": page["id"],
            "title": page["title"],
            "icon": page["icon"],
            "preview": preview_text,
            "tags": page.get("tags") or [],
            "updated_at": page["updated_at"],
            "backlink_count": len(backlinks.data or [])
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# OPTIMIZED CONNECTED ITEMS ENDPOINT
# ============================================

@router.get("/connected/{item_id}")
async def get_connected_items(
    item_id: str, 
    item_type: str = "page",
    workspace_id: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """
    Get all connected items for any entity (page, skill, task) with workspace isolation.
    This is an optimized endpoint that uses server-side filtering.
    """
    try:
        # Get workspace_id from item if not provided
        if not workspace_id:
            if item_type == "page":
                item_response = supabase_admin.table("pages").select("workspace_id").eq("id", item_id).eq("user_id", user_id).single().execute()
            elif item_type == "skill":
                item_response = supabase_admin.table("skills").select("workspace_id").eq("id", item_id).eq("user_id", user_id).single().execute()
            elif item_type == "task":
                item_response = supabase_admin.table("tasks").select("workspace_id").eq("id", item_id).eq("user_id", user_id).single().execute()
            else:
                item_response = None
            
            if item_response and item_response.data:
                workspace_id = item_response.data.get("workspace_id")
        
        connections = []
        
        # Get outgoing connections from graph_edges
        outgoing_query = supabase_admin.table("graph_edges")\
            .select("id, target_id, target_type, edge_type, strength")\
            .eq("source_id", item_id)\
            .eq("user_id", user_id)
        
        if workspace_id:
            outgoing_query = outgoing_query.eq("workspace_id", workspace_id)
        
        outgoing = outgoing_query.execute()
        
        # Get incoming connections from graph_edges
        incoming_query = supabase_admin.table("graph_edges")\
            .select("id, source_id, source_type, edge_type, strength")\
            .eq("target_id", item_id)\
            .eq("user_id", user_id)
        
        if workspace_id:
            incoming_query = incoming_query.eq("workspace_id", workspace_id)
        
        incoming = incoming_query.execute()
        
        # Process outgoing connections
        for edge in outgoing.data or []:
            target_id = edge["target_id"]
            target_type = edge["target_type"]
            
            # Get target details
            label = None
            icon = None
            
            if target_type == "page":
                target_data = supabase_admin.table("pages").select("title, icon").eq("id", target_id).single().execute()
                if target_data.data:
                    label = target_data.data.get("title")
                    icon = target_data.data.get("icon")
            elif target_type == "skill":
                target_data = supabase_admin.table("skills").select("name").eq("id", target_id).single().execute()
                if target_data.data:
                    label = target_data.data.get("name")
            elif target_type == "task":
                target_data = supabase_admin.table("tasks").select("title").eq("id", target_id).single().execute()
                if target_data.data:
                    label = target_data.data.get("title")
            
            if label:
                connections.append({
                    "id": target_id,
                    "type": target_type,
                    "label": label,
                    "icon": icon,
                    "edge_type": edge["edge_type"],
                    "strength": edge.get("strength", 0.5),
                    "direction": "outgoing"
                })
        
        # Process incoming connections
        for edge in incoming.data or []:
            source_id = edge["source_id"]
            source_type = edge["source_type"]
            
            # Skip if already added (bidirectional)
            if any(c["id"] == source_id for c in connections):
                continue
            
            # Get source details
            label = None
            icon = None
            
            if source_type == "page":
                source_data = supabase_admin.table("pages").select("title, icon").eq("id", source_id).single().execute()
                if source_data.data:
                    label = source_data.data.get("title")
                    icon = source_data.data.get("icon")
            elif source_type == "skill":
                source_data = supabase_admin.table("skills").select("name").eq("id", source_id).single().execute()
                if source_data.data:
                    label = source_data.data.get("name")
            elif source_type == "task":
                source_data = supabase_admin.table("tasks").select("title").eq("id", source_id).single().execute()
                if source_data.data:
                    label = source_data.data.get("title")
            
            if label:
                connections.append({
                    "id": source_id,
                    "type": source_type,
                    "label": label,
                    "icon": icon,
                    "edge_type": edge["edge_type"],
                    "strength": edge.get("strength", 0.5),
                    "direction": "incoming"
                })
        
        return {
            "item_id": item_id,
            "item_type": item_type,
            "workspace_id": workspace_id,
            "connections": connections,
            "count": len(connections)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/connection-counts")
async def get_connection_counts(
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """
    Get connection counts for all items in a workspace.
    Useful for displaying connection badges without multiple API calls.
    """
    try:
        # Get all edges for workspace
        edges = supabase_admin.table("graph_edges")\
            .select("source_id, target_id")\
            .eq("workspace_id", workspace_id)\
            .eq("user_id", user_id)\
            .execute()
        
        # Count connections per item
        counts = {}
        for edge in edges.data or []:
            source_id = edge["source_id"]
            target_id = edge["target_id"]
            
            counts[source_id] = counts.get(source_id, 0) + 1
            counts[target_id] = counts.get(target_id, 0) + 1
        
        return {
            "workspace_id": workspace_id,
            "counts": counts,
            "total_edges": len(edges.data or [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
