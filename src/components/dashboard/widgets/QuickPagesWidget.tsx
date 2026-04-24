import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Pin, TrendingUp, Loader2, Clock, Eye, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { LucideIcon, iconMap } from '@/components/ui/IconPicker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCacheFirstPages } from '@/hooks/useCacheFirst';

interface Page {
  id: string;
  title: string;
  icon: string;
  updated_at: string;
  is_favorite?: boolean;
  view_count?: number;
}

type TabType = 'pinned' | 'frequent' | 'recent';

export function QuickPagesWidget({ settings }: { settings?: Record<string, any> }) {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  
  // ✅ CACHE-FIRST LOADING - Instant load from IndexedDB
  const { pages: cachedPages, loading, fromCache } = useCacheFirstPages(
    currentWorkspace?.id,
    () => currentWorkspace?.id ? api.getPagesByWorkspace(currentWorkspace.id) : Promise.resolve([])
  );
  
  const [pages, setPages] = useState<Page[]>([]);
  
  useEffect(() => {
    if (cachedPages.length > 0) {
      setPages(cachedPages);
    }
  }, [cachedPages]);
  
  const [activeTab, setActiveTab] = useState<TabType>('pinned');

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Get pages based on active tab
  const getDisplayPages = () => {
    switch (activeTab) {
      case 'pinned':
        return pages.filter(p => p.is_favorite).slice(0, 5);
      case 'frequent':
        // Sort by view_count (most accessed)
        return [...pages]
          .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
          .slice(0, 5);
      case 'recent':
        // Sort by updated_at (most recent)
        return [...pages]
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          .slice(0, 5);
      default:
        return [];
    }
  };

  const displayPages = getDisplayPages();

  const tabs: { id: TabType; label: string; icon: typeof Pin }[] = [
    { id: 'pinned', label: 'Pinned', icon: Pin },
    { id: 'frequent', label: 'Frequent', icon: TrendingUp },
    { id: 'recent', label: 'Recent', icon: Clock },
  ];

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-5">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-500" />
          Quick Pages
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/workspace/${currentWorkspace?.id}/pages/new`)}
            className="h-7 w-7 p-0"
            title="Create new page"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Link to="/pages">
            <span className="text-xs text-primary hover:underline">View all</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3 p-1 bg-secondary/30 rounded-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all",
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-3 h-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Pages List */}
      <div className="flex-1 overflow-auto">
        {displayPages.length > 0 ? (
          <div className="space-y-1">
            {displayPages.map((page, index) => (
              <motion.div
                key={page.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={`/pages/${page.id}`}>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-sm flex-shrink-0">
                      {page.icon && iconMap[page.icon] ? (
                        <LucideIcon name={page.icon} className="w-4 h-4 text-foreground" />
                      ) : (
                        page.icon || '📄'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {page.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {activeTab === 'frequent' && page.view_count ? (
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {page.view_count} views
                          </span>
                        ) : (
                          <span>{formatTimeAgo(page.updated_at)}</span>
                        )}
                        {page.is_favorite && (
                          <Pin className="w-3 h-3 text-amber-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm mb-2">
              {activeTab === 'pinned' ? 'No pinned pages' : 
               activeTab === 'frequent' ? 'No frequently accessed pages' : 
               'No recent pages'}
            </p>
            <Link to="/pages">
              <button className="text-xs text-primary hover:underline">
                {activeTab === 'pinned' ? 'Pin a page' : 'Browse pages'}
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
