import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  Infinity, 
  Home,
  FileText, 
  Brain, 
  GitBranch, 
  CheckSquare, 
  Calendar, 
  Crown,
  Plus,
  Loader2,
  LogOut,
  Edit,
  Trash2,
  MoreHorizontal,
  Menu,
  X,
  Globe,
  Lock,
  Eye,
  Users,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { CreateWorkspaceForm } from '@/components/workspace/CreateWorkspaceForm';
import { LucideIcon, iconMap } from '@/components/ui/IconPicker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useSubscription } from '@/hooks/useSubscription';

const mainNavItems = [
  { icon: Infinity, label: 'Ask Anything', path: '/ask', primary: true },
  { icon: Home, label: 'Home', path: '' }, // Empty path for home
  { icon: FileText, label: 'Pages', path: '/pages' },
  { icon: Brain, label: 'Skills', path: '/skills' },
  { icon: GitBranch, label: 'Knowledge Graph', path: '/graph' },
  { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
  { icon: Calendar, label: 'Calendar', path: '/calendar' },
  { icon: Trash2, label: 'Trash', path: '/trash' },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaces, loading: workspacesLoading, currentWorkspace, loadWorkspaces } = useWorkspace();
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const { subscription } = useSubscription();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<any>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load user avatar
  useEffect(() => {
    const loadAvatar = async () => {
      if (!user) return;
      try {
        const settings = await api.getUserSettings();
        console.log('Loaded user settings:', settings);
        // Only set avatar if it's a non-empty string
        if (settings?.avatar_url && settings.avatar_url.trim() !== '') {
          console.log('Setting avatar URL:', settings.avatar_url);
          setAvatarUrl(settings.avatar_url);
        } else {
          console.log('No avatar URL found, using initials');
          setAvatarUrl(null);
        }
      } catch (error) {
        console.error('Failed to load avatar:', error);
      }
    };
    loadAvatar();
    
    // Listen for avatar updates via custom event
    const handleAvatarUpdate = (e: CustomEvent) => {
      const newUrl = e.detail?.avatar_url;
      console.log('Avatar update event received:', newUrl);
      // Handle both setting and clearing avatar
      if (newUrl && newUrl.trim() !== '') {
        setAvatarUrl(newUrl);
      } else {
        setAvatarUrl(null);
      }
    };
    window.addEventListener('avatar-updated', handleAvatarUpdate as EventListener);
    
    return () => {
      window.removeEventListener('avatar-updated', handleAvatarUpdate as EventListener);
    };
  }, [user]);

  // Listen for workspace role updates (when owner changes member role)
  // Separate useEffect to ensure loadWorkspaces is always current
  useEffect(() => {
    const handleWorkspaceRoleUpdate = async (e: CustomEvent) => {
      console.log('Workspace role update event received:', e.detail);
      // Force reload workspaces to get updated roles
      await loadWorkspaces();
    };
    
    window.addEventListener('workspace-role-updated', handleWorkspaceRoleUpdate as EventListener);
    
    return () => {
      window.removeEventListener('workspace-role-updated', handleWorkspaceRoleUpdate as EventListener);
    };
  }, [loadWorkspaces]);

  // Get the base path for navigation based on current workspace
  const getNavPath = (path: string) => {
    if (currentWorkspace) {
      // For home, just return workspace path
      if (path === '') {
        return `/workspace/${currentWorkspace.id}`;
      }
      return `/workspace/${currentWorkspace.id}${path}`;
    }
    // For home without workspace, go to /home
    if (path === '') {
      return '/home';
    }
    return path;
  };

  // Get user initials
  const getUserInitials = () => {
    if (!user?.email) return 'U';
    const email = user.email;
    return email.substring(0, 2).toUpperCase();
  };

  // Get user display name
  const getUserName = () => {
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  // Get plan name
  const getPlanName = () => {
    if (!subscription) return 'Free Plan';
    return subscription.plan_name || 'Free Plan';
  };

  // Handle workspace edit
  const handleEditWorkspace = (workspace: any) => {
    setEditingWorkspace(workspace);
    setShowCreateDialog(true);
  };

  // Handle workspace delete
  const handleDeleteWorkspace = async (workspaceId: string, workspaceName: string) => {
    if (!confirm(`Are you sure you want to delete "${workspaceName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.deleteWorkspace(workspaceId);
      toast.success('Workspace deleted');
      await loadWorkspaces();
      
      // If we deleted the current workspace, navigate to home
      if (currentWorkspace?.id === workspaceId) {
        navigate('/home');
      }
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      toast.error('Failed to delete workspace');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card border border-border rounded-lg"
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className={cn(
        "flex flex-col h-screen bg-card border-r border-border transition-all duration-300 ease-in-out rounded-tr-2xl rounded-br-2xl",
        "lg:translate-x-0 lg:static fixed top-0 left-0 z-40",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        isCollapsed ? "w-[72px]" : "w-64"
      )}>
        {/* Logo - Click to toggle collapse */}
        <div className="flex items-center gap-2.5 px-4 py-5 pt-6 border-b border-border">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-2.5 w-full hover:opacity-80 transition-opacity"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <div className="flex items-center justify-center w-8 h-8 p-0.5 flex-shrink-0">
              <img 
                src={theme === 'light' ? '/axora-logo-light.png' : '/axora-logo.png'} 
                alt="Axora" 
                className="w-full h-full object-contain" 
              />
            </div>
            {!isCollapsed && (
              <span className="font-display font-bold text-lg text-foreground">Axora</span>
            )}
          </button>
        </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {/* Show only Home button when not in a workspace */}
        {!currentWorkspace ? (
          <div className="space-y-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/home"
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                      isCollapsed && "justify-center px-2",
                      location.pathname === '/home'
                        ? "bg-secondary text-foreground" 
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                    )}
                  >
                    <Home className="w-4 h-4 flex-shrink-0" />
                    {!isCollapsed && <span>Home</span>}
                  </Link>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">Home</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        ) : (
          /* Show all navigation when inside a workspace */
          <div className="space-y-1">
            <TooltipProvider>
              {mainNavItems.map((item) => {
                const navPath = getNavPath(item.path);
                const isActive = location.pathname === navPath || 
                  location.pathname.endsWith(item.path) ||
                  (item.path === '' && location.pathname.match(/^\/workspace\/[^/]+$/)) ||
                  (item.path === '/ask' && location.pathname === '/');
                const Icon = item.icon;

                return (
                  <Tooltip key={item.path}>
                    <TooltipTrigger asChild>
                      <Link
                        to={navPath}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                          isCollapsed && "justify-center px-2",
                          item.primary && !isActive && "text-primary hover:bg-secondary",
                          isActive 
                            ? "bg-secondary text-foreground" 
                            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                          item.primary && isActive && "bg-primary text-primary-foreground"
                        )}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        {!isCollapsed && <span>{item.label}</span>}
                      </Link>
                    </TooltipTrigger>
                    {isCollapsed && (
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>
        )}

        {/* Workspaces */}
        <div className="mt-8">
          <div className={cn(
            "flex items-center justify-between px-3 mb-2",
            isCollapsed && "justify-center"
          )}>
            {!isCollapsed && (
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Workspaces
              </span>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowCreateDialog(true)}
                    className="p-1 hover:bg-secondary rounded transition-colors"
                    title="Create workspace"
                  >
                    <Plus className="w-3 h-3 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">Create Workspace</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="space-y-0.5">
            {workspacesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : workspaces.length > 0 ? (
              workspaces.map((ws: any) => {
                // Determine user's role for this workspace
                const isOwned = !ws.is_shared;
                const role = ws.member_role || (isOwned ? 'owner' : 'viewer');
                const canDeleteWs = isOwned; // Only owners can delete
                
                // Get role badge info
                const getRoleBadge = () => {
                  if (isOwned) return null; // Don't show badge for owned workspaces
                  switch (role) {
                    case 'admin':
                      return { icon: Shield, label: 'Admin', color: 'text-blue-500 bg-blue-500/10' };
                    case 'member':
                      return { icon: Users, label: 'Member', color: 'text-green-500 bg-green-500/10' };
                    case 'viewer':
                      return { icon: Eye, label: 'View Only', color: 'text-orange-500 bg-orange-500/10' };
                    default:
                      return null;
                  }
                };
                
                const roleBadge = getRoleBadge();
                
                return (
                <div key={ws.id} className="group relative">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          to={`/workspace/${ws.id}`}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                            isCollapsed && "justify-center px-2",
                            currentWorkspace?.id === ws.id
                              ? "bg-secondary text-foreground"
                              : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                          )}
                        >
                          <span className="text-base flex items-center justify-center w-5 h-5 flex-shrink-0">
                            {ws.icon && iconMap[ws.icon] ? (
                              <LucideIcon name={ws.icon} className="w-4 h-4" />
                            ) : (
                              ws.icon
                            )}
                          </span>
                          {!isCollapsed && (
                            <>
                              <span className="truncate flex-1">{ws.name}</span>
                              <div className="flex items-center gap-1">
                                {/* Public/Private indicator */}
                                {isOwned && (
                                  ws.is_public ? (
                                    <Globe className="w-3 h-3 text-muted-foreground" />
                                  ) : (
                                    <Lock className="w-3 h-3 text-muted-foreground" />
                                  )
                                )}
                                {/* Role badge for shared workspaces */}
                                {roleBadge && (
                                  <span className={cn(
                                    "text-[9px] px-1 py-0.5 rounded font-medium",
                                    roleBadge.color
                                  )}>
                                    {roleBadge.label}
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        <div className="space-y-1">
                          <p className="font-medium">{ws.name}</p>
                          {isOwned ? (
                            <p className="text-muted-foreground">
                              {ws.is_public ? '🌐 Public workspace' : '🔒 Private workspace'}
                            </p>
                          ) : (
                            <p className="text-muted-foreground">
                              Shared with you as {role}
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  {/* Workspace Actions - Only show for owned workspaces or admins */}
                  {canDeleteWs && !isCollapsed && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 hover:bg-secondary rounded transition-colors">
                            <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditWorkspace(ws)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteWorkspace(ws.id, ws.name)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              )})
            ) : (
              <div className={cn("px-3 py-2 text-xs text-muted-foreground", isCollapsed && "px-1 text-center")}>
                {!isCollapsed && <p className="mb-2">No workspaces yet</p>}
                {!isCollapsed && (
                  <Button
                    onClick={() => setShowCreateDialog(true)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Create Workspace
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Favorites - Hidden for now since we need to implement favorites */}
        {/* <div className="mt-6">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Favorites
            </span>
          </div>
        </div> */}
      </nav>

      {/* Bottom Section - User Profile */}
      <div className="border-t border-border p-3 pb-6 space-y-2">
        {/* User Profile Card */}
        <div className={cn(
          "bg-secondary/30 rounded-lg p-3",
          isCollapsed && "p-2"
        )}>
          <div className={cn(
            "flex items-center gap-3 mb-2",
            isCollapsed && "justify-center mb-0"
          )}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex-shrink-0">
                    {avatarUrl ? (
                      <img 
                        src={avatarUrl} 
                        alt="Profile" 
                        className={cn(
                          "rounded-full object-cover border border-border",
                          isCollapsed ? "w-8 h-8" : "w-10 h-10"
                        )}
                      />
                    ) : (
                      <div className={cn(
                        "rounded-full bg-primary/10 flex items-center justify-center",
                        isCollapsed ? "w-8 h-8" : "w-10 h-10"
                      )}>
                        <span className={cn(
                          "font-semibold text-primary",
                          isCollapsed ? "text-xs" : "text-sm"
                        )}>{getUserInitials()}</span>
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <div>
                      <p className="font-medium">{getUserName()}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{getUserName()}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email || 'Not logged in'}</p>
              </div>
            )}
          </div>
          
          {/* Plan Badge */}
          {!isCollapsed && (
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-md">
                <Crown className="w-3 h-3 text-primary" />
                <span className="text-xs font-medium text-primary">{getPlanName()}</span>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-full text-destructive hover:text-destructive hover:bg-destructive/10",
                    isCollapsed ? "justify-center px-2" : "justify-start"
                  )}
                >
                  <LogOut className="w-4 h-4" />
                  {!isCollapsed && <span className="ml-2">Logout</span>}
                </Button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">Logout</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      </aside>

      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) setEditingWorkspace(null);
      }}>
        <DialogContent className="max-w-3xl p-0 bg-transparent border-0">
          <VisuallyHidden>
            <DialogTitle>{editingWorkspace ? 'Edit Workspace' : 'Create Workspace'}</DialogTitle>
            <DialogDescription>
              {editingWorkspace ? 'Update your workspace details' : 'Create a new workspace to organize your content'}
            </DialogDescription>
          </VisuallyHidden>
          <CreateWorkspaceForm 
            workspace={editingWorkspace}
            onSuccess={() => {
              setShowCreateDialog(false);
              setEditingWorkspace(null);
              loadWorkspaces();
            }}
            onCancel={() => {
              setShowCreateDialog(false);
              setEditingWorkspace(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
