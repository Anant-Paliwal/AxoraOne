import { useState, useEffect } from 'react';
import { Link2, Trash2, X, Search, FileText, Target, CheckSquare, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Block } from './types';

interface LinkedMentionBlockProps {
  block: Block;
  editable: boolean;
  onUpdate: (data: any) => void;
  onDelete?: () => void;
}

interface MentionItem {
  id: string;
  name: string;
  type: 'page' | 'skill' | 'task';
  icon?: string;
}

export function LinkedMentionBlockComponent({ block, editable, onUpdate, onDelete }: LinkedMentionBlockProps) {
  const { currentWorkspace } = useWorkspace();
  const [mentionType, setMentionType] = useState<'page' | 'skill' | 'task'>(block.data?.mentionType || 'page');
  const [selectedItem, setSelectedItem] = useState<MentionItem | null>(
    block.data?.selectedItem || null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MentionItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(!selectedItem);

  // Search for items
  useEffect(() => {
    if (!searchQuery.trim() || !showSearch) {
      setSearchResults([]);
      return;
    }

    const searchItems = async () => {
      setIsSearching(true);
      try {
        let results: MentionItem[] = [];
        
        if (mentionType === 'page') {
          const pages = await api.getPages(currentWorkspace?.id);
          results = (pages.items || pages || [])
            .filter((p: any) => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
            .slice(0, 5)
            .map((p: any) => ({
              id: p.id,
              name: p.title,
              type: 'page' as const,
              icon: p.icon || '📄'
            }));
        } else if (mentionType === 'skill') {
          const skills = await api.getSkills(currentWorkspace?.id);
          results = (skills || [])
            .filter((s: any) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .slice(0, 5)
            .map((s: any) => ({
              id: s.id,
              name: s.name,
              type: 'skill' as const,
              icon: '🎯'
            }));
        } else if (mentionType === 'task') {
          const tasks = await api.getTasks(currentWorkspace?.id);
          results = (tasks || [])
            .filter((t: any) => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
            .slice(0, 5)
            .map((t: any) => ({
              id: t.id,
              name: t.title,
              type: 'task' as const,
              icon: '✅'
            }));
        }
        
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchItems, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, mentionType, currentWorkspace?.id, showSearch]);

  const selectItem = (item: MentionItem) => {
    setSelectedItem(item);
    setShowSearch(false);
    setSearchQuery('');
    onUpdate({ selectedItem: item, mentionType: item.type });
  };

  const clearSelection = () => {
    setSelectedItem(null);
    setShowSearch(true);
    onUpdate({ selectedItem: null, mentionType });
  };

  // Render selected mention as inline badge
  if (selectedItem && !showSearch) {
    return (
      <div className="inline-flex items-center gap-1.5 my-1">
        <a
          href={`/workspace/${currentWorkspace?.id}/${selectedItem.type}s/${selectedItem.id}`}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium transition-colors",
            "bg-primary/10 text-primary hover:bg-primary/20"
          )}
        >
          <span>{selectedItem.icon}</span>
          <span>{selectedItem.name}</span>
        </a>
        {editable && (
          <>
            <button 
              onClick={clearSelection}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
              title="Change"
            >
              <X className="w-3 h-3" />
            </button>
            {onDelete && (
              <button 
                onClick={onDelete}
                className="p-1 hover:bg-destructive/10 rounded text-destructive"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </>
        )}
      </div>
    );
  }

  // Render search/picker UI
  if (!editable) {
    return <span className="text-muted-foreground text-sm italic">No link selected</span>;
  }

  return (
    <div className="my-2 p-3 rounded-lg bg-muted/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">@Mention - Link to...</span>
        </div>
        {onDelete && (
          <button onClick={onDelete} className="p-1 hover:bg-destructive/10 text-destructive rounded">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* Type selector */}
      <div className="flex gap-2 mb-3">
        {(['page', 'skill', 'task'] as const).map(type => (
          <button
            key={type}
            onClick={() => {
              setMentionType(type);
              setSearchQuery('');
              setSearchResults([]);
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors",
              mentionType === type 
                ? "bg-primary text-primary-foreground" 
                : "bg-secondary hover:bg-secondary/80"
            )}
          >
            {type === 'page' && <FileText className="w-3 h-3" />}
            {type === 'skill' && <Target className="w-3 h-3" />}
            {type === 'task' && <CheckSquare className="w-3 h-3" />}
            <span className="capitalize">{type}</span>
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={`Search ${mentionType}s...`}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9 h-9"
          autoFocus
        />
        {isSearching && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="mt-2 border border-border rounded-lg overflow-hidden bg-background">
          {searchResults.map(item => (
            <button
              key={item.id}
              onClick={() => selectItem(item)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2 border-b border-border last:border-b-0"
            >
              <span>{item.icon}</span>
              <span className="flex-1 truncate">{item.name}</span>
              <span className="text-xs text-muted-foreground capitalize">{item.type}</span>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {searchQuery && !isSearching && searchResults.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground text-center py-2">
          No {mentionType}s found matching "{searchQuery}"
        </p>
      )}

      {/* Hint */}
      {!searchQuery && (
        <p className="mt-2 text-xs text-muted-foreground">
          Start typing to search for {mentionType}s to link
        </p>
      )}
    </div>
  );
}
