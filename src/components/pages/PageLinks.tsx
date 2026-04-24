import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Link2, Plus, Trash2, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PageLinkDialog } from './PageLinkDialog';
import { PageHoverPreview } from './PageHoverPreview';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface PageLink {
  id: string;
  target_page_id: string;
  relation_type: string;
  context?: string;
  target?: {
    id: string;
    title: string;
    icon: string;
  };
}

interface PageLinksProps {
  pageId: string;
  className?: string;
  editable?: boolean;
}

const relationLabels: Record<string, string> = {
  references: 'References',
  explains: 'Explains',
  example_of: 'Example of',
  depends_on: 'Depends on',
  related_to: 'Related to',
  contradicts: 'Contradicts',
  extends: 'Extends',
  summarizes: 'Summarizes',
};

const relationColors: Record<string, string> = {
  references: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  explains: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  example_of: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  depends_on: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  related_to: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  contradicts: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  extends: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  summarizes: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

export function PageLinks({ pageId, className, editable = true }: PageLinksProps) {
  const { currentWorkspace } = useWorkspace();
  const [links, setLinks] = useState<PageLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  useEffect(() => {
    if (pageId) {
      loadLinks();
    }
  }, [pageId, currentWorkspace?.id]);

  const loadLinks = async () => {
    if (!pageId) return;
    
    try {
      setLoading(true);
      const data = await api.getPageLinks(pageId, currentWorkspace?.id);
      setLinks(data.outlinks || []);
    } catch (error) {
      console.error('Failed to load links:', error);
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm('Remove this link?')) return;
    
    try {
      await api.deletePageLink(pageId, linkId);
      setLinks(links.filter(l => l.id !== linkId));
      toast.success('Link removed');
    } catch (error) {
      toast.error('Failed to remove link');
    }
  };

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading links...
      </div>
    );
  }

  return (
    <div className={cn("", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          <Link2 className="w-4 h-4" />
          <span>Links ({links.length})</span>
        </button>
        
        {editable && (
          <button
            onClick={() => setShowLinkDialog(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Link
          </button>
        )}
      </div>

      {/* Links List */}
      {expanded && (
        <div className="space-y-1">
          {links.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No links yet. Connect this page to related content.
            </p>
          ) : (
            links.map((link) => (
              <div
                key={link.id}
                className="flex items-center gap-2 p-2 bg-secondary/30 hover:bg-secondary/50 rounded-lg group transition-colors"
              >
                <PageHoverPreview pageId={link.target_page_id}>
                  <Link
                    to={`/pages/${link.target_page_id}`}
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    <span className="text-base flex-shrink-0">
                      {link.target?.icon || '📄'}
                    </span>
                    <span className="text-sm text-foreground truncate hover:text-primary">
                      {link.target?.title || 'Untitled'}
                    </span>
                  </Link>
                </PageHoverPreview>
                
                <span className={cn(
                  "px-1.5 py-0.5 text-xs rounded flex-shrink-0",
                  relationColors[link.relation_type] || relationColors.references
                )}>
                  {relationLabels[link.relation_type] || link.relation_type}
                </span>
                
                {editable && (
                  <button
                    onClick={() => handleDeleteLink(link.id)}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive rounded transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Link Dialog */}
      <PageLinkDialog
        open={showLinkDialog}
        onClose={() => setShowLinkDialog(false)}
        pageId={pageId}
        onLinkCreated={loadLinks}
      />
    </div>
  );
}
