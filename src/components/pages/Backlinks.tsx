import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Link2, ExternalLink, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface Backlink {
  link_id: string;
  page_id: string;
  title: string;
  icon: string;
  relation_type: string;
  context?: string;
  preview?: string;
}

interface BacklinksProps {
  pageId: string;
  className?: string;
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

export function Backlinks({ pageId, className }: BacklinksProps) {
  const { currentWorkspace } = useWorkspace();
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadBacklinks();
  }, [pageId, currentWorkspace?.id]);

  const loadBacklinks = async () => {
    try {
      setLoading(true);
      const data = await api.getBacklinks(pageId, currentWorkspace?.id);
      setBacklinks(data.backlinks || []);
    } catch (error) {
      console.error('Failed to load backlinks:', error);
      setBacklinks([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading backlinks...
      </div>
    );
  }

  if (backlinks.length === 0) {
    return null;
  }

  return (
    <div className={cn("border-t border-border pt-4 mt-6", className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Linked from {backlinks.length} page{backlinks.length !== 1 ? 's' : ''}</span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {backlinks.map((backlink) => (
            <Link
              key={backlink.link_id}
              to={`/pages/${backlink.page_id}`}
              className="flex items-start gap-3 p-3 bg-secondary/30 hover:bg-secondary/50 rounded-lg transition-colors group"
            >
              <span className="text-lg flex-shrink-0">{backlink.icon || '📄'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {backlink.title}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                    {relationLabels[backlink.relation_type] || backlink.relation_type}
                  </span>
                </div>
                {backlink.preview && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {backlink.preview}
                  </p>
                )}
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
