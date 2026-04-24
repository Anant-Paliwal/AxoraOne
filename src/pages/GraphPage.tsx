import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  GitBranch, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  FileText,
  Brain,
  CheckSquare,
  Sparkles,
  Link2,
  X,
  ExternalLink,
  Pencil,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useNavigate } from 'react-router-dom';

interface GraphNode {
  id: string;
  type: 'page' | 'skill' | 'task';
  label: string;
  x: number;
  y: number;
  icon?: string;
  tags?: string[];
  level?: string;
  status?: string;
}

interface GraphEdge {
  id?: string;
  source_id: string;
  target_id: string;
  edge_type: 'explicit' | 'inferred' | 'evidence' | 'linked';
  source_type?: string;
  target_type?: string;
}

export function GraphPage() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [inferring, setInferring] = useState(false);

  useEffect(() => {
    loadGraphData();
  }, [currentWorkspace]);

  const loadGraphData = async () => {
    try {
      setLoading(true);
      const workspaceId = currentWorkspace?.id;
      
      const [nodesData, edgesData] = await Promise.all([
        api.getGraphNodes(workspaceId),
        api.getGraphEdges(workspaceId)
      ]);

      // Position nodes in a circular layout
      const nodeList = nodesData.nodes || [];
      const positionedNodes = nodeList.map((node: any, index: number) => {
        const angle = (index / nodeList.length) * 2 * Math.PI;
        const radius = 35; // percentage
        const centerX = 50;
        const centerY = 50;
        
        return {
          ...node,
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        };
      });

      setNodes(positionedNodes);
      setEdges(edgesData.edges || []);
    } catch (error) {
      console.error('Failed to load graph data:', error);
      toast.error('Failed to load knowledge graph');
    } finally {
      setLoading(false);
    }
  };

  const handleInferEdges = async () => {
    try {
      setInferring(true);
      const result = await api.inferEdges();
      toast.success(`Found ${result.suggestions?.length || 0} potential connections`);
      // Reload graph to show new suggestions
      await loadGraphData();
    } catch (error) {
      console.error('Failed to infer edges:', error);
      toast.error('Failed to suggest connections');
    } finally {
      setInferring(false);
    }
  };

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(selectedNode === nodeId ? null : nodeId);
  };

  const handleOpenNode = () => {
    if (!selectedNode) return;
    
    const node = nodes.find(n => n.id === selectedNode);
    if (!node) return;

    const workspace = currentWorkspace;
    
    if (node.type === 'page') {
      if (workspace) {
        navigate(`/workspace/${workspace.id}/pages/${node.id}`);
      } else {
        navigate(`/pages/${node.id}`);
      }
    } else if (node.type === 'skill') {
      if (workspace) {
        navigate(`/workspace/${workspace.id}/skills`);
      } else {
        navigate(`/skills`);
      }
    } else if (node.type === 'task') {
      if (workspace) {
        navigate(`/workspace/${workspace.id}/tasks`);
      } else {
        navigate(`/tasks`);
      }
    }
  };

  const selectedNodeData = selectedNode ? nodes.find(n => n.id === selectedNode) : null;
  const connectedNodes = selectedNode ? edges
    .filter(e => e.source_id === selectedNode || e.target_id === selectedNode)
    .map(e => {
      const connectedId = e.source_id === selectedNode ? e.target_id : e.source_id;
      return nodes.find(n => n.id === connectedId);
    })
    .filter(Boolean) : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading knowledge graph...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Graph Area */}
      <div className="flex-1 relative bg-muted/30">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-background to-transparent">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Knowledge Graph</h1>
            <p className="text-sm text-muted-foreground">
              {currentWorkspace ? `${currentWorkspace.name} • ` : ''}{nodes.length} nodes • {edges.length} connections
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-lg"
              onClick={handleInferEdges}
              disabled={inferring}
            >
              {inferring ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              AI Suggest Links
            </Button>
          </div>
        </div>

        {nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <GitBranch className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No data yet</h3>
              <p className="text-muted-foreground mb-4">
                Create pages, skills, or tasks to see your knowledge graph
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Zoom Controls */}
            <div className="absolute bottom-6 left-6 z-10 flex items-center gap-2 bg-card border border-border rounded-xl p-1">
              <button
                onClick={() => setZoom(z => Math.max(50, z - 10))}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <ZoomOut className="w-4 h-4 text-muted-foreground" />
              </button>
              <span className="px-2 text-sm font-medium text-foreground">{zoom}%</span>
              <button
                onClick={() => setZoom(z => Math.min(150, z + 10))}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <ZoomIn className="w-4 h-4 text-muted-foreground" />
              </button>
              <div className="w-px h-6 bg-border" />
              <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <Maximize2 className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Graph Visualization */}
            <div className="absolute inset-0 pt-20 pb-16 px-8 overflow-hidden">
              <svg className="w-full h-full" style={{ transform: `scale(${zoom / 100})` }}>
                {/* Edges */}
                {edges.map((edge, i) => {
                  const source = nodes.find(n => n.id === edge.source_id);
                  const target = nodes.find(n => n.id === edge.target_id);
                  if (!source || !target) return null;
                  
                  // Different colors for different edge types
                  let strokeColor = 'hsl(var(--border))';
                  let strokeDash = '0';
                  
                  if (edge.edge_type === 'inferred') {
                    strokeColor = 'hsl(var(--primary) / 0.3)';
                    strokeDash = '5,5';
                  } else if (edge.edge_type === 'evidence') {
                    strokeColor = 'hsl(var(--accent) / 0.6)';
                    strokeDash = '0';
                  } else if (edge.edge_type === 'linked') {
                    strokeColor = 'hsl(var(--primary) / 0.5)';
                    strokeDash = '0';
                  }
                  
                  return (
                    <line
                      key={i}
                      x1={`${source.x}%`}
                      y1={`${source.y}%`}
                      x2={`${target.x}%`}
                      y2={`${target.y}%`}
                      stroke={strokeColor}
                      strokeWidth={2}
                      strokeDasharray={strokeDash}
                    />
                  );
                })}
              </svg>

              {/* Nodes */}
              {nodes.map((node, index) => {
                const isSelected = selectedNode === node.id;
                const Icon = node.type === 'page' ? FileText : 
                            node.type === 'skill' ? Brain : CheckSquare;
                
                return (
                  <motion.button
                    key={node.id}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleNodeClick(node.id)}
                    className={cn(
                      "absolute flex flex-col items-center gap-2 -translate-x-1/2 -translate-y-1/2 transition-all",
                    )}
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                      isSelected && "ring-4 ring-primary/30 scale-110",
                      node.type === 'page' && "bg-primary/10 border-2 border-primary/30",
                      node.type === 'skill' && "bg-secondary border-2 border-border",
                      node.type === 'task' && "bg-accent/10 border-2 border-accent/30",
                    )}>
                      {node.icon && node.type === 'page' ? (
                        <span className="text-xl">{node.icon}</span>
                      ) : (
                        <Icon className={cn(
                          "w-5 h-5",
                          node.type === 'page' ? "text-primary" : 
                          node.type === 'skill' ? "text-muted-foreground" :
                          "text-accent"
                        )} />
                      )}
                    </div>
                    <span className={cn(
                      "text-xs font-medium px-2 py-1 rounded-md bg-card shadow-sm border border-border max-w-[120px] truncate",
                      isSelected && "bg-primary text-primary-foreground border-primary"
                    )}>
                      {node.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="absolute bottom-6 right-6 z-10 bg-card border border-border rounded-xl p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Legend</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded bg-primary/30 border border-primary/50" />
                  <span className="text-muted-foreground">Page</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded bg-secondary border border-border" />
                  <span className="text-muted-foreground">Skill</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded bg-accent/30 border border-accent/50" />
                  <span className="text-muted-foreground">Task</span>
                </div>
                <div className="h-px bg-border my-1" />
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-6 h-0.5 bg-border" />
                  <span className="text-muted-foreground">Explicit</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-6 h-0.5 bg-accent/60" />
                  <span className="text-muted-foreground">Evidence</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-6 h-0.5 bg-primary/50" />
                  <span className="text-muted-foreground">Linked</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-6 h-0.5 border-t-2 border-dashed border-primary/30" />
                  <span className="text-muted-foreground">AI Inferred</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Panel */}
      {selectedNodeData && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          className="w-80 border-l border-border bg-card flex flex-col"
        >
          {/* Header */}
          <div className="relative h-32 bg-gradient-to-br from-primary to-primary/60 p-4 flex-shrink-0">
            <button
              onClick={() => setSelectedNode(null)}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-background/20 text-primary-foreground hover:bg-background/30 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-4 left-4">
              <div className="flex items-center gap-1.5 text-xs text-primary-foreground/80 mb-1">
                {selectedNodeData.type === 'page' && <FileText className="w-3 h-3" />}
                {selectedNodeData.type === 'skill' && <Brain className="w-3 h-3" />}
                {selectedNodeData.type === 'task' && <CheckSquare className="w-3 h-3" />}
                <span>{selectedNodeData.type.toUpperCase()}</span>
              </div>
              <h2 className="text-xl font-display font-bold text-primary-foreground">
                {selectedNodeData.label}
              </h2>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Metadata */}
            {selectedNodeData.level && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Level</p>
                <span className="px-2 py-1 text-xs bg-secondary rounded-md">
                  {selectedNodeData.level}
                </span>
              </div>
            )}

            {selectedNodeData.status && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Status</p>
                <span className="px-2 py-1 text-xs bg-secondary rounded-md">
                  {selectedNodeData.status}
                </span>
              </div>
            )}

            {/* Tags */}
            {selectedNodeData.tags && selectedNodeData.tags.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedNodeData.tags.map((tag: string) => (
                    <span key={tag} className="px-2 py-1 text-xs bg-secondary rounded-md">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Connections */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">CONNECTIONS</p>
                <span className="text-xs font-medium text-primary">{connectedNodes.length}</span>
              </div>
              {connectedNodes.length > 0 ? (
                <div className="space-y-2">
                  {connectedNodes.map((conn: any) => {
                    const Icon = conn.type === 'page' ? FileText : 
                                conn.type === 'skill' ? Brain : CheckSquare;
                    return (
                      <div 
                        key={conn.id} 
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                        onClick={() => handleNodeClick(conn.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{conn.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No connections yet</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-border bg-card flex-shrink-0">
            <Button 
              className="w-full rounded-xl"
              onClick={handleOpenNode}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open {selectedNodeData.type}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
