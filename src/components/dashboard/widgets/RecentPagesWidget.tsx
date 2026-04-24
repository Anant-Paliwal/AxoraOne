import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { LucideIcon, iconMap } from '@/components/ui/IconPicker';
import { useCacheFirstPages } from '@/hooks/useCacheFirst';

interface Page {
  id: string;
  title: string;
  icon: string;
  updated_at: string;
}

export function RecentPagesWidget({ settings }: { settings?: Record<string, any> }) {
  const { currentWorkspace } = useWorkspace();
  
  // ✅ CACHE-FIRST LOADING - Instant load from IndexedDB
  const { pages: cachedPages, loading, fromCache } = useCacheFirstPages(
    currentWorkspace?.id,
    () => currentWorkspace?.id ? api.getPagesByWorkspace(currentWorkspace.id) : Promise.resolve([])
  );
  
  // Sort by updated_at descending
  const pages = cachedPages.sort((a: any, b: any) => 
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-5">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const recentPages = pages.slice(0, 5);

  return (
    <div className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-500" />
          Recent Pages
        </h3>
        <Link to="/pages">
          <span className="text-xs text-primary hover:underline">View all</span>
        </Link>
      </div>

      {recentPages.length > 0 ? (
        <div className="space-y-2">
          {recentPages.map((page) => (
            <Link key={page.id} to={`/pages/${page.id}`}>
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer">
                <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-sm">
                  {page.icon && iconMap[page.icon] ? (
                    <LucideIcon name={page.icon} className="w-3.5 h-3.5 text-foreground" />
                  ) : (
                    page.icon || '📄'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{page.title}</p>
                  <p className="text-xs text-muted-foreground">{formatTimeAgo(page.updated_at)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm mb-2">No pages yet</p>
          <Link to="/pages/new">
            <button className="text-xs text-primary hover:underline">Create your first page</button>
          </Link>
        </div>
      )}
    </div>
  );
}
