import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { GitBranch, Loader2, FileText, Target, CheckSquare, Brain, Layers, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';

interface GraphNode {
  id: string;
  label: string;
  type: string;
}

interface GraphEdge {
  source: string;
  target: string;
}

const nodeColors: Record<string, string> = {
  skill: '#8b5cf6',
  page: '#3b82f6',
  task: '#22c55e',
  concept: '#f59e0b',
  quiz: '#ec4899',
  flashcard: '#06b6d4',
  workspace: '#6366f1',
};

export function KnowledgeGraphPreviewWidget({ settings }: { settings?: Record<string, any> }) {
  const { currentWorkspace } = useWorkspace();
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGraph = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      const [nodesResponse, edgesResponse] = await Promise.all([
        api.getGraphNodes(currentWorkspace.id),
        api.getGraphEdges(currentWorkspace.id)
      ]);
      
      const nodesData = nodesResponse?.nodes || nodesResponse || [];
      const edgesData = edgesResponse?.edges || edgesResponse || [];
      
      const normalizedNodes = (Array.isArray(nodesData) ? nodesData : []).map((n: any) => ({
        id: n.id,
        label: n.label || n.name || n.title || 'Untitled',
        type: n.type || n.node_type || 'page'
      }));
      
      const normalizedEdges = (Array.isArray(edgesData) ? edgesData : []).map((e: any) => ({
        source: e.source || e.source_id,
        target: e.target || e.target_id,
      }));
      
      setNodes(normalizedNodes.slice(0, 12));
      setEdges(normalizedEdges.slice(0, 20));
    } catch (error) {
      console.error('Failed to load graph:', error);
      setNodes([]);
      setEdges([]);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    if (currentWorkspace) {
      loadGraph();
    }
  }, [currentWorkspace, loadGraph]);

  // Real-time sync
  useEffect(() => {
    if (!currentWorkspace) return;
    const channel = supabase
      .channel('graph-preview-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pages' }, loadGraph)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'skills' }, loadGraph)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, loadGraph)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'graph_edges' }, loadGraph)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentWorkspace, loadGraph]);

  // Calculate positions with workspace in center
  const { nodePositions, workspacePos } = useMemo(() => {
    const centerX = 50;
    const centerY = 50;
    const radius = 32;
    
    const positions = nodes.map((_, i) => {
      const angle = (i / Math.max(nodes.length, 1)) * 2 * Math.PI - Math.PI / 2;
      return {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      };
    });
    
    return { 
      nodePositions: positions, 
      workspacePos: { x: centerX, y: centerY } 
    };
  }, [nodes]);

  // Stats count
  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    nodes.forEach(n => { counts[n.type] = (counts[n.type] || 0) + 1; });
    return counts;
  }, [nodes]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-purple-500" />
          Knowledge Graph
        </h3>
        <Link to={`/workspace/${currentWorkspace?.id}/graph`}>
          <span className="text-xs text-primary hover:underline flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Explore
          </span>
        </Link>
      </div>

      {/* Graph Canvas - Fixed square aspect */}
      <div className="flex-1 p-2 min-h-0">
        {nodes.length > 0 ? (
          <div className="relative w-full h-full bg-secondary/20 rounded-lg overflow-hidden">
            <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
              {/* Edges to center */}
              {nodes.map((node, i) => (
                <motion.line
                  key={`center-${node.id}`}
                  x1={workspacePos.x}
                  y1={workspacePos.y}
                  x2={nodePositions[i]?.x}
                  y2={nodePositions[i]?.y}
                  stroke="currentColor"
                  strokeOpacity={0.15}
                  strokeWidth={0.3}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: i * 0.03 }}
                />
              ))}
              
              {/* Node-to-node edges */}
              {edges.map((edge, i) => {
                const sourceIdx = nodes.findIndex(n => n.id === edge.source);
                const targetIdx = nodes.findIndex(n => n.id === edge.target);
                if (sourceIdx === -1 || targetIdx === -1) return null;
                return (
                  <line
                    key={`edge-${i}`}
                    x1={nodePositions[sourceIdx]?.x}
                    y1={nodePositions[sourceIdx]?.y}
                    x2={nodePositions[targetIdx]?.x}
                    y2={nodePositions[targetIdx]?.y}
                    stroke="currentColor"
                    strokeOpacity={0.2}
                    strokeWidth={0.4}
                  />
                );
              })}
              
              {/* Center workspace node */}
              <motion.g
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.1 }}
              >
                <circle
                  cx={workspacePos.x}
                  cy={workspacePos.y}
                  r={8}
                  fill={nodeColors.workspace}
                  className="drop-shadow-lg"
                />
                <text
                  x={workspacePos.x}
                  y={workspacePos.y + 0.8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[3.5px] fill-white font-bold"
                >
                  {(currentWorkspace?.name || 'W').slice(0, 3).toUpperCase()}
                </text>
              </motion.g>
              
              {/* Outer nodes */}
              {nodes.map((node, i) => (
                <motion.circle
                  key={node.id}
                  cx={nodePositions[i]?.x}
                  cy={nodePositions[i]?.y}
                  r={3.5}
                  fill={nodeColors[node.type] || '#6b7280'}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 + i * 0.03, type: 'spring' }}
                />
              ))}
            </svg>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <GitBranch className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs font-medium">No connections yet</p>
            <Link 
              to={`/workspace/${currentWorkspace?.id}/pages`}
              className="mt-1 text-[10px] text-primary hover:underline"
            >
              Create a page →
            </Link>
          </div>
        )}
      </div>

      {/* Footer stats */}
      {nodes.length > 0 && (
        <div className="px-3 pb-2 pt-1 border-t border-border">
          <div className="flex items-center justify-center gap-3 text-[10px]">
            {Object.entries(stats).slice(0, 4).map(([type, count]) => (
              <span key={type} className="flex items-center gap-1">
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: nodeColors[type] || '#6b7280' }}
                />
                <span className="text-muted-foreground capitalize">{count}</span>
              </span>
            ))}
            <span className="text-muted-foreground">
              • {edges.length} links
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
