import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Pin, Plus, ChevronLeft, ChevronRight, Search, Loader2, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { LucideIcon, iconMap } from '@/components/ui/IconPicker';

interface Page {
  id: string;
  title: string;
  icon: string;
  updated_at: string;
  is_favorite?: boolean;
}

interface Task {
  id: string;
  title: string;
  status: string;
  due_date?: string;
  linked_page_id?: string;
}

export function PinnedPagesWidget({ settings }: { settings?: Record<string, any> }) {
  const { currentWorkspace } = useWorkspace();
  const [pages, setPages] = useState<Page[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentWorkspace) {
      loadData();
    }
  }, [currentWorkspace]);

  const loadData = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      const [pagesData, tasksData] = await Promise.all([
        api.getPagesByWorkspace(currentWorkspace.id),
        api.getTasks(currentWorkspace.id).catch(() => [])
      ]);
      setPages(pagesData);
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get reason why page is active
  const getActiveReason = (pageId: string): string | null => {
    const linkedTasks = tasks.filter(t => t.linked_page_id === pageId && t.status !== 'completed');
    const urgentTasks = linkedTasks.filter(t => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      const now = new Date();
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDue <= 7;
    });
    
    if (urgentTasks.length > 0) {
      return `Deadline this week`;
    }
    if (linkedTasks.length > 0) {
      return `Linked to ${linkedTasks.length} task${linkedTasks.length > 1 ? 's' : ''}`;
    }
    return null;
  };

  const pinnedPages = pages.filter(p => p.is_favorite);
  const recentPages = [...pages]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);
  
  // Combine pinned and recent, removing duplicates
  const displayPagesSet = new Map();
  pinnedPages.forEach(p => displayPagesSet.set(p.id, p));
  recentPages.forEach(p => {
    if (!displayPagesSet.has(p.id)) {
      displayPagesSet.set(p.id, p);
    }
  });
  
  const allDisplayPages = Array.from(displayPagesSet.values()).slice(0, 5);
  const filteredPages = search 
    ? allDisplayPages.filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
    : allDisplayPages;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -180 : 180,
        behavior: 'smooth'
      });
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-5">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          Active Contexts
        </h3>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="pl-8 pr-3 py-1 text-xs bg-secondary/50 border-0 rounded-lg w-28 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="relative group">
        {filteredPages.length > 2 && (
          <>
            <button 
              onClick={() => scroll('left')}
              className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-background border border-border shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-secondary"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button 
              onClick={() => scroll('right')}
              className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-background border border-border shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-secondary"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </>
        )}

        <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
          {filteredPages.length > 0 ? (
            filteredPages.map((page, index) => {
              const reason = getActiveReason(page.id);
              return (
                <Link key={page.id} to={`/pages/${page.id}`} className="flex-shrink-0">
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: index * 0.05 }}
                    className="w-[140px] bg-secondary/30 border border-border rounded-xl p-3 hover:border-primary/20 hover:bg-secondary/50 transition-all cursor-pointer group/card"
                  >
                    <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-lg mb-2">
                      {page.icon && iconMap[page.icon] ? (
                        <LucideIcon name={page.icon} className="w-4 h-4 text-foreground" />
                      ) : (
                        page.icon || '📄'
                      )}
                    </div>
                    <h4 className="font-medium text-xs text-foreground group-hover/card:text-primary transition-colors truncate">
                      {page.title}
                    </h4>
                    {reason ? (
                      <p className="text-[10px] text-amber-500 mt-0.5 truncate">
                        Active: {reason}
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(page.updated_at).toLocaleDateString()}
                      </p>
                    )}
                  </motion.div>
                </Link>
              );
            })
          ) : (
            <div className="w-full text-center py-6 text-muted-foreground">
              <p className="text-sm mb-3">{search ? 'No matching pages' : 'No active contexts'}</p>
              <Link to="/pages">
                <button className="text-xs text-primary hover:underline">Pin a page to track</button>
              </Link>
            </div>
          )}
          
          {filteredPages.length > 0 && (
            <Link to="/pages" className="flex-shrink-0">
              <div className="w-[140px] h-full min-h-[90px] flex flex-col items-center justify-center border border-dashed border-border rounded-xl hover:border-primary/30 hover:bg-secondary/20 transition-all group/add">
                <Plus className="w-5 h-5 text-muted-foreground group-hover/add:text-primary transition-colors mb-1" />
                <span className="text-xs text-muted-foreground group-hover/add:text-foreground transition-colors">Add context</span>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
