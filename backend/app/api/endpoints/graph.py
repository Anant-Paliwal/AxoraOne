from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any
from app.core.supabase import supabase_admin
from app.services.ai_agent import ai_agent_service
from app.api.dependencies import get_current_user

router = APIRouter()

class EdgeCreate(BaseModel):
    source_id: str
    source_type: str
    target_id: str
    target_type: str
    edge_type: str = "explicit"
    workspace_id: str = None

@router.get("/nodes")
async def get_graph_nodes(workspace_id: str = None, user_id: str = Depends(get_current_user)):
    """Get all nodes (pages, skills, tasks, concepts) for knowledge graph filtered by workspace"""
    try:
        nodes = []
        
        # If workspace_id provided, check access
        if workspace_id:
            from app.api.helpers import check_workspace_access
            access = await check_workspace_access(user_id, workspace_id)
            if not access["has_access"]:
                raise HTTPException(status_code=403, detail="Not authorized to access this workspace")
        
        # Get pages (workspace-scoped, not user-scoped)
        if workspace_id:
            pages_query = supabase_admin.table("pages").select("id, title, icon, tags, workspace_id, page_type").eq("workspace_id", workspace_id)
        else:
            pages_query = supabase_admin.table("pages").select("id, title, icon, tags, workspace_id, page_type").eq("user_id", user_id)
        pages = pages_query.execute()
        
        # Get skills (workspace-scoped)
        if workspace_id:
            skills_query = supabase_admin.table("skills").select("id, name, level, workspace_id").eq("workspace_id", workspace_id)
        else:
            skills_query = supabase_admin.table("skills").select("id, name, level, workspace_id").eq("user_id", user_id)
        skills = skills_query.execute()
        
        # Get tasks (workspace-scoped)
        if workspace_id:
            tasks_query = supabase_admin.table("tasks").select("id, title, status, workspace_id").eq("workspace_id", workspace_id)
        else:
            tasks_query = supabase_admin.table("tasks").select("id, title, status, workspace_id").eq("user_id", user_id)
        tasks = tasks_query.execute()
        
        # Get concepts (gracefully handle if table doesn't exist)
        concepts_data = []
        try:
            if workspace_id:
                concepts_query = supabase_admin.table("concepts").select("id, name, description, importance_score, usage_count, workspace_id").eq("workspace_id", workspace_id)
            else:
                concepts_query = supabase_admin.table("concepts").select("id, name, description, importance_score, usage_count, workspace_id").eq("user_id", user_id)
            concepts_result = concepts_query.execute()
            concepts_data = concepts_result.data if concepts_result and concepts_result.data else []
        except Exception as concept_error:
            # Concepts table doesn't exist yet - that's okay
            print(f"Concepts table not available (this is normal if migration not run yet): {concept_error}")
            concepts_data = []
        
        # Get connection counts for importance sizing
        edges_query = supabase_admin.table("graph_edges").select("source_id, target_id").eq("user_id", user_id)
        if workspace_id:
            edges_query = edges_query.eq("workspace_id", workspace_id)
        edges = edges_query.execute()
        
        connection_counts = {}
        if edges and edges.data:
            for edge in edges.data:
                if edge.get("source_id"):
                    connection_counts[edge["source_id"]] = connection_counts.get(edge["source_id"], 0) + 1
                if edge.get("target_id"):
                    connection_counts[edge["target_id"]] = connection_counts.get(edge["target_id"], 0) + 1
        
        # Format pages
        if pages and pages.data:
            for page in pages.data:
                conn_count = connection_counts.get(page["id"], 0)
                nodes.append({
                    "id": page["id"],
                    "type": "page",
                    "label": page["title"],
                    "icon": page.get("icon", "📄"),
                    "tags": page.get("tags", []),
                    "page_type": page.get("page_type"),
                    "workspace_id": page.get("workspace_id"),
                    "connection_count": conn_count,
                    "importance": min(1.0, 0.3 + (conn_count * 0.1))
                })
        
        # Format skills
        if skills and skills.data:
            for skill in skills.data:
                conn_count = connection_counts.get(skill["id"], 0)
                nodes.append({
                    "id": skill["id"],
                    "type": "skill",
                    "label": skill["name"],
                    "level": skill["level"],
                    "workspace_id": skill.get("workspace_id"),
                    "connection_count": conn_count,
                    "importance": min(1.0, 0.5 + (conn_count * 0.1))
                })
        
        # Format tasks
        if tasks and tasks.data:
            for task in tasks.data:
                conn_count = connection_counts.get(task["id"], 0)
                nodes.append({
                    "id": task["id"],
                    "type": "task",
                    "label": task["title"],
                    "status": task["status"],
                    "workspace_id": task.get("workspace_id"),
                    "connection_count": conn_count,
                    "importance": min(1.0, 0.2 + (conn_count * 0.1))
                })
        
        # Format concepts (only if we got data)
        if concepts_data:
            for concept in concepts_data:
                conn_count = connection_counts.get(concept["id"], 0)
                nodes.append({
                    "id": concept["id"],
                    "type": "concept",
                    "label": concept["name"],
                    "description": concept.get("description"),
                    "usage_count": concept.get("usage_count", 0),
                    "workspace_id": concept.get("workspace_id"),
                    "connection_count": conn_count,
                    "importance": concept.get("importance_score", 0.5)
                })
        
        return {"nodes": nodes}
    except Exception as e:
        print(f"Error in get_graph_nodes: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch graph nodes: {str(e)}")

@router.get("/edges")
async def get_graph_edges(workspace_id: str = None, user_id: str = Depends(get_current_user)):
    """Get all edges (connections) for knowledge graph from graph_edges table"""
    try:
        # Get all edges from graph_edges table
        edges_query = supabase_admin.table("graph_edges").select("*").eq("user_id", user_id)
        if workspace_id:
            edges_query = edges_query.eq("workspace_id", workspace_id)
        graph_edges = edges_query.execute()
        
        return {"edges": graph_edges.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/edges")
async def create_edge(edge: EdgeCreate, user_id: str = Depends(get_current_user)):
    """Create a new edge in the knowledge graph"""
    try:
        # Validate workspace access if provided (owner OR member)
        if edge.workspace_id:
            from app.api.helpers.workspace_access import check_workspace_access, can_edit
            access = await check_workspace_access(user_id, edge.workspace_id)
            
            if not access["has_access"]:
                raise HTTPException(status_code=404, detail="Workspace not found")
            
            # Check if user can edit (member, admin, or owner)
            if not can_edit(access["role"]):
                raise HTTPException(status_code=403, detail="You don't have permission to create edges in this workspace")
        
        response = supabase_admin.table("graph_edges").insert({
            "user_id": user_id,
            "workspace_id": edge.workspace_id,
            "source_id": edge.source_id,
            "source_type": edge.source_type,
            "target_id": edge.target_id,
            "target_type": edge.target_type,
            "edge_type": edge.edge_type
        }).execute()
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/edges/{edge_id}")
async def delete_edge(edge_id: str, user_id: str = Depends(get_current_user)):
    """Delete an edge from the knowledge graph"""
    try:
        # Get the edge to check workspace access
        edge_check = supabase_admin.table("graph_edges").select("id, user_id, workspace_id").eq("id", edge_id).execute()
        if not edge_check.data:
            raise HTTPException(status_code=404, detail="Edge not found")
        
        existing_edge = edge_check.data[0]
        
        # Check if user owns edge OR is workspace admin/owner
        if existing_edge.get("user_id") != user_id:
            if existing_edge.get("workspace_id"):
                from app.api.helpers.workspace_access import check_workspace_access, can_admin
                access = await check_workspace_access(user_id, existing_edge["workspace_id"])
                if not access["has_access"] or not can_admin(access["role"]):
                    raise HTTPException(status_code=403, detail="Not authorized to delete this edge")
            else:
                raise HTTPException(status_code=403, detail="Not authorized to delete this edge")
        
        response = supabase_admin.table("graph_edges").delete().eq("id", edge_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Edge not found")
        return {"message": "Edge deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/infer-edges")
async def infer_edges(workspace_id: str = None, node_id: str = None, user_id: str = Depends(get_current_user)):
    """Use AI to infer potential connections in the knowledge graph
    
    If node_id is provided, only return suggestions related to that node
    """
    try:
        # Get all nodes (pages, skills, tasks) filtered by workspace
        pages_query = supabase_admin.table("pages").select("id, title, content, tags").eq("user_id", user_id)
        if workspace_id:
            pages_query = pages_query.eq("workspace_id", workspace_id)
        pages = pages_query.execute()
        
        skills_query = supabase_admin.table("skills").select("id, name, description, level").eq("user_id", user_id)
        if workspace_id:
            skills_query = skills_query.eq("workspace_id", workspace_id)
        skills = skills_query.execute()
        
        tasks_query = supabase_admin.table("tasks").select("id, title, description").eq("user_id", user_id)
        if workspace_id:
            tasks_query = tasks_query.eq("workspace_id", workspace_id)
        tasks = tasks_query.execute()
        
        # Get existing edges to avoid duplicates
        existing_edges_query = supabase_admin.table("graph_edges").select("source_id, target_id").eq("user_id", user_id)
        if workspace_id:
            existing_edges_query = existing_edges_query.eq("workspace_id", workspace_id)
        existing_edges = existing_edges_query.execute()
        existing_pairs = {(e["source_id"], e["target_id"]) for e in existing_edges.data}
        
        all_suggestions = []
        
        # If node_id is provided, only get suggestions for that node
        if node_id:
            # Find the node type
            node_type = None
            node_data = None
            
            for page in pages.data:
                if page["id"] == node_id:
                    node_type = "page"
                    node_data = page
                    break
            
            if not node_type:
                for skill in skills.data:
                    if skill["id"] == node_id:
                        node_type = "skill"
                        node_data = skill
                        break
            
            if not node_type:
                for task in tasks.data:
                    if task["id"] == node_id:
                        node_type = "task"
                        node_data = task
                        break
            
            if not node_type:
                return {"suggestions": []}
            
            # Generate suggestions for this specific node
            if node_type == "page":
                # Suggest connections to other pages with common tags
                page_tags = set(node_data.get("tags", []))
                for other_page in pages.data:
                    if other_page["id"] == node_id:
                        continue
                    if (node_id, other_page["id"]) in existing_pairs or (other_page["id"], node_id) in existing_pairs:
                        continue
                    
                    other_tags = set(other_page.get("tags", []))
                    common_tags = page_tags & other_tags
                    
                    if len(common_tags) >= 1:
                        all_suggestions.append({
                            "source_id": node_id,
                            "source_type": "page",
                            "source_label": node_data["title"],
                            "target_id": other_page["id"],
                            "target_type": "page",
                            "target_label": other_page["title"],
                            "confidence": min(0.9, 0.5 + len(common_tags) * 0.15),
                            "reason": f"Common tags: {', '.join(common_tags)}"
                        })
                
                # Suggest connections to skills mentioned in content
                page_text = f"{node_data.get('title', '')} {node_data.get('content', '')}".lower()
                for skill in skills.data:
                    if (node_id, skill["id"]) in existing_pairs:
                        continue
                    
                    skill_name = skill["name"].lower()
                    if skill_name in page_text:
                        all_suggestions.append({
                            "source_id": node_id,
                            "source_type": "page",
                            "source_label": node_data["title"],
                            "target_id": skill["id"],
                            "target_type": "skill",
                            "target_label": skill["name"],
                            "confidence": 0.85,
                            "reason": f"Page mentions skill '{skill['name']}'"
                        })
            
            elif node_type == "skill":
                # Suggest connections to pages that mention this skill
                skill_name = node_data["name"].lower()
                for page in pages.data:
                    if (node_id, page["id"]) in existing_pairs or (page["id"], node_id) in existing_pairs:
                        continue
                    
                    page_text = f"{page.get('title', '')} {page.get('content', '')}".lower()
                    if skill_name in page_text:
                        all_suggestions.append({
                            "source_id": page["id"],
                            "source_type": "page",
                            "source_label": page["title"],
                            "target_id": node_id,
                            "target_type": "skill",
                            "target_label": node_data["name"],
                            "confidence": 0.85,
                            "reason": f"Page mentions this skill"
                        })
            
            elif node_type == "task":
                # Suggest connections to related pages
                task_text = f"{node_data.get('title', '')} {node_data.get('description', '')}".lower()
                for page in pages.data:
                    if (node_id, page["id"]) in existing_pairs:
                        continue
                    
                    page_title = page["title"].lower()
                    if page_title in task_text or any(tag.lower() in task_text for tag in page.get("tags", [])):
                        all_suggestions.append({
                            "source_id": node_id,
                            "source_type": "task",
                            "source_label": node_data["title"],
                            "target_id": page["id"],
                            "target_type": "page",
                            "target_label": page["title"],
                            "confidence": 0.75,
                            "reason": f"Task references this page"
                        })
        else:
            # Original behavior: get all suggestions
            # Infer connections between pages
            for i, page1 in enumerate(pages.data):
                for page2 in pages.data[i+1:]:
                    if (page1["id"], page2["id"]) in existing_pairs or (page2["id"], page1["id"]) in existing_pairs:
                        continue
                    
                    # Check for common tags
                    tags1 = set(page1.get("tags", []))
                    tags2 = set(page2.get("tags", []))
                    common_tags = tags1 & tags2
                    
                    if len(common_tags) >= 2:
                        all_suggestions.append({
                            "source_id": page1["id"],
                            "source_type": "page",
                            "source_label": page1["title"],
                            "target_id": page2["id"],
                            "target_type": "page",
                            "target_label": page2["title"],
                            "confidence": min(0.9, 0.5 + len(common_tags) * 0.1),
                            "reason": f"Common tags: {', '.join(common_tags)}"
                        })
            
            # Infer connections between pages and skills
            for page in pages.data:
                page_text = f"{page.get('title', '')} {page.get('content', '')}".lower()
                for skill in skills.data:
                    if (page["id"], skill["id"]) in existing_pairs:
                        continue
                    
                    skill_name = skill["name"].lower()
                    if skill_name in page_text:
                        all_suggestions.append({
                            "source_id": page["id"],
                            "source_type": "page",
                            "source_label": page["title"],
                            "target_id": skill["id"],
                            "target_type": "skill",
                            "target_label": skill["name"],
                            "confidence": 0.8,
                            "reason": f"Page mentions skill '{skill['name']}'"
                        })
            
            # Infer connections between tasks and pages
            for task in tasks.data:
                task_text = f"{task.get('title', '')} {task.get('description', '')}".lower()
                for page in pages.data:
                    if (task["id"], page["id"]) in existing_pairs:
                        continue
                    
                    page_title = page["title"].lower()
                    if page_title in task_text or any(tag.lower() in task_text for tag in page.get("tags", [])):
                        all_suggestions.append({
                            "source_id": task["id"],
                            "source_type": "task",
                            "source_label": task["title"],
                            "target_id": page["id"],
                            "target_type": "page",
                            "target_label": page["title"],
                            "confidence": 0.7,
                            "reason": f"Task references page '{page['title']}'"
                        })
        
        # Sort by confidence
        all_suggestions.sort(key=lambda x: x["confidence"], reverse=True)
        
        return {"suggestions": all_suggestions[:20]}  # Return top 20 suggestions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/edges/accept-suggestion")
async def accept_suggestion(
    data: EdgeCreate,
    user_id: str = Depends(get_current_user)
):
    """Accept an AI suggestion and create an inferred edge"""
    try:
        response = supabase_admin.table("graph_edges").insert({
            "user_id": user_id,
            "workspace_id": data.workspace_id,
            "source_id": data.source_id,
            "source_type": data.source_type,
            "target_id": data.target_id,
            "target_type": data.target_type,
            "edge_type": "inferred"
        }).execute()
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/edges/{edge_id}/type")
async def update_edge_type(
    edge_id: str,
    edge_type: str,
    user_id: str = Depends(get_current_user)
):
    """Update edge type (e.g., convert inferred to explicit)"""
    try:
        response = supabase_admin.table("graph_edges").update({
            "edge_type": edge_type
        }).eq("id", edge_id).eq("user_id", user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Edge not found")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/insights")
async def get_graph_insights(workspace_id: str = None, user_id: str = Depends(get_current_user)):
    """Get AI-powered insights about the knowledge graph"""
    try:
        # Call the database function
        result = supabase_admin.rpc(
            'calculate_graph_insights',
            {'p_user_id': user_id, 'p_workspace_id': workspace_id}
        ).execute()
        
        insights = result.data if result.data else {}
        
        # Add actionable recommendations
        recommendations = []
        
        # Skill gap recommendations
        if insights.get('skill_gaps'):
            for gap in insights['skill_gaps'][:3]:
                recommendations.append({
                    "type": "skill_gap",
                    "priority": "high",
                    "title": f"Practice {gap['skill_name']}",
                    "description": f"This skill has {gap.get('connection_count', 0)} connections. Add more evidence or practice.",
                    "action": {
                        "label": "Add Evidence",
                        "route": f"/skills/{gap['skill_id']}"
                    }
                })
        
        # Isolated node recommendations
        if insights.get('isolated_nodes'):
            for node in insights['isolated_nodes'][:2]:
                recommendations.append({
                    "type": "isolated_content",
                    "priority": "medium",
                    "title": f"Connect '{node['label']}'",
                    "description": "This content has no connections. Link it to related skills or pages.",
                    "action": {
                        "label": "Add Connections",
                        "route": f"/graph?focus={node['node_id']}"
                    }
                })
        
        insights['recommendations'] = recommendations
        return insights
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/path")
async def find_learning_path(
    start_id: str,
    end_id: str,
    workspace_id: str = None,
    user_id: str = Depends(get_current_user)
):
    """Find learning path between two nodes"""
    try:
        result = supabase_admin.rpc(
            'find_learning_path',
            {
                'p_user_id': user_id,
                'p_start_node_id': start_id,
                'p_end_node_id': end_id,
                'p_workspace_id': workspace_id
            }
        ).execute()
        
        return {"path": result.data if result.data else []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/backlinks/{node_id}")
async def get_backlinks(
    node_id: str,
    workspace_id: str = None,
    user_id: str = Depends(get_current_user)
):
    """Get all nodes that link to this node (backlinks)"""
    try:
        # Get edges where this node is the target
        query = supabase_admin.table("graph_edges").select(
            "id, source_id, source_type, edge_type, strength, created_at"
        ).eq("target_id", node_id).eq("user_id", user_id)
        
        if workspace_id:
            query = query.eq("workspace_id", workspace_id)
        
        edges = query.execute()
        
        # Get source node details
        backlinks = []
        for edge in edges.data:
            source_type = edge["source_type"]
            source_id = edge["source_id"]
            
            # Fetch source node details
            if source_type == "page":
                node = supabase_admin.table("pages").select("id, title as label, icon").eq("id", source_id).single().execute()
            elif source_type == "skill":
                node = supabase_admin.table("skills").select("id, name as label").eq("id", source_id).single().execute()
            elif source_type == "task":
                node = supabase_admin.table("tasks").select("id, title as label").eq("id", source_id).single().execute()
            elif source_type == "concept":
                node = supabase_admin.table("concepts").select("id, name as label").eq("id", source_id).single().execute()
            else:
                continue
            
            if node.data:
                backlinks.append({
                    "edge_id": edge["id"],
                    "node_id": source_id,
                    "node_type": source_type,
                    "label": node.data.get("label", "Unknown"),
                    "icon": node.data.get("icon"),
                    "edge_type": edge["edge_type"],
                    "strength": edge.get("strength", 0.5),
                    "created_at": edge.get("created_at")
                })
        
        return {"backlinks": backlinks, "count": len(backlinks)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/concepts/extract")
async def extract_concepts(
    page_id: str,
    workspace_id: str = None,
    user_id: str = Depends(get_current_user)
):
    """Manually trigger concept extraction for a page"""
    try:
        # Get page content
        page = supabase_admin.table("pages").select("*").eq("id", page_id).eq("user_id", user_id).single().execute()
        
        if not page.data:
            raise HTTPException(status_code=404, detail="Page not found")
        
        # Trigger the extraction function by updating the page
        supabase_admin.table("pages").update({
            "updated_at": "NOW()"
        }).eq("id", page_id).execute()
        
        # Get newly created concepts
        concepts = supabase_admin.table("concepts").select("*").eq("user_id", user_id)
        if workspace_id:
            concepts = concepts.eq("workspace_id", workspace_id)
        concepts = concepts.order("created_at", desc=True).limit(10).execute()
        
        return {"concepts": concepts.data, "message": "Concepts extracted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/node/{node_id}/preview")
async def get_node_preview(
    node_id: str,
    node_type: str,
    user_id: str = Depends(get_current_user)
):
    """Get preview information for a node (for hover previews)"""
    try:
        preview = {}
        
        if node_type == "page":
            page = supabase_admin.table("pages").select(
                "id, title, icon, content, tags, created_at"
            ).eq("id", node_id).eq("user_id", user_id).single().execute()
            
            if page.data:
                # Get first 200 chars of content
                content = page.data.get("content", "")
                preview = {
                    "id": page.data["id"],
                    "title": page.data["title"],
                    "icon": page.data.get("icon"),
                    "preview": content[:200] + "..." if len(content) > 200 else content,
                    "tags": page.data.get("tags", []),
                    "created_at": page.data.get("created_at")
                }
        
        elif node_type == "skill":
            skill = supabase_admin.table("skills").select(
                "id, name, description, level"
            ).eq("id", node_id).eq("user_id", user_id).single().execute()
            
            if skill.data:
                preview = {
                    "id": skill.data["id"],
                    "title": skill.data["name"],
                    "preview": skill.data.get("description", ""),
                    "level": skill.data.get("level")
                }
        
        elif node_type == "concept":
            concept = supabase_admin.table("concepts").select(
                "id, name, description, definition, usage_count"
            ).eq("id", node_id).eq("user_id", user_id).single().execute()
            
            if concept.data:
                preview = {
                    "id": concept.data["id"],
                    "title": concept.data["name"],
                    "preview": concept.data.get("definition") or concept.data.get("description", ""),
                    "usage_count": concept.data.get("usage_count", 0)
                }
        
        elif node_type == "task":
            task = supabase_admin.table("tasks").select(
                "id, title, description, status, due_date"
            ).eq("id", node_id).eq("user_id", user_id).single().execute()
            
            if task.data:
                preview = {
                    "id": task.data["id"],
                    "title": task.data["title"],
                    "preview": task.data.get("description", ""),
                    "status": task.data.get("status"),
                    "due_date": task.data.get("due_date")
                }
        
        if not preview:
            raise HTTPException(status_code=404, detail="Node not found")
        
        # Get connection count
        edges = supabase_admin.table("graph_edges").select("id").or_(
            f"source_id.eq.{node_id},target_id.eq.{node_id}"
        ).eq("user_id", user_id).execute()
        
        preview["connection_count"] = len(edges.data) if edges.data else 0
        
        return preview
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
