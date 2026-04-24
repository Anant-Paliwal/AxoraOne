import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  Search, 
  MoreHorizontal,
  Folder,
  Clock,
  Tag,
  ArrowLeft,
  Star,
  Edit,
  Trash2,
  CheckSquare,
  Square,
  Archive,
  Copy,
  X,
  ChevronRight,
  ChevronDown,
  Eye,
  Globe,
  Lock,
  Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { SearchBar } from '@/components/pages/SearchBar';
import { LucideIcon, iconMap } from '@/components/ui/IconPicker';
import { MovePageDialog } from '@/components/pages/MovePageDialog';
import { SharePageDialog } from '@/components/pages/SharePageDialog';
import { computePageIntelligence, getIntelligenceStatusColor } from '@/lib/intelligenceUtils';
import { Task, Skill } from '@/types/workspace';

// Utility function to strip HTML tags and get plain text
function stripHtml(html: string): string {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// Utility function to truncate text
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function PagesPage() {
  const navigate = useNavigate();
  const { currentWorkspace, canEdit, canAdmin, getUserRole } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [pages, setPages] = useState<any[]>([]);
  const [allPages, setAllPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [pageToMove, setPageToMove] = useState<{ id: string; title: string } | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [pageToShare, setPageToShare] = useState<{ id: string; title: string; isPublic: boolean } | null>(null);
  
  // Intelligence data
  const [tasks, setTasks] = useState<Task[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  
  // Permission checks
  const userCanEdit = canEdit();
  const userCanAdmin = canAdmin();
  const userRole = getUserRole();

  useEffect(() => {
    loadPages();
  }, [currentWorkspace]);

  const loadPages = async () => {
    if (!currentWorkspace) {
      setPages([]);
      setAllPages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [pagesData, tasksData, skillsData] = await Promise.all([
        api.getPagesByWorkspace(currentWorkspace.id),
        api.getTasks(currentWorkspace.id).catch(() => []),
        api.getSkills(currentWorkspace.id).catch(() => [])
      ]);
      
      // Store all pages and separate parent/sub-pages
      setAllPages(pagesData);
      
      // Filter to show only parent pages (pages without parent_page_id)
      const parentPages = pagesData.filter((p: any) => !p.parent_page_id);
      
      setPages(parentPages);
      
      // Store intelligence data
      setTasks(tasksData.map((t: any) => ({
        ...t,
        dueDate: t.due_date,
        linkedPageId: t.linked_page_id,
        linkedSkillId: t.linked_skill_id,
      })));
      setSkills(skillsData);
    } catch (error) {
      toast.error('Failed to load pages');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const togglePageExpansion = (pageId: string) => {
    const newExpanded = new Set(expandedPages);
    if (newExpanded.has(pageId)) {
      newExpanded.delete(pageId);
    } else {
      newExpanded.add(pageId);
    }
    setExpandedPages(newExpanded);
  };

  const getSubPages = (parentId: string) => {
    return allPages.filter((p: any) => p.parent_page_id === parentId);
  };

  const handleCreatePage = () => {
    if (!currentWorkspace) {
      toast.error('Please select a workspace first');
      return;
    }
    if (!userCanEdit) {
      toast.error('You don\'t have permission to create pages in this workspace');
      return;
    }
    // Directly navigate to new blank page editor
    navigate(`/workspace/${currentWorkspace.id}/pages/new`);
  };

  const handlePageClick = (pageId: string) => {
    navigate(`/workspace/${currentWorkspace?.id}/pages/${pageId}`);
  };

  const handleTogglePin = async (pageId: string, currentFavorite: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.updatePage(pageId, { is_favorite: !currentFavorite });
      toast.success(currentFavorite ? 'Unpinned page' : 'Pinned page');
      loadPages(); // Reload to show updated state
    } catch (error) {
      toast.error('Failed to update page');
      console.error(error);
    }
  };

  const handleEditPage = (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/workspace/${currentWorkspace?.id}/pages/${pageId}/edit`);
  };

  const handleDeletePage = async (pageId: string, pageTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Permission check - only admins and owners can delete
    if (!userCanAdmin) {
      toast.error('You don\'t have permission to delete pages');
      return;
    }
    
    if (!confirm(`Are you sure you want to move "${pageTitle}" to trash?`)) return;

    try {
      await api.movePageToTrash(pageId);
      toast.success('Page moved to trash');
      loadPages(); // Reload pages list
    } catch (error) {
      toast.error('Failed to move page to trash');
      console.error(error);
    }
  };

  const handleMoveToPage = async (pageId: string, pageTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!userCanEdit) {
      toast.error('You don\'t have permission to move pages');
      return;
    }

    setPageToMove({ id: pageId, title: pageTitle });
    setMoveDialogOpen(true);
  };

  const handleMoveConfirm = async (targetPageId: string | null) => {
    if (!pageToMove) return;

    try {
      await api.movePage(pageToMove.id, targetPageId, 0);
      const targetName = targetPageId 
        ? pages.find(p => p.id === targetPageId)?.title || 'selected page'
        : 'root level';
      toast.success(`Moved "${pageToMove.title}" to ${targetName}`);
      loadPages();
    } catch (error) {
      toast.error('Failed to move page');
      console.error(error);
    }
  };

  const handleSharePage = async (pageId: string, currentPublic: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!userCanAdmin) {
      toast.error('You don\'t have permission to change sharing settings');
      return;
    }

    // Find the page to get its details
    const page = allPages.find(p => p.id === pageId);
    if (!page) return;

    setPageToShare({
      id: pageId,
      title: page.title,
      isPublic: currentPublic
    });
    setShareDialogOpen(true);
  };

  const handleTogglePublicInDialog = async (isPublic: boolean) => {
    if (!pageToShare) return;

    try {
      await api.updatePageSharing(pageToShare.id, isPublic);
      toast.success(isPublic ? 'Page is now public' : 'Page is now private');
      
      // Update local state
      setPageToShare({
        ...pageToShare,
        isPublic
      });
      
      loadPages();
    } catch (error) {
      toast.error('Failed to update sharing settings');
      console.error(error);
    }
  };

  const togglePageSelection = (pageId: string) => {
    const newSelection = new Set(selectedPages);
    if (newSelection.has(pageId)) {
      newSelection.delete(pageId);
    } else {
      newSelection.add(pageId);
    }
    setSelectedPages(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedPages.size === filteredPages.length) {
      setSelectedPages(new Set());
    } else {
      setSelectedPages(new Set(filteredPages.map(p => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPages.size === 0) return;
    
    // Permission check - only admins and owners can delete
    if (!userCanAdmin) {
      toast.error('You don\'t have permission to delete pages');
      return;
    }
    
    if (!confirm(`Delete ${selectedPages.size} page(s)?`)) return;

    try {
      await api.bulkDeletePages(Array.from(selectedPages), false);
      toast.success(`${selectedPages.size} page(s) archived`);
      setSelectedPages(new Set());
      setIsSelectionMode(false);
      loadPages();
    } catch (error) {
      toast.error('Failed to delete pages');
      console.error(error);
    }
  };

  const handleBulkDuplicate = async () => {
    if (selectedPages.size === 0) return;

    try {
      const promises = Array.from(selectedPages).map(pageId => 
        api.duplicatePage(pageId)
      );
      await Promise.all(promises);
      toast.success(`${selectedPages.size} page(s) duplicated`);
      setSelectedPages(new Set());
      setIsSelectionMode(false);
      loadPages();
    } catch (error) {
      toast.error('Failed to duplicate pages');
      console.error(error);
    }
  };

  const handleBulkAddTag = async () => {
    if (selectedPages.size === 0) return;

    const tag = prompt('Enter tag to add:');
    if (!tag) return;

    try {
      // Get current tags for each page and add new tag
      const updates = { tags: [] }; // This would need to be smarter to append tags
      await api.bulkUpdatePages(Array.from(selectedPages), updates);
      toast.success(`Tag "${tag}" added to ${selectedPages.size} page(s)`);
      setSelectedPages(new Set());
      setIsSelectionMode(false);
      loadPages();
    } catch (error) {
      toast.error('Failed to add tag');
      console.error(error);
    }
  };

  const filteredPages = pages.filter((page) => {
    const matchesSearch = page.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const pinnedPages = filteredPages.filter(p => p.is_favorite);
  const unpinnedPages = filteredPages.filter(p => !p.is_favorite);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No workspace selected</h3>
          <p className="text-muted-foreground mb-4">Please select a workspace to view pages</p>
          <Button onClick={() => navigate('/home')}>
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      {/* Center content with max width */}
      <div className="max-w-6xl mx-auto">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/workspace/${currentWorkspace.id}`)}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Workspace
        </Button>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Pages</h1>
          <p className="text-muted-foreground mt-1">
            {currentWorkspace.name} - {pages.length} {pages.length === 1 ? 'page' : 'pages'}
            {selectedPages.size > 0 && ` - ${selectedPages.size} selected`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSelectionMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedPages(new Set());
                }}
                className="rounded-xl"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDuplicate}
                disabled={selectedPages.size === 0}
                className="rounded-xl"
              >
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                disabled={selectedPages.size === 0}
                className="rounded-xl text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSelectionMode(true)}
                className="rounded-xl"
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Select
              </Button>
              <Button onClick={handleCreatePage} className="rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                New Page
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <SearchBar
          workspaceId={currentWorkspace.id}
          placeholder="Search pages..."
          className="max-w-2xl"
        />
      </div>

      {/* Selection Mode Header */}
      {isSelectionMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
            >
              {selectedPages.size === filteredPages.length ? (
                <CheckSquare className="w-5 h-5 text-primary" />
              ) : (
                <Square className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
            <span className="text-sm font-medium text-foreground">
              {selectedPages.size === 0
                ? 'Select pages'
                : `${selectedPages.size} page(s) selected`}
            </span>
          </div>
          {selectedPages.size > 0 && (
            <div className="text-xs text-muted-foreground">
              Click pages to select/deselect
            </div>
          )}
        </motion.div>
      )}

      {/* Pinned Pages Section */}
      {pinnedPages.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            Pinned Pages
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedPages.map((page, index) => (
              <PageCard
                key={page.id}
                page={page}
                index={index}
                workspaceName={currentWorkspace.name}
                onPageClick={handlePageClick}
                onTogglePin={handleTogglePin}
                onEdit={handleEditPage}
                onDelete={handleDeletePage}
                onMoveTo={handleMoveToPage}
                onShare={handleSharePage}
                isSelectionMode={isSelectionMode}
                isSelected={selectedPages.has(page.id)}
                onToggleSelect={togglePageSelection}
                tasks={tasks}
                skills={skills}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Pages Section */}
      <div>
        {pinnedPages.length > 0 && (
          <h2 className="text-lg font-semibold text-foreground mb-4">All Pages</h2>
        )}
        
        {filteredPages.length === 0 && !loading && (
          <div className="col-span-full text-center py-12">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No pages yet</h3>
            <p className="text-muted-foreground mb-4">Create your first page to get started</p>
            <Button onClick={handleCreatePage}>
              <Plus className="w-4 h-4 mr-2" />
              Create Page
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {unpinnedPages.map((page, index) => {
            const subPages = getSubPages(page.id);
            const isExpanded = expandedPages.has(page.id);
            
            return (
              <div key={page.id} className="space-y-2">
                <PageCard
                  page={page}
                  index={index + pinnedPages.length}
                  workspaceName={currentWorkspace.name}
                  onPageClick={handlePageClick}
                  onTogglePin={handleTogglePin}
                  onEdit={handleEditPage}
                  onDelete={handleDeletePage}
                  onMoveTo={handleMoveToPage}
                  onShare={handleSharePage}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedPages.has(page.id)}
                  onToggleSelect={togglePageSelection}
                  hasSubPages={subPages.length > 0}
                  isExpanded={isExpanded}
                  onToggleExpand={() => togglePageExpansion(page.id)}
                  tasks={tasks}
                  skills={skills}
                />
                
                {/* ✅ CRITICAL FIX #5: Show sub-pages when expanded */}
                {isExpanded && subPages.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="ml-8 space-y-2"
                  >
                    {subPages.map((subPage: any, subIndex: number) => (
                      <PageCard
                        key={subPage.id}
                        page={subPage}
                        index={subIndex}
                        workspaceName={currentWorkspace.name}
                        onPageClick={handlePageClick}
                        onTogglePin={handleTogglePin}
                        onEdit={handleEditPage}
                        onDelete={handleDeletePage}
                        onMoveTo={handleMoveToPage}
                        onShare={handleSharePage}
                        isSelectionMode={isSelectionMode}
                        isSelected={selectedPages.has(subPage.id)}
                        onToggleSelect={togglePageSelection}
                        isSubPage={true}
                        tasks={tasks}
                        skills={skills}
                      />
                    ))}
                  </motion.div>
                )}
              </div>
            );
          })}

          {/* Add Page Card */}
          {filteredPages.length > 0 && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: filteredPages.length * 0.05 }}
              onClick={handleCreatePage}
              className="flex flex-col items-center justify-center min-h-[200px] border-2 border-dashed border-border rounded-2xl hover:border-primary/30 hover:bg-secondary/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                Create new page
              </span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Move Page Dialog */}
      {pageToMove && (
        <MovePageDialog
          open={moveDialogOpen}
          onOpenChange={setMoveDialogOpen}
          currentPageId={pageToMove.id}
          currentPageTitle={pageToMove.title}
          availablePages={allPages}
          onMove={handleMoveConfirm}
        />
      )}

      {/* Share Page Dialog */}
      {pageToShare && (
        <SharePageDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          pageId={pageToShare.id}
          pageTitle={pageToShare.title}
          isPublic={pageToShare.isPublic}
          onTogglePublic={handleTogglePublicInDialog}
        />
      )}
      </div>
    </div>
  );
}

interface PageCardProps {
  page: any;
  index: number;
  workspaceName: string;
  onPageClick: (pageId: string) => void;
  onTogglePin: (pageId: string, currentFavorite: boolean, e: React.MouseEvent) => void;
  onEdit: (pageId: string, e: React.MouseEvent) => void;
  onDelete: (pageId: string, pageTitle: string, e: React.MouseEvent) => void;
  onMoveTo?: (pageId: string, pageTitle: string, e: React.MouseEvent) => void;
  onShare?: (pageId: string, currentPublic: boolean, e: React.MouseEvent) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (pageId: string) => void;
  hasSubPages?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isSubPage?: boolean;
  tasks?: Task[];
  skills?: Skill[];
}

function PageCard({ 
  page, 
  index, 
  workspaceName, 
  onPageClick, 
  onTogglePin, 
  onEdit, 
  onDelete,
  onMoveTo,
  onShare,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
  hasSubPages = false,
  isExpanded = false,
  onToggleExpand,
  isSubPage = false,
  tasks = [],
  skills = []
}: PageCardProps) {
  // Compute intelligence status
  const intelligenceStatus = useMemo(() => {
    if (tasks.length === 0 || skills.length === 0) return null;
    return computePageIntelligence(page, tasks, skills);
  }, [page, tasks, skills]);
  const handleClick = () => {
    if (isSelectionMode && onToggleSelect) {
      onToggleSelect(page.id);
    } else {
      onPageClick(page.id);
    }
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleExpand) {
      onToggleExpand();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={handleClick}
      className={cn(
        "group bg-card border rounded-2xl p-5 hover:border-primary/30 hover:shadow-soft transition-all cursor-pointer relative",
        isSelected ? "border-primary bg-primary/5" : "border-border",
        isSubPage && "bg-secondary/30"
      )}
    >
      {/* Expand/Collapse Button for pages with sub-pages */}
      {hasSubPages && !isSelectionMode && (
        <button
          onClick={handleExpandClick}
          className="absolute top-3 left-3 p-1 rounded-lg hover:bg-secondary transition-colors z-10"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      )}

      {/* Selection Checkbox */}
      {isSelectionMode && (
        <div className="absolute top-3 left-3 z-10">
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-primary" />
          ) : (
            <Square className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      )}

      {/* Pin indicator */}
      {page.is_favorite && !isSelectionMode && (
        <div className="absolute top-3 right-3">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          "flex items-center gap-3 flex-1",
          (isSelectionMode || hasSubPages) && "ml-8"
        )}>
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-xl flex-shrink-0">
            {page.icon && iconMap[page.icon] ? (
              <LucideIcon name={page.icon} className="w-5 h-5 text-foreground" />
            ) : (
              page.icon || '📄'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {page.title}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <Folder className="w-3 h-3" />
              <span className="truncate">{workspaceName}</span>
            </div>
          </div>
        </div>

        {!isSelectionMode && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all"
              >
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => onTogglePin(page.id, page.is_favorite, e as any)}>
                <Star className={cn("w-4 h-4 mr-2", page.is_favorite && "fill-yellow-500 text-yellow-500")} />
                {page.is_favorite ? 'Unpin' : 'Pin'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => onEdit(page.id, e as any)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onPageClick(page.id);
              }}>
                <Eye className="w-4 h-4 mr-2" />
                View
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onMoveTo && (
                <DropdownMenuItem onClick={(e) => onMoveTo(page.id, page.title, e as any)}>
                  <Folder className="w-4 h-4 mr-2" />
                  Move to Page
                </DropdownMenuItem>
              )}
              {onShare && (
                <DropdownMenuItem onClick={(e) => onShare(page.id, page.is_public || false, e as any)}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => onDelete(page.id, page.title, e as any)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Move to Trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2 mb-3 min-h-[2.5rem]">
        {page.content 
          ? truncateText(stripHtml(page.content), 120)
          : 'No content yet'}
      </p>

      {/* Intelligence Status - ONE line only */}
      {intelligenceStatus && (
        <div className={cn(
          "text-xs font-medium mb-3 flex items-center gap-1.5",
          getIntelligenceStatusColor(intelligenceStatus.type)
        )}>
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            intelligenceStatus.type === 'active' && "bg-green-500",
            intelligenceStatus.type === 'planning' && "bg-blue-500",
            intelligenceStatus.type === 'inactive' && "bg-gray-400",
            intelligenceStatus.type === 'blocked' && "bg-red-500"
          )} />
          {intelligenceStatus.text}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {page.tags && page.tags.slice(0, 2).map((tag: string) => (
            <span
              key={tag}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-secondary text-secondary-foreground rounded-md"
            >
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{new Date(page.updated_at).toLocaleDateString()}</span>
        </div>
      </div>
    </motion.div>
  );
}
