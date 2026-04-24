import { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  Panel,
  MiniMap,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Loader2, 
  RefreshCw,
  Maximize2,
  Search,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { WorkspaceNode } from '@/components/graph/WorkspaceNode';
import { SkillNode } from '@/components/graph/SkillNode';
import { PageNode } from '@/components/graph/PageNode';
import { TaskNode } from '@/components/graph/TaskNode';
import { QuizNode } from '@/components/graph/QuizNode';

const nodeTypes = {
  workspace: WorkspaceNode,
  skill: SkillNode,
  page: PageNode,
  task: TaskNode,
  quiz: QuizNode,
};

// Dagre layout configuration
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  const nodeWidth = 200;
  const nodeHeight = 100;
  
  dagreGraph.setGraph({ 
    rankdir: direction,
    ranksep: 150,
    nodesep: 100,
    edgesep: 50,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { 
      width: node.type === 'workspace' ? 300 : nodeWidth, 
      height: node.type === 'workspace' ? 150 : nodeHeight 
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.position = {
      x: nodeWithPosition.x - (node.type === 'workspace' ? 150 : nodeWidth / 2),
      y: nodeWithPosition.y - (node.type === 'workspace' ? 75 : nodeHeight / 2),
    };
  });

  return { nodes, edges };
};

export function WorkspaceGraphPage() {
  const { currentWorkspace } = useWorkspace();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [inferring, setInferring] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'page' | 'skill' | 'task' | 'quiz'>('all');

  const loadGraphData = useCallback(async () => {
    if (!currentWorkspace) return;
    
    try {
      setLoading(true);
      const workspaceId = currentWorkspace.id;
      
      const [nodesData, edgesData] = await Promise.all([
        api.getGraphNodes(workspaceId),
        api.getGraphEdges(workspaceId)
      ]);

      const nodeList = nodesData.nodes || [];
      
      // Create workspace center node
      const workspaceNode: Node = {
        id: `workspace-${workspaceId}`,
        type: 'workspace',
        position: { x: 0, y: 0 },
        data: { 
          label: currentWorkspace.name,
          description: currentWorkspace.description || 'Your workspace hub',
          workspace: currentWorkspace
        },
      };

      // Create nodes for all items
      const itemNodes: Node[] = nodeList.map((node: any) => ({
        id: node.id,
        type: node.type,
        position: { x: 0, y: 0 },
        data: {
          label: node.label,
          icon: node.icon,
          level: node.level,
          status: node.status,
          tags: node.tags,
          ...node
        },
      }));

      // Create edges - everything connects to workspace
      const workspaceEdges: Edge[] = itemNodes.map((node) => ({
        id: `workspace-${node.id}`,
        source: workspaceNode.id,
        target: node.id,
        type: 'smoothstep',
        animated: false,
        style: { 
          stroke: getEdgeColor('workspace'),
          strokeWidth: 2,
        },
      }));

      // Add existing edges between items
      const itemEdges: Edge[] = (edgesData.edges || []).map((edge: any) => ({
        id: edge.id || `${edge.source_id}-${edge.target_id}`,
        source: edge.source_id,
        target: edge.target_id,
        type: 'smoothstep',
        animated: edge.edge_type === 'inferred',
        style: {
          stroke: getEdgeColor(edge.edge_type),
          strokeWidth: edge.edge_type === 'explicit' ? 3 : 2,
          strokeDasharray: edge.edge_type === 'inferred' ? '5,5' : undefined,
        },
        label: edge.edge_type === 'evidence' ? '📚' : undefined,
      }));

      const allNodes = [workspaceNode, ...itemNodes];
      const allEdges = [...workspaceEdges, ...itemEdges];

      // Apply layout
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        allNodes,
        allEdges,
        'TB'
      );

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    } catch (error) {
      console.error('Failed to load graph data:', error);
      toast.error('Failed to load knowledge graph');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, setNodes, setEdges]);

  useEffect(() => {
    loadGraphData();
  }, [loadGraphData]);

  const handleInferEdges = async () => {
    try {
      setInferring(true);
      const result = await api.inferEdges(currentWorkspace?.id);
      toast.success(`Found ${result.suggestions?.length || 0} potential connections`);
      await loadGraphData();
    } catch (error) {
      console.error('Failed to infer edges:', error);
      toast.error('Failed to suggest connections');
    } finally {
      setInferring(false);
    }
  };

  const getEdgeColor = (type: string) => {
    switch (type) {
      case 'workspace':
        return 'rgb(168, 85, 247)'; // Purple
      case 'explicit':
        return 'rgb(168, 85, 247)'; // Purple
      case 'evidence':
        return 'rgb(59, 130, 246)'; // Blue
      case 'linked':
        return 'rgb(34, 197, 94)'; // Green
      case 'inferred':
        return 'rgb(168, 85, 247)'; // Purple dashed
      default:
        return 'rgb(156, 163, 175)'; // Gray
    }
  };

  const filteredNodes = nodes.filter(node => {
    if (node.type === 'workspace') return true;
    const matchesType = filterType === 'all' || node.type === filterType;
    const matchesSearch = !searchQuery || 
      node.data.label?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const filteredEdges = edges.filter(edge => {
    const sourceVisible = filteredNodes.some(n => n.id === edge.source);
    const targetVisible = filteredNodes.some(n => n.id === edge.target);
    return sourceVisible && targetVisible;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading knowledge graph...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-background">
      <ReactFlow
        nodes={filteredNodes}
        edges={filteredEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
        }}
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1}
          color="hsl(var(--muted-foreground) / 0.2)"
        />
        
        <Controls 
          className="bg-card border border-border rounded-lg shadow-lg"
          showInteractive={false}
        />
        
        <MiniMap 
          className="bg-card border border-border rounded-lg shadow-lg"
          nodeColor={(node) => {
            switch (node.type) {
              case 'workspace': return 'rgb(168, 85, 247)';
              case 'skill': return 'rgb(168, 85, 247)';
              case 'page': return 'rgb(59, 130, 246)';
              case 'task': return 'rgb(234, 179, 8)';
              case 'quiz': return 'rgb(236, 72, 153)';
              default: return 'rgb(156, 163, 175)';
            }
          }}
          maskColor="rgb(0, 0, 0, 0.1)"
        />

        {/* Top Panel */}
        <Panel position="top-center" className="flex flex-col items-center gap-2">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-lg p-4"
          >
            <h1 className="text-2xl font-display font-bold text-center mb-1">
              {currentWorkspace?.name || 'Knowledge Graph'}
            </h1>
            <p className="text-sm text-muted-foreground text-center">
              {filteredNodes.length - 1} nodes • {filteredEdges.length} connections
            </p>
          </motion.div>
        </Panel>

        {/* Top Right Controls */}
        <Panel position="top-right" className="flex flex-col gap-2">
          <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-lg p-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-48"
              />
            </div>
            
            <div className="flex gap-1">
              {(['all', 'page', 'skill', 'task', 'quiz'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={cn(
                    "px-2 py-1 rounded text-xs font-medium transition-all",
                    filterType === type
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary hover:bg-secondary/80"
                  )}
                >
                  {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleInferEdges}
              disabled={inferring}
              className="w-full"
            >
              {inferring ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              AI Suggest
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadGraphData}
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </Panel>

        {/* Legend */}
        <Panel position="bottom-right">
          <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-lg p-4">
            <p className="text-xs font-semibold text-foreground mb-3">Legend</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600" />
                <span className="text-muted-foreground">Workspace</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded-lg bg-purple-500/20 border-2 border-purple-500" />
                <span className="text-muted-foreground">Skill</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded-lg bg-blue-500/20 border-2 border-blue-500" />
                <span className="text-muted-foreground">Page</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded-lg bg-yellow-500/20 border-2 border-yellow-500" />
                <span className="text-muted-foreground">Task</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded-lg bg-pink-500/20 border-2 border-pink-500" />
                <span className="text-muted-foreground">Quiz</span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex items-center gap-2 text-xs">
                <Zap className="w-4 h-4 text-purple-500" />
                <span className="text-muted-foreground">Drag to pan</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Maximize2 className="w-4 h-4 text-purple-500" />
                <span className="text-muted-foreground">Scroll to zoom</span>
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
