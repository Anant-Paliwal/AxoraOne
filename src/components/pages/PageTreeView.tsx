import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Plus,
  MoreHorizontal,
  Trash2,
  Copy,
  Star,
  FolderOpen,
  Loader2
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LucideIcon, iconMap } from '@/components/ui/IconPicker';

interface PageNode {
  id: string;
  title: string;
  icon: string;
  parent_page_id: string | null;
  depth: number;
  is_favorite: boolean;
  page_type: string;
  children?: PageNode[];
  has_children?: boolean;
}

interface PageTreeViewProps {
  workspaceId?: string;
  selectedPageId?: string;
  onPageSelect?: (pageId: string) => void;
  onCreateSubPage?: (parentId: string) => void;
  compact?: boolean;
  maxDepth?: number;
}

// Recursive tree node component
function TreeNode({
  node,
  level,
  selectedPageId,
  expandedNodes,
  loadingNodes,
  onToggle,
  onSelect,
  onCreateSubPage,
  onDelete,
  onDuplicate,
  onToggleFavorite,
  compact,
  maxDepth
}: {
  node: PageNode;
  level: number;
  selectedPageId?: string;
  expandedNodes: Set<string>;
  loadingNodes: Set<string>;
  onToggle: (nodeId: string) => void;
  onSelect: (nodeId: string) => void;
  onCreateSubPage: (parentId: string) => void;
  onDelete: (nodeId: string) => void;
  onDuplicate: (nodeId: string) => void;
  onToggleFavorite: (nodeId: string, current: boolean) => void;
  compact?: boolean;
  maxDepth?: number;
}) {
  const navigate = useNavigate();
  const isExpanded = expandedNodes.has(node.id);
  const isLoading = loadingNodes.has(node.id);
  const isSelected = selectedPageId === node.id;
  const hasChildren = node.children && node.children.length > 0;
  const canExpand = hasChildren || node.has_children;
  const canAddChild = !maxDepth || level < maxDepth;

  // Get icon component
  const IconComponent = node.icon && iconMap[node.icon as keyof typeof iconMap] 
    ? iconMap[node.icon as keyof typeof iconMap] 
    : FileText;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.id);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canExpand) {
      onToggle(node.id);
    }
  };

  return (
    <div className="select-none">
      {/* Node row */}
      <div
        className={cn(
          "group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
          "hover:bg-accent/50",
          isSelected && "bg-accent text-accent-foreground",
          compact && "py-1"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {/* Expand/collapse button */}
        <button
          onClick={handleToggle}
          className={cn(
            "w-5 h-5 flex items-center justify-center rounded hover:bg-accent",
            !canExpand && "invisible"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          ) : isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>

        {/* Page icon */}
        <span className="flex-shrink-0 text-base">
          {typeof node.icon === 'string' && node.icon.length <= 2 ? (
            node.icon
          ) : (
            <IconComponent className="w-4 h-4 text-muted-foreground" />
          )}
        </span>

        {/* Title */}
        <span className={cn(
          "flex-1 truncate text-sm",
          compact && "text-xs"
        )}>
          {node.title || 'Untitled'}
        </span>

        {/* Favorite indicator */}
        {node.is_favorite && (
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
        )}

        {/* Actions (visible on hover) */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {canAddChild && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateSubPage(node.id);
              }}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-accent"
              title="Add sub-page"
            >
              <Plus className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-accent"
              >
                <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onToggleFavorite(node.id, node.is_favorite)}>
                <Star className={cn("w-4 h-4 mr-2", node.is_favorite && "fill-yellow-500 text-yellow-500")} />
                {node.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(node.id)}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(node.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Children */}
      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {node.children!.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                level={level + 1}
                selectedPageId={selectedPageId}
                expandedNodes={expandedNodes}
                loadingNodes={loadingNodes}
                onToggle={onToggle}
                onSelect={onSelect}
                onCreateSubPage={onCreateSubPage}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onToggleFavorite={onToggleFavorite}
                compact={compact}
                maxDepth={maxDepth}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PageTreeView({
  workspaceId,
  selectedPageId,
  onPageSelect,
  onCreateSubPage,
  compact = false,
  maxDepth = 10
}: PageTreeViewProps) {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [rootPages, setRootPages] = useState<PageNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const wsId = workspaceId || currentWorkspace?.id;

  // Load root pages (pages without parent)
  const loadRootPages = useCallback(async () => {
    if (!wsId) return;

    try {
      setLoading(true);
      const data = await api.getPagesByWorkspace(wsId);
      
      // Filter to only root pages and build tree structure
      const rootOnly = data.filter((p: any) => !p.parent_page_id);
      const withChildren = rootOnly.map((p: any) => ({
        ...p,
        depth: 0,
        children: [],
        has_children: data.some((child: any) => child.parent_page_id === p.id)
      }));
      
      setRootPages(withChildren);
    } catch (error) {
      console.error('Failed to load pages:', error);
      toast.error('Failed to load pages');
    } finally {
      setLoading(false);
    }
  }, [wsId]);

  // Load children for a specific node
  const loadChildren = useCallback(async (parentId: string) => {
    try {
      setLoadingNodes(prev => new Set(prev).add(parentId));
      
      const children = await api.getSubPages(parentId);
      
      // Update the tree with loaded children
      const updateNode = (nodes: PageNode[]): PageNode[] => {
        return nodes.map(node => {
          if (node.id === parentId) {
            return {
              ...node,
              children: children.map((c: any) => ({
                ...c,
                depth: node.depth + 1,
                children: [],
                has_children: true // We'll check this when expanding
              }))
            };
          }
          if (node.children) {
            return { ...node, children: updateNode(node.children) };
          }
          return node;
        });
      };
      
      setRootPages(prev => updateNode(prev));
    } catch (error) {
      console.error('Failed to load children:', error);
    } finally {
      setLoadingNodes(prev => {
        const next = new Set(prev);
        next.delete(parentId);
        return next;
      });
    }
  }, []);

  useEffect(() => {
    loadRootPages();
  }, [loadRootPages]);

  // Handle node toggle (expand/collapse)
  const handleToggle = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
        // Load children if not already loaded
        const findNode = (nodes: PageNode[]): PageNode | undefined => {
          for (const node of nodes) {
            if (node.id === nodeId) return node;
            if (node.children) {
              const found = findNode(node.children);
              if (found) return found;
            }
          }
          return undefined;
        };
        const node = findNode(rootPages);
        if (node && (!node.children || node.children.length === 0) && node.has_children) {
          loadChildren(nodeId);
        }
      }
      return next;
    });
  }, [rootPages, loadChildren]);

  // Handle page selection
  const handleSelect = useCallback((pageId: string) => {
    if (onPageSelect) {
      onPageSelect(pageId);
    } else {
      navigate(`/workspace/${wsId}/page/${pageId}`);
    }
  }, [onPageSelect, navigate, wsId]);

  // Handle create sub-page
  const handleCreateSubPage = useCallback((parentId: string) => {
    if (onCreateSubPage) {
      onCreateSubPage(parentId);
    } else {
      navigate(`/workspace/${wsId}/page/new?parent=${parentId}`);
    }
  }, [onCreateSubPage, navigate, wsId]);

  // Handle delete
  const handleDelete = useCallback(async (pageId: string) => {
    if (!confirm('Delete this page and all its sub-pages?')) return;
    
    try {
      await api.deletePage(pageId);
      toast.success('Page deleted');
      loadRootPages();
    } catch (error) {
      toast.error('Failed to delete page');
    }
  }, [loadRootPages]);

  // Handle duplicate
  const handleDuplicate = useCallback(async (pageId: string) => {
    try {
      await api.duplicatePage(pageId);
      toast.success('Page duplicated');
      loadRootPages();
    } catch (error) {
      toast.error('Failed to duplicate page');
    }
  }, [loadRootPages]);

  // Handle toggle favorite
  const handleToggleFavorite = useCallback(async (pageId: string, currentFavorite: boolean) => {
    try {
      await api.updatePage(pageId, { is_favorite: !currentFavorite });
      
      // Update local state
      const updateNode = (nodes: PageNode[]): PageNode[] => {
        return nodes.map(node => {
          if (node.id === pageId) {
            return { ...node, is_favorite: !currentFavorite };
          }
          if (node.children) {
            return { ...node, children: updateNode(node.children) };
          }
          return node;
        });
      };
      
      setRootPages(prev => updateNode(prev));
      toast.success(currentFavorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      toast.error('Failed to update favorite status');
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rootPages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FolderOpen className="w-10 h-10 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No pages yet</p>
        <button
          onClick={() => navigate(`/workspace/${wsId}/page/new`)}
          className="mt-2 text-sm text-primary hover:underline"
        >
          Create your first page
        </button>
      </div>
    );
  }

  return (
    <div className="py-1">
      {rootPages.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          level={0}
          selectedPageId={selectedPageId}
          expandedNodes={expandedNodes}
          loadingNodes={loadingNodes}
          onToggle={handleToggle}
          onSelect={handleSelect}
          onCreateSubPage={handleCreateSubPage}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onToggleFavorite={handleToggleFavorite}
          compact={compact}
          maxDepth={maxDepth}
        />
      ))}
    </div>
  );
}