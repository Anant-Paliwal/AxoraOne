import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home, FileText, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { LucideIcon, iconMap } from '@/components/ui/IconPicker';

interface Ancestor {
  id: string;
  title: string;
  icon: string;
  depth: number;
}

interface PageBreadcrumbProps {
  pageId: string;
  workspaceId?: string;
  currentTitle?: string;
  currentIcon?: string;
  className?: string;
  showHome?: boolean;
  maxItems?: number;
}

export function PageBreadcrumb({ 
  pageId, 
  workspaceId,
  currentTitle, 
  currentIcon,
  className,
  showHome = true,
  maxItems = 5
}: PageBreadcrumbProps) {
  const { currentWorkspace } = useWorkspace();
  const wsId = workspaceId || currentWorkspace?.id;
  const [ancestors, setAncestors] = useState<Ancestor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAncestors();
  }, [pageId]);

  const loadAncestors = async () => {
    try {
      setLoading(true);
      const data = await api.getPageAncestors(pageId);
      setAncestors(data.ancestors || []);
    } catch (error) {
      console.error('Failed to load ancestors:', error);
      setAncestors([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={cn("flex items-center gap-1 text-sm text-muted-foreground", className)}>
        <Loader2 className="w-3 h-3 animate-spin" />
      </div>
    );
  }

  // Truncate if too many items
  let displayAncestors = ancestors;
  let showEllipsis = false;
  if (ancestors.length > maxItems - 1) {
    displayAncestors = ancestors.slice(-(maxItems - 1));
    showEllipsis = true;
  }

  const renderIcon = (icon: string) => {
    if (icon && iconMap[icon]) {
      return <LucideIcon name={icon} className="w-3.5 h-3.5" />;
    }
    return <span className="text-sm">{icon || '📄'}</span>;
  };

  return (
    <nav className={cn("flex items-center gap-1 text-sm", className)}>
      {/* Home / Workspace link */}
      {showHome && wsId && (
        <>
          <Link
            to={`/workspace/${wsId}/pages`}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 rounded hover:bg-secondary/50"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pages</span>
          </Link>
          {(ancestors.length > 0 || currentTitle) && (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
          )}
        </>
      )}

      {/* Ellipsis for truncated ancestors */}
      {showEllipsis && (
        <>
          <span className="text-muted-foreground px-1">...</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
        </>
      )}

      {/* Ancestor pages */}
      {displayAncestors.map((ancestor, index) => (
        <div key={ancestor.id} className="flex items-center gap-1">
          <Link
            to={`/workspace/${wsId}/pages/${ancestor.id}`}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 rounded hover:bg-secondary/50 max-w-[150px]"
          >
            {renderIcon(ancestor.icon)}
            <span className="truncate">{ancestor.title}</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
        </div>
      ))}

      {/* Current page (not a link) */}
      {currentTitle && (
        <div className="flex items-center gap-1.5 text-foreground font-medium px-1.5 py-1 max-w-[200px]">
          {currentIcon && renderIcon(currentIcon)}
          <span className="truncate">{currentTitle}</span>
        </div>
      )}
    </nav>
  );
}
