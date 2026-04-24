import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useReactFlow,
  MarkerType,
  ConnectionLineType,
  Node,
  Edge,
  ReactFlowProvider,
  getBezierPath,
  EdgeProps,
  BaseEdge,
  EdgeLabelRenderer,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Target,
  FileText,
  ListTodo,
  Brain,
  Sparkles,
  X,
  ExternalLink,
  TrendingUp,
  Link2,
  Lightbulb,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGraphStore, NodeType } from '@/stores/graphStore';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';

// ============ DOTTED CONNECTION EDGE (Theme-aware, Visible) ============
function DottedEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  id,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.2,
  });

  const isWorkspaceConnection = data?.edge_type === 'contains' || data?.isWorkspaceEdge;
  const isSuggested = data?.edge_type === 'suggested';

  // Use inline style for better visibility
  // Dark theme: white/light color, Light theme: dark color
  return (
    <>
      {/* Background path for better visibility */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke="currentColor"
        strokeWidth={isWorkspaceConnection ? 2.5 : 2}
        strokeDasharray="5,10"
        strokeLinecap="round"
        className="text-slate-400 dark:text-slate-300"
        style={{
          opacity: isSuggested ? 0.4 : 0.6,
        }}
      />
    </>
  );
}

// ============ WORKSPACE CENTER NODE (Large Purple Circle) ============
function WorkspaceCenterNode({ data, selected }: any) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="relative cursor-pointer"
    >
      {/* Outer glow rings */}
      <div className="absolute -inset-4 rounded-full bg-violet-400/10 animate-pulse" />
      <div className="absolute -inset-2 rounded-full bg-violet-400/20" />
      
      {/* Main circle */}
      <div
        className={cn(
          "w-28 h-28 rounded-full flex items-center justify-center",
          "bg-gradient-to-br from-violet-400 via-purple-500 to-indigo-600",
          "shadow-xl shadow-purple-500/40",
          "border-4 border-white/30",
          selected && "ring-4 ring-purple-300 ring-offset-2"
        )}
      >
        <div className="text-center text-white px-2">
          <div className="text-xs font-bold leading-tight">{data.label}</div>
        </div>
      </div>
    </motion.div>
  );
}

// ============ SKILL NODE (Purple with dot) ============
function SkillNode({ data, selected }: any) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      className={cn(
        "px-4 py-2.5 rounded-2xl cursor-pointer transition-shadow",
        "bg-gradient-to-br from-violet-50 to-purple-100 dark:from-violet-950 dark:to-purple-900",
        "border-2 border-violet-200 dark:border-violet-700",
        "shadow-lg shadow-violet-100 dark:shadow-violet-900/50",
        selected && "ring-2 ring-violet-500 ring-offset-2 shadow-xl"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-violet-500 flex-shrink-0" />
        <span className="font-medium text-sm text-violet-800 dark:text-violet-200 whitespace-nowrap">
          {data.label}
        </span>
      </div>
      {data.sublabel && (
        <div className="text-[10px] text-violet-500 dark:text-violet-400 mt-0.5 ml-4.5 italic">
          {data.sublabel}
        </div>
      )}
    </motion.div>
  );
}

// ============ PAGE NODE (Blue with icon) - Shows Full Title ============
function PageNode({ data, selected }: any) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      className={cn(
        "px-4 py-2.5 rounded-xl cursor-pointer transition-shadow",
        "bg-gradient-to-br from-blue-50 to-sky-100 dark:from-blue-950 dark:to-sky-900",
        "border-2 border-blue-200 dark:border-blue-700",
        "shadow-lg shadow-blue-100 dark:shadow-blue-900/50",
        selected && "ring-2 ring-blue-500 ring-offset-2 shadow-xl"
      )}
    >
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <span className="font-medium text-sm text-blue-800 dark:text-blue-200 whitespace-nowrap max-w-[200px] truncate" title={data.label}>
          {data.label}
        </span>
      </div>
      {data.status && (
        <div className="flex items-center gap-1.5 mt-1 ml-6">
          <span className={cn(
            "w-1.5 h-1.5 rounded-full",
            data.status === 'Completed' ? 'bg-green-500' : 
            data.status === 'In Progress' ? 'bg-blue-500' : 'bg-gray-400'
          )} />
          <span className="text-[10px] text-blue-500 dark:text-blue-400">{data.status}</span>
        </div>
      )}
    </motion.div>
  );
}

// ============ TASK NODE (Amber/Orange) ============
function TaskNode({ data, selected }: any) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      className={cn(
        "px-4 py-2.5 rounded-xl cursor-pointer transition-shadow",
        "bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-900",
        "border-2 border-amber-200 dark:border-amber-700",
        "shadow-lg shadow-amber-100 dark:shadow-amber-900/50",
        selected && "ring-2 ring-amber-500 ring-offset-2 shadow-xl"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
        <span className="font-medium text-sm text-amber-800 dark:text-amber-200 whitespace-nowrap">
          {data.label}
        </span>
      </div>
      {data.linkedTo && (
        <div className="text-[10px] text-amber-500 dark:text-amber-400 mt-0.5 ml-4.5">
          {data.linkedTo}
        </div>
      )}
    </motion.div>
  );
}

// ============ QUIZ NODE (Green) ============
function QuizNode({ data, selected }: any) {
  const isCompleted = data.status === 'Completed';
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      className={cn(
        "px-4 py-2.5 rounded-xl cursor-pointer transition-shadow",
        "bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-900",
        "border-2 border-emerald-200 dark:border-emerald-700",
        "shadow-lg shadow-emerald-100 dark:shadow-emerald-900/50",
        selected && "ring-2 ring-emerald-500 ring-offset-2 shadow-xl"
      )}
    >
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        <span className="font-medium text-sm text-emerald-800 dark:text-emerald-200 whitespace-nowrap">
          {data.label}
        </span>
      </div>
      {data.status && (
        <div className="flex items-center gap-1.5 mt-1 ml-6">
          <span className={cn("w-1.5 h-1.5 rounded-full", isCompleted ? 'bg-green-500' : 'bg-gray-400')} />
          <span className="text-[10px] text-emerald-500">{data.status}</span>
        </div>
      )}
    </motion.div>
  );
}

// ============ CONCEPT NODE (Light purple circle) ============
function ConceptNode({ data, selected }: any) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      className={cn(
        "w-16 h-16 rounded-full cursor-pointer transition-shadow flex items-center justify-center",
        "bg-gradient-to-br from-purple-100 to-violet-200 dark:from-purple-900 dark:to-violet-800",
        "border-2 border-purple-300 dark:border-purple-600",
        "shadow-lg shadow-purple-100 dark:shadow-purple-900/50",
        selected && "ring-2 ring-purple-500 ring-offset-2 shadow-xl"
      )}
    >
      <Lightbulb className="w-5 h-5 text-purple-600 dark:text-purple-300" />
    </motion.div>
  );
}

// ============ FUTURE GOAL NODE (Rose/Pink) ============
function FutureNode({ data, selected }: any) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      className={cn(
        "px-4 py-2.5 rounded-xl cursor-pointer transition-shadow",
        "bg-gradient-to-br from-rose-50 to-pink-100 dark:from-rose-950 dark:to-pink-900",
        "border-2 border-rose-200 dark:border-rose-700",
        "shadow-lg shadow-rose-100 dark:shadow-rose-900/50",
        selected && "ring-2 ring-rose-500 ring-offset-2 shadow-xl"
      )}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-rose-500 flex-shrink-0" />
        <span className="font-medium text-sm text-rose-800 dark:text-rose-200 whitespace-nowrap">
          {data.label}
        </span>
      </div>
    </motion.div>
  );
}

// Node and edge type registries
const nodeTypes = {
  workspace: WorkspaceCenterNode,
  skill: SkillNode,
  page: PageNode,
  task: TaskNode,
  quiz: QuizNode,
  concept: ConceptNode,
  flashcard: PageNode,
  future: FutureNode,
  default: PageNode,
};

const edgeTypes = {
  smooth: DottedEdge,
  dotted: DottedEdge,
  default: DottedEdge,
};

// ============ RADIAL LAYOUT - WORKSPACE CENTER, ALL NODES AROUND ============
function calculateForceLayout(
  nodes: Node[],
  edges: Edge[],
  width: number,
  height: number
): Node[] {
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Find workspace node
  const workspaceNode = nodes.find(n => n.data?.nodeType === 'workspace');
  const otherNodes = nodes.filter(n => n.data?.nodeType !== 'workspace');
  
  const positioned: Node[] = [];
  
  // Position workspace at exact center
  if (workspaceNode) {
    positioned.push({
      ...workspaceNode,
      position: { x: centerX - 56, y: centerY - 56 },
      type: 'workspace',
    });
  }
  
  // Group by type for organized rings
  const byType: Record<string, Node[]> = {};
  otherNodes.forEach(node => {
    const type = node.data?.nodeType || 'default';
    if (!byType[type]) byType[type] = [];
    byType[type].push(node);
  });
  
  // Ring configuration - workspace center, nodes radiate outward
  // Skills closest, then pages, then tasks/quizzes, then concepts
  const rings = [
    { types: ['skill'], radius: 220, angleOffset: -Math.PI / 2 },
    { types: ['page'], radius: 380, angleOffset: Math.PI / 8 },
    { types: ['task', 'quiz'], radius: 520, angleOffset: -Math.PI / 6 },
    { types: ['concept', 'flashcard', 'future'], radius: 650, angleOffset: Math.PI / 4 },
  ];
  
  rings.forEach(ring => {
    const ringNodes: Node[] = [];
    ring.types.forEach(type => {
      if (byType[type]) ringNodes.push(...byType[type]);
    });
    
    if (ringNodes.length === 0) return;
    
    // Distribute evenly around the ring
    const angleStep = (2 * Math.PI) / Math.max(ringNodes.length, 1);
    
    ringNodes.forEach((node, i) => {
      const angle = ring.angleOffset + i * angleStep;
      // Small jitter for organic feel but keep it minimal
      const radiusJitter = (Math.random() - 0.5) * 30;
      const angleJitter = (Math.random() - 0.5) * 0.1;
      
      const finalAngle = angle + angleJitter;
      const finalRadius = ring.radius + radiusJitter;
      
      positioned.push({
        ...node,
        position: {
          x: centerX + Math.cos(finalAngle) * finalRadius - 60,
          y: centerY + Math.sin(finalAngle) * finalRadius - 25,
        },
        type: node.data?.nodeType || 'default',
      });
    });
  });
  
  return positioned;
}

// ============ NODE DETAILS PANEL (Shows on click) ============
interface NodeDetailsPanelProps {
  node: Node | null;
  connections: { nodes: Node[]; edges: Edge[] };
  onClose: () => void;
}

function NodeDetailsPanel({ node, connections, onClose }: NodeDetailsPanelProps) {
  if (!node) return null;

  const nodeType = node.data?.nodeType || 'default';
  const typeColors: Record<string, string> = {
    skill: 'text-violet-600 bg-violet-100',
    page: 'text-blue-600 bg-blue-100',
    task: 'text-amber-600 bg-amber-100',
    quiz: 'text-emerald-600 bg-emerald-100',
    concept: 'text-purple-600 bg-purple-100',
    future: 'text-rose-600 bg-rose-100',
  };

  const typeIcons: Record<string, React.ReactNode> = {
    skill: <Target className="w-4 h-4" />,
    page: <FileText className="w-4 h-4" />,
    task: <ListTodo className="w-4 h-4" />,
    quiz: <Brain className="w-4 h-4" />,
    concept: <Lightbulb className="w-4 h-4" />,
    future: <Sparkles className="w-4 h-4" />,
  };

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute top-0 right-0 w-80 h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-xl z-20 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <span className={cn("px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1", typeColors[nodeType] || 'bg-gray-100 text-gray-600')}>
            {typeIcons[nodeType]}
            {nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}
          </span>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <h3 className="font-semibold text-lg text-slate-900 dark:text-white">{node.data?.label}</h3>
        {node.data?.sublabel && (
          <p className="text-sm text-slate-500 mt-1">{node.data.sublabel}</p>
        )}
      </div>

      {/* Stats */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-violet-600">{connections.nodes.length}</div>
            <div className="text-xs text-slate-500">Total Nodes</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{connections.edges.length}</div>
            <div className="text-xs text-slate-500">Connections</div>
          </div>
        </div>
      </div>

      {/* Connections List */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Connected Items
          </h4>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            {connections.nodes.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No connections found</p>
            ) : (
              connections.nodes.map((connNode) => (
                <div
                  key={connNode.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <span className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs",
                    connNode.data?.nodeType === 'skill' ? 'bg-violet-500' :
                    connNode.data?.nodeType === 'page' ? 'bg-blue-500' :
                    connNode.data?.nodeType === 'task' ? 'bg-amber-500' :
                    connNode.data?.nodeType === 'quiz' ? 'bg-emerald-500' :
                    'bg-slate-400'
                  )}>
                    {connNode.data?.label?.charAt(0) || '?'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                      {connNode.data?.label}
                    </div>
                    <div className="text-xs text-slate-400 capitalize">{connNode.data?.nodeType}</div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <Button className="w-full" variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Insights
        </Button>
      </div>
    </motion.div>
  );
}

// ============ LEGEND ============
function GraphLegend() {
  const items = [
    { color: 'bg-violet-500', label: 'Skill' },
    { color: 'bg-blue-500', label: 'Page' },
    { color: 'bg-amber-500', label: 'Task' },
    { color: 'bg-emerald-500', label: 'Quiz' },
    { color: 'bg-purple-400', label: 'Concept' },
    { color: 'bg-rose-500', label: 'Future Goal' },
  ];

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-full border border-slate-200 dark:border-slate-700 shadow-lg">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className={cn("w-2.5 h-2.5 rounded-full", item.color)} />
          <span className="text-xs text-slate-600 dark:text-slate-400">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ============ FILTER BUTTONS ============
function FilterButtons({
  activeFilters,
  onToggle,
}: {
  activeFilters: { allNodes: boolean; focusMode: boolean; suggestedLinks: boolean; skillProgress: boolean };
  onToggle: (key: keyof typeof activeFilters) => void;
}) {
  const buttons = [
    { key: 'allNodes' as const, label: 'All Nodes', icon: Target },
    { key: 'focusMode' as const, label: 'Focus Mode', icon: ZoomIn },
    { key: 'suggestedLinks' as const, label: 'Suggested Links', icon: Link2 },
    { key: 'skillProgress' as const, label: 'Skill Progress', icon: TrendingUp },
  ];

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-full border border-slate-200 dark:border-slate-700 shadow-lg">
      {buttons.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onToggle(key)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
            activeFilters[key]
              ? "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300"
              : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

// ============ TYPE FILTER BADGES ============
function TypeFilters({
  visibleTypes,
  onToggle,
}: {
  visibleTypes: NodeType[];
  onToggle: (type: NodeType) => void;
}) {
  const types: { type: NodeType; icon: React.ElementType; color: string; bgColor: string }[] = [
    { type: 'skill', icon: Target, color: 'text-violet-600', bgColor: 'bg-violet-100 dark:bg-violet-900/50' },
    { type: 'page', icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/50' },
    { type: 'task', icon: ListTodo, color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/50' },
    { type: 'quiz', icon: Brain, color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/50' },
    { type: 'concept', icon: Lightbulb, color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/50' },
    { type: 'future', icon: Sparkles, color: 'text-rose-600', bgColor: 'bg-rose-100 dark:bg-rose-900/50' },
  ];

  return (
    <div className="flex items-center gap-1.5">
      {types.map(({ type, icon: Icon, color, bgColor }) => {
        const isActive = visibleTypes.includes(type);
        return (
          <button
            key={type}
            onClick={() => onToggle(type)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
              isActive ? cn(bgColor, color) : "bg-slate-100 dark:bg-slate-800 text-slate-400"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="capitalize">{type}</span>
          </button>
        );
      })}
    </div>
  );
}

// ============ MAIN GRAPH COMPONENT ============
function EnhancedKnowledgeGraphInner() {
  const { currentWorkspace } = useWorkspace();
  const containerRef = useRef<HTMLDivElement>(null);
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    allNodes: true,
    focusMode: false,
    suggestedLinks: true,
    skillProgress: true,
  });

  const {
    nodes,
    edges,
    visibleNodeTypes,
    loading,
    onNodesChange,
    onEdgesChange,
    toggleNodeType,
    loadGraph,
  } = useGraphStore();

  // Load graph
  useEffect(() => {
    if (currentWorkspace?.id) {
      loadGraph(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, loadGraph]);

  // Calculate positioned nodes
  const positionedNodes = useMemo(() => {
    if (!nodes.length) return [];
    
    // Add workspace center node
    const hasWorkspace = nodes.some(n => n.data?.nodeType === 'workspace');
    let allNodes = [...nodes];
    
    if (!hasWorkspace && currentWorkspace) {
      allNodes = [
        {
          id: 'workspace-center',
          type: 'workspace',
          data: {
            label: currentWorkspace.name || 'Workspace',
            nodeType: 'workspace' as NodeType,
            color: '#8b5cf6',
          },
          position: { x: 0, y: 0 },
        },
        ...nodes,
      ];
    }

    // Filter by type
    const filtered = allNodes.filter(node => {
      const nodeType = node.data?.nodeType as NodeType;
      if (nodeType === 'workspace') return true;
      if (!filters.allNodes) return false;
      return visibleNodeTypes.includes(nodeType);
    });

    // Filter by search
    const searched = searchQuery
      ? filtered.filter(node => {
          const label = node.data?.label?.toLowerCase() || '';
          return label.includes(searchQuery.toLowerCase()) || node.data?.nodeType === 'workspace';
        })
      : filtered;

    // Apply layout
    const width = containerRef.current?.clientWidth || 1400;
    const height = containerRef.current?.clientHeight || 900;
    
    return calculateForceLayout(searched, edges, width, height);
  }, [nodes, edges, visibleNodeTypes, filters.allNodes, searchQuery, currentWorkspace]);

  // Get connections for selected node
  const selectedConnections = useMemo(() => {
    if (!selectedNode) return { nodes: [], edges: [] };
    
    const connectedEdges = edges.filter(
      e => e.source === selectedNode.id || e.target === selectedNode.id
    );
    
    const connectedNodeIds = new Set<string>();
    connectedEdges.forEach(e => {
      if (e.source !== selectedNode.id) connectedNodeIds.add(e.source);
      if (e.target !== selectedNode.id) connectedNodeIds.add(e.target);
    });
    
    const connectedNodes = positionedNodes.filter(n => connectedNodeIds.has(n.id));
    
    return { nodes: connectedNodes, edges: connectedEdges };
  }, [selectedNode, edges, positionedNodes]);

  // Filter edges and create workspace connections
  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(positionedNodes.map(n => n.id));
    
    let processed = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));

    // Filter suggested links
    if (!filters.suggestedLinks) {
      processed = processed.filter(e => e.data?.edge_type !== 'suggested');
    }

    // Create dotted connections from workspace center to ALL nodes
    const workspaceEdges: Edge[] = [];
    positionedNodes.forEach(node => {
      // Skip workspace itself
      if (node.data?.nodeType === 'workspace') return;
      
      // Check if already has a connection to workspace
      const hasConn = processed.some(
        e => (e.source === node.id && e.target === 'workspace-center') ||
             (e.target === node.id && e.source === 'workspace-center')
      );
      
      if (!hasConn) {
        workspaceEdges.push({
          id: `ws-${node.id}`,
          source: 'workspace-center',
          target: node.id,
          type: 'dotted',
          data: { 
            edge_type: 'contains',
            isWorkspaceEdge: true 
          },
        });
      }
    });

    return [...processed, ...workspaceEdges].map(edge => ({
      ...edge,
      type: 'dotted',
      markerEnd: edge.data?.isWorkspaceEdge ? undefined : {
        type: MarkerType.ArrowClosed,
        width: 10,
        height: 10,
        color: edge.data?.edge_type === 'suggested' ? '#c4b5fd' : '#94a3b8',
      },
    }));
  }, [edges, positionedNodes, filters.suggestedLinks]);

  // Fit view on load
  useEffect(() => {
    if (positionedNodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.15, duration: 800 }), 200);
    }
  }, [positionedNodes.length, fitView]);

  const handleNodeClick = useCallback((_: any, node: Node) => {
    if (node.data?.nodeType === 'workspace') {
      setSelectedNode(null);
    } else {
      setSelectedNode(node);
    }
  }, []);

  const toggleFilter = (key: keyof typeof filters) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div ref={containerRef} className="w-full h-full relative bg-gradient-to-br from-slate-50 via-white to-violet-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-violet-950/10 overflow-hidden">
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Knowledge Graph</h2>
          <TypeFilters visibleTypes={visibleNodeTypes} onToggle={toggleNodeType} />
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-72 h-9 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-slate-200 dark:border-slate-700"
          />
        </div>
      </div>

      {/* Graph Canvas */}
      <ReactFlow
        nodes={positionedNodes}
        edges={filteredEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={() => setSelectedNode(null)}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{ type: 'dotted' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e2e8f0" gap={30} size={1} />
        <Controls 
          position="bottom-right"
          className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg !right-4 !bottom-24"
          showInteractive={false}
        />
      </ReactFlow>

      {/* Bottom Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3">
        <FilterButtons activeFilters={filters} onToggle={toggleFilter} />
        <div className="flex items-center gap-2">
          <GraphLegend />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => currentWorkspace?.id && loadGraph(currentWorkspace.id)}
            className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-lg"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Graph
          </Button>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-28 right-4 z-10 flex flex-col gap-1">
        <Button variant="outline" size="icon" onClick={() => zoomIn()} className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-lg h-9 w-9">
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => zoomOut()} className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-lg h-9 w-9">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => fitView({ padding: 0.15 })} className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-lg h-9 w-9">
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Node Details Panel (shows on click) */}
      <AnimatePresence>
        {selectedNode && (
          <NodeDetailsPanel
            node={selectedNode}
            connections={selectedConnections}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </AnimatePresence>

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-30">
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading graph...</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ EXPORT WITH PROVIDER ============
export function EnhancedKnowledgeGraph() {
  return (
    <ReactFlowProvider>
      <EnhancedKnowledgeGraphInner />
    </ReactFlowProvider>
  );
}

export default EnhancedKnowledgeGraph;
