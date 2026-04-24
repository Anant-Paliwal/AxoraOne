import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, Brain, CheckSquare, Sparkles, ExternalLink,
  Check, Search, RefreshCw, Target, TrendingUp,
  Eye, Zap, BookOpen, Award, ChevronDown, Lightbulb,
  ZoomIn, ZoomOut, Maximize2, PanelRightClose, PanelRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useNavigate } from 'react-router-dom';

interface GraphNode {
  id: string;
  type: 'page' | 'skill' | 'task' | 'quiz' | 'goal' | 'concept' | 'workspace';
  label: string;
  x: number;
  y: number;
  icon?: string;
  tags?: string[];
  level?: string;
  status?: string;
  progress?: number;
  confidence?: number;
  isCenter?: boolean;
  size?: 'xlarge' | 'large' | 'medium' | 'small';
  connection_count?: number;
}

interface GraphEdge {
  id?: string;
  source_id: string;
  target_id: string;
  edge_type: string;
  source_type?: string;
  target_type?: string;
}

interface Suggestion {
  source_id: string;
  source_type: string;
  source_label: string;
  target_id: string;
  target_type: string;
  target_label: string;
  confidence: number;
  reason: string;
}

export function EnhancedGraphPage() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'insights' | 'suggestions'>('insights');
  const [showAllNodes, setShowAllNodes] = useState(true);
  const [showSuggestedLinks, setShowSuggestedLinks] = useState(true);
  const [showSkillProgress, setShowSkillProgress] = useState(true);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showSidebar, setShowSidebar] = useState(true);

  const loadGraphData = useCallback(async () => {
    try {
      setLoading(true);
      const workspaceId = currentWorkspace?.id;
      
      const [nodesData, edgesData] = await Promise.all([
        api.getGraphNodes(workspaceId),
        api.getGraphEdges(workspaceId),
      ]);

      const nodeList = nodesData.nodes || [];
      const edgeList = edgesData.edges || [];
      
      const positionedNodes = layoutNodesRadial(nodeList, currentWorkspace?.name || 'Workspace');
      
      setNodes(positionedNodes);
      setEdges(edgeList);
      
      try {
        const result = await api.inferEdges(workspaceId);
        setSuggestions(result.suggestions || []);
      } catch (e) {
        console.log('No suggestions available');
      }
    } catch (error) {
      console.error('Failed to load graph data:', error);
      toast.error('Failed to load knowledge graph');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, currentWorkspace?.name]);

  useEffect(() => {
    loadGraphData();
  }, [loadGraphData]);

  // Radial layout positioning
  const layoutNodesRadial = (nodeList: any[], workspaceName: string): GraphNode[] => {
    const positioned: GraphNode[] = [];
    const centerX = 50;
    const centerY = 50;
    
    positioned.push({
      id: 'workspace-center',
      type: 'workspace',
      label: workspaceName,
      x: centerX,
      y: centerY,
      isCenter: true,
      size: 'xlarge'
    });

    if (nodeList.length === 0) return positioned;
    
    const skills = nodeList.filter(n => n.type === 'skill');
    const pages = nodeList.filter(n => n.type === 'page');
    const tasks = nodeList.filter(n => n.type === 'task');
    const quizzes = nodeList.filter(n => n.type === 'quiz');
    const concepts = nodeList.filter(n => n.type === 'concept');
    const goals = nodeList.filter(n => n.type === 'goal');
    
    // Ring 1: Skills - radius 20%
    skills.forEach((skill, i) => {
      const angle = (i / Math.max(skills.length, 1)) * 2 * Math.PI - Math.PI / 2;
      positioned.push({
        ...skill,
        x: centerX + 20 * Math.cos(angle),
        y: centerY + 20 * Math.sin(angle),
        size: 'large',
        progress: skill.confidence || 0
      });
    });
    
    // Ring 2: Pages - radius 35%
    pages.forEach((page, i) => {
      const angle = (i / Math.max(pages.length, 1)) * 2 * Math.PI - Math.PI / 4;
      positioned.push({
        ...page,
        x: centerX + 35 * Math.cos(angle),
        y: centerY + 35 * Math.sin(angle),
        size: 'medium'
      });
    });
    
    // Ring 3: Tasks - radius 45%
    tasks.forEach((task, i) => {
      const angle = (i / Math.max(tasks.length, 1)) * 2 * Math.PI + Math.PI / 6;
      positioned.push({
        ...task,
        x: centerX + 45 * Math.cos(angle),
        y: centerY + 45 * Math.sin(angle),
        size: 'small'
      });
    });

    quizzes.forEach((quiz, i) => {
      const angle = (i / Math.max(quizzes.length, 1)) * 2 * Math.PI + Math.PI / 3;
      positioned.push({
        ...quiz,
        x: centerX + 40 * Math.cos(angle),
        y: centerY + 40 * Math.sin(angle),
        size: 'small'
      });
    });

    concepts.forEach((concept, i) => {
      const angle = (i / Math.max(concepts.length, 1)) * 2 * Math.PI;
      positioned.push({
        ...concept,
        x: centerX + 30 * Math.cos(angle),
        y: centerY + 30 * Math.sin(angle),
        size: 'small'
      });
    });

    goals.forEach((goal, i) => {
      const angle = (i / Math.max(goals.length, 1)) * 2 * Math.PI;
      positioned.push({
        ...goal,
        x: centerX + 48 * Math.cos(angle),
        y: centerY + 48 * Math.sin(angle),
        size: 'medium'
      });
    });
    
    return positioned;
  };

  // Build all edges including auto-generated ones
  const allEdges = useCallback((): GraphEdge[] => {
    const result: GraphEdge[] = [...edges];
    const existingPairs = new Set(edges.map(e => `${e.source_id}-${e.target_id}`));
    
    // Connect skills to workspace center
    nodes.filter(n => n.type === 'skill').forEach(skill => {
      const key = `workspace-center-${skill.id}`;
      if (!existingPairs.has(key)) {
        result.push({
          id: key,
          source_id: 'workspace-center',
          target_id: skill.id,
          edge_type: 'contains'
        });
      }
    });

    // If no edges from backend, create connections based on node relationships
    if (edges.length === 0) {
      const skills = nodes.filter(n => n.type === 'skill');
      const pages = nodes.filter(n => n.type === 'page');
      const tasks = nodes.filter(n => n.type === 'task');
      const quizzes = nodes.filter(n => n.type === 'quiz');
      
      // Connect pages to nearest skill
      pages.forEach((page, i) => {
        if (skills.length > 0) {
          const skill = skills[i % skills.length];
          result.push({
            id: `auto-${skill.id}-${page.id}`,
            source_id: skill.id,
            target_id: page.id,
            edge_type: 'linked'
          });
        }
      });

      // Connect tasks to pages
      tasks.forEach((task, i) => {
        if (pages.length > 0) {
          const page = pages[i % pages.length];
          result.push({
            id: `auto-${page.id}-${task.id}`,
            source_id: page.id,
            target_id: task.id,
            edge_type: 'evidence'
          });
        }
      });

      // Connect quizzes to skills
      quizzes.forEach((quiz, i) => {
        if (skills.length > 0) {
          const skill = skills[i % skills.length];
          result.push({
            id: `auto-${skill.id}-${quiz.id}`,
            source_id: skill.id,
            target_id: quiz.id,
            edge_type: 'assessment'
          });
        }
      });
    }
    
    return result;
  }, [edges, nodes]);

  const handleNodeClick = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(selectedNode === nodeId ? null : nodeId);
  };

  const handleOpenNode = (node: GraphNode) => {
    const ws = currentWorkspace;
    if (node.type === 'page') navigate(ws ? `/workspace/${ws.id}/pages/${node.id}` : `/pages/${node.id}`);
    else if (node.type === 'skill') navigate(ws ? `/workspace/${ws.id}/skills` : `/skills`);
    else if (node.type === 'task') navigate(ws ? `/workspace/${ws.id}/tasks` : `/tasks`);
  };

  const handleAcceptSuggestion = async (suggestion: Suggestion) => {
    try {
      await api.acceptSuggestion({
        source_id: suggestion.source_id,
        source_type: suggestion.source_type,
        target_id: suggestion.target_id,
        target_type: suggestion.target_type,
        workspace_id: currentWorkspace?.id
      });
      toast.success('Connection added');
      setSuggestions(prev => prev.filter(s => s.source_id !== suggestion.source_id || s.target_id !== suggestion.target_id));
      await loadGraphData();
    } catch (error) {
      toast.error('Failed to add connection');
    }
  };

  // Filter nodes
  const filteredNodes = nodes.filter(node => {
    if (node.type === 'workspace') return true;
    if (filterType && node.type !== filterType) return false;
    if (searchQuery && !node.label.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Filter edges
  const graphEdges = allEdges();
  const filteredEdges = graphEdges.filter(edge => {
    if (!showSuggestedLinks && edge.edge_type === 'suggested') return false;
    const hasSource = filteredNodes.some(n => n.id === edge.source_id);
    const hasTarget = filteredNodes.some(n => n.id === edge.target_id);
    return hasSource && hasTarget;
  });

  const selectedNodeData = selectedNode ? nodes.find(n => n.id === selectedNode) : null;
  const connectedEdges = selectedNode ? graphEdges.filter(e => e.source_id === selectedNode || e.target_id === selectedNode) : [];
  const connectedNodes = connectedEdges.map(edge => {
    const id = edge.source_id === selectedNode ? edge.target_id : edge.source_id;
    return nodes.find(n => n.id === id);
  }).filter(Boolean) as GraphNode[];

  const NodeIcon = ({ type, className }: { type: string; className?: string }) => {
    switch (type) {
      case 'skill': return <Brain className={className} />;
      case 'page': return <FileText className={className} />;
      case 'task': return <CheckSquare className={className} />;
      case 'quiz': return <Award className={className} />;
      case 'goal': return <Target className={className} />;
      case 'concept': return <Lightbulb className={className} />;
      default: return <FileText className={className} />;
    }
  };

  // Theme colors - using standard Tailwind theme classes like HomePage
  const wireColor = '#6366f1';
  const wireHighlight = '#818cf8';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <p className="text-muted-foreground">Loading Knowledge Graph...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Main Graph Area */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-background" 
        onClick={() => setSelectedNode(null)}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-background to-transparent">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold flex items-center gap-2 text-foreground">
              Knowledge Graph
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </h1>
          </div>
          
          {/* Type Filters */}
          <div className="flex items-center gap-1 backdrop-blur-sm rounded-full px-2 py-1 border bg-card/80 border-border">
            {[
              { type: 'skill', color: 'bg-violet-500', label: 'Skill' },
              { type: 'page', color: 'bg-blue-500', label: 'Page' },
              { type: 'task', color: 'bg-amber-500', label: 'Task' },
              { type: 'quiz', color: 'bg-emerald-500', label: 'Quiz' },
              { type: 'concept', color: 'bg-orange-500', label: 'Concept' },
              { type: 'goal', color: 'bg-rose-500', label: 'Future' },
            ].map(({ type, color, label }) => (
              <button
                key={type}
                onClick={(e) => { e.stopPropagation(); setFilterType(filterType === type ? null : type); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  filterType === type 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-secondary"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full", color)} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Toggle Sidebar */}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); setShowSidebar(!showSidebar); }}
            className="text-muted-foreground hover:bg-secondary"
          >
            {showSidebar ? <PanelRightClose className="w-5 h-5" /> : <PanelRight className="w-5 h-5" />}
          </Button>
        </div>

        {/* Graph Canvas */}
        <div 
          className="absolute inset-0 pt-16 pb-24"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        >
          {/* SVG for Wire Connections */}
          <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 5 }}>
            <defs>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Render all edges as curved wires */}
            {filteredEdges.map((edge, i) => {
              const source = filteredNodes.find(n => n.id === edge.source_id);
              const target = filteredNodes.find(n => n.id === edge.target_id);
              if (!source || !target) return null;
              
              const isHighlighted = selectedNode && (edge.source_id === selectedNode || edge.target_id === selectedNode);
              const isSuggested = edge.edge_type === 'suggested';
              
              // Calculate bezier curve control points
              const sx = source.x, sy = source.y;
              const tx = target.x, ty = target.y;
              const mx = (sx + tx) / 2;
              const my = (sy + ty) / 2;
              const dx = tx - sx;
              const dy = ty - sy;
              const dist = Math.sqrt(dx * dx + dy * dy);
              
              // Curve amount based on distance
              const curveAmount = Math.min(dist * 0.3, 15);
              const cx = mx + (-dy / (dist || 1)) * curveAmount;
              const cy = my + (dx / (dist || 1)) * curveAmount;
              
              const wireOpacity = selectedNode ? (isHighlighted ? 1 : 0.15) : 0.5;
              const wireWidth = isHighlighted ? 3 : 2;
              
              return (
                <g key={`edge-${i}`}>
                  {/* Glow effect for all wires */}
                  <path
                    d={`M ${sx}% ${sy}% Q ${cx}% ${cy}% ${tx}% ${ty}%`}
                    fill="none"
                    stroke={isHighlighted ? wireHighlight : wireColor}
                    strokeWidth={wireWidth + 4}
                    opacity={wireOpacity * 0.3}
                    strokeLinecap="round"
                  />
                  {/* Main wire path */}
                  <path
                    d={`M ${sx}% ${sy}% Q ${cx}% ${cy}% ${tx}% ${ty}%`}
                    fill="none"
                    stroke={isHighlighted ? wireHighlight : wireColor}
                    strokeWidth={wireWidth}
                    strokeDasharray={isSuggested ? '8,4' : '0'}
                    opacity={wireOpacity}
                    strokeLinecap="round"
                    filter={isHighlighted ? 'url(#glow)' : undefined}
                    className="transition-all duration-300"
                  />
                  {/* Highlight glow */}
                  {isHighlighted && (
                    <path
                      d={`M ${sx}% ${sy}% Q ${cx}% ${cy}% ${tx}% ${ty}%`}
                      fill="none"
                      stroke={wireHighlight}
                      strokeWidth={8}
                      opacity={0.25}
                      strokeLinecap="round"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {filteredNodes.map((node, index) => {
            const isSelected = selectedNode === node.id;
            const isConnected = selectedNode && connectedEdges.some(e => e.source_id === node.id || e.target_id === node.id);
            
            const sizes = {
              xlarge: { w: 'w-28', h: 'h-28', text: 'text-sm', icon: 'w-8 h-8' },
              large: { w: 'w-36', h: 'h-12', text: 'text-xs', icon: 'w-4 h-4' },
              medium: { w: 'w-40', h: 'h-10', text: 'text-xs', icon: 'w-4 h-4' },
              small: { w: 'w-36', h: 'h-9', text: 'text-[11px]', icon: 'w-3.5 h-3.5' }
            };
            const size = sizes[node.size || 'medium'];
            
            const getNodeStyle = (type: string) => {
              switch (type) {
                case 'workspace': return { bg: 'bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600', text: 'text-white', border: 'border-violet-400' };
                case 'skill': return { bg: 'bg-violet-500/20', text: 'text-violet-300', border: 'border-violet-500/50' };
                case 'page': return { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/50' };
                case 'task': return { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/50' };
                case 'quiz': return { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/50' };
                case 'concept': return { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/50' };
                case 'goal': return { bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/50' };
                default: return { bg: 'bg-secondary', text: 'text-secondary-foreground', border: 'border-border' };
              }
            };
            const style = getNodeStyle(node.type);
            
            return (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: selectedNode && !isSelected && !isConnected ? 0.3 : 1,
                  scale: isSelected ? 1.05 : 1
                }}
                transition={{ delay: index * 0.02, type: 'spring', stiffness: 300, damping: 25 }}
                onClick={(e) => node.type !== 'workspace' && handleNodeClick(node.id, e)}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200",
                  node.type === 'workspace' && "cursor-default"
                )}
                style={{ left: `${node.x}%`, top: `${node.y}%`, zIndex: isSelected ? 30 : node.isCenter ? 20 : 10 }}
              >
                {node.type === 'workspace' ? (
                  <div className="relative">
                    <div className={cn(
                      "w-28 h-28 rounded-full flex items-center justify-center",
                      style.bg,
                      "shadow-2xl shadow-purple-500/30"
                    )}>
                      <div className="absolute inset-2 rounded-full bg-white/10" />
                      <div className="absolute inset-4 rounded-full bg-white/5" />
                      <div className="relative text-center text-white z-10 px-2">
                        <div className="text-sm font-bold leading-tight">{node.label}</div>
                      </div>
                    </div>
                    <div className="absolute inset-0 rounded-full bg-purple-400/20 blur-xl -z-10 scale-125" />
                  </div>
                ) : (
                  <div className={cn(
                    "rounded-2xl border-2 backdrop-blur-sm transition-all flex items-center gap-2 px-3 shadow-sm",
                    size.w, size.h,
                    style.bg, style.border,
                    isSelected && "ring-2 ring-violet-400 scale-105 shadow-lg shadow-violet-500/20"
                  )}>
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full flex-shrink-0",
                      node.type === 'skill' && "bg-violet-500",
                      node.type === 'page' && "bg-blue-500",
                      node.type === 'task' && "bg-amber-500",
                      node.type === 'quiz' && "bg-emerald-500",
                      node.type === 'concept' && "bg-orange-500",
                      node.type === 'goal' && "bg-rose-500"
                    )} />
                    <span className={cn("truncate font-medium", size.text, style.text)}>
                      {node.label}
                    </span>
                    {node.status && (
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ml-auto",
                        node.status === 'done' ? "bg-emerald-500/30 text-emerald-600" :
                        node.status === 'in_progress' ? "bg-amber-500/30 text-amber-600" :
                        "bg-gray-500/30 text-gray-500"
                      )}>
                        {node.status === 'done' ? '✓' : node.status === 'in_progress' ? '◐' : '○'}
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="absolute bottom-24 left-4 z-20 backdrop-blur-sm rounded-xl p-3 border bg-card/90 border-border">
          <div className="space-y-1.5 text-xs">
            {[
              { color: 'bg-violet-500', label: 'Skill' },
              { color: 'bg-blue-500', label: 'Page' },
              { color: 'bg-amber-500', label: 'Task' },
              { color: 'bg-emerald-500', label: 'Quiz' },
              { color: 'bg-orange-500', label: 'Concept' },
              { color: 'bg-rose-500', label: 'Future Goal' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded-full", color)} />
                <span className="text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Toolbar */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 backdrop-blur-sm rounded-full px-4 py-2 border bg-card/90 border-border">
          <button
            onClick={(e) => { e.stopPropagation(); setShowAllNodes(!showAllNodes); setFilterType(null); }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all",
              showAllNodes 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:bg-secondary"
            )}
          >
            <Eye className="w-4 h-4" />
            All Nodes
          </button>
          <div className="w-px h-6 bg-border" />
          <button
            onClick={(e) => { e.stopPropagation(); setShowSuggestedLinks(!showSuggestedLinks); }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all",
              showSuggestedLinks 
                ? "bg-violet-600/50 text-violet-300" 
                : "text-muted-foreground hover:bg-secondary"
            )}
          >
            <Zap className="w-4 h-4" />
            Suggested Links
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowSkillProgress(!showSkillProgress); }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all",
              showSkillProgress 
                ? "bg-emerald-600/50 text-emerald-300" 
                : "text-muted-foreground hover:bg-secondary"
            )}
          >
            <TrendingUp className="w-4 h-4" />
            Skill Progress
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-24 right-4 z-20 flex flex-col gap-1">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(z + 0.1, 2)); }}
            className="bg-card/90 border-border text-muted-foreground hover:bg-secondary"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(z - 0.1, 0.5)); }}
            className="bg-card/90 border-border text-muted-foreground hover:bg-secondary"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={(e) => { e.stopPropagation(); setZoom(1); }}
            className="bg-card/90 border-border text-muted-foreground hover:bg-secondary"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Right Sidebar - Graph Assistant (Collapsible) */}
      {showSidebar && (
        <motion.div 
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          className="border-l flex flex-col overflow-hidden bg-card border-border"
        >
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between border-border">
            <h2 className="font-semibold text-foreground">Graph Assistant</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSidebar(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <PanelRightClose className="w-4 h-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-secondary border-border"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="p-4 border-b border-border">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg p-3 text-center bg-secondary">
                <div className="text-2xl font-bold text-foreground">{nodes.length}</div>
                <div className="text-xs text-muted-foreground">Total Nodes</div>
              </div>
              <div className="rounded-lg p-3 text-center bg-secondary">
                <div className="text-2xl font-bold text-violet-500">{graphEdges.length}</div>
                <div className="text-xs text-muted-foreground">Connections</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab('insights')}
              className={cn(
                "flex-1 py-3 text-sm font-medium transition-colors",
                activeTab === 'insights' 
                  ? "text-primary border-b-2 border-primary" 
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              <Sparkles className="w-4 h-4 inline mr-1.5" />
              Insights
            </button>
            <button
              onClick={() => setActiveTab('suggestions')}
              className={cn(
                "flex-1 py-3 text-sm font-medium transition-colors",
                activeTab === 'suggestions' 
                  ? "text-primary border-b-2 border-primary" 
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              <Zap className="w-4 h-4 inline mr-1.5" />
              Suggestions
              {suggestions.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-violet-500/30 text-violet-400 rounded-full">
                  {suggestions.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'insights' ? (
              <div className="space-y-3">
                {selectedNodeData ? (
                  <div className="rounded-xl p-4 border bg-secondary border-border">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        selectedNodeData.type === 'skill' && "bg-violet-500/20",
                        selectedNodeData.type === 'page' && "bg-blue-500/20",
                        selectedNodeData.type === 'task' && "bg-amber-500/20",
                        selectedNodeData.type === 'quiz' && "bg-emerald-500/20"
                      )}>
                        <NodeIcon type={selectedNodeData.type} className={cn(
                          "w-5 h-5",
                          selectedNodeData.type === 'skill' && "text-violet-500",
                          selectedNodeData.type === 'page' && "text-blue-500",
                          selectedNodeData.type === 'task' && "text-amber-500",
                          selectedNodeData.type === 'quiz' && "text-emerald-500"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate text-foreground">{selectedNodeData.label}</h3>
                        <p className="text-xs capitalize text-muted-foreground">{selectedNodeData.type}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenNode(selectedNodeData)}
                        className="text-muted-foreground"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Connected to</p>
                      {connectedNodes.length > 0 ? (
                        <div className="space-y-1.5">
                          {connectedNodes.slice(0, 5).map(node => (
                            <div 
                              key={node.id}
                              onClick={(e) => handleNodeClick(node.id, e)}
                              className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors bg-background hover:bg-secondary"
                            >
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                node.type === 'skill' && "bg-violet-500",
                                node.type === 'page' && "bg-blue-500",
                                node.type === 'task' && "bg-amber-500",
                                node.type === 'quiz' && "bg-emerald-500"
                              )} />
                              <span className="text-sm truncate text-foreground">{node.label}</span>
                            </div>
                          ))}
                          {connectedNodes.length > 5 && (
                            <p className="text-xs text-center text-muted-foreground">
                              +{connectedNodes.length - 5} more
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No connections yet</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-secondary">
                      <BookOpen className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Select a node to see details</p>
                  </div>
                )}

                {/* Graph Overview */}
                <div className="rounded-xl p-4 border bg-secondary border-border">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-foreground">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Graph Overview
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Skills</span>
                      <span className="text-violet-500 font-medium">{nodes.filter(n => n.type === 'skill').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pages</span>
                      <span className="text-blue-500 font-medium">{nodes.filter(n => n.type === 'page').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tasks</span>
                      <span className="text-amber-500 font-medium">{nodes.filter(n => n.type === 'task').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quizzes</span>
                      <span className="text-emerald-500 font-medium">{nodes.filter(n => n.type === 'quiz').length}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {suggestions.length > 0 ? (
                  suggestions.map((suggestion, i) => (
                    <div key={i} className="rounded-xl p-4 border bg-secondary border-border">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-violet-500/20">
                          <Zap className="w-4 h-4 text-violet-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">
                            Connect <span className="text-blue-500">{suggestion.source_label}</span> to{' '}
                            <span className="text-violet-500">{suggestion.target_label}</span>
                          </p>
                          <p className="text-xs mt-1 text-muted-foreground">{suggestion.reason}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-16 rounded-full overflow-hidden bg-secondary">
                            <div className="h-full bg-violet-500 rounded-full" style={{ width: `${suggestion.confidence * 100}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{Math.round(suggestion.confidence * 100)}%</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAcceptSuggestion(suggestion)}
                          className="bg-violet-600 hover:bg-violet-700 text-white text-xs"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Accept
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-secondary">
                      <Sparkles className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No suggestions available</p>
                    <p className="text-xs mt-1 text-muted-foreground">Add more content to get AI suggestions</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <div className="p-4 border-t border-border">
            <Button
              onClick={loadGraphData}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Graph
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default EnhancedGraphPage;
