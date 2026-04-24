import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Sparkles, 
  Search, 
  Send, 
  FileText, 
  Brain, 
  GitBranch,
  ExternalLink,
  ListTodo,
  FilePlus,
  Bookmark,
  MessageCircle,
  ChevronDown,
  History,
  X,
  Trash2,
  Plus,
  FileQuestion,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

const searchModes = [
  { value: 'ask', label: 'Ask', description: 'Get answers and guidance' },
  { value: 'agent', label: 'Agent', description: 'Create pages, skills, tasks' },
  { value: 'plan', label: 'Plan', description: 'Create learning plans' },
];

const availableSources = [
  { id: 'web', label: 'Web', icon: ExternalLink, description: 'Search the internet' },
  { id: 'pages', label: 'Pages', icon: FileText, description: 'Your workspace pages' },
  { id: 'skills', label: 'Skills', icon: Brain, description: 'Your tracked skills' },
  { id: 'tasks', label: 'Tasks', icon: ListTodo, description: 'Your tasks and linked content' },
  { id: 'graph', label: 'Graph', icon: GitBranch, description: 'Knowledge connections' },
  { id: 'kb', label: 'Knowledge Base', icon: Bookmark, description: 'All workspace content' },
];

interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
}

// Action can be a string (legacy) or an object with label/route
interface SuggestedAction {
  label: string;
  route?: string | null;
  action?: string;
  mode?: string;
}

interface AIResponse {
  response: string;
  sources: Array<{
    id: string;
    title: string;
    type: string;
  }>;
  suggested_actions: (string | SuggestedAction)[];
  created_items?: {
    pages?: any[];
    skills?: any[];
    tasks?: any[];
    quizzes?: any[];
    flashcards?: any[];
  };
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: any[];
  model?: string;
  suggested_actions?: (string | SuggestedAction)[];
  created_items?: any;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
  workspace_id?: string;
}

export function AskAnything() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentWorkspace } = useWorkspace();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('ask');
  const [scope, setScope] = useState('all');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [showScopeDropdown, setShowScopeDropdown] = useState(false);
  const [enabledSources, setEnabledSources] = useState<string[]>(['web', 'pages', 'skills', 'tasks', 'graph', 'kb']);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionType, setMentionType] = useState<'page' | 'task' | 'skill' | null>(null);
  const [mentionSearch, setMentionSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionedItems, setMentionedItems] = useState<Array<{type: string, id: string, name: string}>>([]);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [showAllItems, setShowAllItems] = useState(false);
  const [recentMentions, setRecentMentions] = useState<Array<{type: string, id: string, name: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [initialQueryProcessed, setInitialQueryProcessed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const scopeDropdownRef = useRef<HTMLDivElement>(null);
  const mentionsDropdownRef = useRef<HTMLDivElement>(null);
  const responseEndRef = useRef<HTMLDivElement>(null);

  // Handle URL query parameter
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery && !initialQueryProcessed) {
      setQuery(urlQuery);
      setInitialQueryProcessed(true);
      // Auto-submit after a short delay to allow component to fully mount
      setTimeout(() => {
        if (urlQuery.trim()) {
          // Trigger search programmatically
          const searchButton = document.querySelector('[data-search-button]') as HTMLButtonElement;
          if (searchButton) searchButton.click();
        }
      }, 500);
    }
  }, [searchParams, initialQueryProcessed]);

  useEffect(() => {
    loadModels();
    loadChatSessions();
    
    // Close dropdowns on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
      if (scopeDropdownRef.current && !scopeDropdownRef.current.contains(event.target as Node)) {
        setShowScopeDropdown(false);
      }
      if (mentionsDropdownRef.current && !mentionsDropdownRef.current.contains(event.target as Node)) {
        setShowMentions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    loadChatSessions();
  }, [currentWorkspace]);

  const loadChatSessions = async () => {
    try {
      setLoadingHistory(true);
      const sessions = await api.getChatSessions(currentWorkspace?.id);
      setChatSessions(sessions);
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadChatSession = async (sessionId: string) => {
    try {
      const session = await api.getChatSession(sessionId);
      setCurrentSessionId(sessionId);
      
      // Load the full conversation history
      if (session.messages && session.messages.length > 0) {
        setMessages(session.messages);
        setHasSearched(true);
        
        // Clear the input
        setQuery('');
        setResponse(null);
      }
      
      setShowHistory(false);
      toast.success('Chat loaded');
    } catch (error) {
      console.error('Failed to load chat session:', error);
      toast.error('Failed to load chat');
    }
  };

  const createNewChat = async () => {
    try {
      const session = await api.createChatSession({
        workspace_id: currentWorkspace?.id
      });
      setCurrentSessionId(session.id);
      setQuery('');
      setResponse(null);
      setMessages([]); // Clear messages for new chat
      setHasSearched(false);
      await loadChatSessions();
      toast.success('New chat created');
    } catch (error) {
      console.error('Failed to create chat:', error);
      toast.error('Failed to create chat');
    }
  };

  const deleteChatSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this chat?')) return;
    
    try {
      await api.deleteChatSession(sessionId);
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setQuery('');
        setResponse(null);
        setMessages([]); // Clear messages
        setHasSearched(false);
      }
      await loadChatSessions();
      toast.success('Chat deleted');
    } catch (error) {
      console.error('Failed to delete chat:', error);
      toast.error('Failed to delete chat');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
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
        setSelectedMentionIndex(0); // Reset selection on search change
        setShowAllItems(false); // Reset show all on new search
        
        // Determine mention type based on prefix
        if (searchText.startsWith('page:') || searchText.startsWith('p:')) {
          setMentionType('page');
        } else if (searchText.startsWith('task:') || searchText.startsWith('t:')) {
          setMentionType('task');
        } else if (searchText.startsWith('skill:') || searchText.startsWith('s:')) {
          setMentionType('skill');
        } else {
          // Default: show all types (pages, tasks, skills only - no workspaces)
          setMentionType(null);
        }
        
        setShowMentions(true);
        return;
      }
    }
    
    setShowMentions(false);
  };

  const handleMention = (item: any, type: 'page' | 'task' | 'skill') => {
    const textBeforeCursor = query.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const beforeAt = query.substring(0, lastAtIndex);
      const afterCursor = query.substring(cursorPosition);
      const itemName = item.title || item.name;
      const newQuery = `${beforeAt}@${itemName} ${afterCursor}`;
      
      setQuery(newQuery);
      
      // Track mentioned item
      const newMention = { type, id: item.id, name: itemName };
      setMentionedItems(prev => [...prev, newMention]);
      
      // Add to recent mentions (keep last 10, avoid duplicates)
      setRecentMentions(prev => {
        const filtered = prev.filter(m => m.id !== item.id);
        return [newMention, ...filtered].slice(0, 10);
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
  };
  
  // Remove a mentioned item (chip)
  const removeMentionedItem = (index: number) => {
    const item = mentionedItems[index];
    if (item) {
      // Remove from query
      const mentionPattern = new RegExp(`@${item.name}\\s?`, 'g');
      setQuery(prev => prev.replace(mentionPattern, ''));
      // Remove from tracked items
      setMentionedItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Load workspace data for mentions
  const [pages, setPages] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  
  useEffect(() => {
    if (currentWorkspace) {
      loadWorkspaceData();
    }
  }, [currentWorkspace]);
  
  const loadWorkspaceData = async () => {
    if (!currentWorkspace) return;
    
    try {
      const [pagesData, tasksData, skillsData] = await Promise.all([
        api.getPagesByWorkspace(currentWorkspace.id),
        api.getTasks(currentWorkspace.id),
        api.getSkills(currentWorkspace.id)
      ]);
      
      setPages(pagesData);
      setTasks(tasksData);
      setSkills(skillsData);
    } catch (error) {
      console.error('Failed to load workspace data:', error);
    }
  };
  
  // Filter items based on search - WORKSPACE ISOLATION
  const getFilteredItems = () => {
    const searchLower = mentionSearch.toLowerCase();
    
    // Remove prefix from search
    const cleanSearch = searchLower
      .replace(/^(page|p|task|t|skill|s|workspace|w):/, '')
      .trim();
    
    const results: Array<{type: string, items: any[], totalCount: number}> = [];
    
    // ONLY show items from current workspace - NO cross-workspace access
    // NO workspace mentions allowed
    if (!currentWorkspace) {
      return results; // No workspace = no items
    }
    
    const itemLimit = showAllItems ? 20 : 5; // Show more items when expanded
    
    if (!mentionType || mentionType === 'page') {
      const filtered = pages.filter(p => 
        p.title.toLowerCase().includes(cleanSearch) &&
        p.workspace_id === currentWorkspace.id  // Strict isolation
      );
      if (filtered.length > 0) {
        results.push({ 
          type: 'page', 
          items: filtered.slice(0, itemLimit),
          totalCount: filtered.length
        });
      }
    }
    
    if (!mentionType || mentionType === 'task') {
      const filtered = tasks.filter(t => 
        t.title.toLowerCase().includes(cleanSearch) &&
        t.workspace_id === currentWorkspace.id  // Strict isolation
      );
      if (filtered.length > 0) {
        results.push({ 
          type: 'task', 
          items: filtered.slice(0, itemLimit),
          totalCount: filtered.length
        });
      }
    }
    
    if (!mentionType || mentionType === 'skill') {
      const filtered = skills.filter(s => 
        s.name.toLowerCase().includes(cleanSearch) &&
        s.workspace_id === currentWorkspace.id  // Strict isolation
      );
      if (filtered.length > 0) {
        results.push({ 
          type: 'skill', 
          items: filtered.slice(0, itemLimit),
          totalCount: filtered.length
        });
      }
    }
    
    return results;
  };
  
  // Get flat list of all filtered items for keyboard navigation
  const getAllFilteredItems = () => {
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
          flatItems.push({ item, type: recent.type as any });
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
  };

  const loadModels = async () => {
    try {
      const data = await api.getAIModels();
      setModels(data.models);
    } catch (error) {
      console.error('Failed to load models:', error);
      // Set default models if API fails
      setModels([
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', description: 'Fast and efficient' },
        { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Most capable' },
      ]);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    const userQuery = query.trim();
    const currentMentionedItems = [...mentionedItems]; // Capture mentioned items
    
    setQuery(''); // Clear input immediately
    setMentionedItems([]); // Clear mentioned items
    setIsLoading(true);
    setIsStreaming(true);
    setHasSearched(true);
    setStreamingText('');
    setResponse(null);
    
    // Add user message to UI immediately
    const userMessage: Message = {
      role: 'user',
      content: userQuery,
      timestamp: new Date().toISOString(),
      model: selectedModel
    };
    setMessages(prev => [...prev, userMessage]);
    
    try {
      // Create session if needed and get the session ID
      let sessionId = currentSessionId;
      if (!sessionId) {
        const session = await api.createChatSession({
          workspace_id: currentWorkspace?.id
        });
        sessionId = session.id;
        setCurrentSessionId(sessionId);
        console.log('Created new session:', sessionId);
      }
      
      // Add user message to session (use sessionId variable, not state)
      console.log('Adding user message to session:', sessionId);
      
      // Validate user message content
      if (!userQuery || !userQuery.trim()) {
        throw new Error('Message content cannot be empty');
      }
      
      const userMessageResult = await api.addMessageToSession(sessionId, {
        role: 'user',
        content: userQuery.trim(),
        model: selectedModel
      });
      console.log('User message added:', userMessageResult);
      
      // Use currentWorkspace.id if no workspace was mentioned with @
      const workspaceIdForQuery = selectedWorkspaceId || currentWorkspace?.id;
      console.log('Querying with workspace_id:', workspaceIdForQuery);
      console.log('Mentioned items:', currentMentionedItems);
      console.log('Enabled sources:', enabledSources);
      console.log('Mode:', mode);
      
      // Use enhanced endpoint for better intent detection and smart building
      // This endpoint:
      // - Detects user intent intelligently
      // - Only creates what user specifically asks for (not everything)
      // - Gathers relevant context efficiently (no lag with large workspaces)
      // - Returns actions for navigation (follows Ask Anything architecture)
      let result;
      try {
        result = await api.queryEnhanced(
          userQuery, 
          mode, 
          workspaceIdForQuery, 
          currentMentionedItems,
          sessionId
        );
        console.log('Enhanced query result:', result);
      } catch (enhancedError) {
        // Fallback to regular query if enhanced fails
        console.warn('Enhanced query failed, falling back to regular:', enhancedError);
        result = await api.query(
          userQuery, 
          mode, 
          scope, 
          selectedModel, 
          workspaceIdForQuery, 
          currentMentionedItems,
          enabledSources,
          sessionId
        );
      }
      
      // Handle build results - show actions for navigation
      if (result.build && result.build.success) {
        console.log('Build completed:', result.build);
        // Toast notification for created items
        if (result.build.created) {
          const createdTypes = Object.keys(result.build.created).filter(k => result.build.created[k]?.length > 0);
          if (createdTypes.length > 0) {
            toast.success(`Created: ${createdTypes.join(', ')}`);
          }
        }
      }
      
      // Add assistant response to session
      console.log('Adding assistant message to session:', sessionId);
      
      // Ensure sources are properly formatted and serializable
      const cleanSources = (result.sources || []).map(source => {
        if (typeof source !== 'object' || source === null) {
          return {};
        }
        
        // Only include serializable fields
        const cleanSource: any = {};
        if (source.id) cleanSource.id = String(source.id);
        if (source.title) cleanSource.title = String(source.title);
        if (source.type) cleanSource.type = String(source.type);
        if (source.url) cleanSource.url = String(source.url);
        
        return cleanSource;
      });
      
      // Validate assistant response content
      let assistantContent = result.response || '';
      if (!assistantContent.trim()) {
        console.error('Empty response from API:', result);
        // Instead of throwing, use a fallback message
        assistantContent = 'I apologize, but I could not generate a response. Please try again or select a different AI model.';
        result.response = assistantContent;
      }
      
      const assistantMessageResult = await api.addMessageToSession(sessionId, {
        role: 'assistant',
        content: assistantContent.trim(),
        sources: cleanSources,
        model: selectedModel
      });
      console.log('Assistant message added:', assistantMessageResult);
      
      // Reload chat sessions to update the sidebar
      console.log('Reloading chat sessions...');
      await loadChatSessions();
      
      // Stream the response character by character
      const text = result.response;
      let currentIndex = 0;
      
      const streamInterval = setInterval(() => {
        if (currentIndex < text.length) {
          // Stream in chunks for smoother effect
          const chunkSize = Math.floor(Math.random() * 3) + 2;
          const chunk = text.slice(currentIndex, currentIndex + chunkSize);
          setStreamingText(prev => prev + chunk);
          currentIndex += chunkSize;
          
          // Auto-scroll to bottom
          responseEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        } else {
          clearInterval(streamInterval);
          setIsStreaming(false);
          
          // Add assistant message to UI
          const assistantMessage: Message = {
            role: 'assistant',
            content: result.response,
            timestamp: new Date().toISOString(),
            sources: result.sources,
            model: selectedModel,
            suggested_actions: result.suggested_actions
          };
          setMessages(prev => [...prev, assistantMessage]);
          setStreamingText('');
          setResponse(result);
        }
      }, 30);
      
    } catch (error: any) {
      console.error('Query error:', error);
      setIsStreaming(false);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to process query';
      if (error.message) {
        if (error.message.includes('422')) {
          errorMessage = 'Invalid message format. Please try again.';
        } else if (error.message.includes('404')) {
          errorMessage = 'Chat session not found. Creating a new chat...';
          // Reset session and try again
          setCurrentSessionId(null);
        } else if (error.message.includes('empty')) {
          errorMessage = 'Message cannot be empty. Please enter a valid query.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
      
      // Remove the user message if query failed
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle keyboard navigation for mentions dropdown
    if (showMentions) {
      const allItems = getAllFilteredItems();
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev < allItems.length - 1 ? prev + 1 : 0
        );
        return;
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev > 0 ? prev - 1 : allItems.length - 1
        );
        return;
      }
      
      if (e.key === 'Enter') {
        e.preventDefault();
        const selectedItem = allItems[selectedMentionIndex];
        if (selectedItem) {
          handleMention(selectedItem.item, selectedItem.type);
        }
        return;
      }
      
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentions(false);
        return;
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
        return;
      }
    }
    
    // Normal Enter to search
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleSourceClick = (source: any) => {
    if (source.type === 'page') {
      navigate(`/pages/${source.id}`);
    } else if (source.type === 'skill') {
      navigate(`/skills`);
    } else if (source.type === 'task') {
      navigate(`/tasks`);
    } else if (source.type === 'web') {
      window.open(source.url, '_blank');
    }
  };

  const handleSuggestedAction = async (action: string | SuggestedAction) => {
    try {
      // Handle object format (new architecture)
      if (typeof action === 'object' && action !== null) {
        const actionObj = action as SuggestedAction;
        
        // If action has a route, navigate to it
        if (actionObj.route) {
          navigate(actionObj.route);
          return;
        }
        
        // Handle mode switching
        if (actionObj.action === 'switch_mode' && actionObj.mode) {
          setMode(actionObj.mode);
          toast.info(`Switched to ${actionObj.mode.toUpperCase()} mode`);
          inputRef.current?.focus();
          return;
        }
        
        // Handle continue action (focus input)
        if (actionObj.action === 'continue') {
          inputRef.current?.focus();
          return;
        }
        
        // Fallback: show the label
        toast.info(`Action: ${actionObj.label}`);
        return;
      }
      
      // Handle string format (legacy)
      const actionLower = (action as string).toLowerCase();
      
      // Switch to AGENT mode (when content not found)
      if (actionLower.includes('switch to agent') || actionLower.includes('agent mode')) {
        setMode('agent');
        toast.info('Switched to AGENT mode. Now ask me to create content!');
        inputRef.current?.focus();
        return;
      }
      
      // Create a page about this topic (when content not found)
      if (actionLower.includes('create a page about')) {
        if (!currentWorkspace) {
          toast.error('Please select a workspace first');
          return;
        }
        setMode('agent');
        // Get the last user query from messages
        const lastUserMessage = messages.filter(m => m.role === 'user').pop();
        const topic = lastUserMessage?.content || 'this topic';
        setQuery(`Create a detailed page about: ${topic}`);
        setTimeout(() => handleSearch(), 100);
        return;
      }
      
      // Add as a skill (when content not found)
      if (actionLower.includes('add this as a skill')) {
        if (!currentWorkspace) {
          toast.error('Please select a workspace first');
          return;
        }
        setMode('agent');
        const lastUserMessage = messages.filter(m => m.role === 'user').pop();
        const topic = lastUserMessage?.content || 'this topic';
        setQuery(`Create a skill for: ${topic}`);
        setTimeout(() => handleSearch(), 100);
        return;
      }
      
      // Create a learning task (when content not found)
      if (actionLower.includes('create a learning task')) {
        if (!currentWorkspace) {
          toast.error('Please select a workspace first');
          return;
        }
        setMode('agent');
        const lastUserMessage = messages.filter(m => m.role === 'user').pop();
        const topic = lastUserMessage?.content || 'this topic';
        setQuery(`Create a task to learn about: ${topic}`);
        setTimeout(() => handleSearch(), 100);
        return;
      }
      
      // Create summary page
      if (actionLower.includes('summary page') || actionLower.includes('save as new page')) {
        if (!response) return;
        
        const title = query.length > 50 ? query.substring(0, 50) + '...' : query;
        const content = `# ${query}\n\n${response.response}`;
        
        const newPage = await api.createPage({
          title: title,
          content: content,
          icon: '📝',
          tags: ['ai-generated'],
          workspace_id: currentWorkspace?.id
        });
        
        toast.success('Page created!');
        navigate(`/pages/${newPage.id}`);
      }
      // Generate practice tasks - Use AGENT mode to actually create tasks
      else if (actionLower.includes('practice tasks') || actionLower.includes('generate') && actionLower.includes('task')) {
        if (!response || !currentWorkspace) {
          toast.error('Please select a workspace first');
          return;
        }
        
        // Switch to agent mode and ask AI to create tasks
        setMode('agent');
        setQuery(`Create 3-5 practice tasks for: ${query}. Make them specific and actionable.`);
        
        // Trigger a new search in agent mode
        setTimeout(() => {
          handleSearch();
        }, 100);
        
        toast.info('Generating practice tasks...');
      }
      // View related pages
      else if (actionLower.includes('related pages') || actionLower.includes('view') && actionLower.includes('page')) {
        navigate('/pages');
      }
      // Visualize in knowledge graph
      else if (actionLower.includes('knowledge graph') || actionLower.includes('visualize') && actionLower.includes('graph')) {
        navigate('/graph');
      }
      // Explain in detail - removed, use Ask mode instead
      else if (actionLower.includes('explain in detail') || actionLower.includes('explain')) {
        setMode('ask');
        setTimeout(() => {
          handleSearch();
        }, 100);
      }
      // Create a plan
      else if (actionLower.includes('create') && actionLower.includes('plan')) {
        setMode('plan');
        setTimeout(() => {
          handleSearch();
        }, 100);
      }
      // Generate related skills
      else if (actionLower.includes('skill')) {
        navigate('/skills');
      }
      // Ask follow-up question
      else if (actionLower.includes('follow') || actionLower.includes('question')) {
        // Focus on the follow-up input
        const followUpInput = document.querySelector('input[placeholder*="follow"]') as HTMLInputElement;
        if (followUpInput) {
          followUpInput.focus();
        }
      }
      // Default: show info toast
      else {
        toast.info(`Action: ${action}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to perform action');
      console.error('Action error:', error);
    }
  };

  const selectedModelData = models.find(m => m.id === selectedModel);

  return (
    <div className="flex flex-col min-h-screen relative">
      {/* History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />
            
            {/* Sidebar */}
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-card border-r border-border z-50 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-foreground">Chat History</h2>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* New Chat Button */}
              <div className="p-3 border-b border-border">
                <Button
                  onClick={createNewChat}
                  className="w-full rounded-xl"
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Chat
                </Button>
              </div>

              {/* Chat Sessions List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : chatSessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No chat history yet
                  </div>
                ) : (
                  chatSessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => loadChatSession(session.id)}
                      className={cn(
                        "group p-3 rounded-lg cursor-pointer transition-all hover:bg-secondary",
                        currentSessionId === session.id && "bg-primary/10 hover:bg-primary/15"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            currentSessionId === session.id ? "text-primary" : "text-foreground"
                          )}>
                            {session.title || 'Untitled Chat'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(session.updated_at).toLocaleDateString()}
                          </p>
                          {session.messages && session.messages.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {session.messages.length} messages
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => deleteChatSession(session.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* History Toggle Button */}
      <div className="absolute top-4 left-4 z-30">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border hover:border-primary/30 rounded-xl transition-all shadow-sm hover:shadow-md"
        >
          <History className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">History</span>
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col items-center pt-12 pb-6 px-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-4"
        >
          <div className="relative">
            <Sparkles className="w-10 h-10 text-primary" />
            <div className="absolute inset-0 blur-xl bg-primary/30 rounded-full" />
          </div>
          <h1 className="text-4xl font-display font-bold text-foreground">Ask Anything</h1>
        </motion.div>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground text-center max-w-lg"
        >
          Ask questions across your pages, skills, and knowledge base
        </motion.p>
      </div>

      {/* Search Area */}
      <div className="flex-1 flex flex-col px-4 md:px-8 max-w-4xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative"
        >
          {/* Top Controls - Sources and Model (removed workspace dropdown) */}
          <div className="flex items-center justify-end gap-3 mb-3">
            {/* Sources Dropdown - Perplexity Style */}
            <div className="relative" ref={scopeDropdownRef}>
              <button
                onClick={() => {
                  setShowScopeDropdown(!showScopeDropdown);
                  setShowModelDropdown(false);
                }}
                className="flex items-center gap-2 px-4 py-2.5 text-sm bg-card border border-border hover:border-primary/30 rounded-xl transition-all shadow-sm hover:shadow-md"
              >
                <Search className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-foreground">
                  {enabledSources.length === availableSources.length 
                    ? 'All Sources' 
                    : enabledSources.length === 0
                    ? 'No Sources'
                    : `${enabledSources.length} Source${enabledSources.length > 1 ? 's' : ''}`
                  }
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
              
              {showScopeDropdown && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-xl shadow-xl z-[100] overflow-hidden">
                  <div className="p-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-2 mb-2">
                      Search Sources
                    </div>
                    
                    {/* All Sources Toggle */}
                    <button
                      onClick={() => {
                        if (enabledSources.length === availableSources.length) {
                          // Disable all
                          setEnabledSources([]);
                        } else {
                          // Enable all
                          setEnabledSources(availableSources.map(s => s.id));
                        }
                      }}
                      className={cn(
                        "w-full text-left px-3 py-3 rounded-lg hover:bg-secondary transition-colors flex items-center gap-3 mb-2 border",
                        enabledSources.length === availableSources.length 
                          ? "bg-primary/10 border-primary/30" 
                          : "border-transparent"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        enabledSources.length === availableSources.length 
                          ? "bg-primary/20" 
                          : "bg-secondary"
                      )}>
                        <Search className={cn(
                          "w-5 h-5",
                          enabledSources.length === availableSources.length 
                            ? "text-primary" 
                            : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="flex-1">
                        <p className={cn(
                          "text-sm font-semibold",
                          enabledSources.length === availableSources.length 
                            ? "text-primary" 
                            : "text-foreground"
                        )}>
                          All Sources
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Search across everything
                        </p>
                      </div>
                      <div className={cn(
                        "w-10 h-6 rounded-full transition-colors relative",
                        enabledSources.length === availableSources.length 
                          ? "bg-primary" 
                          : "bg-muted"
                      )}>
                        <div className={cn(
                          "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                          enabledSources.length === availableSources.length 
                            ? "translate-x-4" 
                            : "translate-x-0.5"
                        )} />
                      </div>
                    </button>

                    {/* Individual Source Toggles */}
                    <div className="space-y-1">
                      {availableSources.map((source) => {
                        const Icon = source.icon;
                        const isEnabled = enabledSources.includes(source.id);
                        
                        return (
                          <button
                            key={source.id}
                            onClick={() => {
                              if (isEnabled) {
                                setEnabledSources(enabledSources.filter(id => id !== source.id));
                              } else {
                                setEnabledSources([...enabledSources, source.id]);
                              }
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors flex items-center gap-3",
                              isEnabled && "bg-primary/5"
                            )}
                          >
                            <Icon className={cn(
                              "w-4 h-4",
                              isEnabled ? "text-primary" : "text-muted-foreground"
                            )} />
                            <div className="flex-1">
                              <p className={cn(
                                "text-sm font-medium",
                                isEnabled ? "text-foreground" : "text-muted-foreground"
                              )}>
                                {source.label}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {source.description}
                              </p>
                            </div>
                            <div className={cn(
                              "w-9 h-5 rounded-full transition-colors relative flex-shrink-0",
                              isEnabled ? "bg-primary" : "bg-muted"
                            )}>
                              <div className={cn(
                                "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                                isEnabled ? "translate-x-4" : "translate-x-0.5"
                              )} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Model Selector */}
            <div className="relative" ref={modelDropdownRef}>
              <button
                onClick={() => {
                  setShowModelDropdown(!showModelDropdown);
                  setShowScopeDropdown(false);
                }}
                className="flex items-center gap-2 px-4 py-2.5 text-sm bg-card border border-border hover:border-primary/30 rounded-xl transition-all shadow-sm hover:shadow-md"
              >
                <Brain className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-foreground">
                  {selectedModelData?.name || selectedModel || 'Select Model'}
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
              
              {showModelDropdown && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-[100] max-h-[480px] overflow-y-auto">
                  <div className="p-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
                      Choose a model
                    </div>
                    {models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setSelectedModel(model.id);
                          setShowModelDropdown(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-3 rounded-lg hover:bg-secondary transition-colors",
                          selectedModel === model.id && "bg-primary/10 hover:bg-primary/15"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "font-medium text-sm",
                              selectedModel === model.id ? "text-primary" : "text-foreground"
                            )}>{model.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{model.provider}</p>
                            <p className="text-xs text-muted-foreground mt-1">{model.description}</p>
                          </div>
                          {selectedModel === model.id && (
                            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Input with @ mentions */}
          <div className="relative bg-card border border-border rounded-2xl shadow-soft overflow-visible transition-shadow hover:shadow-md focus-within:shadow-md focus-within:border-primary/30">
            <div className="flex items-center gap-3 px-4 py-4">
              <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything... (Type @ to mention a workspace)"
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-base"
              />
              
              <Button 
                onClick={handleSearch}
                disabled={!query.trim() || isLoading}
                className="rounded-xl px-5"
                data-search-button
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Ask
                  </>
                )}
              </Button>
            </div>

            {/* @ Mentions Dropdown - STRICT WORKSPACE ISOLATION */}
            {showMentions && (
              <div 
                ref={mentionsDropdownRef}
                className="absolute left-4 top-full mt-2 w-96 bg-card border border-border rounded-xl shadow-xl z-[100] max-h-[450px] overflow-hidden"
              >
                <div className="p-2">
                  {/* Header with current workspace indicator */}
                  <div className="px-3 py-2 mb-1 bg-primary/5 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-primary uppercase tracking-wider">
                        @ Mention
                        {currentWorkspace && (
                          <span className="ml-2 text-xs font-normal normal-case text-muted-foreground">
                            in {currentWorkspace.icon} {currentWorkspace.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="text-xs text-muted-foreground">
                        {mentionType ? `Showing: ${mentionType}s` : 'All types'}
                      </div>
                      <div className="text-xs text-muted-foreground/60">
                        • ↑↓ navigate • Enter select • Tab filter • Esc close
                      </div>
                    </div>
                    {/* Type filter tabs */}
                    <div className="flex gap-1 mt-2">
                      {[
                        { type: null, label: 'All' },
                        { type: 'page' as const, label: 'Pages' },
                        { type: 'task' as const, label: 'Tasks' },
                        { type: 'skill' as const, label: 'Skills' }
                      ].map(({ type, label }) => (
                        <button
                          key={label}
                          onClick={() => {
                            setMentionType(type);
                            setSelectedMentionIndex(0);
                          }}
                          className={cn(
                            "px-2 py-1 text-xs rounded-md transition-colors",
                            mentionType === type
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Scrollable content area */}
                  <div className="thin-scrollbar max-h-[320px] overflow-y-auto">
                    {/* Recent Mentions Section */}
                    {!mentionSearch && recentMentions.length > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center gap-2 px-3 py-1.5">
                          <div className="text-xs font-medium text-muted-foreground">
                            Recent
                          </div>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                        {recentMentions.slice(0, 3).map((recent, idx) => {
                          const item = recent.type === 'page' 
                            ? pages.find(p => p.id === recent.id)
                            : recent.type === 'task'
                            ? tasks.find(t => t.id === recent.id)
                            : skills.find(s => s.id === recent.id);
                          
                          if (!item) return null;
                          
                          const Icon = recent.type === 'page' ? FileText :
                                      recent.type === 'task' ? ListTodo :
                                      Brain;
                          const isSelected = selectedMentionIndex === idx;
                          
                          return (
                            <button
                              key={`recent-${recent.id}`}
                              onClick={() => handleMention(item, recent.type as any)}
                              className={cn(
                                "w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3",
                                isSelected 
                                  ? "bg-primary/10 border border-primary/30" 
                                  : "hover:bg-secondary"
                              )}
                            >
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                isSelected ? "bg-primary/20" : "bg-secondary"
                              )}>
                                <Icon className={cn("w-4 h-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  "text-sm font-medium truncate",
                                  isSelected ? "text-primary" : "text-foreground"
                                )}>
                                  @{recent.name}
                                </p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {recent.type}
                                </p>
                              </div>
                              <span className="text-xs text-muted-foreground/50">recent</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    
                    {getFilteredItems().length === 0 && recentMentions.length === 0 ? (
                      <div className="px-3 py-6 text-center">
                        <p className="text-sm text-muted-foreground mb-2">
                          {currentWorkspace 
                            ? `No ${mentionType || 'items'} found in ${currentWorkspace.name}`
                            : 'No workspace selected'
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Try: @page:, @task:, or @skill:
                        </p>
                      </div>
                    ) : (
                      <>
                        {getFilteredItems().map((group) => {
                          // Calculate the starting index for this group
                          const recentCount = !mentionSearch ? Math.min(recentMentions.length, 3) : 0;
                          let startIndex = recentCount;
                          getFilteredItems().forEach(g => {
                            if (g.type === group.type) return;
                            startIndex += g.items.length;
                          });
                          
                          return (
                            <div key={group.type} className="mb-2">
                              <div className="flex items-center justify-between px-3 py-1.5">
                                <div className="text-xs font-medium text-muted-foreground capitalize">
                                  {group.type}s ({group.totalCount})
                                </div>
                                {group.totalCount > 5 && !showAllItems && (
                                  <button
                                    onClick={() => setShowAllItems(true)}
                                    className="text-xs text-primary hover:underline"
                                  >
                                    Show all
                                  </button>
                                )}
                              </div>
                              {group.items.map((item, itemIdx) => {
                                const Icon = group.type === 'page' ? FileText :
                                            group.type === 'task' ? ListTodo :
                                            Brain;
                                const itemName = item.title || item.name;
                                
                                // Calculate global index for keyboard navigation
                                const allItems = getAllFilteredItems();
                                const globalIndex = allItems.findIndex(ai => ai.item.id === item.id);
                                const isSelected = selectedMentionIndex === globalIndex;
                                
                                return (
                                  <button
                                    key={item.id}
                                    onClick={() => handleMention(item, group.type as any)}
                                    className={cn(
                                      "w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3",
                                      isSelected 
                                        ? "bg-primary/10 border border-primary/30" 
                                        : "hover:bg-secondary"
                                    )}
                                  >
                                    <div className={cn(
                                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                      isSelected ? "bg-primary/20" : "bg-primary/10"
                                    )}>
                                      <Icon className={cn("w-4 h-4", isSelected ? "text-primary" : "text-primary")} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={cn(
                                        "text-sm font-medium truncate",
                                        isSelected ? "text-primary" : "text-foreground"
                                      )}>
                                        @{itemName}
                                      </p>
                                      {(item.description || item.status) && (
                                        <p className="text-xs text-muted-foreground truncate">
                                          {item.description || item.status}
                                        </p>
                                      )}
                                    </div>
                                    {isSelected && (
                                      <span className="text-xs text-primary">Enter ↵</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Mentioned Items Chips - Visual display of selected mentions */}
            {mentionedItems.length > 0 && (
              <div className="flex flex-wrap gap-2 px-4 py-2 border-t border-border/50">
                <span className="text-xs text-muted-foreground self-center">Mentioning:</span>
                {mentionedItems.map((item, index) => {
                  const Icon = item.type === 'page' ? FileText :
                              item.type === 'task' ? ListTodo :
                              Brain;
                  const bgColor = item.type === 'page' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                 item.type === 'task' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
                  
                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
                        bgColor
                      )}
                    >
                      <Icon className="w-3 h-3" />
                      <span className="max-w-[120px] truncate">@{item.name}</span>
                      <button
                        onClick={() => removeMentionedItem(index)}
                        className="ml-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mode Selector */}
            <div className="flex items-center gap-2 px-4 pb-3 border-t border-border/50 pt-3">
              <div className="flex items-center bg-secondary rounded-lg p-0.5">
                {searchModes.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setMode(m.value)}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                      mode === m.value
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Response Area - Show all messages in conversation */}
        <AnimatePresence mode="wait">
          {isLoading && messages.length === 0 && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-8"
            >
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-secondary animate-pulse" />
                  <div className="flex-1">
                    <div className="h-5 w-48 bg-secondary rounded animate-pulse mb-2" />
                    <div className="h-4 w-32 bg-secondary rounded animate-pulse" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-secondary rounded animate-pulse w-full" />
                  <div className="h-4 bg-secondary rounded animate-pulse w-5/6" />
                  <div className="h-4 bg-secondary rounded animate-pulse w-4/6" />
                </div>
              </div>
            </motion.div>
          )}

          {messages.length > 0 && (
            <motion.div
              key="conversation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-8 space-y-6"
            >
              {/* Render all messages in the conversation */}
              {messages.map((message, index) => (
                <div key={index}>
                  {message.role === 'user' ? (
                    /* User Message */
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-primary">You</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{message.content}</p>
                      </div>
                    </div>
                  ) : (
                    /* AI Response Card */
                    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
                      <div className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Sparkles className="w-5 h-5 text-primary" />
                          <span className="text-sm font-medium text-muted-foreground">
                            {models.find(m => m.id === message.model)?.name || selectedModelData?.name}
                          </span>
                        </div>
                        
                        <MarkdownRenderer content={message.content} />
                      </div>

                      {/* Sources Section */}
                      {message.sources && message.sources.length > 0 && (
                        <div className="border-t border-border bg-muted/30 p-6">
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                            Sources
                          </h3>
                          <div className="flex flex-wrap gap-3">
                            {message.sources.map((source, sourceIdx) => {
                              const isLinkedSource = source.linked_from === 'task';
                              
                              return (
                                <div
                                  key={`${source.id}-${sourceIdx}`}
                                  onClick={() => handleSourceClick(source)}
                                  className={cn(
                                    "flex items-center gap-3 border rounded-xl px-4 py-3 hover:shadow-sm transition-all cursor-pointer group",
                                    isLinkedSource 
                                      ? "bg-primary/5 border-primary/20 hover:border-primary/40" 
                                      : "bg-card border-border hover:border-primary/30"
                                  )}
                                >
                                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                                    {source.type === 'web' ? (
                                      <ExternalLink className="w-4 h-4 text-primary" />
                                    ) : source.type === 'task' ? (
                                      <ListTodo className="w-4 h-4 text-primary" />
                                    ) : source.type === 'skill' ? (
                                      <Brain className="w-4 h-4 text-primary" />
                                    ) : (
                                      <FileText className="w-4 h-4 text-primary" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{source.title}</p>
                                    <p className="text-xs text-muted-foreground capitalize">
                                      {source.type}
                                      {isLinkedSource && <span className="ml-1 opacity-60">→ from task</span>}
                                    </p>
                                  </div>
                                  <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons - Only show on last message */}
                      {index === messages.length - 1 && message.suggested_actions && message.suggested_actions.length > 0 && (
                        <div className="border-t border-border p-4 flex flex-wrap gap-2">
                          {message.suggested_actions.map((action, actionIndex) => {
                            // Get label for display (handle both string and object formats)
                            const actionLabel = typeof action === 'string' ? action : action.label;
                            const actionLower = actionLabel.toLowerCase();
                            
                            return (
                              <Button 
                                key={actionIndex} 
                                variant="outline" 
                                size="sm" 
                                className="rounded-full"
                                onClick={() => handleSuggestedAction(action)}
                              >
                                {actionLower.includes('task') && <ListTodo className="w-4 h-4 mr-2" />}
                                {actionLower.includes('page') && <FilePlus className="w-4 h-4 mr-2" />}
                                {actionLower.includes('skill') && <Brain className="w-4 h-4 mr-2" />}
                                {actionLower.includes('graph') && <GitBranch className="w-4 h-4 mr-2" />}
                                {actionLower.includes('quiz') && <FileQuestion className="w-4 h-4 mr-2" />}
                                {actionLower.includes('flashcard') && <Layers className="w-4 h-4 mr-2" />}
                                {actionLabel}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Show streaming message if currently streaming */}
              {isStreaming && (
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium text-muted-foreground">
                        {selectedModelData?.name || selectedModel || 'AI Model'}
                      </span>
                    </div>
                    
                    <div className="prose-custom">
                      <MarkdownRenderer content={streamingText} />
                      <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={responseEndRef} />

              {/* Follow-up Input - Show when not streaming */}
              {!isStreaming && !isLoading && (
                <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
                  <MessageCircle className="w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Ask a follow up..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                    className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
                  />
                  <Button 
                    size="sm" 
                    className="rounded-lg"
                    onClick={handleSearch}
                    disabled={!query.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {!hasSearched && !isLoading && messages.length === 0 && (
            <motion.div
              key="suggestions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-12"
            >
              <h3 className="text-sm font-medium text-muted-foreground mb-4 text-center">
                Quick suggestions
              </h3>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  'What pages do I have?',
                  'Summarize my content',
                  'What topics am I covering?',
                  'Find related pages',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setQuery(suggestion)}
                    className="px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-full transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
