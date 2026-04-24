import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface PagePreview {
  id: string;
  title: string;
  icon: string;
  preview: string;
  tags: string[];
  updated_at: string;
  backlink_count: number;
}

interface PageHoverPreviewProps {
  pageId: string;
  children: React.ReactNode;
  className?: string;
}

export function PageHoverPreview({ pageId, children, className }: PageHoverPreviewProps) {
  const [preview, setPreview] = useState<PagePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('bottom');
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadPreview = async () => {
    if (preview) return; // Already loaded
    
    setLoading(true);
    try {
      const data = await api.getPagePreview(pageId);
      setPreview(data);
    } catch (error) {
      console.error('Failed to load preview:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setShowPreview(true);
      loadPreview();
      
      // Calculate position
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setPosition(spaceBelow < 200 ? 'top' : 'bottom');
      }
    }, 300); // 300ms delay before showing
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowPreview(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={triggerRef}
      className={cn("relative inline-block", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {showPreview && (
        <div
          className={cn(
            "absolute z-50 w-72 p-3 bg-card border border-border rounded-xl shadow-lg",
            "animate-in fade-in-0 zoom-in-95 duration-200",
            position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
            "left-0"
          )}
        >
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : preview ? (
            <>
              {/* Header */}
              <div className="flex items-start gap-2 mb-2">
                <span className="text-xl">{preview.icon || '📄'}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-foreground truncate">
                    {preview.title}
                  </h4>
                  {preview.backlink_count > 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <ArrowLeft className="w-3 h-3" />
                      {preview.backlink_count} backlink{preview.backlink_count !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>

              {/* Preview Text */}
              {preview.preview && (
                <p className="text-xs text-muted-foreground line-clamp-3 mb-2">
                  {preview.preview}
                </p>
              )}

              {/* Tags */}
              {preview.tags && preview.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {preview.tags.slice(0, 3).map((tag, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 text-xs bg-secondary text-secondary-foreground rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {preview.tags.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{preview.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Open Link */}
              <Link
                to={`/pages/${pageId}`}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Open page
                <ExternalLink className="w-3 h-3" />
              </Link>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              Preview not available
            </p>
          )}
        </div>
      )}
    </div>
  );
}
