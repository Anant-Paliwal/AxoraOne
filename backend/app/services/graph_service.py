"""
Knowledge Graph Service using NetworkX
Provides advanced graph algorithms and analysis
"""
import networkx as nx
from typing import Optional, List, Dict, Any, Tuple
from collections import defaultdict
from app.core.supabase import supabase_admin

class KnowledgeGraphService:
    """NetworkX-powered knowledge graph service"""
    
    def __init__(self):
        self.graphs: Dict[str, nx.DiGraph] = {}  # workspace_id -> graph
    
    def _get_or_create_graph(self, workspace_id: str) -> nx.DiGraph:
        """Get or create a graph for a workspace"""
        if workspace_id not in self.graphs:
            self.graphs[workspace_id] = nx.DiGraph()
        return self.graphs[workspace_id]
    
    async def load_graph_from_db(self, workspace_id: str, user_id: str) -> nx.DiGraph:
        """Load graph data from Supabase into NetworkX"""
        G = nx.DiGraph()
        
        try:
            # Load nodes (pages, skills, tasks, concepts)
            pages = supabase_admin.table("pages").select("id, title, icon, tags, page_type").eq("workspace_id", workspace_id).eq("user_id", user_id).eq("is_archived", False).execute()
            skills = supabase_admin.table("skills").select("id, name, category, confidence").eq("workspace_id", workspace_id).eq("user_id", user_id).execute()
            tasks = supabase_admin.table("tasks").select("id, title, status, priority, event_type").eq("workspace_id", workspace_id).eq("user_id", user_id).execute()
            
            # Add page nodes
            for page in (pages.data or []):
                G.add_node(
                    page["id"],
                    type="page",
                    label=page["title"],
                    icon=page.get("icon", "📄"),
                    tags=page.get("tags", []),
                    page_type=page.get("page_type", "blank"),
                    color="#3b82f6"  # Blue
                )
            
            # Add skill nodes
            for skill in (skills.data or []):
                G.add_node(
                    skill["id"],
                    type="skill",
                    label=skill["name"],
                    category=skill.get("category"),
                    confidence=skill.get("confidence", 0),
                    color="#22c55e"  # Green
                )
            
            # Add task nodes
            for task in (tasks.data or []):
                G.add_node(
                    task["id"],
                    type="task",
                    label=task["title"],
                    status=task.get("status"),
                    priority=task.get("priority"),
                    event_type=task.get("event_type", "task"),
                    color="#f59e0b"  # Amber
                )
            
            # Load edges from graph_edges table
            edges = supabase_admin.table("graph_edges").select("*").eq("workspace_id", workspace_id).execute()
            
            for edge in (edges.data or []):
                source_id = edge.get("source_id")
                target_id = edge.get("target_id")
                if source_id and target_id and G.has_node(source_id) and G.has_node(target_id):
                    G.add_edge(
                        source_id,
                        target_id,
                        edge_type=edge.get("edge_type", "related"),
                        weight=edge.get("weight", 1.0),
                        id=edge.get("id")
                    )
            
            # Load page links with workspace filter
            page_links_query = supabase_admin.table("page_links").select("*").eq("user_id", user_id)
            if workspace_id:
                page_links_query = page_links_query.eq("workspace_id", workspace_id)
            page_links = page_links_query.execute()
            
            for link in (page_links.data or []):
                source_id = link.get("source_page_id")
                target_id = link.get("target_page_id")
                if source_id and target_id and G.has_node(source_id) and G.has_node(target_id):
                    if not G.has_edge(source_id, target_id):
                        G.add_edge(
                            source_id,
                            target_id,
                            edge_type=link.get("relation_type", "links_to"),
                            weight=1.0
                        )
            
            # Store in cache
            self.graphs[workspace_id] = G
            return G
            
        except Exception as e:
            print(f"Error loading graph: {e}")
            return G
    
    def get_node_types(self, G: nx.DiGraph) -> Dict[str, List[str]]:
        """Get nodes grouped by type"""
        types = defaultdict(list)
        for node, data in G.nodes(data=True):
            types[data.get("type", "unknown")].append(node)
        return dict(types)
    
    def get_node_degree_centrality(self, G: nx.DiGraph) -> Dict[str, float]:
        """Calculate degree centrality for all nodes"""
        return nx.degree_centrality(G)
    
    def get_betweenness_centrality(self, G: nx.DiGraph) -> Dict[str, float]:
        """Calculate betweenness centrality (important connector nodes)"""
        return nx.betweenness_centrality(G)
    
    def get_pagerank(self, G: nx.DiGraph) -> Dict[str, float]:
        """Calculate PageRank scores"""
        try:
            return nx.pagerank(G)
        except:
            return {}
    
    def find_shortest_path(self, G: nx.DiGraph, source: str, target: str) -> List[str]:
        """Find shortest path between two nodes"""
        try:
            return nx.shortest_path(G, source, target)
        except nx.NetworkXNoPath:
            return []
        except nx.NodeNotFound:
            return []
    
    def find_all_paths(self, G: nx.DiGraph, source: str, target: str, max_length: int = 5) -> List[List[str]]:
        """Find all simple paths between two nodes"""
        try:
            return list(nx.all_simple_paths(G, source, target, cutoff=max_length))
        except:
            return []
    
    def get_connected_components(self, G: nx.DiGraph) -> List[set]:
        """Get weakly connected components"""
        return list(nx.weakly_connected_components(G))
    
    def get_strongly_connected_components(self, G: nx.DiGraph) -> List[set]:
        """Get strongly connected components"""
        return list(nx.strongly_connected_components(G))
    
    def detect_communities(self, G: nx.DiGraph) -> Dict[str, int]:
        """Detect communities using Louvain-like algorithm"""
        try:
            # Convert to undirected for community detection
            G_undirected = G.to_undirected()
            communities = nx.community.louvain_communities(G_undirected)
            
            node_to_community = {}
            for i, community in enumerate(communities):
                for node in community:
                    node_to_community[node] = i
            return node_to_community
        except:
            return {}
    
    def get_neighbors(self, G: nx.DiGraph, node_id: str, depth: int = 1) -> Dict[str, Any]:
        """Get neighbors up to a certain depth"""
        if not G.has_node(node_id):
            return {"nodes": [], "edges": []}
        
        visited = {node_id}
        current_level = {node_id}
        all_nodes = [node_id]
        all_edges = []
        
        for _ in range(depth):
            next_level = set()
            for node in current_level:
                # Successors (outgoing)
                for successor in G.successors(node):
                    if successor not in visited:
                        visited.add(successor)
                        next_level.add(successor)
                        all_nodes.append(successor)
                    all_edges.append({
                        "source": node,
                        "target": successor,
                        **G.edges[node, successor]
                    })
                
                # Predecessors (incoming)
                for predecessor in G.predecessors(node):
                    if predecessor not in visited:
                        visited.add(predecessor)
                        next_level.add(predecessor)
                        all_nodes.append(predecessor)
                    all_edges.append({
                        "source": predecessor,
                        "target": node,
                        **G.edges[predecessor, node]
                    })
            
            current_level = next_level
        
        # Get node data
        nodes_with_data = []
        for node_id in all_nodes:
            node_data = G.nodes[node_id]
            nodes_with_data.append({
                "id": node_id,
                **node_data
            })
        
        return {
            "nodes": nodes_with_data,
            "edges": all_edges
        }
    
    def get_hub_nodes(self, G: nx.DiGraph, top_n: int = 10) -> List[Dict[str, Any]]:
        """Get the most connected nodes (hubs)"""
        degree_centrality = self.get_node_degree_centrality(G)
        sorted_nodes = sorted(degree_centrality.items(), key=lambda x: x[1], reverse=True)[:top_n]
        
        result = []
        for node_id, centrality in sorted_nodes:
            if G.has_node(node_id):
                node_data = G.nodes[node_id]
                result.append({
                    "id": node_id,
                    "centrality": centrality,
                    "in_degree": G.in_degree(node_id),
                    "out_degree": G.out_degree(node_id),
                    **node_data
                })
        return result
    
    def get_isolated_nodes(self, G: nx.DiGraph) -> List[Dict[str, Any]]:
        """Get nodes with no connections"""
        isolated = list(nx.isolates(G))
        return [{"id": node_id, **G.nodes[node_id]} for node_id in isolated]
    
    def suggest_connections(self, G: nx.DiGraph, node_id: str, top_n: int = 5) -> List[Dict[str, Any]]:
        """Suggest potential connections based on common neighbors"""
        if not G.has_node(node_id):
            return []
        
        suggestions = []
        node_type = G.nodes[node_id].get("type")
        
        # Get current neighbors
        current_neighbors = set(G.successors(node_id)) | set(G.predecessors(node_id))
        current_neighbors.add(node_id)
        
        # Find nodes with common neighbors (Jaccard similarity)
        for other_node in G.nodes():
            if other_node in current_neighbors:
                continue
            
            other_neighbors = set(G.successors(other_node)) | set(G.predecessors(other_node))
            
            # Calculate Jaccard similarity
            intersection = len(current_neighbors & other_neighbors)
            union = len(current_neighbors | other_neighbors)
            
            if union > 0 and intersection > 0:
                similarity = intersection / union
                suggestions.append({
                    "id": other_node,
                    "similarity": similarity,
                    "common_neighbors": intersection,
                    **G.nodes[other_node]
                })
        
        # Sort by similarity
        suggestions.sort(key=lambda x: x["similarity"], reverse=True)
        return suggestions[:top_n]
    
    def get_learning_path(self, G: nx.DiGraph, start_skill: str, end_skill: str) -> Dict[str, Any]:
        """Find optimal learning path between two skills"""
        path = self.find_shortest_path(G, start_skill, end_skill)
        
        if not path:
            return {"path": [], "steps": []}
        
        steps = []
        for i, node_id in enumerate(path):
            node_data = G.nodes.get(node_id, {})
            steps.append({
                "order": i + 1,
                "id": node_id,
                "type": node_data.get("type"),
                "label": node_data.get("label"),
                **node_data
            })
        
        return {
            "path": path,
            "steps": steps,
            "length": len(path)
        }
    
    def get_graph_stats(self, G: nx.DiGraph) -> Dict[str, Any]:
        """Get overall graph statistics"""
        return {
            "total_nodes": G.number_of_nodes(),
            "total_edges": G.number_of_edges(),
            "density": nx.density(G),
            "is_connected": nx.is_weakly_connected(G) if G.number_of_nodes() > 0 else False,
            "num_components": nx.number_weakly_connected_components(G),
            "avg_clustering": nx.average_clustering(G.to_undirected()) if G.number_of_nodes() > 0 else 0,
            "node_types": dict(self.get_node_types(G))
        }
    
    def export_for_react_flow(self, G: nx.DiGraph) -> Dict[str, Any]:
        """Export graph in React Flow format"""
        nodes = []
        edges = []
        
        # Calculate positions using spring layout
        try:
            pos = nx.spring_layout(G, k=2, iterations=50)
        except:
            pos = {}
        
        for node_id, data in G.nodes(data=True):
            position = pos.get(node_id, (0, 0))
            nodes.append({
                "id": node_id,
                "type": data.get("type", "default"),
                "position": {
                    "x": float(position[0]) * 500,
                    "y": float(position[1]) * 500
                },
                "data": {
                    "label": data.get("label", node_id),
                    "nodeType": data.get("type"),
                    "color": data.get("color", "#6366f1"),
                    **{k: v for k, v in data.items() if k not in ["label", "type", "color"]}
                }
            })
        
        for source, target, data in G.edges(data=True):
            edges.append({
                "id": f"{source}-{target}",
                "source": source,
                "target": target,
                "type": "smoothstep",
                "animated": data.get("edge_type") == "learning_path",
                "label": data.get("edge_type", ""),
                "data": data
            })
        
        return {"nodes": nodes, "edges": edges}
    
    def filter_by_type(self, G: nx.DiGraph, node_types: List[str]) -> nx.DiGraph:
        """Create a subgraph with only specified node types"""
        nodes_to_keep = [n for n, d in G.nodes(data=True) if d.get("type") in node_types]
        return G.subgraph(nodes_to_keep).copy()
    
    def get_ego_graph(self, G: nx.DiGraph, node_id: str, radius: int = 2) -> nx.DiGraph:
        """Get ego graph (subgraph centered on a node)"""
        try:
            return nx.ego_graph(G, node_id, radius=radius, undirected=True)
        except:
            return nx.DiGraph()


# Singleton instance
graph_service = KnowledgeGraphService()
