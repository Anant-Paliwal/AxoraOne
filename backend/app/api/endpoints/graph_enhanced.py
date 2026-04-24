"""
Enhanced Knowledge Graph API with NetworkX
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from app.api.dependencies import get_current_user
from app.services.graph_service import graph_service

router = APIRouter()

@router.get("/load")
async def load_graph(
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """Load graph from database into NetworkX"""
    try:
        G = await graph_service.load_graph_from_db(workspace_id, user_id)
        stats = graph_service.get_graph_stats(G)
        return {
            "status": "loaded",
            "workspace_id": workspace_id,
            **stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/react-flow")
async def get_react_flow_data(
    workspace_id: str,
    user_id: str = Depends(get_current_user),
    node_types: Optional[str] = None  # comma-separated: "page,skill,task"
):
    """Get graph data formatted for React Flow"""
    try:
        G = await graph_service.load_graph_from_db(workspace_id, user_id)
        
        # Filter by node types if specified
        if node_types:
            types = [t.strip() for t in node_types.split(",")]
            G = graph_service.filter_by_type(G, types)
        
        data = graph_service.export_for_react_flow(G)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_graph_stats(
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get graph statistics"""
    try:
        G = await graph_service.load_graph_from_db(workspace_id, user_id)
        return graph_service.get_graph_stats(G)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/hubs")
async def get_hub_nodes(
    workspace_id: str,
    user_id: str = Depends(get_current_user),
    top_n: int = Query(10, ge=1, le=50)
):
    """Get most connected nodes (hubs)"""
    try:
        G = await graph_service.load_graph_from_db(workspace_id, user_id)
        return graph_service.get_hub_nodes(G, top_n)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/isolated")
async def get_isolated_nodes(
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get nodes with no connections"""
    try:
        G = await graph_service.load_graph_from_db(workspace_id, user_id)
        return graph_service.get_isolated_nodes(G)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/neighbors/{node_id}")
async def get_node_neighbors(
    node_id: str,
    workspace_id: str,
    user_id: str = Depends(get_current_user),
    depth: int = Query(1, ge=1, le=3)
):
    """Get neighbors of a node up to specified depth"""
    try:
        G = await graph_service.load_graph_from_db(workspace_id, user_id)
        return graph_service.get_neighbors(G, node_id, depth)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/path")
async def find_path(
    workspace_id: str,
    source: str,
    target: str,
    user_id: str = Depends(get_current_user)
):
    """Find shortest path between two nodes"""
    try:
        G = await graph_service.load_graph_from_db(workspace_id, user_id)
        path = graph_service.find_shortest_path(G, source, target)
        
        if not path:
            return {"path": [], "found": False}
        
        # Get node details for path
        path_details = []
        for node_id in path:
            if G.has_node(node_id):
                path_details.append({
                    "id": node_id,
                    **G.nodes[node_id]
                })
        
        return {
            "path": path,
            "path_details": path_details,
            "length": len(path),
            "found": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/learning-path")
async def get_learning_path(
    workspace_id: str,
    start_skill: str,
    end_skill: str,
    user_id: str = Depends(get_current_user)
):
    """Find optimal learning path between two skills"""
    try:
        G = await graph_service.load_graph_from_db(workspace_id, user_id)
        return graph_service.get_learning_path(G, start_skill, end_skill)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/communities")
async def detect_communities(
    workspace_id: str,
    user_id: str = Depends(get_current_user)
):
    """Detect communities/clusters in the graph"""
    try:
        G = await graph_service.load_graph_from_db(workspace_id, user_id)
        communities = graph_service.detect_communities(G)
        
        # Group nodes by community
        community_groups = {}
        for node_id, community_id in communities.items():
            if community_id not in community_groups:
                community_groups[community_id] = []
            if G.has_node(node_id):
                community_groups[community_id].append({
                    "id": node_id,
                    **G.nodes[node_id]
                })
        
        return {
            "num_communities": len(community_groups),
            "communities": community_groups,
            "node_assignments": communities
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/centrality")
async def get_centrality_scores(
    workspace_id: str,
    user_id: str = Depends(get_current_user),
    metric: str = Query("degree", regex="^(degree|betweenness|pagerank)$")
):
    """Get centrality scores for all nodes"""
    try:
        G = await graph_service.load_graph_from_db(workspace_id, user_id)
        
        if metric == "degree":
            scores = graph_service.get_node_degree_centrality(G)
        elif metric == "betweenness":
            scores = graph_service.get_betweenness_centrality(G)
        elif metric == "pagerank":
            scores = graph_service.get_pagerank(G)
        else:
            scores = {}
        
        # Add node details
        result = []
        for node_id, score in sorted(scores.items(), key=lambda x: x[1], reverse=True):
            if G.has_node(node_id):
                result.append({
                    "id": node_id,
                    "score": score,
                    **G.nodes[node_id]
                })
        
        return {
            "metric": metric,
            "scores": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/suggestions/{node_id}")
async def get_connection_suggestions(
    node_id: str,
    workspace_id: str,
    user_id: str = Depends(get_current_user),
    top_n: int = Query(5, ge=1, le=20)
):
    """Get suggested connections for a node"""
    try:
        G = await graph_service.load_graph_from_db(workspace_id, user_id)
        return graph_service.suggest_connections(G, node_id, top_n)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ego/{node_id}")
async def get_ego_graph(
    node_id: str,
    workspace_id: str,
    user_id: str = Depends(get_current_user),
    radius: int = Query(2, ge=1, le=4)
):
    """Get ego graph centered on a node"""
    try:
        G = await graph_service.load_graph_from_db(workspace_id, user_id)
        ego = graph_service.get_ego_graph(G, node_id, radius)
        return graph_service.export_for_react_flow(ego)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
