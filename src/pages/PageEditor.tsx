import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Trash2, 
  Star,
  Tag,
  Plus,
  Check,
  Loader2,
  Undo2,
  Redo2,
  List,
  X,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconPicker, LucideIcon, iconMap } from '@/components/ui/IconPicker';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useBlockInsert } from '@/contexts/BlockInsertContext';
import { DraggableBlockEditor } from '@/components/blocks/DraggableBlocks';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { OutlineView } from '@/components/editor/OutlineView';
import { WritingGoals } from '@/components/editor/WritingGoals';
import { FocusMode } from '@/components/editor/FocusMode';
import { FloatingAskAnything } from '@/components/FloatingAskAnything';
import { PageBreadcrumb } from '@/components/pages/PageBreadcrumb';
import { PageHistory } from '@/components/pages/PageHistory';
import { useWordCount } from '@/hooks/useWordCount';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { BLOCK_TYPES, BlockType } from '@/components/blocks/types';
import '@/components/editor/tiptap.css';


// Convert HTML content to blocks
function convertHTMLToBlocks(html: string): any[] {
  if (!html || html.trim() === '') {
    return [{
      id: `text-${Date.now()}`,
      type: 'text',
      position: 0,
      data: { content: '' }
    }];
  }

  const blocks: any[] = [];
  let position = 0;

  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Extract text content from each top-level element
  const elements = tempDiv.children.length > 0 ? Array.from(tempDiv.children) : [tempDiv];
  
  elements.forEach((element) => {
    const textContent = element.textContent?.trim() || '';
    
    if (textContent) {
      // Check element type and create appropriate block
      const tagName = element.tagName?.toLowerCase();
      
      if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
        blocks.push({
          id: `heading-${Date.now()}-${position}`,
          type: 'heading',
          position: position++,
          data: { 
            content: textContent,
            level: parseInt(tagName.charAt(1))
          }
        });
      } else if (tagName === 'ul' || tagName === 'ol') {
        // Extract list items
        const items = Array.from(element.querySelectorAll('li'));
        items.forEach((li, idx) => {
          const itemText = li.textContent?.trim() || '';
          if (itemText) {
            blocks.push({
              id: `text-${Date.now()}-${position}-${idx}`,
              type: 'text',
              position: position++,
              data: { content: `• ${itemText}` }
            });
          }
        });
      } else if (tagName === 'blockquote') {
        blocks.push({
          id: `quote-${Date.now()}-${position}`,
          type: 'quote',
          position: position++,
          data: { content: textContent }
        });
      } else {
        // Default to text block
        blocks.push({
          id: `text-${Date.now()}-${position}`,
          type: 'text',
          position: position++,
          data: { content: textContent }
        });
      }
    }
  });

  // If no blocks were created, create a default text block
  if (blocks.length === 0) {
    blocks.push({
      id: `text-${Date.now()}`,
      type: 'text',
      position: 0,
      data: { content: tempDiv.textContent?.trim() || '' }
    });
  }

  return blocks;
}

// Get default data for each block type
function getDefaultBlockData(type: BlockType): any {
  const defaultDatabaseData = { 
    currentView: 'table',
    columns: [
      { id: '1', name: 'Name', type: 'text' },
      { id: '2', name: 'Status', type: 'select', config: { options: [
        { value: 'todo', label: 'To Do', color: '#6b7280' },
        { value: 'in_progress', label: 'In Progress', color: '#f59e0b' },
        { value: 'done', label: 'Done', color: '#10b981' },
      ]}},
      { id: '3', name: 'Date', type: 'date' }
    ],
    rows: [],
    groupByColumn: '2'
  };

  switch (type) {
    case 'heading':
      return { content: '', level: 2 };
    case 'checklist':
      return { items: [{ id: '1', text: '', checked: false }] };
    case 'list':
      return { items: [''], style: 'bullet' };
    case 'table':
      return { 
        rows: [['', '', ''], ['', '', '']], 
        hasHeader: true 
      };
    case 'code':
      return { content: '', language: 'javascript' };
    case 'callout':
      return { content: '', type: 'info' };
    case 'quote':
      return { content: '' };
    case 'toggle':
      return { title: '', content: '' };
    case 'database':
    case 'database_table':
      return { ...defaultDatabaseData, currentView: 'table' };
    case 'database_board':
      return { ...defaultDatabaseData, currentView: 'board' };
    case 'image':
      return { url: '', alt: '', width: 100 };
    case 'video':
      return { url: '', width: 100 };
    case 'embed':
      return { url: '', height: 400 };
    case 'file':
      return { url: '', name: '', size: 0 };
    default:
      return { content: '' };
  }
}

// Auto-save hook
function useAutoSave(callback: () => Promise<void>, delay: number = 30000) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const trigger = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await callback();
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsSaving(false);
      }
    }, delay);
  }, [callback, delay]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  useEffect(() => {
    return () => cancel();
  }, [cancel]);

  return { trigger, cancel, isSaving, lastSaved };
}

export function PageEditor() {
  const { pageId, workspaceId } = useParams();
  const [searchParams] = useSearchParams();
  const parentIdFromUrl = searchParams.get('parent');
  const navigate = useNavigate();
  const { currentWorkspace, canEdit, canAdmin, getUserRole } = useWorkspace();
  const { pendingBlocks, clearPendingBlocks } = useBlockInsert();
  const [currentPageId, setCurrentPageId] = useState<string | null>(pageId !== 'new' ? pageId || null : null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [icon, setIcon] = useState('📄');
  const [tags, setTags] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, setSaving] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [subPages, setSubPages] = useState<any[]>([]);
  const [allPages, setAllPages] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([
    // Default text block on new pages
    {
      id: 'default-text-block',
      type: 'text',
      position: 0,
      data: { content: '' }
    }
  ]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [parentPageData, setParentPageData] = useState<any>(null);
  const [parentPageId, setParentPageId] = useState<string | null>(parentIdFromUrl);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  
  // Permission checks
  const userCanEdit = canEdit();
  const userCanAdmin = canAdmin();
  
  // New features state
  const [showOutline, setShowOutline] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  
  // Word count and stats
  const wordStats = useWordCount(content);
  
  // Undo/Redo for content
  const contentHistory = useUndoRedo(content);

  // Auto-save functionality
  const autoSaveCallback = useCallback(async () => {
    // Only autosave existing pages (not new pages)
    if (!currentPageId || !hasUnsavedChanges) return;
    
    // Don't autosave if title is empty
    if (!title.trim()) return;
    
    try {
      await api.updatePage(currentPageId, { 
        title, 
        content, 
        icon, 
        tags, 
        is_favorite: isFavorite,
        blocks
      });
      setHasUnsavedChanges(false);
      console.log('Auto-saved successfully');
    } catch (error) {
      console.error('Auto-save failed:', error);
      toast.error('Auto-save failed');
    }
  }, [currentPageId, title, content, icon, tags, isFavorite, blocks, hasUnsavedChanges]);

  const { trigger: triggerAutoSave, isSaving: isAutoSaving, lastSaved } = useAutoSave(autoSaveCallback, 30000);

  useEffect(() => {
    if (pageId && pageId !== 'new') {
      loadPage();
      loadSubPages();
    } else {
      setActiveTabId('new'); // For new pages
    }
  }, [pageId]);

  // Listen for pending blocks from Ask Anything and insert them
  useEffect(() => {
    if (pendingBlocks && pendingBlocks.length > 0) {
      // Calculate new positions starting from the end of existing blocks
      const startPosition = blocks.length;
      const newBlocks = pendingBlocks.map((block, index) => ({
        ...block,
        id: `${block.type}-${Date.now()}-${index}`, // Ensure unique IDs
        position: startPosition + index
      }));
      
      // Append new blocks to existing blocks
      setBlocks(prevBlocks => [...prevBlocks, ...newBlocks]);
      setHasUnsavedChanges(true);
      
      // Clear pending blocks after insertion
      clearPendingBlocks();
      
      toast.success(`Inserted ${newBlocks.length} block(s) from Ask Anything`);
    }
  }, [pendingBlocks, clearPendingBlocks]);

  const loadSubPages = async () => {
    if (!pageId || pageId === 'new') return;
    
    try {
      // Get the parent page ID (either current page or its parent)
      const currentPage = await api.getPage(pageId);
      const parentId = currentPage.parent_page_id || pageId;
      
      const subPagesData = await api.getSubPages(parentId);
      setSubPages(subPagesData);
    } catch (error) {
      console.error('Failed to load sub-pages:', error);
    }
  };

  // Track unsaved changes and trigger auto-save (only for existing pages)
  useEffect(() => {
    if (currentPageId) {
      setHasUnsavedChanges(true);
      triggerAutoSave();
    }
  }, [title, content, icon, tags, isFavorite, blocks, currentPageId, triggerAutoSave]);
  
  // Update content history when content changes
  useEffect(() => {
    if (content !== contentHistory.state) {
      contentHistory.set(content);
    }
  }, [content]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Cmd/Ctrl + Z to undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (contentHistory.canUndo) {
          setContent(contentHistory.state);
          contentHistory.undo();
        }
      }
      // Cmd/Ctrl + Shift + Z to redo
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        if (contentHistory.canRedo) {
          contentHistory.redo();
          setContent(contentHistory.state);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [contentHistory]);

  const loadPage = async () => {
    if (!pageId || pageId === 'new') return;
    
    setLoading(true);
    try {
      const [page, allPagesData] = await Promise.all([
        api.getPage(pageId),
        currentWorkspace ? api.getPagesByWorkspace(currentWorkspace.id) : Promise.resolve([])
      ]);
      
      setAllPages(allPagesData);
      
      // ✅ CRITICAL FIX #4: Check page type and redirect if needed
      if (page.page_type === 'database') {
        // Redirect to dedicated database view
        const workspace = currentWorkspace || (workspaceId ? { id: workspaceId } : null);
        if (workspace) {
          navigate(`/workspace/${workspace.id}/database/${pageId}`);
        } else {
          navigate(`/database/${pageId}`);
        }
        return;
      }
      
      // Check if this is a sub-page
      if (page.parent_page_id) {
        // Load parent page data
        const parent = await api.getPage(page.parent_page_id);
        setParentPageData(parent);
        setParentPageId(page.parent_page_id);
        setActiveTabId(page.id); // Set current sub-page as active
      } else {
        // This is a parent page
        setParentPageData(page);
        setParentPageId(null);
        setActiveTabId(page.id);
      }
      
      setTitle(page.title);
      setContent(page.content || '');
      setIcon(page.icon || '📄');
      setTags(page.tags || []);
      setIsFavorite(page.is_favorite || false);
      setCoverImage(page.cover_image || null);
      
      // If page has no blocks, convert HTML content to blocks
      if (!page.blocks || page.blocks.length === 0) {
        const convertedBlocks = convertHTMLToBlocks(page.content || '');
        setBlocks(convertedBlocks);
      } else {
        setBlocks(page.blocks);
      }
      
      setHasUnsavedChanges(false);
    } catch (error) {
      toast.error('Failed to load page');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    console.log('Save clicked', { title, pageId, currentPageId, workspaceId, currentWorkspace });
    
    // Permission check
    if (!userCanEdit) {
      toast.error('You don\'t have permission to save pages in this workspace');
      return;
    }
    
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    const workspace = currentWorkspace || (workspaceId ? { id: workspaceId } : null);
    console.log('Workspace for save:', workspace);
    
    if (!workspace) {
      toast.error('No workspace selected');
      return;
    }

    setSaving(true);
    try {
      if (!currentPageId) {
        // Create new page (pageId is 'new' or undefined)
        console.log('Creating new page with:', { title, content, icon, tags, blocks, workspace_id: workspace.id, parent_page_id: parentPageId, cover_image: coverImage });
        const newPage = await api.createPage({ 
          title, 
          content, 
          icon, 
          tags,
          blocks,
          workspace_id: workspace.id,
          parent_page_id: parentPageId || undefined,
          cover_image: coverImage || undefined
        });
        console.log('Page created:', newPage);
        setCurrentPageId(newPage.id);
        toast.success('Page created!');
        setHasUnsavedChanges(false);
        // Navigate back to pages list to see the new page
        setTimeout(() => {
          navigate(`/workspace/${workspace.id}/pages`);
        }, 500);
      } else {
        // Update existing page
        console.log('Updating page:', currentPageId);
        await api.updatePage(currentPageId, { 
          title, 
          content, 
          icon, 
          tags, 
          is_favorite: isFavorite,
          blocks,
          cover_image: coverImage
        });
        toast.success('Page saved!');
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentPageId) return;
    
    // Permission check - only admins and owners can delete
    if (!userCanAdmin) {
      toast.error('You don\'t have permission to delete pages');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this page?')) return;

    try {
      await api.deletePage(currentPageId);
      toast.success('Page deleted');
      const workspace = currentWorkspace || (workspaceId ? { id: workspaceId } : null);
      if (workspace) {
        navigate(`/workspace/${workspace.id}/pages`);
      } else {
        navigate('/pages');
      }
    } catch (error) {
      toast.error('Failed to delete page');
      console.error(error);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleBack = () => {
    const workspace = currentWorkspace || (workspaceId ? { id: workspaceId } : null);
    if (workspace) {
      navigate(`/workspace/${workspace.id}/pages`);
    } else {
      navigate('/pages');
    }
  };

  const handleCreateSubPage = async () => {
    if (!currentPageId) {
      toast.error('Please save the page first');
      return;
    }
    
    // Permission check
    if (!userCanEdit) {
      toast.error('You don\'t have permission to create pages');
      return;
    }

    const workspace = currentWorkspace || (workspaceId ? { id: workspaceId } : null);
    if (!workspace) {
      toast.error('No workspace selected');
      return;
    }

    try {
      const newSubPage = await api.createPage({
        title: `Sub-page ${subPages.length + 1}`,
        content: '',
        icon: '📄',
        workspace_id: workspace.id,
        parent_page_id: currentPageId,
        page_order: subPages.length
      });
      
      setSubPages([...subPages, newSubPage]);
      toast.success('Sub-page created');
      
      // Navigate to edit the new sub-page
      navigate(`/workspace/${workspace.id}/pages/${newSubPage.id}/edit`);
    } catch (error) {
      toast.error('Failed to create sub-page');
      console.error(error);
    }
  };

  const handleDeleteSubPage = async (subPageId: string) => {
    // Permission check - only admins and owners can delete
    if (!userCanAdmin) {
      toast.error('You don\'t have permission to delete pages');
      return;
    }
    
    if (!confirm('Delete this sub-page?')) return;
    
    try {
      await api.deletePage(subPageId);
      setSubPages(subPages.filter(sp => sp.id !== subPageId));
      toast.success('Sub-page deleted');
    } catch (error) {
      toast.error('Failed to delete sub-page');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header with Browser-Style Tabs */}
        <div className="bg-background">
          {/* Breadcrumb Navigation */}
          {currentPageId && (
            <div className="px-6 pt-3">
              <PageBreadcrumb 
                pageId={currentPageId} 
                workspaceId={workspaceId || currentWorkspace?.id}
              />
            </div>
          )}
          
          {/* Top Bar - Actions */}
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="rounded-lg"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isFavorite ? "text-yellow-500" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Star className={cn("w-5 h-5", isFavorite && "fill-current")} />
              </button>
              
              {/* Auto-save indicator */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {isAutoSaving && (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Saving...</span>
                  </>
                )}
                {!isAutoSaving && lastSaved && currentPageId && (
                  <>
                    <Check className="w-3 h-3 text-green-500" />
                    <span>Saved {new Date(lastSaved).toLocaleTimeString()}</span>
                  </>
                )}
                {!isAutoSaving && !lastSaved && hasUnsavedChanges && currentPageId && (
                  <span>Unsaved changes</span>
                )}
                {!currentPageId && (
                  <span className="text-amber-600">New page - Save to enable autosave</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Undo/Redo */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (contentHistory.canUndo) {
                    contentHistory.undo();
                    const previousContent = contentHistory.state;
                    setContent(previousContent);
                    // Also trigger a re-render of blocks if needed
                    setHasUnsavedChanges(true);
                  }
                }}
                disabled={!contentHistory.canUndo}
                title="Undo (Ctrl+Z)"
                className="rounded-lg"
              >
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (contentHistory.canRedo) {
                    contentHistory.redo();
                    const nextContent = contentHistory.state;
                    setContent(nextContent);
                    // Also trigger a re-render of blocks if needed
                    setHasUnsavedChanges(true);
                  }
                }}
                disabled={!contentHistory.canRedo}
                title="Redo (Ctrl+Shift+Z)"
                className="rounded-lg"
              >
                <Redo2 className="w-4 h-4" />
              </Button>
              
              {/* Save button - Show for new pages only */}
              {!currentPageId && (
                <Button
                  onClick={handleSave}
                  variant="default"
                  size="sm"
                  className="rounded-lg"
                >
                  Create Page
                </Button>
              )}
              
              {/* Three-dot menu for existing pages */}
              {currentPageId && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="rounded-lg">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleSave}>
                      <Check className="w-4 h-4 mr-2" />
                      Save Now
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowOutline(!showOutline)}>
                      <List className="w-4 h-4 mr-2" />
                      {showOutline ? 'Hide Outline' : 'Show Outline'}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onSelect={(e) => e.preventDefault()}
                      className="p-0"
                    >
                      <PageHistory 
                        pageId={currentPageId} 
                        onRestore={() => {
                          loadPage();
                          toast.success('Page restored from history');
                        }}
                      />
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Page
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Dot Navigation */}
          {parentPageData && (
            <div className="px-6 py-3 flex items-center gap-3">
              {/* Parent Page Dot */}
              <button
                onClick={() => {
                  const workspace = currentWorkspace || (workspaceId ? { id: workspaceId } : null);
                  if (workspace) {
                    navigate(`/workspace/${workspace.id}/pages/${parentPageData.id}/edit`);
                  }
                }}
                className="group relative flex flex-col items-center gap-1"
                title={parentPageData.title}
              >
                <div
                  className={cn(
                    "w-3 h-3 rounded-full transition-all",
                    activeTabId === parentPageData.id
                      ? "bg-primary shadow-lg shadow-primary/50 scale-125"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50 hover:scale-110"
                  )}
                />
                <span className={cn(
                  "text-[10px] font-medium transition-colors max-w-[80px] truncate",
                  activeTabId === parentPageData.id ? "text-primary" : "text-muted-foreground"
                )}>
                  {parentPageData.title}
                </span>
              </button>

              {/* Subpage Dots */}
              {subPages.map((subPage) => (
                <button
                  key={subPage.id}
                  onClick={() => {
                    const workspace = currentWorkspace || (workspaceId ? { id: workspaceId } : null);
                    if (workspace) {
                      navigate(`/workspace/${workspace.id}/pages/${subPage.id}/edit`);
                    }
                  }}
                  className="group relative flex flex-col items-center gap-1"
                  title={subPage.title}
                >
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full transition-all",
                      activeTabId === subPage.id
                        ? "bg-primary shadow-lg shadow-primary/50 scale-125"
                        : "bg-muted-foreground/30 hover:bg-muted-foreground/50 hover:scale-110"
                    )}
                  />
                  <span className={cn(
                    "text-[10px] font-medium transition-colors max-w-[80px] truncate",
                    activeTabId === subPage.id ? "text-primary" : "text-muted-foreground"
                  )}>
                    {subPage.title}
                  </span>
                </button>
              ))}

              {/* Add Sub-Page Button */}
              {currentPageId && userCanEdit && (
                <button
                  onClick={handleCreateSubPage}
                  className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all"
                  title="Add subpage"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Editor - Scrollable with Sidebar */}
        <div className="flex-1 flex">
          {/* Main Editor Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto px-8 py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Cover Image */}
              {coverImage ? (
                <div className="relative -mx-8 -mt-12 mb-8 group">
                  <img 
                    src={coverImage} 
                    alt="Cover" 
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowCoverPicker(true)}
                        className="px-3 py-1.5 bg-white/90 text-black rounded-lg text-sm font-medium hover:bg-white"
                      >
                        Change cover
                      </button>
                      <button
                        onClick={() => setCoverImage(null)}
                        className="px-3 py-1.5 bg-white/90 text-black rounded-lg text-sm font-medium hover:bg-white"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCoverPicker(true)}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 -mt-4 mb-4 opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
                >
                  <span>🖼️</span> Add cover
                </button>
              )}

              {/* Cover Image Picker Modal */}
              {showCoverPicker && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowCoverPicker(false)}>
                  <div className="bg-card rounded-xl p-6 w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-semibold mb-4">Add Cover Image</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Image URL</label>
                        <input
                          type="url"
                          placeholder="https://example.com/image.jpg"
                          className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const url = (e.target as HTMLInputElement).value;
                              if (url) {
                                setCoverImage(url);
                                setShowCoverPicker(false);
                              }
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">Or choose a gradient</label>
                        <div className="grid grid-cols-5 gap-2">
                          {[
                            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                            'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                            'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
                            'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
                            'linear-gradient(135deg, #cd9cf2 0%, #f6f3ff 100%)',
                            'linear-gradient(135deg, #37ecba 0%, #72afd3 100%)',
                          ].map((gradient, i) => (
                            <button
                              key={i}
                              className="w-full h-12 rounded-lg border-2 border-transparent hover:border-primary transition-colors"
                              style={{ background: gradient }}
                              onClick={() => {
                                setCoverImage(gradient);
                                setShowCoverPicker(false);
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={() => setShowCoverPicker(false)}
                          className="px-4 py-2 text-sm rounded-lg hover:bg-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Icon & Title - Notion Style */}
              <div className="flex items-start gap-4 mb-2">
                <IconPicker
                  value={icon}
                  onChange={(iconName) => setIcon(iconName)}
                  size="lg"
                />
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Untitled"
                  className="flex-1 text-5xl font-display font-bold bg-transparent outline-none text-foreground placeholder:text-muted-foreground/40 py-2"
                />
              </div>

              {/* Tags - Cleaner Design */}
              <div className="flex flex-wrap gap-2 items-center -mt-2">
                {tags.length > 0 && <Tag className="w-3.5 h-3.5 text-muted-foreground" />}
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-secondary/60 text-secondary-foreground rounded-md hover:bg-secondary transition-colors"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-destructive transition-colors text-muted-foreground hover:text-destructive"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTag()}
                  placeholder={tags.length === 0 ? "Add tags..." : ""}
                  className="px-2.5 py-1 text-xs bg-transparent text-muted-foreground placeholder:text-muted-foreground/40 outline-none min-w-[80px]"
                />
              </div>

              {/* Word Count & Stats - Minimal */}
              <div className="flex items-center gap-6 text-xs text-muted-foreground/60 pb-4">
                <div className="flex-1" />
                
                {/* Add Block Dropdown - ... icon */}
                {userCanEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground h-7 w-7 p-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 max-h-96 overflow-y-auto">
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Basic Blocks</div>
                      {BLOCK_TYPES.filter(b => b.category === 'basic').map(blockType => (
                        <DropdownMenuItem key={blockType.type} onClick={() => {
                          const newBlock = {
                            id: Date.now().toString(),
                            type: blockType.type as BlockType,
                            data: getDefaultBlockData(blockType.type as BlockType),
                            position: blocks.length
                          };
                          setBlocks([...blocks, newBlock]);
                        }}>
                          <blockType.icon className="w-4 h-4 mr-2" />
                          <div className="flex flex-col">
                            <span>{blockType.label}</span>
                            <span className="text-xs text-muted-foreground">{blockType.description}</span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Database Views</div>
                      {BLOCK_TYPES.filter(b => b.category === 'database').map(blockType => (
                        <DropdownMenuItem key={blockType.type} onClick={() => {
                          const newBlock = {
                            id: Date.now().toString(),
                            type: blockType.type as BlockType,
                            data: getDefaultBlockData(blockType.type as BlockType),
                            position: blocks.length
                          };
                          setBlocks([...blocks, newBlock]);
                        }}>
                          <blockType.icon className="w-4 h-4 mr-2" />
                          <div className="flex flex-col">
                            <span>{blockType.label}</span>
                            <span className="text-xs text-muted-foreground">{blockType.description}</span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Advanced</div>
                      {BLOCK_TYPES.filter(b => b.category === 'advanced').map(blockType => (
                        <DropdownMenuItem key={blockType.type} onClick={() => {
                          const newBlock = {
                            id: Date.now().toString(),
                            type: blockType.type as BlockType,
                            data: getDefaultBlockData(blockType.type as BlockType),
                            position: blocks.length
                          };
                          setBlocks([...blocks, newBlock]);
                        }}>
                          <blockType.icon className="w-4 h-4 mr-2" />
                          <div className="flex flex-col">
                            <span>{blockType.label}</span>
                            <span className="text-xs text-muted-foreground">{blockType.description}</span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Media</div>
                      {BLOCK_TYPES.filter(b => b.category === 'media').map(blockType => (
                        <DropdownMenuItem key={blockType.type} onClick={() => {
                          const newBlock = {
                            id: Date.now().toString(),
                            type: blockType.type as BlockType,
                            data: getDefaultBlockData(blockType.type as BlockType),
                            position: blocks.length
                          };
                          setBlocks([...blocks, newBlock]);
                        }}>
                          <blockType.icon className="w-4 h-4 mr-2" />
                          <div className="flex flex-col">
                            <span>{blockType.label}</span>
                            <span className="text-xs text-muted-foreground">{blockType.description}</span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Content Editor - Block-Only (No Text Editor) */}
              <FocusMode isActive={focusMode} onToggle={() => setFocusMode(!focusMode)}>
                <div className="relative min-h-[60vh]">
                  {/* Only Blocks - No separate text editor */}
                  <DraggableBlockEditor
                    blocks={blocks}
                    onChange={setBlocks}
                    editable={userCanEdit}
                  />
                </div>
              </FocusMode>
            </motion.div>
          </div>
        </div>

        {/* Right Sidebar - Outline View */}
        {showOutline && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l border-border bg-card/50 overflow-y-auto flex-shrink-0"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Outline</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowOutline(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <OutlineView
                content={content}
                onNavigate={(id) => {
                  const element = document.getElementById(id);
                  element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              />
            </div>
          </motion.div>
        )}
        </div>
      </div>

      {/* Floating Ask Anything */}
      <FloatingAskAnything />
    </div>
  );
}
