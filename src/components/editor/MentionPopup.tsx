import { useState, useEffect, useCallback } from 'react';
import { FileText, Target, CheckSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

export interface MentionSuggestion {
  type: 'page' | 'skill' | 'task';
  id: string;
  name: string;
}

interface MentionPopupProps {
  isOpen: boolean;
  query: string;
  type: 'page' | 'skill' | 'task' | null;
  workspaceId: string;
  onSelect: (item: MentionSuggestion) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

export function MentionPopup({
  isOpen,
  query,
  type,
  workspaceId,
  onSelect,
  onClose,
  position,
}: MentionPopupProps) {
  const [pages, setPages] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Load data when popup opens
  useEffect(() => {
    if (isOpen && workspaceId) {
      loadData();
    }
  }, [isOpen, workspaceId]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, type]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pagesData, skillsData, tasksData] = await Promise.all([
        api.getPagesByWorkspace(workspaceId),
        api.getSkills(workspaceId),
        api.getTasks(workspaceId),
      ]);
      setPages(pagesData || []);
      setSkills(skillsData || []);
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Failed to load mention data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter items based on query
  const getFilteredItems = useCallback((): MentionSuggestion[] => {
    const cleanQuery = query
      .replace(/^(page|p|skill|s|task|t):/, '')
      .toLowerCase()
      .trim();

    const results: MentionSuggestion[] = [];

    // Filter pages
    if (!type || type === 'page') {
      pages
        .filter(p => p.title?.toLowerCase().includes(cleanQuery))
        .slice(0, 5)
        .forEach(p => results.push({ type: 'page', id: p.id, name: p.title }));
    }

    // Filter skills
    if (!type || type === 'skill') {
      skills
        .filter(s => s.name?.toLowerCase().includes(cleanQuery))
        .slice(0, 5)
        .forEach(s => results.push({ type: 'skill', id: s.id, name: s.name }));
    }

    // Filter tasks
    if (!type || type === 'task') {
      tasks
        .filter(t => t.title?.toLowerCase().includes(cleanQuery))
        .slice(0, 5)
        .forEach(t => results.push({ type: 'task', id: t.id, name: t.title }));
    }

    return results;
  }, [query, type, pages, skills, tasks]);

  const filteredItems = getFilteredItems();

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredItems.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          onSelect(filteredItems[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        // Cycle through types
        // This is handled by the parent
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onSelect, onClose]);

  if (!isOpen) return null;

  const getIcon = (itemType: 'page' | 'skill' | 'task') => {
    switch (itemType) {
      case 'page':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'skill':
        return <Target className="w-4 h-4 text-purple-500" />;
      case 'task':
        return <CheckSquare className="w-4 h-4 text-green-500" />;
    }
  };

  const getTypeLabel = (itemType: 'page' | 'skill' | 'task') => {
    switch (itemType) {
      case 'page':
        return 'Page';
      case 'skill':
        return 'Skill';
      case 'task':
        return 'Task';
    }
  };

  return (
    <div
      className="fixed z-[9999] w-72 bg-popover border border-border rounded-lg shadow-xl overflow-hidden"
      style={{ 
        top: position?.top || 100, 
        left: Math.max(position?.left || 200, 200), // Ensure it's not behind sidebar
        maxHeight: '320px'
      }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Type</span>
          <kbd className="px-1.5 py-0.5 bg-background rounded text-[10px] font-mono">@page:</kbd>
          <kbd className="px-1.5 py-0.5 bg-background rounded text-[10px] font-mono">@skill:</kbd>
          <kbd className="px-1.5 py-0.5 bg-background rounded text-[10px] font-mono">@task:</kbd>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No items found
          </div>
        ) : (
          <div className="py-1">
            {filteredItems.map((item, index) => (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => onSelect(item)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                  index === selectedIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                )}
              >
                {getIcon(item.type)}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.name}</div>
                </div>
                <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                  {getTypeLabel(item.type)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <kbd className="px-1 py-0.5 bg-background rounded text-[10px]">↑↓</kbd>
          navigate
          <kbd className="px-1 py-0.5 bg-background rounded text-[10px]">Enter</kbd>
          select
          <kbd className="px-1 py-0.5 bg-background rounded text-[10px]">Esc</kbd>
          close
        </span>
      </div>
    </div>
  );
}
