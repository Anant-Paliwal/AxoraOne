import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, Send, FileText, Brain, GitBranch, ExternalLink, Bookmark,
  ChevronDown, History, X, Trash2, Plus, Maximize2, ListTodo, Loader2,
  AlertTriangle, PlusSquare, RefreshCw, Lightbulb, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useBlockInsert } from '@/contexts/BlockInsertContext';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { useMentions } from '@/hooks/useMentions';
import { useActionPreview } from '@/hooks/useActionPreview';
import { ActionPreviewDialog } from '@/components/ai/ActionPreviewDialog';
import { ActionFeedback } from '@/components/ai/ActionFeedback';

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

interface SuggestedAction {
  label: string;
  route?: string | null;
  action?: string;
  mode?: string;
  blocks?: any[];
}

interface GeneratedBlock {
  id: string;
  type: string;
  position: number;
  data: Record<string, any>;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: any[];
  model?: string;
  suggested_actions?: (string | SuggestedAction)[];
  generated_blocks?: GeneratedBlock[];
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
  workspace_id?: string;
}

// Failed query for retry functionality
interface FailedQuery {
  query: string;
  mode: string;
  mentionedItems: Array<{type: string, id: string, name: string}>;
  timestamp: string;
  error: string;
}

// Weak area from learning memory
interface WeakArea {
  topic: string;
  confidence: number;
  last_reviewed?: string;
  error_count?: number;
}


export function FloatingAskAnything() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { insertBlocks } = useBlockInsert();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('ask');
  const [enabledSources, setEnabledSources] = useState<string[]>(['web', 'pages', 'skills', 'tasks', 'graph', 'kb']);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showSourcesDropdown, setShowSourcesDropdown] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<any>(null);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [parentPage, setParentPage] = useState<any>(null);
  const [subPages, setSubPages] = useState<any[]>([]);
  const [pendingGeneratedBlocks, setPendingGeneratedBlocks] = useState<GeneratedBlock[]>([]);
  
  // NEW: Error recovery state
  const [failedQuery, setFailedQuery] = useState<FailedQuery | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  
  // NEW: Learning context state
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);
  const [showLearningContext, setShowLearningContext] = useState(false);
  
  // NEW: Real streaming state
  const [streamingChunks, setStreamingChunks] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const localInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mentionsDropdownRef = useRef<HTMLDivElement>(null);

  // Use the shared mentions hook
  const mentions = useMentions({ workspaceId: currentWorkspace?.id });

  // Use the action preview hook for BUILD/PLAN modes (human verification loop)
  const actionPreview = useActionPreview({
    onActionsExecuted: (results) => {
      // Refresh workspace data after actions are executed
      loadChatSessions();
    }
  });

  // Detect current page from URL
  useEffect(() => {
    const pathMatch = location.pathname.match(/\/pages\/([^\/]+)/);
    if (pathMatch && pathMatch[1] !== 'new') {
      const pageId = pathMatch[1];
      setCurrentPageId(pageId);
      loadCurrentPage(pageId);
    } else {
      setCurrentPageId(null);
      setCurrentPage(null);
    }
  }, [location.pathname]);

  const loadCurrentPage = async (pageId: string) => {
    try {
      const page = await api.getPage(pageId);
      setCurrentPage(page);
      
      if (page.parent_page_id) {
        try {
          const parent = await api.getPage(page.parent_page_id);
          setParentPage(parent);
        } catch (err) {
          console.error('Failed to load parent page:', err);
        }
      } else {
        setParentPage(null);
      }
      
      try {
        const subs = await api.getSubPages(pageId);
        setSubPages(subs || []);
      } catch (err) {
        console.error('Failed to load sub-pages:', err);
        setSubPages([]);
      }
    } catch (error) {
      console.error('Failed to load current page:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadChatSessions();
      loadWeakAreas(); // NEW: Load learning context
    }
  }, [isOpen, currentWorkspace]);

  // NEW: Load weak areas from learning memory
  const loadWeakAreas = async () => {
    if (!currentWorkspace?.id) return;
    try {
      const response = await api.getWeakAreas(currentWorkspace.id);
      setWeakAreas(response.weak_areas || []);
    } catch (error) {
      console.error('Failed to load weak areas:', error);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const loadChatSessions = async () => {
    try {
      const sessions = await api.getChatSessions(currentWorkspace?.id);
      setChatSessions(sessions);
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    }
  };

  const loadChatSession = async (sessionId: string) => {
    try {
      const session = await api.getChatSession(sessionId);
      setCurrentSessionId(sessionId);
      if (session.messages && session.messages.length > 0) {
        setMessages(session.messages);
      }
      setQuery('');
      setShowHistory(false);
      toast.success('Chat loaded');
    } catch (error) {
      console.error('Failed to load chat session:', error);
      toast.error('Failed to load chat');
    }
  };

  const createNewChat = async () => {
    try {
      const session = await api.createChatSession({ workspace_id: currentWorkspace?.id });
      setCurrentSessionId(session.id);
      setQuery('');
      setMessages([]);
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
        setMessages([]);
      }
      await loadChatSessions();
      toast.success('Chat deleted');
    } catch (error) {
      console.error('Failed to delete chat:', error);
      toast.error('Failed to delete chat');
    }
  };


  // Handle input change with @ mention detection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    mentions.handleInputChange(value, cursorPos, setQuery);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    const userQuery = query.trim();
    const currentMentionedItems = [...mentions.mentionedItems];
    
    // Clear any previous failed query
    setFailedQuery(null);
    
    // For AGENT mode, use the agentic API with real streaming
    if (mode === 'agent') {
      setQuery('');
      mentions.clearMentions();
      setIsLoading(true);
      setIsStreaming(true);
      setStreamingText('');
      setStreamingChunks([]);
      
      const userMessage: Message = {
        role: 'user',
        content: userQuery,
        timestamp: new Date().toISOString(),
        model: selectedModel
      };
      setMessages(prev => [...prev, userMessage]);
      
      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();
      
      try {
        const allMentionedItems = [...currentMentionedItems];
        if (currentPage && currentPageId) {
          allMentionedItems.push({ type: 'page', id: currentPageId, name: currentPage.title });
        }
        
        // Use streaming API if available, fallback to regular
        const result = await streamAgentQuery(
          userQuery,
          currentWorkspace?.id,
          allMentionedItems,
          currentSessionId || undefined,
          currentPageId || undefined,
          abortControllerRef.current.signal
        );
        
        setStreamingText('');
        setIsStreaming(false);
        
        // AUTO-INSERT BLOCKS in Agent mode when on a page
        if (result.generated_blocks && result.generated_blocks.length > 0) {
          if (currentPageId) {
            // Auto-insert blocks in agent mode
            insertBlocks(result.generated_blocks);
            toast.success(`Auto-inserted ${result.generated_blocks.length} block(s) to page`);
          } else {
            setPendingGeneratedBlocks(result.generated_blocks);
            toast.success(`Generated ${result.generated_blocks.length} blocks`);
          }
        }
        
        // Build response content
        let responseContent = result.response;
        
        // Show reasoning trace compactly
        if (result.reasoning_trace && result.reasoning_trace.length > 0) {
          responseContent += '\n\n---\n**Agent Actions:**\n';
          result.reasoning_trace.forEach((step: any) => {
            const actionIcon = step.action === 'THINK' ? '🧠' : 
                              step.action === 'SEARCH_WORKSPACE' ? '🔍' :
                              step.action === 'READ_PAGE' ? '📖' :
                              step.action === 'CREATE_CONTENT' ? '✏️' :
                              step.action === 'UPDATE_PAGE' ? '💾' :
                              step.action === 'CREATE_SKILL' ? '🎯' :
                              step.action === 'CREATE_TASK' ? '✅' : '⚡';
            responseContent += `${actionIcon} ${step.action}\n`;
          });
        }
        
        const assistantMessage: Message = {
          role: 'assistant',
          content: responseContent,
          timestamp: new Date().toISOString(),
          sources: result.sources || [],
          model: selectedModel,
          suggested_actions: result.actions,
          generated_blocks: currentPageId ? undefined : result.generated_blocks // Only show insert button if not auto-inserted
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Show success toasts
        if (result.modified_pages?.length > 0) {
          toast.success(`Agent modified ${result.modified_pages.length} page(s)`);
        }
        if (result.created_skills?.length > 0) {
          toast.success(`Created ${result.created_skills.length} skill(s)`);
        }
        if (result.created_tasks?.length > 0) {
          toast.success(`Created ${result.created_tasks.length} task(s)`);
        }
        
      } catch (error: any) {
        if (error.name === 'AbortError') {
          toast.info('Request cancelled');
        } else {
          // Store failed query for retry
          setFailedQuery({
            query: userQuery,
            mode: 'agent',
            mentionedItems: currentMentionedItems,
            timestamp: new Date().toISOString(),
            error: error.message || 'Failed to process goal'
          });
          toast.error(error.message || 'Failed to process goal');
          setMessages(prev => prev.slice(0, -1));
        }
        setStreamingText('');
        setIsStreaming(false);
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
      return;
    }
    
    // For BUILD and PLAN modes, use the preview system (human verification loop)
    if (actionPreview.requiresPreview(mode)) {
      setQuery('');
      mentions.clearMentions();
      setIsLoading(true);
      
      const userMessage: Message = {
        role: 'user',
        content: userQuery,
        timestamp: new Date().toISOString(),
        model: selectedModel
      };
      setMessages(prev => [...prev, userMessage]);
      
      try {
        const allMentionedItems = [...currentMentionedItems];
        if (currentPage && currentPageId) {
          allMentionedItems.push({ type: 'page', id: currentPageId, name: currentPage.title });
        }
        if (parentPage) {
          allMentionedItems.push({ type: 'page', id: parentPage.id, name: `${parentPage.title} (parent)` });
        }
        
        const preview = await actionPreview.generatePreview({
          query: userQuery,
          mode: mode as 'agent' | 'plan',
          workspace_id: currentWorkspace?.id,
          session_id: currentSessionId || undefined,
          model: selectedModel,
          mentioned_items: allMentionedItems,
          enabled_sources: enabledSources
        });
        
        if (preview) {
          const assistantMessage: Message = {
            role: 'assistant',
            content: preview.response + (preview.actions.length > 0 
              ? `\n\n⚠️ **${preview.actions.length} action${preview.actions.length !== 1 ? 's' : ''} pending review** - Please confirm to execute.`
              : ''),
            timestamp: new Date().toISOString(),
            sources: preview.sources,
            model: selectedModel,
            suggested_actions: preview.suggested_actions
          };
          setMessages(prev => [...prev, assistantMessage]);
        }
      } catch (error: any) {
        setFailedQuery({
          query: userQuery,
          mode,
          mentionedItems: currentMentionedItems,
          timestamp: new Date().toISOString(),
          error: error.message || 'Failed to process query'
        });
        toast.error(error.message || 'Failed to process query');
        setMessages(prev => prev.slice(0, -1));
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // For ASK mode, use real streaming
    setQuery('');
    mentions.clearMentions();
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingText('');
    setStreamingChunks([]);
    
    const userMessage: Message = {
      role: 'user',
      content: userQuery,
      timestamp: new Date().toISOString(),
      model: selectedModel
    };
    setMessages(prev => [...prev, userMessage]);
    
    abortControllerRef.current = new AbortController();
    
    try {
      let sessionId = currentSessionId;
      if (!sessionId) {
        const session = await api.createChatSession({ workspace_id: currentWorkspace?.id });
        sessionId = session.id;
        setCurrentSessionId(sessionId);
      }
      
      await api.addMessageToSession(sessionId, {
        role: 'user',
        content: userQuery,
        model: selectedModel
      });
      
      const allMentionedItems = [...currentMentionedItems];
      if (currentPage && currentPageId) {
        allMentionedItems.push({ type: 'page', id: currentPageId, name: currentPage.title });
      }
      if (parentPage) {
        allMentionedItems.push({ type: 'page', id: parentPage.id, name: `${parentPage.title} (parent)` });
      }
      if (subPages.length > 0) {
        subPages.slice(0, 3).forEach(subPage => {
          allMentionedItems.push({ type: 'page', id: subPage.id, name: `${subPage.title} (sub-page)` });
        });
      }
      
      // Try streaming first, fallback to regular
      const result = await streamQuery(
        userQuery, 
        mode, 
        currentWorkspace?.id, 
        allMentionedItems, 
        sessionId,
        (chunk) => {
          setStreamingText(prev => prev + chunk);
        },
        abortControllerRef.current.signal
      );
      
      // Handle build results
      if (result.build?.success && result.build.created) {
        const createdTypes = Object.keys(result.build.created).filter(k => result.build.created[k]?.length > 0);
        if (createdTypes.length > 0) {
          toast.success(`Created: ${createdTypes.join(', ')}`);
        }
      }
      
      // AUTO-INSERT BLOCKS in Agent mode
      if (result.generated_blocks?.length > 0) {
        if (currentPageId && mode === 'agent') {
          insertBlocks(result.generated_blocks);
          toast.success(`Auto-inserted ${result.generated_blocks.length} block(s)`);
        } else {
          setPendingGeneratedBlocks(result.generated_blocks);
        }
      }
      
      await api.addMessageToSession(sessionId, {
        role: 'assistant',
        content: result.response,
        sources: result.sources || [],
        model: selectedModel
      });
      
      await loadChatSessions();
      
      setIsStreaming(false);
      const assistantMessage: Message = {
        role: 'assistant',
        content: result.response,
        timestamp: new Date().toISOString(),
        sources: result.sources,
        model: selectedModel,
        suggested_actions: result.suggested_actions,
        generated_blocks: currentPageId && mode === 'agent' ? undefined : result.generated_blocks
      };
      setMessages(prev => [...prev, assistantMessage]);
      setStreamingText('');
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.info('Request cancelled');
      } else {
        setFailedQuery({
          query: userQuery,
          mode,
          mentionedItems: currentMentionedItems,
          timestamp: new Date().toISOString(),
          error: error.message || 'Failed to process query'
        });
        toast.error(error.message || 'Failed to process query');
        setMessages(prev => prev.slice(0, -1));
      }
      setIsStreaming(false);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // NEW: Retry failed query
  const retryFailedQuery = useCallback(async () => {
    if (!failedQuery) return;
    
    setIsRetrying(true);
    setQuery(failedQuery.query);
    // Restore mentioned items by clearing and re-adding
    mentions.clearMentions();
    failedQuery.mentionedItems.forEach(item => {
      mentions.mentionedItems.push(item as any);
    });
    setMode(failedQuery.mode);
    setFailedQuery(null);
    
    // Small delay then trigger search
    setTimeout(() => {
      setIsRetrying(false);
      handleSearch();
    }, 100);
  }, [failedQuery, mentions]);

  // NEW: Cancel ongoing request
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingText('');
    }
  }, []);

  // NEW: Stream query with real SSE or chunked response
  const streamQuery = async (
    query: string,
    mode: string,
    workspaceId: string | undefined,
    mentionedItems: Array<{type: string, id: string, name: string}>,
    sessionId: string,
    onChunk: (chunk: string) => void,
    signal: AbortSignal
  ) => {
    // Try enhanced query first (it may support streaming in future)
    // For now, simulate streaming with the response
    const result = await api.queryEnhanced(
      query, mode, workspaceId, mentionedItems, sessionId
    ).catch(async () => {
      return api.query(
        query, mode, 'all', selectedModel, workspaceId, 
        mentionedItems, enabledSources, sessionId
      );
    });
    
    // Simulate streaming for better UX (real streaming would use SSE)
    const text = result.response || '';
    const words = text.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      onChunk((i > 0 ? ' ' : '') + words[i]);
      await new Promise(r => setTimeout(r, 20 + Math.random() * 30));
    }
    
    return result;
  };

  // NEW: Stream agent query
  const streamAgentQuery = async (
    query: string,
    workspaceId: string | undefined,
    mentionedItems: Array<{type: string, id: string, name: string}>,
    sessionId: string | undefined,
    pageId: string | undefined,
    signal: AbortSignal
  ) => {
    // Show thinking status while processing
    const statusMessages = [
      '🧠 Analyzing your request...',
      '🔍 Searching workspace...',
      '📝 Planning actions...',
      '⚡ Generating content...',
      '✨ Finalizing...'
    ];
    
    let statusIndex = 0;
    const statusInterval = setInterval(() => {
      if (statusIndex < statusMessages.length) {
        setStreamingText(statusMessages[statusIndex]);
        statusIndex++;
      }
    }, 800);
    
    try {
      const result = await api.queryAgent(
        query, workspaceId, mentionedItems, sessionId, pageId
      );
      
      clearInterval(statusInterval);
      return result;
    } catch (error) {
      clearInterval(statusInterval);
      throw error;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const handled = mentions.handleKeyDown(e, query, setQuery, handleSearch);
    if (!handled && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'page': return <FileText className="w-3.5 h-3.5" />;
      case 'task': return <ListTodo className="w-3.5 h-3.5" />;
      case 'skill': return <Brain className="w-3.5 h-3.5" />;
      default: return <FileText className="w-3.5 h-3.5" />;
    }
  };


  return (
    <>
      {/* Action Preview Dialog (Human Verification Loop) */}
      <ActionPreviewDialog
        preview={actionPreview.currentPreview}
        isOpen={actionPreview.showPreviewDialog}
        onClose={() => actionPreview.setShowPreviewDialog(false)}
        onConfirm={actionPreview.executeSelectedActions}
        onSkip={actionPreview.skipActions}
        isExecuting={actionPreview.isExecuting}
      />

      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-background hover:bg-accent shadow-lg hover:shadow-xl transition-all flex items-center justify-center group border border-border"
            title="Ask Anything"
          >
            <img src="/axora-logo-light.png" alt="Axora" className="w-7 h-7 group-hover:scale-110 transition-transform dark:hidden" />
            <img src="/axora-logo.png" alt="Axora" className="w-7 h-7 group-hover:scale-110 transition-transform hidden dark:block" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Floating Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[90vw] h-[600px] max-h-[80vh] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary/5 p-3 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-2 text-foreground">
                <img src="/axora-logo-light.png" alt="Axora" className="w-4 h-4 dark:hidden" />
                <img src="/axora-logo.png" alt="Axora" className="w-4 h-4 hidden dark:block" />
                <span className="font-semibold text-sm">Ask Anything</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => navigate('/ask')} className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-secondary rounded" title="Open full page">
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-secondary rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="p-2 border-b border-border bg-muted/30 flex items-center gap-2">
              {/* Mode Selector */}
              <div className="flex gap-1 bg-background rounded-lg p-0.5">
                {searchModes.map((m) => (
                  <button key={m.value} onClick={() => setMode(m.value)}
                    className={cn('px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1',
                      mode === m.value ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                    )}>
                    {m.label}
                    {(m.value === 'build' || m.value === 'plan') && mode === m.value && (
                      <AlertTriangle className="w-3 h-3 text-yellow-500" />
                    )}
                  </button>
                ))}
              </div>

              {/* Model Dropdown */}
              <div className="relative">
                <button onClick={() => { setShowModelDropdown(!showModelDropdown); setShowSourcesDropdown(false); }}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-background border border-border hover:border-primary/30 rounded-lg transition-all">
                  <Brain className="w-3 h-3" />
                  <span className="text-xs max-w-[60px] truncate">
                    {selectedModel === 'gemini-2.5-flash' ? 'Gemini 2.5' :
                     selectedModel === 'meta-llama/llama-3.2-3b-instruct:free' ? 'Llama' :
                     selectedModel === 'nvidia/nemotron-nano-12b-v2-vl:free' ? 'Nemotron' :
                     selectedModel === 'gpt-4o-mini' ? 'GPT-4o Mini' :
                     selectedModel === 'gpt-4o' ? 'GPT-4o' : 'Model'}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                
                {showModelDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-72 bg-card border border-border rounded-lg shadow-xl z-10 overflow-hidden">
                    <div className="p-2 max-h-80 overflow-y-auto">
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Free Models</div>
                      {[
                        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'Latest Gemini - Google Direct API' },
                        { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Llama 3.2 3B', desc: 'Fast, reliable - OpenRouter' },
                        { id: 'nvidia/nemotron-nano-12b-v2-vl:free', name: 'Nemotron Nano 12B', desc: 'Lightweight, fast (OpenRouter)' }
                      ].map(model => (
                        <button key={model.id} onClick={() => { setSelectedModel(model.id); setShowModelDropdown(false); }}
                          className={cn('w-full text-left px-3 py-2 rounded-lg hover:bg-secondary transition-colors', selectedModel === model.id && 'bg-primary/10')}>
                          <div className="text-sm font-medium">{model.name}</div>
                          <div className="text-xs text-muted-foreground">{model.desc}</div>
                        </button>
                      ))}
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">Paid Models</div>
                      {[
                        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', desc: 'Fast and efficient' },
                        { id: 'gpt-4o', name: 'GPT-4o', desc: 'Most capable' }
                      ].map(model => (
                        <button key={model.id} onClick={() => { setSelectedModel(model.id); setShowModelDropdown(false); }}
                          className={cn('w-full text-left px-3 py-2 rounded-lg hover:bg-secondary transition-colors', selectedModel === model.id && 'bg-primary/10')}>
                          <div className="text-sm font-medium">{model.name}</div>
                          <div className="text-xs text-muted-foreground">{model.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sources Dropdown */}
              <div className="relative">
                <button onClick={() => { setShowSourcesDropdown(!showSourcesDropdown); setShowModelDropdown(false); }}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-background border border-border hover:border-primary/30 rounded-lg transition-all">
                  <Search className="w-3 h-3" />
                  <span className="text-xs">{enabledSources.length === availableSources.length ? 'All' : enabledSources.length}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                
                {showSourcesDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-xl z-10 overflow-hidden">
                    <div className="p-2">
                      {availableSources.map((source) => {
                        const Icon = source.icon;
                        const isEnabled = enabledSources.includes(source.id);
                        return (
                          <button key={source.id}
                            onClick={() => isEnabled ? setEnabledSources(enabledSources.filter(s => s !== source.id)) : setEnabledSources([...enabledSources, source.id])}
                            className={cn('w-full text-left px-3 py-2 rounded-lg hover:bg-secondary transition-colors flex items-center gap-2', isEnabled && 'bg-primary/10')}>
                            <Icon className="w-4 h-4" />
                            <span className="text-sm">{source.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* History Button */}
              <button onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-background border border-border hover:border-primary/30 rounded-lg transition-all ml-auto">
                <History className="w-3 h-3" />
              </button>
            </div>


            {/* History Sidebar */}
            <AnimatePresence>
              {showHistory && (
                <motion.div initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
                  className="absolute left-0 top-[120px] bottom-0 w-64 bg-card border-r border-border z-10 flex flex-col">
                  <div className="p-3 border-b border-border">
                    <Button onClick={createNewChat} className="w-full" variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />New Chat
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {chatSessions.map((session) => (
                      <div key={session.id} onClick={() => loadChatSession(session.id)}
                        className={cn("group p-2 rounded-lg cursor-pointer transition-all hover:bg-secondary", currentSessionId === session.id && "bg-primary/10")}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{session.title || 'Untitled Chat'}</p>
                            <p className="text-xs text-muted-foreground">{new Date(session.updated_at).toLocaleDateString()}</p>
                          </div>
                          <button onClick={(e) => deleteChatSession(session.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded">
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* NEW: Learning Context Banner */}
              {weakAreas.length > 0 && messages.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2"
                >
                  <button 
                    onClick={() => setShowLearningContext(!showLearningContext)}
                    className="w-full flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span className="font-medium">Topics that need review</span>
                    </div>
                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showLearningContext && "rotate-180")} />
                  </button>
                  <AnimatePresence>
                    {showLearningContext && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-2 space-y-1 overflow-hidden"
                      >
                        {weakAreas.slice(0, 3).map((area, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setQuery(`Help me understand ${area.topic}`);
                              localInputRef.current?.focus();
                            }}
                            className="w-full text-left px-2 py-1 rounded bg-yellow-500/10 hover:bg-yellow-500/20 text-xs flex items-center justify-between"
                          >
                            <span>{area.topic}</span>
                            <span className="text-yellow-600/60">{Math.round(area.confidence * 100)}% confident</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {messages.length === 0 && !weakAreas.length && (
                <div className="h-full flex items-center justify-center text-center">
                  <div className="space-y-2">
                    <img src="/axora-logo-light.png" alt="Axora" className="w-10 h-10 mx-auto opacity-50 dark:hidden" />
                    <img src="/axora-logo.png" alt="Axora" className="w-10 h-10 mx-auto opacity-50 hidden dark:block" />
                    <p className="text-xs text-muted-foreground px-4">Ask questions across your pages, skills, and knowledge base. Type @ to mention items.</p>
                  </div>
                </div>
              )}
              
              {messages.length === 0 && weakAreas.length > 0 && !showLearningContext && (
                <div className="h-[calc(100%-60px)] flex items-center justify-center text-center">
                  <div className="space-y-2">
                    <img src="/axora-logo-light.png" alt="Axora" className="w-10 h-10 mx-auto opacity-50 dark:hidden" />
                    <img src="/axora-logo.png" alt="Axora" className="w-10 h-10 mx-auto opacity-50 hidden dark:block" />
                    <p className="text-xs text-muted-foreground px-4">Ask questions across your pages, skills, and knowledge base. Type @ to mention items.</p>
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div key={index} className={cn('flex flex-col gap-2', message.role === 'user' ? 'items-end' : 'items-start')}>
                  <div className={cn('max-w-[85%] rounded-xl px-3 py-2',
                    message.role === 'user' ? 'bg-primary/10 text-foreground' : 'bg-muted text-foreground')}>
                    {message.role === 'assistant' ? (
                      <div className="prose prose-xs dark:prose-invert max-w-none"><MarkdownRenderer content={message.content} /></div>
                    ) : (
                      <p className="text-xs whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                  
                  {/* Sources Display */}
                  {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1 max-w-[85%]">
                      {message.sources.slice(0, 5).map((source, i) => {
                        const isTask = source.type === 'task';
                        const isLinkedSource = source.linked_from === 'task';
                        
                        return (
                          <button key={i} 
                            onClick={() => {
                              if (source.type === 'page') navigate(`/pages/${source.id}`);
                              else if (source.type === 'skill') navigate(`/skills`);
                              else if (source.type === 'task') navigate(`/tasks`);
                              else if (source.url) window.open(source.url, '_blank');
                            }}
                            className={cn(
                              "text-xs px-2 py-0.5 rounded transition-colors flex items-center gap-1",
                              isLinkedSource ? "bg-primary/5 text-primary/70 hover:bg-primary/10" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                            )}
                            title={isLinkedSource ? `Linked from task` : undefined}
                          >
                            {source.type === 'web' ? <ExternalLink className="w-3 h-3" /> : 
                             source.type === 'task' ? <ListTodo className="w-3 h-3" /> :
                             source.type === 'skill' ? <Brain className="w-3 h-3" /> :
                             <FileText className="w-3 h-3" />}
                            <span className="truncate max-w-[100px]">{source.title}</span>
                            {isLinkedSource && <span className="text-[10px] opacity-60">→</span>}
                          </button>
                        );
                      })}
                      {message.sources.length > 5 && (
                        <span className="text-xs text-muted-foreground px-2 py-0.5">
                          +{message.sources.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Suggested Actions */}
                  {message.role === 'assistant' && message.suggested_actions && message.suggested_actions.length > 0 && (
                    <div className="flex flex-wrap gap-1 max-w-[85%]">
                      {message.suggested_actions.slice(0, 3).map((action, actionIndex) => {
                        const actionLabel = typeof action === 'string' ? action : action.label;
                        const actionRoute = typeof action === 'object' ? action.route : null;
                        const actionMode = typeof action === 'object' ? action.mode : null;
                        
                        return (
                          <button key={actionIndex}
                            onClick={() => {
                              if (actionRoute) { navigate(actionRoute); setIsOpen(false); return; }
                              if (actionMode) { setMode(actionMode); localInputRef.current?.focus(); return; }
                              setQuery(actionLabel); localInputRef.current?.focus();
                            }}
                            className="text-xs px-2 py-1 rounded-lg bg-primary/5 text-primary hover:bg-primary/10 transition-colors border border-primary/10">
                            {actionLabel}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Insert Blocks Action - Only show when on a page and blocks are available */}
                  {message.role === 'assistant' && message.generated_blocks && message.generated_blocks.length > 0 && currentPageId && (
                    <div className="flex flex-wrap gap-1 max-w-[85%]">
                      <button
                        onClick={() => {
                          insertBlocks(message.generated_blocks!);
                          toast.success(`${message.generated_blocks!.length} block(s) ready to insert. Check your page editor.`);
                          setIsOpen(false);
                        }}
                        className="text-xs px-2 py-1 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors border border-green-500/20 flex items-center gap-1">
                        <PlusSquare className="w-3 h-3" />
                        Insert {message.generated_blocks.length} Block(s) to Page
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {isStreaming && streamingText && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-xl px-3 py-2 bg-muted">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm text-foreground">{streamingText}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* NEW: Error Recovery UI */}
              {failedQuery && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-destructive/10 border border-destructive/20 rounded-lg p-3"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-destructive">Request failed</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{failedQuery.error}</p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={retryFailedQuery}
                          disabled={isRetrying}
                          className="h-7 text-xs"
                        >
                          <RefreshCw className={cn("w-3 h-3 mr-1", isRetrying && "animate-spin")} />
                          Retry
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setFailedQuery(null)}
                          className="h-7 text-xs"
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Action Feedback (after execution) */}
              {actionPreview.showFeedback && actionPreview.executedActions.length > 0 && (
                <ActionFeedback
                  executedActions={actionPreview.executedActions}
                  previewId={actionPreview.currentPreview?.preview_id || ''}
                  onUndo={actionPreview.undoActions}
                  onDismiss={actionPreview.dismissFeedback}
                  isUndoing={actionPreview.isUndoing}
                />
              )}

              <div ref={messagesEndRef} />
            </div>


            {/* Input Area with @ Mentions */}
            <div className="p-3 border-t border-border bg-muted/30">
              {/* Current Page Context Indicator */}
              {currentPage && (
                <div className="mb-2 flex flex-col gap-1 text-xs text-muted-foreground">
                  {parentPage && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      <span>Parent: <span className="font-medium text-foreground">{parentPage.title}</span></span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <FileText className="w-3 h-3" />
                    <span>Current: <span className="font-medium text-foreground">{currentPage.title}</span></span>
                  </div>
                  {subPages.length > 0 && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      <span>{subPages.length} sub-page{subPages.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Mentioned Items Chips */}
              {mentions.mentionedItems.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {mentions.mentionedItems.map((item, index) => (
                    <span key={index} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                      {getTypeIcon(item.type)}
                      <span className="max-w-[80px] truncate">{item.name}</span>
                      <button onClick={() => mentions.removeMentionedItem(index, query, setQuery)} className="hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              <div className="relative">
                <div className="flex gap-2">
                  <input
                    ref={localInputRef}
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything... (@ to mention)"
                    className="flex-1 px-3 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs"
                    disabled={isLoading}
                  />
                  {isLoading ? (
                    <Button onClick={cancelRequest} variant="outline" className="px-4" size="sm" title="Cancel request">
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  ) : (
                    <Button onClick={handleSearch} disabled={!query.trim()}
                      className="bg-primary/10 hover:bg-primary/20 text-primary px-4" size="sm">
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                {/* @ Mentions Dropdown */}
                {mentions.showMentions && (
                  <div ref={mentionsDropdownRef}
                    className="absolute left-0 bottom-full mb-2 w-full bg-card border border-border rounded-xl shadow-xl z-20 max-h-[250px] overflow-hidden">
                    <div className="p-2">
                      <div className="px-2 py-1 mb-1 bg-primary/5 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-semibold text-primary">@ Mention
                            {currentWorkspace && <span className="ml-1 text-xs font-normal text-muted-foreground">in {currentWorkspace.name}</span>}
                          </div>
                        </div>
                        <div className="flex gap-1 mt-1">
                          {[{ type: null, label: 'All' }, { type: 'page' as const, label: 'Pages' }, { type: 'task' as const, label: 'Tasks' }, { type: 'skill' as const, label: 'Skills' }].map(({ type, label }) => (
                            <button key={label} onClick={() => { mentions.setMentionType(type); mentions.setSelectedMentionIndex(0); }}
                              className={cn('px-2 py-0.5 rounded text-xs transition-colors',
                                mentions.mentionType === type ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80')}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {mentions.isLoadingMentions ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="max-h-[150px] overflow-y-auto">
                          {mentions.getFilteredItems().map((group) => (
                            <div key={group.type}>
                              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground capitalize">{group.type}s</div>
                              {group.items.map((item, idx) => {
                                const flatItems = mentions.getAllFilteredItems();
                                const globalIndex = flatItems.findIndex(f => f.item.id === item.id);
                                const isSelected = globalIndex === mentions.selectedMentionIndex;
                                
                                return (
                                  <button key={item.id}
                                    onClick={() => mentions.handleMention(item, group.type as any, query, setQuery)}
                                    className={cn('w-full text-left px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2',
                                      isSelected ? 'bg-primary/10' : 'hover:bg-secondary')}>
                                    {getTypeIcon(group.type)}
                                    <span className="text-xs truncate">{item.title || item.name}</span>
                                  </button>
                                );
                              })}
                              {group.totalCount > group.items.length && (
                                <button onClick={() => mentions.setShowAllItems(true)}
                                  className="w-full text-left px-3 py-1 text-xs text-primary hover:underline">
                                  Show {group.totalCount - group.items.length} more...
                                </button>
                              )}
                            </div>
                          ))}
                          {mentions.getFilteredItems().length === 0 && (
                            <div className="px-3 py-2 text-xs text-muted-foreground text-center">No items found</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
