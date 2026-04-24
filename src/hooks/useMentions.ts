import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '@/lib/api';

export interface MentionItem {
  type: 'page' | 'task' | 'skill';
  id: string;
  name: string;
}

export interface MentionGroup {
  type: string;
  items: any[];
  totalCount: number;
}

interface UseMentionsOptions {
  workspaceId?: string;
  maxRecentMentions?: number;
  itemLimit?: number;
}

export function useMentions(options: UseMentionsOptions = {}) {
  const { workspaceId, maxRecentMentions = 10, itemLimit = 5 } = options;
  
  const [showMentions, setShowMentions] = useState(false);
  const [mentionType, setMentionType] = useState<'page' | 'task' | 'skill' | null>(null);
  const [mentionSearch, setMentionSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionedItems, setMentionedItems] = useState<MentionItem[]>([]);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [showAllItems, setShowAllItems] = useState(false);
  const [recentMentions, setRecentMentions] = useState<MentionItem[]>([]);
  const [isLoadingMentions, setIsLoadingMentions] = useState(false);
  
  // Workspace data
  const [pages, setPages] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Load workspace data when workspaceId changes
  useEffect(() => {
    if (workspaceId) {
      loadWorkspaceData();
    }
  }, [workspaceId]);

  const loadWorkspaceData = async () => {
    if (!workspaceId) return;
    
    setIsLoadingMentions(true);
    try {
      const [pagesData, tasksData, skillsData] = await Promise.all([
        api.getPagesByWorkspace(workspaceId),
        api.getTasks(workspaceId),
        api.getSkills(workspaceId)
      ]);
      
      setPages(pagesData || []);
      setTasks(tasksData || []);
      setSkills(skillsData || []);
    } catch (error) {
      console.error('Failed to load workspace data for mentions:', error);
    } finally {
      setIsLoadingMentions(false);
    }
  };

  const handleInputChange = useCallback((
    value: string, 
    cursorPos: number,
    setQuery: (value: string) => void
  ) => {
    setQuery(value);
    setCursorPosition(cursorPos);
    
    // Check if @ was just typed
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Show mentions if @ is at start or after a space, and no space after @
      if ((lastAtIndex === 0 || value[lastAtIndex - 1] === ' ') && !textAfterAt.includes(' ')) {
        const searchText = textAfterAt.toLowerCase();
        setMentionSearch(searchText);
        setSelectedMentionIndex(0);
        setShowAllItems(false);
        
        // Determine mention type based on prefix
        if (searchText.startsWith('page:') || searchText.startsWith('p:')) {
          setMentionType('page');
        } else if (searchText.startsWith('task:') || searchText.startsWith('t:')) {
          setMentionType('task');
        } else if (searchText.startsWith('skill:') || searchText.startsWith('s:')) {
          setMentionType('skill');
        } else {
          setMentionType(null);
        }
        
        setShowMentions(true);
        return;
      }
    }
    
    setShowMentions(false);
  }, []);

  const handleMention = useCallback((
    item: any, 
    type: 'page' | 'task' | 'skill',
    query: string,
    setQuery: (value: string) => void
  ) => {
    const textBeforeCursor = query.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const beforeAt = query.substring(0, lastAtIndex);
      const afterCursor = query.substring(cursorPosition);
      const itemName = item.title || item.name;
      const newQuery = `${beforeAt}@${itemName} ${afterCursor}`;
      
      setQuery(newQuery);
      
      // Track mentioned item
      const newMention: MentionItem = { type, id: item.id, name: itemName };
      setMentionedItems(prev => [...prev, newMention]);
      
      // Add to recent mentions (keep last N, avoid duplicates)
      setRecentMentions(prev => {
        const filtered = prev.filter(m => m.id !== item.id);
        return [newMention, ...filtered].slice(0, maxRecentMentions);
      });
      
      setShowMentions(false);
      setSelectedMentionIndex(0);
      
      // Focus back on input
      setTimeout(() => {
        if (inputRef.current) {
          const newCursorPos = lastAtIndex + itemName.length + 2;
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  }, [cursorPosition, maxRecentMentions]);

  const removeMentionedItem = useCallback((
    index: number,
    query: string,
    setQuery: (value: string) => void
  ) => {
    const item = mentionedItems[index];
    if (item) {
      // Remove from query
      const mentionPattern = new RegExp(`@${item.name}\\s?`, 'g');
      setQuery(query.replace(mentionPattern, ''));
      // Remove from tracked items
      setMentionedItems(prev => prev.filter((_, i) => i !== index));
    }
  }, [mentionedItems]);

  const getFilteredItems = useCallback((): MentionGroup[] => {
    const searchLower = mentionSearch.toLowerCase();
    
    // Remove prefix from search
    const cleanSearch = searchLower
      .replace(/^(page|p|task|t|skill|s):/, '')
      .trim();
    
    const results: MentionGroup[] = [];
    
    if (!workspaceId) {
      return results;
    }
    
    const limit = showAllItems ? 20 : itemLimit;
    
    if (!mentionType || mentionType === 'page') {
      const filtered = pages.filter(p => 
        p.title?.toLowerCase().includes(cleanSearch) &&
        p.workspace_id === workspaceId
      );
      if (filtered.length > 0) {
        results.push({ 
          type: 'page', 
          items: filtered.slice(0, limit),
          totalCount: filtered.length
        });
      }
    }
    
    if (!mentionType || mentionType === 'task') {
      const filtered = tasks.filter(t => 
        t.title?.toLowerCase().includes(cleanSearch) &&
        t.workspace_id === workspaceId
      );
      if (filtered.length > 0) {
        results.push({ 
          type: 'task', 
          items: filtered.slice(0, limit),
          totalCount: filtered.length
        });
      }
    }
    
    if (!mentionType || mentionType === 'skill') {
      const filtered = skills.filter(s => 
        s.name?.toLowerCase().includes(cleanSearch) &&
        s.workspace_id === workspaceId
      );
      if (filtered.length > 0) {
        results.push({ 
          type: 'skill', 
          items: filtered.slice(0, limit),
          totalCount: filtered.length
        });
      }
    }
    
    return results;
  }, [mentionSearch, mentionType, pages, tasks, skills, workspaceId, showAllItems, itemLimit]);

  const getAllFilteredItems = useCallback((): Array<{item: any, type: 'page' | 'task' | 'skill'}> => {
    const groups = getFilteredItems();
    const flatItems: Array<{item: any, type: 'page' | 'task' | 'skill'}> = [];
    
    // Add recent mentions first if no search
    if (!mentionSearch && recentMentions.length > 0) {
      recentMentions.forEach(recent => {
        let item = null;
        if (recent.type === 'page') {
          item = pages.find(p => p.id === recent.id);
        } else if (recent.type === 'task') {
          item = tasks.find(t => t.id === recent.id);
        } else if (recent.type === 'skill') {
          item = skills.find(s => s.id === recent.id);
        }
        if (item) {
          flatItems.push({ item, type: recent.type });
        }
      });
    }
    
    groups.forEach(group => {
      group.items.forEach(item => {
        // Avoid duplicates from recent mentions
        if (!flatItems.some(f => f.item.id === item.id)) {
          flatItems.push({ item, type: group.type as any });
        }
      });
    });
    
    return flatItems;
  }, [getFilteredItems, mentionSearch, recentMentions, pages, tasks, skills]);

  const handleKeyDown = useCallback((
    e: React.KeyboardEvent,
    query: string,
    setQuery: (value: string) => void,
    onSearch: () => void
  ) => {
    if (showMentions) {
      const allItems = getAllFilteredItems();
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev < allItems.length - 1 ? prev + 1 : 0
        );
        return true;
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev > 0 ? prev - 1 : allItems.length - 1
        );
        return true;
      }
      
      if (e.key === 'Enter') {
        e.preventDefault();
        const selectedItem = allItems[selectedMentionIndex];
        if (selectedItem) {
          handleMention(selectedItem.item, selectedItem.type, query, setQuery);
        }
        return true;
      }
      
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentions(false);
        return true;
      }
      
      if (e.key === 'Tab') {
        e.preventDefault();
        // Tab cycles through types
        if (mentionType === null) {
          setMentionType('page');
        } else if (mentionType === 'page') {
          setMentionType('task');
        } else if (mentionType === 'task') {
          setMentionType('skill');
        } else {
          setMentionType(null);
        }
        setSelectedMentionIndex(0);
        return true;
      }
    }
    
    // Normal Enter to search
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSearch();
      return true;
    }
    
    return false;
  }, [showMentions, getAllFilteredItems, selectedMentionIndex, handleMention, mentionType]);

  const clearMentions = useCallback(() => {
    setMentionedItems([]);
    setShowMentions(false);
    setMentionSearch('');
    setSelectedMentionIndex(0);
  }, []);

  return {
    // State
    showMentions,
    setShowMentions,
    mentionType,
    setMentionType,
    mentionSearch,
    mentionedItems,
    selectedMentionIndex,
    setSelectedMentionIndex,
    showAllItems,
    setShowAllItems,
    recentMentions,
    isLoadingMentions,
    inputRef,
    
    // Data
    pages,
    tasks,
    skills,
    
    // Methods
    handleInputChange,
    handleMention,
    removeMentionedItem,
    getFilteredItems,
    getAllFilteredItems,
    handleKeyDown,
    clearMentions,
    loadWorkspaceData,
  };
}
