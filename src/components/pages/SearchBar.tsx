import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Clock, Tag, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  icon: string;
  tags: string[];
  workspace_id: string;
  updated_at: string;
  word_count: number;
  estimated_reading_time: number;
}

interface SearchBarProps {
  workspaceId?: string;
  onResultClick?: (pageId: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ workspaceId, onResultClick, placeholder = "Search pages...", className }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await api.searchPages(query, workspaceId, 10);
        setResults(response.results || []);
        setShowResults(true);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, workspaceId]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Cmd/Ctrl + K to focus search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
      
      // Escape to close
      if (event.key === 'Escape') {
        setShowResults(false);
        inputRef.current?.blur();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const saveRecentSearch = useCallback((searchQuery: string) => {
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  }, [recentSearches]);

  const handleResultClick = (result: SearchResult) => {
    saveRecentSearch(query);
    setShowResults(false);
    setQuery('');
    
    if (onResultClick) {
      onResultClick(result.id);
    } else {
      navigate(`/workspace/${result.workspace_id}/pages/${result.id}`);
    }
  };

  const handleRecentSearchClick = (recentQuery: string) => {
    setQuery(recentQuery);
    inputRef.current?.focus();
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/50 text-foreground">{part}</mark> : 
        part
    );
  };

  return (
    <div ref={searchRef} className={cn("relative", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-20 py-2.5 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all"
        />
        
        {/* Right side indicators */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isSearching && (
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          )}
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                setShowResults(false);
              }}
              className="p-1 hover:bg-secondary rounded-md transition-colors"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-mono bg-secondary text-muted-foreground rounded border border-border">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50 max-h-[500px] overflow-y-auto"
          >
            {/* Recent Searches */}
            {!query && recentSearches.length > 0 && (
              <div className="p-3 border-b border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Recent Searches
                  </span>
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-1">
                  {recentSearches.map((recentQuery, index) => (
                    <button
                      key={index}
                      onClick={() => handleRecentSearchClick(recentQuery)}
                      className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-secondary rounded-lg transition-colors"
                    >
                      {recentQuery}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            {query && results.length > 0 && (
              <div className="p-2">
                <div className="text-xs font-medium text-muted-foreground px-3 py-2">
                  {results.length} result{results.length !== 1 ? 's' : ''}
                </div>
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className="w-full text-left p-3 hover:bg-secondary rounded-lg transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-lg flex-shrink-0">
                        {result.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                          {highlightMatch(result.title, query)}
                        </h4>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {highlightMatch(result.snippet, query)}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {result.tags.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              <span>{result.tags[0]}</span>
                              {result.tags.length > 1 && (
                                <span>+{result.tags.length - 1}</span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            <span>{result.word_count} words</span>
                          </div>
                          <span>·</span>
                          <span>{result.estimated_reading_time} min read</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No Results */}
            {query && !isSearching && results.length === 0 && (
              <div className="p-8 text-center">
                <Search className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  No pages found for "{query}"
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
