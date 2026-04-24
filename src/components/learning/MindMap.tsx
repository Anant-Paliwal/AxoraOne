import { useCallback, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, Maximize, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MindMapNode {
  id: string;
  label: string;
  type?: 'central' | 'main' | 'sub';
  children?: MindMapNode[];
}

interface MindMapProps {
  title: string;
  data: MindMapNode;
  onNodeClick?: (nodeId: string) => void;
}

const nodeTypes = {
  central: ({ data }: any) => (
    <div className="px-8 py-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl border-4 border-primary/30">
      <div className="text-lg font-bold text-center">{data.label}</div>
    </div>
  ),
  main: ({ data }: any) => (
    <div className="px-6 py-3 rounded-xl bg-card border-2 border-primary/50 shadow-lg">
      <div className="text-base font-semibold text-foreground">{data.label}</div>
    </div>
  ),
  sub: ({ data }: any) => (
    <div className="px-4 py-2 rounded-lg bg-secondary border border-border shadow-md">
      <div className="text-sm font-medium text-foreground">{data.label}</div>
    </div>
  ),
};

function convertToFlowNodes(
  node: MindMapNode,
  parentId: string | null = null,
  level: number = 0,
  angle: number = 0,
  totalSiblings: number = 1,
  siblingIndex: number = 0
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Calculate position based on level and angle
  const radius = level === 0 ? 0 : level * 250;
  const angleStep = (Math.PI * 2) / Math.max(totalSiblings, 1);
  const nodeAngle = angle + angleStep * siblingIndex;
  
  const x = level === 0 ? 0 : Math.cos(nodeAngle) * radius;
  const y = level === 0 ? 0 : Math.sin(nodeAngle) * radius;

  const nodeType = level === 0 ? 'central' : level === 1 ? 'main' : 'sub';

  nodes.push({
    id: node.id,
    type: nodeType,
    position: { x, y },
    data: { label: node.label },
  });

  if (parentId) {
    edges.push({
      id: `${parentId}-${node.id}`,
      source: parentId,
      target: node.id,
      type: 'smoothstep',
      animated: level === 1,
      style: {
        stroke: level === 1 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
        strokeWidth: level === 1 ? 3 : 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: level === 1 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
      },
    });
  }

  if (node.children && node.children.length > 0) {
    node.children.forEach((child, index) => {
      const childResult = convertToFlowNodes(
        child,
        node.id,
        level + 1,
        nodeAngle,
        node.children!.length,
        index
      );
      nodes.push(...childResult.nodes);
      edges.push(...childResult.edges);
    });
  }

  return { nodes, edges };
}

export function MindMap({ title, data, onNodeClick }: MindMapProps) {
  const { nodes: initialNodes, edges: initialEdges } = convertToFlowNodes(data);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClickHandler = useCallback(
    (event: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick]
  );

  const handleZoomIn = () => {
    reactFlowInstance?.zoomIn();
  };

  const handleZoomOut = () => {
    reactFlowInstance?.zoomOut();
  };

  const handleFitView = () => {
    reactFlowInstance?.fitView({ padding: 0.2, duration: 800 });
  };

  const handleDownload = () => {
    if (!reactFlowInstance) return;
    
    const imageWidth = 1920;
    const imageHeight = 1080;
    
    reactFlowInstance.fitView({ padding: 0.1 });
    
    setTimeout(() => {
      const viewport = reactFlowInstance.getViewport();
      const canvas = document.createElement('canvas');
      canvas.width = imageWidth;
      canvas.height = imageHeight;
      
      // This is a simplified version - in production, you'd use a proper export library
      const link = document.createElement('a');
      link.download = `${title.replace(/\s+/g, '-').toLowerCase()}-mindmap.png`;
      link.href = canvas.toDataURL();
      link.click();
    }, 100);
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            className="rounded-lg"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            className="rounded-lg"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleFitView}
            className="rounded-lg"
          >
            <Maximize className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="rounded-lg"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Mind Map */}
      <div className="h-[600px] bg-background/50">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClickHandler}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: false,
          }}
        >
          <Background color="hsl(var(--muted-foreground))" gap={16} />
          <Controls className="bg-card border border-border rounded-lg" />
          
          <Panel position="bottom-center" className="bg-card/80 backdrop-blur-sm border border-border rounded-lg px-4 py-2">
            <p className="text-xs text-muted-foreground">
              Click and drag to pan • Scroll to zoom • Click nodes to explore
            </p>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
