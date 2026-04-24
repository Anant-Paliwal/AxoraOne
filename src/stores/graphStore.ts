import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  Node,
  Edge,
  Connection,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from 'reactflow';
import { api } from '@/lib/api';

// Node types for the knowledge graph
export type NodeType = 'page' | 'skill' | 'task' | 'concept' | 'quiz' | 'flashcard' | 'workspace' | 'future';

export interface GraphNode extends Node {
  data: {
    label: string;
    nodeType: NodeType;
    color: string;
    icon?: string;
    tags?: string[];
    confidence?: number;
    status?: string;
    priority?: string;
    [key: string]: any;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  label?: string;
  data?: {
    edge_type?: string;
    weight?: number;
    [key: string]: any;
  };
}

export interface GraphStats {
  total_nodes: number;
  total_edges: number;
  density: number;
  is_connected: boolean;
  num_components: number;
  avg_clustering: number;
  node_types: Record<string, string[]>;
}

export interface Community {
  id: number;
  nodes: GraphNode[];
  color: string;
}

interface GraphState {
  // Core graph data
  nodes: GraphNode[];
  edges: GraphEdge[];
  
  // UI state
  selectedNode: string | null;
  hoveredNode: string | null;
  selectedEdge: string | null;
  
  // Filters
  visibleNodeTypes: NodeType[];
  searchQuery: string;
  
  // Graph analysis
  stats: GraphStats | null;
  communities: Record<number, GraphNode[]>;
  hubNodes: GraphNode[];
  isolatedNodes: GraphNode[];
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Layout
  layoutType: 'force' | 'hierarchical' | 'radial' | 'dagre';
  
  // Actions
  setNodes: (nodes: GraphNode[]) => void;
  setEdges: (edges: GraphEdge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  
  selectNode: (nodeId: string | null) => void;
  hoverNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  
  setVisibleNodeTypes: (types: NodeType[]) => void;
  toggleNodeType: (type: NodeType) => void;
  setSearchQuery: (query: string) => void;
  
  setLayoutType: (layout: 'force' | 'hierarchical' | 'radial' | 'dagre') => void;
  
  // API actions
  loadGraph: (workspaceId: string) => Promise<void>;
  loadStats: (workspaceId: string) => Promise<void>;
  loadCommunities: (workspaceId: string) => Promise<void>;
  loadHubs: (workspaceId: string) => Promise<void>;
  loadNeighbors: (nodeId: string, workspaceId: string, depth?: number) => Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }>;
  findPath: (workspaceId: string, source: string, target: string) => Promise<string[]>;
  getSuggestions: (nodeId: string, workspaceId: string) => Promise<GraphNode[]>;
  
  // Utility
  getFilteredNodes: () => GraphNode[];
  getFilteredEdges: () => GraphEdge[];
  reset: () => void;
}

const NODE_TYPE_COLORS: Record<NodeType, string> = {
  page: '#3b82f6',     // Blue
  skill: '#22c55e',    // Green
  task: '#f59e0b',     // Amber
  concept: '#8b5cf6',  // Purple
  quiz: '#ec4899',     // Pink
  flashcard: '#06b6d4', // Cyan
  workspace: '#8b5cf6', // Purple (center)
  future: '#f43f5e',   // Rose
};

const COMMUNITY_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

const initialState = {
  nodes: [],
  edges: [],
  selectedNode: null,
  hoveredNode: null,
  selectedEdge: null,
  visibleNodeTypes: ['page', 'skill', 'task', 'concept', 'quiz', 'flashcard', 'workspace', 'future'] as NodeType[],
  searchQuery: '',
  stats: null,
  communities: {},
  hubNodes: [],
  isolatedNodes: [],
  loading: false,
  error: null,
  layoutType: 'force' as const,
};

export const useGraphStore = create<GraphState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        setNodes: (nodes) => set({ nodes }),
        setEdges: (edges) => set({ edges }),

        onNodesChange: (changes) => {
          set({
            nodes: applyNodeChanges(changes, get().nodes) as GraphNode[],
          });
        },

        onEdgesChange: (changes) => {
          set({
            edges: applyEdgeChanges(changes, get().edges) as GraphEdge[],
          });
        },

        onConnect: (connection) => {
          set({
            edges: addEdge(connection, get().edges) as GraphEdge[],
          });
        },

        selectNode: (nodeId) => set({ selectedNode: nodeId }),
        hoverNode: (nodeId) => set({ hoveredNode: nodeId }),
        selectEdge: (edgeId) => set({ selectedEdge: edgeId }),

        setVisibleNodeTypes: (types) => set({ visibleNodeTypes: types }),
        
        toggleNodeType: (type) => {
          const current = get().visibleNodeTypes;
          if (current.includes(type)) {
            set({ visibleNodeTypes: current.filter(t => t !== type) });
          } else {
            set({ visibleNodeTypes: [...current, type] });
          }
        },

        setSearchQuery: (query) => set({ searchQuery: query }),
        
        setLayoutType: (layout) => set({ layoutType: layout }),

        loadGraph: async (workspaceId) => {
          set({ loading: true, error: null, nodes: [], edges: [] }); // Clear old data first
          try {
            const data = await api.getGraphReactFlow(workspaceId);
            
            // Add colors based on node type
            const nodes = (data.nodes || []).map((node: any) => ({
              ...node,
              data: {
                ...node.data,
                color: NODE_TYPE_COLORS[node.data?.nodeType as NodeType] || '#6366f1',
              },
            }));
            
            set({ 
              nodes, 
              edges: data.edges || [],
              loading: false 
            });
          } catch (error: any) {
            set({ error: error.message, loading: false });
          }
        },

        loadStats: async (workspaceId) => {
          try {
            const stats = await api.getGraphStats(workspaceId);
            set({ stats });
          } catch (error: any) {
            console.error('Failed to load stats:', error);
          }
        },

        loadCommunities: async (workspaceId) => {
          try {
            const data = await api.getGraphCommunities(workspaceId);
            
            // Assign colors to communities
            const communities: Record<number, GraphNode[]> = {};
            Object.entries(data.communities || {}).forEach(([id, nodes], index) => {
              const communityId = parseInt(id);
              communities[communityId] = (nodes as any[]).map(node => ({
                ...node,
                data: {
                  ...node,
                  communityColor: COMMUNITY_COLORS[index % COMMUNITY_COLORS.length],
                },
              }));
            });
            
            set({ communities });
          } catch (error: any) {
            console.error('Failed to load communities:', error);
          }
        },

        loadHubs: async (workspaceId) => {
          try {
            const hubs = await api.getGraphHubs(workspaceId);
            set({ hubNodes: hubs });
          } catch (error: any) {
            console.error('Failed to load hubs:', error);
          }
        },

        loadNeighbors: async (nodeId, workspaceId, depth = 1) => {
          try {
            const data = await api.getGraphNeighbors(nodeId, workspaceId, depth);
            return {
              nodes: data.nodes || [],
              edges: data.edges || [],
            };
          } catch (error: any) {
            console.error('Failed to load neighbors:', error);
            return { nodes: [], edges: [] };
          }
        },

        findPath: async (workspaceId, source, target) => {
          try {
            const data = await api.findGraphPath(workspaceId, source, target);
            return data.path || [];
          } catch (error: any) {
            console.error('Failed to find path:', error);
            return [];
          }
        },

        getSuggestions: async (nodeId, workspaceId) => {
          try {
            const suggestions = await api.getGraphSuggestions(nodeId, workspaceId);
            return suggestions || [];
          } catch (error: any) {
            console.error('Failed to get suggestions:', error);
            return [];
          }
        },

        getFilteredNodes: () => {
          const { nodes, visibleNodeTypes, searchQuery } = get();
          
          return nodes.filter(node => {
            // Filter by type
            const nodeType = node.data?.nodeType as NodeType;
            if (!visibleNodeTypes.includes(nodeType)) return false;
            
            // Filter by search
            if (searchQuery) {
              const label = node.data?.label?.toLowerCase() || '';
              const tags = (node.data?.tags || []).join(' ').toLowerCase();
              const query = searchQuery.toLowerCase();
              if (!label.includes(query) && !tags.includes(query)) return false;
            }
            
            return true;
          });
        },

        getFilteredEdges: () => {
          const { edges } = get();
          const filteredNodes = get().getFilteredNodes();
          const nodeIds = new Set(filteredNodes.map(n => n.id));
          
          return edges.filter(edge => 
            nodeIds.has(edge.source) && nodeIds.has(edge.target)
          );
        },

        reset: () => set(initialState),
      }),
      {
        name: 'graph-store',
        partialize: (state) => ({
          visibleNodeTypes: state.visibleNodeTypes,
          layoutType: state.layoutType,
        }),
      }
    ),
    { name: 'GraphStore' }
  )
);
