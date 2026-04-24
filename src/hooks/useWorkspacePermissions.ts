import { useMemo } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

/**
 * Hook for checking workspace permissions based on user role
 * 
 * Role Hierarchy:
 * - viewer (level 1): Read-only access
 * - member (level 2): Can create/edit content
 * - admin (level 3): Can manage members and settings
 * - owner (level 4): Full control including subscription
 */
export function useWorkspacePermissions() {
  const { currentWorkspace } = useWorkspace();
  
  const role = useMemo(() => {
    return currentWorkspace?.member_role || null;
  }, [currentWorkspace]);
  
  /**
   * Can view content (all roles)
   */
  const canView = useMemo(() => {
    return role !== null;
  }, [role]);
  
  /**
   * Can create and edit content (member, admin, owner)
   */
  const canEdit = useMemo(() => {
    return ['member', 'admin', 'owner'].includes(role || '');
  }, [role]);
  
  /**
   * Can manage members and workspace settings (admin, owner)
   */
  const canAdmin = useMemo(() => {
    return ['admin', 'owner'].includes(role || '');
  }, [role]);
  
  /**
   * Can manage subscription and delete workspace (owner only)
   */
  const isOwner = useMemo(() => {
    return role === 'owner';
  }, [role]);
  
  /**
   * Is viewer only (read-only access)
   */
  const isViewer = useMemo(() => {
    return role === 'viewer';
  }, [role]);
  
  /**
   * Get permission error message for action
   */
  const getPermissionError = (action: 'view' | 'edit' | 'admin' | 'owner') => {
    const messages = {
      view: 'You need to be a workspace member to view this content',
      edit: 'You need member, admin, or owner role to edit content',
      admin: 'You need admin or owner role to manage workspace settings',
      owner: 'Only the workspace owner can perform this action'
    };
    return messages[action];
  };
  
  return {
    role,
    canView,
    canEdit,
    canAdmin,
    isOwner,
    isViewer,
    getPermissionError
  };
}
