import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Check, X, Loader2, RefreshCw, Link2 } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface Suggestion {
  id: string;
  suggested_page_id: string;
  confidence: number;
  reason: string;
  status: string;
  suggested: {
    id: string;
    title: string;
    icon: string;
  };
}

interface RelatedPagesProps {
  pageId: string;
  className?: string;
  onLinkCreated?: () => void;
}

export function RelatedPages({ pageId, className, onLinkCreated }: RelatedPagesProps) {
  const { currentWorkspace } = useWorkspace();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadSuggestions();
  }, [pageId]);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      const data = await api.getRelatedSuggestions(pageId, currentWorkspace?.id);
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (suggestionId: string, status: 'accepted' | 'rejected') => {
    try {
      await api.respondToSuggestion(pageId, suggestionId, status);
      
      if (status === 'accepted') {
        toast.success('Page linked!');
        onLinkCreated?.();
      }
      
      // Remove from list
      setSuggestions(suggestions.filter(s => s.id !== suggestionId));
    } catch (error) {
      toast.error('Failed to process suggestion');
    }
  };

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <Loader2 className="w-3 h-3 animate-spin" />
        Finding related pages...
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className={cn("border-t border-border pt-4 mt-4", className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground w-full">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 hover:text-foreground transition-colors flex-1"
        >
          <Sparkles className="w-4 h-4 text-primary" />
          <span>{suggestions.length} suggested related page{suggestions.length !== 1 ? 's' : ''}</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            loadSuggestions();
          }}
          className="p-1 hover:bg-secondary rounded"
          title="Refresh suggestions"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg group"
            >
              <span className="text-lg flex-shrink-0">
                {suggestion.suggested?.icon || '📄'}
              </span>
              <div className="flex-1 min-w-0">
                <Link
                  to={`/pages/${suggestion.suggested_page_id}`}
                  className="text-sm font-medium text-foreground hover:text-primary truncate block"
                >
                  {suggestion.suggested?.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {suggestion.reason}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <div className="h-1 w-16 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${suggestion.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(suggestion.confidence * 100)}% match
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleResponse(suggestion.id, 'accepted')}
                  className="p-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
                  title="Accept & Link"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleResponse(suggestion.id, 'rejected')}
                  className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
