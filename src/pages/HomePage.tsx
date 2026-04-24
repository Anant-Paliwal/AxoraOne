import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { 
  FileText, ChevronRight, Plus,
  Loader2, ArrowLeft, Settings, MoreVertical,
  Palette, Presentation, Share2, LayoutGrid, Columns
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { CreateWorkspaceForm } from '@/components/workspace/CreateWorkspaceForm';
import { ShareWorkspaceDialog } from '@/components/workspace/ShareWorkspaceDialog';
import { PendingInvitations } from '@/components/workspace/PendingInvitations';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import { LucideIcon, iconMap } from '@/components/ui/IconPicker';
import { NotificationInbox } from '@/components/notifications/NotificationInbox';
import { api } from '@/lib/api';

export function HomePage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { currentWorkspace, workspaces, loading: workspaceLoading, setCurrentWorkspace, loadWorkspaces } = useWorkspace();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');

  // Dashboard layout hook
  const { layout, gridColumns, spacing, loading: layoutLoading, updateLayout, updateGridColumns, updateSpacing } = useDashboardLayout(currentWorkspace?.id);

  useEffect(() => {
    if (workspaceId && workspaces.length > 0) {
      const workspace = workspaces.find(w => w.id === workspaceId);
      if (workspace && workspace.id !== currentWorkspace?.id) {
        setCurrentWorkspace(workspace);
      }
    } else if (!workspaceId && currentWorkspace && !workspaceLoading) {
      navigate(`/workspace/${currentWorkspace.id}`, { replace: true });
    }
  }, [workspaceId, workspaces, currentWorkspace, workspaceLoading]);

  if (workspaceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!currentWorkspace && workspaces.length === 0) {
    return (
      <>
        <div className="min-h-screen flex flex-col items-center justify-center p-8">
          {/* Show pending invitations even when user has no workspaces */}
          <div className="w-full max-w-2xl mb-8">
            <PendingInvitations />
          </div>
          
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No Workspace Yet</h2>
            <p className="text-muted-foreground mb-6">Create your first workspace to get started, or accept a pending invitation above.</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />Create Workspace
            </Button>
          </div>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-3xl p-0 bg-transparent border-0">
            <VisuallyHidden><DialogTitle>Create Workspace</DialogTitle><DialogDescription>Create a new workspace</DialogDescription></VisuallyHidden>
            <CreateWorkspaceForm onSuccess={() => setShowCreateDialog(false)} onCancel={() => setShowCreateDialog(false)} />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (!currentWorkspace) {
    return (
      <>
        <div className="min-h-screen p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground mb-2">Your Workspaces</h1>
              <p className="text-muted-foreground">Select a workspace to get started</p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}><Plus className="w-4 h-4 mr-2" />Create Workspace</Button>
          </div>
          
          {/* Pending Invitations */}
          <PendingInvitations />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {workspaces.map((workspace, index) => (
              <motion.div key={workspace.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
                onClick={() => { setCurrentWorkspace(workspace); navigate(`/workspace/${workspace.id}`); }}
                className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer group">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform" style={{ backgroundColor: workspace.color + '20' }}>
                  {workspace.icon && iconMap[workspace.icon] ? (
                    <LucideIcon name={workspace.icon} className="w-8 h-8 text-foreground" />
                  ) : (
                    workspace.icon
                  )}
                </div>
                <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors mb-2">{workspace.name}</h3>
                {workspace.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{workspace.description}</p>}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="w-3 h-3" /><span>{workspace.is_public ? 'Public' : 'Private'}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-3xl p-0 bg-transparent border-0">
            <VisuallyHidden><DialogTitle>Create Workspace</DialogTitle><DialogDescription>Create a new workspace</DialogDescription></VisuallyHidden>
            <CreateWorkspaceForm onSuccess={() => setShowCreateDialog(false)} onCancel={() => setShowCreateDialog(false)} />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (layoutLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      {/* Breadcrumb */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
        <Button variant="ghost" size="sm" onClick={() => { setCurrentWorkspace(null); navigate('/home'); }} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">Back to Workspaces</span><span className="sm:hidden">Back</span>
        </Button>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <span className="hidden sm:inline">Workspaces</span><ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{currentWorkspace.name}</span>
        </div>
      </div>

      {/* Pending Invitations - Show even when inside a workspace */}
      <PendingInvitations />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xl sm:text-2xl flex-shrink-0" style={{ backgroundColor: currentWorkspace.color + '20' }}>
              {currentWorkspace.icon && iconMap[currentWorkspace.icon] ? (
                <LucideIcon name={currentWorkspace.icon} className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
              ) : (
                currentWorkspace.icon
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground truncate">{currentWorkspace.name}</h1>
          </div>
        </div>
      </div>

      {/* Share Dialog */}
      <ShareWorkspaceDialog 
        open={showShareDialog} 
        onOpenChange={setShowShareDialog}
        workspace={currentWorkspace}
        onWorkspaceUpdate={loadWorkspaces}
      />

      {/* Top Right Actions - Three Dot Menu */}
      <div className="fixed top-4 right-4 sm:absolute sm:top-8 sm:right-8 flex items-center gap-2 z-30">
        {/* Notification Inbox - Floating Panel */}
        <NotificationInbox />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setShowShareDialog(true)}>
              <Share2 className="w-4 h-4 mr-2" />
              Share Workspace
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(`/workspace/${currentWorkspace.id}/settings`)}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>View</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={viewMode} onValueChange={(value) => setViewMode(value as 'single' | 'grid')}>
              <DropdownMenuRadioItem value="single">
                <Columns className="w-4 h-4 mr-2" />
                Single Column
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="grid">
                <LayoutGrid className="w-4 h-4 mr-2" />
                Grid View
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsEditMode(!isEditMode)}>
              <Palette className="w-4 h-4 mr-2" />
              {isEditMode ? 'Exit Customize' : 'Customize'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              // Toggle presentation mode - could be implemented as a full-screen view
              document.documentElement.requestFullscreen?.();
            }}>
              <Presentation className="w-4 h-4 mr-2" />
              View Present
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Dashboard Widgets - Living Intelligence integrated */}
      <DashboardGrid
        layout={layout}
        gridColumns={viewMode === 'single' ? 1 : gridColumns}
        spacing={spacing}
        onLayoutChange={updateLayout}
        onGridColumnsChange={updateGridColumns}
        onSpacingChange={updateSpacing}
        isEditMode={isEditMode}
        onEditModeChange={setIsEditMode}
      />
    </div>
  );
}
