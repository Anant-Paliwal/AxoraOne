import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Brain, CheckSquare, Link2, Plus, Loader2, ExternalLink, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface ConnectedItem {
  id: string;
  type: 'page' | 'skill' | 'task';
  label: string;
  edge_type: 'explicit' | 'inferred' | 'evidence' | 'linked' | 'links_to' | 'references';
  icon?: string;
  direction?: 'incoming' | 'outgoing';
  strength?: number;
}

interface ConnectedItemsProps {
  itemId: string;
  itemType: 'page' | 'skill' | 'task';
  showAddButton?: boolean;
  compact?: boolean;
}

export function ConnectedItems({ itemId, itemType, showAddButton = true, compact = false }: ConnectedItemsProps) {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [connections, setConnections] = useState<ConnectedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConnections();
  }, [itemId, itemType, currentWorkspace?.id]);

  const loadConnections = async () => {
    try {
      setLoading(true);
      
      // Use the optimized connected items endpoint
      const result = await api.getConnectedItems(itemId, itemType, currentWorkspace?.id);
      
      if (result && result.connections) {
        setConnections(result.connections.map((conn: any) => ({
          id: conn.id,
          type: conn.type,
          label: conn.label,
          edge_type: conn.edge_type,
          icon: conn.icon,
          direction: conn.direction,
          strength: conn.strength
        })));
      } else {
        // Fallback to old method if new endpoint not available
        await loadConnectionsLegacy();
      }
    } catch (error) {
      console.error('Failed to load connections, trying legacy method:', error);
      await loadConnectionsLegacy();
    } finally {
      setLoading(false);
    }
  };

  const loadConnectionsLegacy = async () => {
    try {
      const edges = await api.getGraphEdges(currentWorkspace?.id);
      
      // Filter edges connected to this item
      const connectedEdges = edges.edges.filter((edge: any) => 
        edge.source_id === itemId || edge.target_id === itemId
      );

      // Get details for connected items
      const items: ConnectedItem[] = [];
      
      for (const edge of connectedEdges) {
        const connectedId = edge.source_id === itemId ? edge.target_id : edge.source_id;
        const connectedType = edge.source_id === itemId ? edge.target_type : edge.source_type;
        const direction = edge.source_id === itemId ? 'outgoing' : 'incoming';
        
        try {
          let itemData;
          if (connectedType === 'page') {
            itemData = await api.getPage(connectedId);
            items.push({
              id: connectedId,
              type: 'page',
              label: itemData.title,
              edge_type: edge.edge_type,
              icon: itemData.icon,
              direction
            });
          } else if (connectedType === 'skill') {
            const skills = await api.getSkills(currentWorkspace?.id);
            itemData = skills.find((s: any) => s.id === connectedId);
            if (itemData) {
              items.push({
                id: connectedId,
                type: 'skill',
                label: itemData.name,
                edge_type: edge.edge_type,
                direction
              });
            }
          } else if (connectedType === 'task') {
            const tasks = await api.getTasks(currentWorkspace?.id);
            itemData = tasks.find((t: any) => t.id === connectedId);
            if (itemData) {
              items.push({
                id: connectedId,
                type: 'task',
                label: itemData.title,
                edge_type: edge.edge_type,
                direction
              });
            }
          }
        } catch (error) {
          console.error(`Failed to load connected ${connectedType}:`, error);
        }
      }

      setConnections(items);
    } catch (error) {
      console.error('Failed to load connections:', error);
      setConnections([]);
    }
  };

  const handleNavigate = (item: ConnectedItem) => {
    const workspace = currentWorkspace;
    
    if (item.type === 'page') {
      navigate(workspace ? `/workspace/${workspace.id}/pages/${item.id}` : `/pages/${item.id}`);
    } else if (item.type === 'skill') {
      navigate(workspace ? `/workspace/${workspace.id}/skills` : `/skills`);
    } else if (item.type === 'task') {
      navigate(workspace ? `/workspace/${workspace.id}/tasks` : `/tasks`);
    }
  };

  const handleAddConnection = () => {
    const workspace = currentWorkspace;
    navigate(workspace ? `/workspace/${workspace.id}/graph` : `/graph`);
    toast.info('Select an item to connect');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (connections.length === 0 && !showAddButton) {
    return null;
  }

  const Icon = (type: string) => {
    switch (type) {
      case 'page': return FileText;
      case 'skill': return Brain;
      case 'task': return CheckSquare;
      default: return Link2;
    }
  };

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-muted-foreground" />
          <h3 className={cn(
            "font-semibold text-foreground",
            compact ? "text-sm" : "text-base"
          )}>
            Connected Items
          </h3>
          {connections.length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
              {connections.length}
            </span>
          )}
        </div>
        {showAddButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddConnection}
            className="h-7"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add
          </Button>
        )}
      </div>

      {connections.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No connections yet. Add connections in the Knowledge Graph.
        </p>
      ) : (
        <div className={cn(
          "space-y-2",
          compact && "space-y-1"
        )}>
          {connections.map((item, index) => {
            const ItemIcon = Icon(item.type);
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleNavigate(item)}
                className={cn(
                  "w-full flex items-center justify-between p-2 rounded-lg hover:bg-secondary transition-colors group",
                  compact && "p-1.5"
                )}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* Direction indicator */}
                  {item.direction && (
                    <span className="flex-shrink-0 text-muted-foreground">
                      {item.direction === 'outgoing' ? (
                        <ArrowRight className="w-3 h-3" />
                      ) : (
                        <ArrowLeft className="w-3 h-3" />
                      )}
                    </span>
                  )}
                  {item.icon && item.type === 'page' ? (
                    <span className="text-lg flex-shrink-0">{item.icon}</span>
                  ) : (
                    <ItemIcon className={cn(
                      "flex-shrink-0",
                      compact ? "w-3 h-3" : "w-4 h-4",
                      item.type === 'page' ? "text-primary" :
                      item.type === 'skill' ? "text-green-500" :
                      "text-amber-500"
                    )} />
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className={cn(
                      "font-medium text-foreground truncate",
                      compact ? "text-xs" : "text-sm"
                    )}>
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {item.edge_type.replace(/_/g, ' ')} • {item.type}
                    </p>
                  </div>
                </div>
                <ExternalLink className={cn(
                  "flex-shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity",
                  compact ? "w-3 h-3" : "w-4 h-4"
                )} />
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
