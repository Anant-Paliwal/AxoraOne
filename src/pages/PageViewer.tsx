import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Edit,
  Star,
  Tag,
  Clock,
  MoreHorizontal,
  Trash2,
  Plus,
  FileText,
  BookOpen,
  Eye,
  EyeOff,
  Download,
  Printer,
  Link2,
  BarChart3,
  List,
  Target,
  Sparkles,
  X,
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { TiptapEditor } from '@/components/editor/TiptapEditor';
import { ContentViewer } from '@/components/viewer/ContentViewer';
import { useTableOfContents } from '@/hooks/useTableOfContents';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { LucideIcon, iconMap } from '@/components/ui/IconPicker';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { PageLinks } from '@/components/pages/PageLinks';
import { Backlinks } from '@/components/pages/Backlinks';
import { RelatedPages } from '@/components/pages/RelatedPages';
import { PageBreadcrumb } from '@/components/pages/PageBreadcrumb';
import { SharePageDialog } from '@/components/pages/SharePageDialog';
import '@/components/editor/tiptap.css';
import '@/components/viewer/content-viewer.css';

export function PageViewer() {
  const { pageId, workspaceId } = useParams();
  const navigate = useNavigate();
  const { currentWorkspace, canEdit, canAdmin, getUserRole } = useWorkspace();
  const [page, setPage] = useState<any>(null);
  const [subPages, setSubPages] = useState<any[]>([]);
  const [allPages, setAllPages] = useState<any[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReadingMode, setIsReadingMode] = useState(false);
  const [showToc, setShowToc] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(false); // Closed by default
  const [analytics, setAnalytics] = useState<any>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [linkedSkills, setLinkedSkills] = useState<any[]>([]);
  const [skillSuggestions, setSkillSuggestions] = useState<any[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [pageToShare, setPageToShare] = useState<{ id: string; title: string; isPublic: boolean } | null>(null);
  
  // Permission checks
  const userCanEdit = canEdit();
  const userCanAdmin = canAdmin();
  const userRole = getUserRole();
  
  const { toc, activeId } = useTableOfContents(contentRef);
  const readingProgress = useReadingProgress(contentRef);

  useEffect(() => {
    if (pageId) {
      loadPageAndSubPages();
      loadAnalytics();
      loadLinkedSkills();
      loadSkillSuggestions();
      // Track page view
      api.trackPageView(pageId).catch(err => 
        console.error('Failed to track page view:', err)
      );
    }
  }, [pageId]);

  const loadPageAndSubPages = async () => {
    if (!pageId) return;

    setLoading(true);
    try {
      const [pageData, subPagesData, allPagesData] = await Promise.all([
        api.getPage(pageId),
        api.getSubPages(pageId),
        currentWorkspace ? api.getPagesByWorkspace(currentWorkspace.id) : Promise.resolve([])
      ]);

      // ✅ CRITICAL FIX #3 & #4: Check page type and redirect if needed
      if (pageData.page_type === 'database') {
        // Redirect to dedicated database view
        const workspace = currentWorkspace || (workspaceId ? { id: workspaceId } : null);
        if (workspace) {
          navigate(`/workspace/${workspace.id}/database/${pageId}`);
        } else {
          navigate(`/database/${pageId}`);
        }
        return;
      }

      setPage(pageData);
      setSubPages(subPagesData);
      setAllPages(allPagesData);
      // ✅ CRITICAL FIX #5: Set activeTabId to current page
      setActiveTabId(pageData.id);
    } catch (error) {
      toast.error('Failed to load page');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    if (!pageId) return;
    try {
      const data = await api.getPageAnalytics(pageId);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const loadLinkedSkills = async () => {
    if (!pageId || !currentWorkspace?.id) return;
    try {
      // Load skills linked via skill_evidence table
      const response = await fetch(`/api/skills?workspace_id=${currentWorkspace.id}`);
      const allSkills = await response.json();
      
      // Filter skills that have evidence linking to this page
      const linkedSkillIds = new Set<string>();
      for (const skill of allSkills) {
        const evidenceResponse = await fetch(`/api/skills/${skill.id}/evidence`);
        const evidence = await evidenceResponse.json();
        if (evidence.some((e: any) => e.source_id === pageId && e.source_type === 'page')) {
          linkedSkillIds.add(skill.id);
        }
      }
      
      const linked = allSkills.filter((s: any) => linkedSkillIds.has(s.id));
      setLinkedSkills(linked);
    } catch (error) {
      console.error('Failed to load linked skills:', error);
    }
  };

  const loadSkillSuggestions = async () => {
    if (!pageId || !currentWorkspace?.id) return;
    try {
      // Load AI-proposed skill links from proposed_actions table
      const response = await fetch(`/api/intelligence/proposed-actions?workspace_id=${currentWorkspace.id}&target_id=${pageId}&action_type=link_page_to_skill`);
      const actions = await response.json();
      
      // Extract skill suggestions from proposed actions
      const suggestions = actions
        .filter((a: any) => !a.executed && !a.dismissed)
        .map((a: any) => ({
          skillId: a.payload.skill_id,
          skillName: a.payload.skill_name,
          confidence: a.payload.confidence,
          reason: a.reason,
          actionId: a.id
        }));
      
      setSkillSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to load skill suggestions:', error);
    }
  };

  const acceptSkillSuggestion = async (suggestion: any) => {
    try {
      // Create skill evidence link
      await api.addSkillEvidence(suggestion.skillId, {
        page_id: pageId!,
        evidence_type: 'page_content',
        notes: `Linked from page: ${page?.title || 'Untitled'}`
      });
      
      // Remove the suggestion from the list
      setSkillSuggestions(prev => prev.filter(s => s.skillId !== suggestion.skillId));
      
      // Reload linked skills
      await loadLinkedSkills();
      
      toast.success(`Linked to ${suggestion.skillName}`);
    } catch (error) {
      toast.error('Failed to link skill');
      console.error(error);
    }
  };

  const dismissSkillSuggestion = async (suggestion: any) => {
    try {
      await fetch(`/api/intelligence/proposed-actions/${suggestion.actionId}/dismiss`, {
        method: 'POST'
      });
      
      setSkillSuggestions(skillSuggestions.filter(s => s.actionId !== suggestion.actionId));
      toast.success('Suggestion dismissed');
    } catch (error) {
      toast.error('Failed to dismiss suggestion');
    }
  };

  const handleCreateSubPage = async () => {
    if (!page || !currentWorkspace) return;
    
    // Permission check
    if (!userCanEdit) {
      toast.error('You don\'t have permission to create pages');
      return;
    }

    try {
      const newSubPage = await api.createPage({
        title: `Sub-page ${subPages.length + 1}`,
        content: '',
        icon: '📄',
        workspace_id: currentWorkspace.id,
        parent_page_id: page.id,
        page_order: subPages.length
      });

      setSubPages([...subPages, newSubPage]);
      toast.success('Sub-page created');
    } catch (error) {
      toast.error('Failed to create sub-page');
      console.error(error);
    }
  };

  const handleDeleteSubPage = async (subPageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Permission check - only admins and owners can delete
    if (!userCanAdmin) {
      toast.error('You don\'t have permission to delete pages');
      return;
    }
    
    if (!confirm('Delete this sub-page?')) return;

    try {
      await api.deletePage(subPageId);
      const updatedSubPages = subPages.filter(sp => sp.id !== subPageId);
      setSubPages(updatedSubPages);

      if (activeTabId === subPageId) {
        setActiveTabId(page.id);
      }

      toast.success('Sub-page deleted');
    } catch (error) {
      toast.error('Failed to delete sub-page');
      console.error(error);
    }
  };

  const handleEdit = () => {
    const workspace = currentWorkspace || (workspaceId ? { id: workspaceId } : null);
    if (workspace) {
      navigate(`/workspace/${workspace.id}/pages/${activeTabId}/edit`);
    }
  };

  const handleToggleFavorite = async () => {
    if (!page) return;
    try {
      await api.updatePage(page.id, { is_favorite: !page.is_favorite });
      setPage({ ...page, is_favorite: !page.is_favorite });
      toast.success(page.is_favorite ? 'Unpinned page' : 'Pinned page');
    } catch (error) {
      toast.error('Failed to update page');
    }
  };

  const handleDelete = async () => {
    if (!page) return;
    
    // Permission check - only admins and owners can delete
    if (!userCanAdmin) {
      toast.error('You don\'t have permission to delete pages');
      return;
    }
    
    if (!confirm(`Delete "${page.title}"?`)) return;

    try {
      await api.deletePage(page.id);
      toast.success('Page deleted');
      const workspace = currentWorkspace || (workspaceId ? { id: workspaceId } : null);
      if (workspace) {
        navigate(`/workspace/${workspace.id}/pages`);
      }
    } catch (error) {
      toast.error('Failed to delete page');
    }
  };

  const handleBack = () => {
    const workspace = currentWorkspace || (workspaceId ? { id: workspaceId } : null);
    if (workspace) {
      navigate(`/workspace/${workspace.id}/pages`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = (format: 'pdf' | 'markdown' | 'html') => {
    if (!page) return;
    
    try {
      if (format === 'markdown') {
        exportAsMarkdown();
      } else if (format === 'pdf') {
        exportAsPDF();
      } else if (format === 'html') {
        exportAsHTML();
      }
    } catch (error) {
      toast.error(`Failed to export as ${format.toUpperCase()}`);
      console.error('Export error:', error);
    }
  };

  const exportAsMarkdown = () => {
    if (!page) return;
    
    let markdown = `# ${page.title}\n\n`;
    
    // Add metadata
    markdown += `> Created: ${new Date(page.created_at).toLocaleDateString()}\n`;
    markdown += `> Updated: ${new Date(page.updated_at).toLocaleDateString()}\n\n`;
    
    // Add tags if present
    if (page.tags && page.tags.length > 0) {
      markdown += `**Tags:** ${page.tags.join(', ')}\n\n`;
    }
    
    markdown += '---\n\n';
    
    // Convert blocks to markdown
    if (page.blocks && page.blocks.length > 0) {
      page.blocks.forEach((block: any) => {
        switch (block.type) {
          case 'heading':
            const level = block.data?.level || 1;
            markdown += `${'#'.repeat(level)} ${block.data?.content || ''}\n\n`;
            break;
          case 'text':
            markdown += `${block.data?.content || ''}\n\n`;
            break;
          case 'quote':
            markdown += `> ${block.data?.content || ''}\n\n`;
            break;
          case 'code':
            const language = block.data?.language || '';
            markdown += `\`\`\`${language}\n${block.data?.content || ''}\n\`\`\`\n\n`;
            break;
          case 'list':
            if (block.data?.items) {
              block.data.items.forEach((item: string) => {
                markdown += `- ${item}\n`;
              });
              markdown += '\n';
            }
            break;
          case 'checkbox':
            const checked = block.data?.checked ? '[x]' : '[ ]';
            markdown += `${checked} ${block.data?.content || ''}\n\n`;
            break;
          case 'divider':
            markdown += '---\n\n';
            break;
          case 'image':
            markdown += `![${block.data?.caption || 'Image'}](${block.data?.url || ''})\n\n`;
            break;
          case 'link':
            markdown += `[${block.data?.text || 'Link'}](${block.data?.url || ''})\n\n`;
            break;
          default:
            if (block.data?.content) {
              markdown += `${block.data.content}\n\n`;
            }
        }
      });
    } else if (page.content) {
      // Fallback to content field
      markdown += page.content;
    }
    
    // Create and download file
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${page.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Exported as Markdown');
  };

  const exportAsPDF = () => {
    if (!page) return;
    
    // Create a printable version
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to export PDF');
      return;
    }
    
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${page.title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
          }
          h1 { font-size: 2.5em; margin-bottom: 0.5em; }
          h2 { font-size: 2em; margin-top: 1em; }
          h3 { font-size: 1.5em; margin-top: 1em; }
          .metadata {
            color: #666;
            font-size: 0.9em;
            margin-bottom: 2em;
            padding-bottom: 1em;
            border-bottom: 1px solid #ddd;
          }
          .tags {
            margin: 1em 0;
          }
          .tag {
            display: inline-block;
            background: #f0f0f0;
            padding: 4px 12px;
            border-radius: 12px;
            margin-right: 8px;
            font-size: 0.85em;
          }
          code {
            background: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
          }
          pre {
            background: #f5f5f5;
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
          }
          blockquote {
            border-left: 4px solid #ddd;
            padding-left: 16px;
            margin-left: 0;
            color: #666;
          }
          img {
            max-width: 100%;
            height: auto;
          }
          @media print {
            body { margin: 0; padding: 20px; }
          }
        </style>
      </head>
      <body>
        <h1>${page.title}</h1>
        <div class="metadata">
          <div>Created: ${new Date(page.created_at).toLocaleDateString()}</div>
          <div>Updated: ${new Date(page.updated_at).toLocaleDateString()}</div>
        </div>
    `;
    
    // Add tags
    if (page.tags && page.tags.length > 0) {
      htmlContent += '<div class="tags">';
      page.tags.forEach((tag: string) => {
        htmlContent += `<span class="tag">${tag}</span>`;
      });
      htmlContent += '</div>';
    }
    
    // Add content
    if (page.blocks && page.blocks.length > 0) {
      page.blocks.forEach((block: any) => {
        switch (block.type) {
          case 'heading':
            const level = block.data?.level || 1;
            htmlContent += `<h${level}>${block.data?.content || ''}</h${level}>`;
            break;
          case 'text':
            htmlContent += `<p>${block.data?.content || ''}</p>`;
            break;
          case 'quote':
            htmlContent += `<blockquote>${block.data?.content || ''}</blockquote>`;
            break;
          case 'code':
            htmlContent += `<pre><code>${block.data?.content || ''}</code></pre>`;
            break;
          case 'divider':
            htmlContent += '<hr />';
            break;
          case 'image':
            htmlContent += `<img src="${block.data?.url || ''}" alt="${block.data?.caption || ''}" />`;
            if (block.data?.caption) {
              htmlContent += `<p><em>${block.data.caption}</em></p>`;
            }
            break;
          default:
            if (block.data?.content) {
              htmlContent += `<p>${block.data.content}</p>`;
            }
        }
      });
    } else if (page.content) {
      htmlContent += `<div>${page.content}</div>`;
    }
    
    htmlContent += `
      </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        toast.success('Opening print dialog for PDF export');
      }, 250);
    };
  };

  const exportAsHTML = () => {
    if (!page) return;
    
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${page.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.6;
    }
    h1 { font-size: 2.5em; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
    pre { background: #f5f5f5; padding: 16px; border-radius: 6px; }
    blockquote { border-left: 4px solid #ddd; padding-left: 16px; margin-left: 0; }
  </style>
</head>
<body>
  <h1>${page.title}</h1>
  ${page.content || ''}
</body>
</html>`;
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${page.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Exported as HTML');
  };

  const handleShare = () => {
    if (!page) return;
    
    // Get the currently active page (main page or subpage)
    const currentPage = activeTabId === page.id 
      ? page 
      : subPages.find(sp => sp.id === activeTabId) || page;
    
    setPageToShare({
      id: currentPage.id,
      title: currentPage.title,
      isPublic: currentPage.is_public || false
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
      
      // Reload page data
      loadPageAndSubPages();
    } catch (error) {
      toast.error('Failed to update sharing settings');
      console.error(error);
    }
  };

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h3 className="text-lg font-medium text-foreground mb-2">Page not found</h3>
          <Button onClick={handleBack}>Go Back</Button>
        </div>
      </div>
    );
  }

  const activeContent = activeTabId === page.id 
    ? page 
    : subPages.find(sp => sp.id === activeTabId) || page;

  return (
    <div className="flex h-screen">
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-secondary z-50">
        <motion.div
          className="h-full bg-primary"
          style={{ width: `${readingProgress}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header with Tabs */}
        <div className="sticky top-0 z-10 bg-background">
          {/* Breadcrumb Navigation */}
          {pageId && (
            <div className="px-6 pt-3">
              <PageBreadcrumb 
                pageId={pageId} 
                workspaceId={workspaceId || currentWorkspace?.id}
              />
            </div>
          )}
          
          {/* Top Bar */}
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={handleBack} className="rounded-lg">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <div className="flex items-center gap-2">
              {/* View Only indicator */}
              {userRole === 'viewer' && (
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                  View Only
                </span>
              )}
              
              {/* Reading Mode Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReadingMode(!isReadingMode)}
                className="rounded-lg"
                title={isReadingMode ? "Exit Reading Mode" : "Enter Reading Mode"}
              >
                {isReadingMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>

              {/* TOC Toggle */}
              {toc.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRightSidebar(!showRightSidebar)}
                  className="rounded-lg"
                  title="Toggle Sidebar"
                >
                  <List className="w-4 h-4" />
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="rounded-lg">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {userCanEdit && (
                    <>
                      <DropdownMenuItem onClick={handleEdit}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Page
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {toc.length > 0 && (
                    <DropdownMenuItem onClick={() => setShowRightSidebar(!showRightSidebar)}>
                      <List className="w-4 h-4 mr-2" />
                      {showRightSidebar ? 'Hide Outline' : 'Show Outline'}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleToggleFavorite}>
                    <Star className={cn("w-4 h-4 mr-2", page.is_favorite && "fill-yellow-500 text-yellow-500")} />
                    {page.is_favorite ? 'Unpin' : 'Pin'}
                  </DropdownMenuItem>
                  {userCanAdmin && (
                    <DropdownMenuItem onClick={() => {
                      // Open share dialog or handle sharing
                      handleShare();
                    }}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handlePrint}>
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    <Download className="w-4 h-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('markdown')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Export as Markdown
                  </DropdownMenuItem>
                  {userCanAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Dot Navigation */}
          <div className="px-6 py-3 flex items-center gap-3">
            {/* Main Page Dot */}
            <button
              onClick={() => setActiveTabId(page.id)}
              className="group relative flex flex-col items-center gap-1"
              title={page.title}
            >
              <div
                className={cn(
                  "w-3 h-3 rounded-full transition-all",
                  activeTabId === page.id
                    ? "bg-primary shadow-lg shadow-primary/50 scale-125"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50 hover:scale-110"
                )}
              />
              <span className={cn(
                "text-[10px] font-medium transition-colors max-w-[80px] truncate",
                activeTabId === page.id ? "text-primary" : "text-muted-foreground"
              )}>
                {page.title}
              </span>
            </button>

            {/* Subpage Dots */}
            {subPages.map((subPage) => (
              <button
                key={subPage.id}
                onClick={() => setActiveTabId(subPage.id)}
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

            {userCanEdit && (
              <button
                onClick={handleCreateSubPage}
                className="flex items-center gap-1 px-2 sm:px-3 py-2.5 text-muted-foreground hover:text-foreground transition-all whitespace-nowrap"
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm hidden sm:inline"></span>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className={cn(
            "mx-auto px-4 sm:px-6 py-8 sm:py-12",
            isReadingMode ? "max-w-3xl" : "max-w-4xl"
          )}>
            <motion.div
              key={activeContent.id}
              ref={contentRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Cover Image */}
              {activeContent.cover_image && (
                <div className="-mx-6 -mt-12 mb-8">
                  {activeContent.cover_image.startsWith('linear-gradient') ? (
                    <div 
                      className="w-full h-48"
                      style={{ background: activeContent.cover_image }}
                    />
                  ) : (
                    <img 
                      src={activeContent.cover_image} 
                      alt="Cover" 
                      className="w-full h-48 object-cover"
                    />
                  )}
                </div>
              )}

              {/* AI Skill Suggestions Banner */}
              {skillSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">AI Detected Skill Connections</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        This page relates to skills you're learning. Link them to track progress automatically.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {skillSuggestions.map((suggestion) => (
                          <div
                            key={suggestion.actionId}
                            className="flex items-center gap-2 bg-background/50 border border-border rounded-lg px-3 py-2"
                          >
                            <Target className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">{suggestion.skillName}</span>
                            <span className="text-xs text-muted-foreground">
                              {Math.round(suggestion.confidence * 100)}% match
                            </span>
                            <button
                              onClick={() => acceptSkillSuggestion(suggestion)}
                              className="ml-2 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                            >
                              Link
                            </button>
                            <button
                              onClick={() => dismissSkillSuggestion(suggestion)}
                              className="p-1 hover:bg-secondary rounded transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Page Header */}
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 flex items-center justify-center bg-secondary rounded-xl">
                    {activeContent.icon && iconMap[activeContent.icon] ? (
                      <LucideIcon name={activeContent.icon} className="w-10 h-10 text-foreground" />
                    ) : (
                      <span className="text-5xl">{activeContent.icon || '📄'}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h1 className="text-4xl font-display font-bold text-foreground mb-2">
                      {activeContent.title}
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>Updated {new Date(activeContent.updated_at).toLocaleDateString()}</span>
                      </div>
                      {activeContent.estimated_reading_time && (
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          <span>{activeContent.estimated_reading_time} min read</span>
                        </div>
                      )}
                      {analytics && (
                        <div className="flex items-center gap-1">
                          <BarChart3 className="w-4 h-4" />
                          <span>{analytics.view_count} views</span>
                        </div>
                      )}
                      {activeContent.is_favorite && (
                        <div className="flex items-center gap-1 text-yellow-500">
                          <Star className="w-4 h-4 fill-current" />
                          <span>Pinned</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Linked Skills Badges */}
                {linkedSkills.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Linked Skills:</span>
                    {linkedSkills.map((skill: any) => (
                      <button
                        key={skill.id}
                        onClick={() => navigate(`/workspace/${currentWorkspace?.id}/skills/${skill.id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                      >
                        <span className="font-medium">{skill.name}</span>
                        {skill.confidence && (
                          <span className="text-xs opacity-75">
                            {Math.round(skill.confidence)}%
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {activeContent.tags && activeContent.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    {activeContent.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border" />

              {/* Content */}
              <div className="prose prose-lg dark:prose-invert max-w-none">
                {/* Render Blocks first if they exist */}
                {activeContent.blocks && activeContent.blocks.length > 0 ? (
                  <div className="space-y-2">
                    {activeContent.blocks.map((block: any) => (
                      <BlockRenderer
                        key={block.id}
                        block={block}
                        editable={false}
                      />
                    ))}
                  </div>
                ) : activeContent.content ? (
                  <ContentViewer 
                    content={activeContent.content}
                    className="min-h-[200px]"
                  />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="mb-4">This page is empty</p>
                    {userCanEdit && (
                      <Button onClick={handleEdit} variant="outline">
                        <Edit className="w-4 h-4 mr-2" />
                        Add Content
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Backlinks Section */}
              <Backlinks pageId={activeContent.id} />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <AnimatePresence>
        {!isReadingMode && showRightSidebar && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            className="hidden lg:block w-80 border-l border-border bg-card/50 overflow-y-auto flex-shrink-0"
          >
            <div className="p-5 space-y-5">
              {/* Table of Contents */}
              {toc.length > 0 && showToc && (
                <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <List className="w-4 h-4" />
                    Table of Contents
                  </h3>
                  <div className="space-y-1.5">
                    {toc.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => scrollToHeading(item.id)}
                        className={cn(
                          "w-full text-left text-sm py-2 px-3 rounded-lg transition-colors",
                          activeId === item.id
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                        )}
                        style={{ paddingLeft: `${(item.level - 1) * 12 + 12}px` }}
                      >
                        {item.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Page Links */}
              <div className="bg-secondary/30 rounded-xl p-4">
                <PageLinks 
                  pageId={activeContent.id} 
                  editable={true}
                />
              </div>

              {/* AI Suggested Related Pages */}
              <div className="bg-secondary/30 rounded-xl p-4">
                <RelatedPages 
                  pageId={activeContent.id}
                  onLinkCreated={() => {
                    // Refresh links when a suggestion is accepted
                  }}
                />
              </div>

              {/* Analytics */}
              {analytics && (
                <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Analytics
                  </h3>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Views</span>
                      <span className="font-medium text-foreground">{analytics.view_count}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Words</span>
                      <span className="font-medium text-foreground">{analytics.word_count}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Reading Time</span>
                      <span className="font-medium text-foreground">{analytics.estimated_reading_time} min</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Related Pages - Show Sub-pages */}
              {subPages.length > 0 && (
                <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Related Pages</h3>
                  <div className="space-y-2">
                    {subPages.map((subPage) => (
                      <button
                        key={subPage.id}
                        onClick={() => setActiveTabId(subPage.id)}
                        className={cn(
                          "w-full p-3 rounded-lg border cursor-pointer transition-colors text-left",
                          activeTabId === subPage.id 
                            ? "border-primary bg-primary/5" 
                            : "border-border/50 hover:border-primary/30 hover:bg-secondary/40"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-lg flex items-center justify-center w-5 h-5">
                            {subPage.icon && iconMap[subPage.icon] ? (
                              <LucideIcon name={subPage.icon} className="w-4 h-4" />
                            ) : (
                              subPage.icon || '📄'
                            )}
                          </span>
                          <p className="text-sm text-foreground flex-1 line-clamp-2">{subPage.title}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Learning Tools - View in Graph only */}
              <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Quick Actions</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start rounded-lg"
                    onClick={() => navigate(`/workspace/${currentWorkspace?.id}/graph`)}
                  >
                    🗺️ View in Graph
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white;
          }
          .tiptap-viewer-content {
            max-width: 100%;
          }
        }
      `}</style>

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
  );
}
