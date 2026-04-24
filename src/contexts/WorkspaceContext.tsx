import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface Workspace {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color?: string;
  is_default?: boolean;
  is_public?: boolean;
  is_shared?: boolean;
  member_role?: 'viewer' | 'member' | 'admin' | 'owner';
  user_id?: string;
  created_at: string;
  updated_at: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  loading: boolean;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  loadWorkspaces: () => Promise<void>;
  createWorkspace: (data: { name: string; description?: string; icon?: string; color?: string }) => Promise<Workspace>;
  updateWorkspace: (id: string, updates: any) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  // Permission helpers
  canEdit: () => boolean;
  canAdmin: () => boolean;
  isOwner: () => boolean;
  getUserRole: () => string;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);
  const { user } = useAuth();

  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000;

  useEffect(() => {
    if (user) {
      loadWorkspaces();
    } else {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setLoading(false);
    }
  }, [user]);

  // Listen for workspace role updates to refresh data
  useEffect(() => {
    const handleRoleUpdate = () => {
      if (user) {
        loadWorkspaces(true); // Force reload on role update
      }
    };
    
    window.addEventListener('workspace-role-updated', handleRoleUpdate);
    return () => {
      window.removeEventListener('workspace-role-updated', handleRoleUpdate);
    };
  }, [user]);

  // Handle visibility change - don't reload when user comes back to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        // Only reload if cache is stale (older than 5 minutes)
        const now = Date.now();
        const cacheAge = now - lastLoadTime;
        
        if (cacheAge > CACHE_DURATION) {
          console.log('Cache stale, reloading workspaces...');
          loadWorkspaces();
        } else {
          console.log('Using cached workspace data');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, lastLoadTime]);

  // Permission helpers
  const getUserRole = (): string => {
    if (!currentWorkspace || !user) return 'none';
    
    // If user owns the workspace
    if (currentWorkspace.user_id === user.id) return 'owner';
    
    // If it's a shared workspace, use the member_role
    if (currentWorkspace.is_shared && currentWorkspace.member_role) {
      return currentWorkspace.member_role;
    }
    
    return 'owner'; // Default to owner for non-shared workspaces
  };

  const isOwner = (): boolean => {
    return getUserRole() === 'owner';
  };

  const canAdmin = (): boolean => {
    const role = getUserRole();
    return role === 'owner' || role === 'admin';
  };

  const canEdit = (): boolean => {
    const role = getUserRole();
    return role === 'owner' || role === 'admin' || role === 'member';
  };

  const loadWorkspaces = async (forceReload = false) => {
    if (!user) return;
    
    // Skip loading if cache is fresh and not forced
    if (!forceReload && workspaces.length > 0) {
      const now = Date.now();
      const cacheAge = now - lastLoadTime;
      
      if (cacheAge < CACHE_DURATION) {
        console.log('Using cached workspaces, skipping API call');
        return;
      }
    }
    
    try {
      setLoading(true);
      const data = await api.getWorkspaces();
      
      // Update last load time
      setLastLoadTime(Date.now());
      
      // If no workspaces exist, create a default one based on user email
      if (data.length === 0) {
        const emailName = user.email?.split('@')[0] || 'My';
        const defaultWorkspace = await api.createWorkspace({
          name: `${emailName}'s Workspace`,
          description: 'Your personal workspace',
          icon: '🏠',
          color: '#6366f1'
        });
        
        // Mark as default in database
        try {
          await api.updateWorkspace(defaultWorkspace.id, { is_default: true });
          defaultWorkspace.is_default = true;
        } catch (e) {
          // is_default column might not exist, ignore
        }
        
        setWorkspaces([defaultWorkspace]);
        setCurrentWorkspace(defaultWorkspace);
        toast.success('Welcome! Your workspace has been created.');
      } else {
        setWorkspaces(data);
        
        // If we have a current workspace, update it with fresh data (including role changes)
        if (currentWorkspace) {
          const updatedCurrent = data.find((w: Workspace) => w.id === currentWorkspace.id);
          if (updatedCurrent) {
            setCurrentWorkspace(updatedCurrent);
          } else {
            // Current workspace no longer accessible, switch to default
            const defaultWs = data.find((w: Workspace) => w.is_default) || data[0];
            setCurrentWorkspace(defaultWs);
          }
        } else {
          // Set default workspace as current, or first one
          const defaultWs = data.find((w: Workspace) => w.is_default) || data[0];
          setCurrentWorkspace(defaultWs);
        }
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
      setWorkspaces([]);
      setCurrentWorkspace(null);
    } finally {
      setLoading(false);
    }
  };

  const createWorkspace = async (data: { name: string; description?: string; icon?: string; color?: string }) => {
    try {
      const newWorkspace = await api.createWorkspace(data);
      setWorkspaces([newWorkspace, ...workspaces]);
      setCurrentWorkspace(newWorkspace);
      toast.success('Workspace created');
      return newWorkspace;
    } catch (error) {
      toast.error('Failed to create workspace');
      throw error;
    }
  };

  const updateWorkspace = async (id: string, updates: any) => {
    try {
      const updated = await api.updateWorkspace(id, updates);
      setWorkspaces(workspaces.map(w => w.id === id ? updated : w));
      if (currentWorkspace?.id === id) {
        setCurrentWorkspace(updated);
      }
      toast.success('Workspace updated');
    } catch (error) {
      toast.error('Failed to update workspace');
      throw error;
    }
  };

  const deleteWorkspace = async (id: string) => {
    try {
      // Don't allow deleting the last workspace
      if (workspaces.length <= 1) {
        toast.error('Cannot delete your only workspace');
        return;
      }
      
      await api.deleteWorkspace(id);
      const remainingWorkspaces = workspaces.filter(w => w.id !== id);
      setWorkspaces(remainingWorkspaces);
      
      if (currentWorkspace?.id === id) {
        // Set another workspace as current
        const newCurrent = remainingWorkspaces[0] || null;
        setCurrentWorkspace(newCurrent);
      }
      toast.success('Workspace deleted');
    } catch (error) {
      toast.error('Failed to delete workspace');
      throw error;
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        loading,
        setCurrentWorkspace,
        loadWorkspaces,
        createWorkspace,
        updateWorkspace,
        deleteWorkspace,
        // Permission helpers
        canEdit,
        canAdmin,
        isOwner,
        getUserRole,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
