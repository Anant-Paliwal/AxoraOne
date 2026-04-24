import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { LucideIcon, iconMap } from '@/components/ui/IconPicker';

interface Invitation {
  id: string;
  workspace_id: string;
  workspace_name: string;
  workspace_icon?: string;
  workspace_color?: string;
  role: string;
  invited_by_name: string;
  token: string;
  created_at: string;
}

export function PendingInvitations() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loadWorkspaces } = useWorkspace();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      console.log('Loading invitations...');
      const data = await api.getMyInvitations();
      console.log('Invitations loaded:', data);
      setInvitations(data || []);
    } catch (error: any) {
      console.error('Failed to load invitations:', error);
      // Show error in toast for debugging
      toast({ 
        title: 'Debug: Invitation fetch', 
        description: error.message || 'Failed to load invitations',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitation: Invitation) => {
    try {
      setProcessingId(invitation.id);
      const result = await api.acceptInvitation(invitation.token);
      toast({ title: 'Joined workspace!', description: `You are now a member of ${invitation.workspace_name}` });
      setInvitations(prev => prev.filter(i => i.id !== invitation.id));
      // Reload workspaces to include the new shared workspace
      await loadWorkspaces();
      // Navigate to the workspace
      navigate(`/workspace/${result.workspace_id}`);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to accept invitation', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitation: Invitation) => {
    try {
      setProcessingId(invitation.id);
      await api.declineInvitation(invitation.token);
      toast({ title: 'Invitation declined' });
      setInvitations(prev => prev.filter(i => i.id !== invitation.id));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to decline invitation', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="mb-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Checking for invitations...</span>
      </div>
    );
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <Users className="w-4 h-4" />
        Pending Invitations ({invitations.length})
      </h3>
      <div className="space-y-2">
        <AnimatePresence>
          {invitations.map((invitation) => (
            <motion.div
              key={invitation.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                  style={{ backgroundColor: (invitation.workspace_color || '#6366f1') + '20' }}
                >
                  {invitation.workspace_icon && iconMap[invitation.workspace_icon] ? (
                    <LucideIcon name={invitation.workspace_icon} className="w-5 h-5" />
                  ) : (
                    invitation.workspace_icon || '📁'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{invitation.workspace_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {invitation.invited_by_name} invited you as {invitation.role}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDecline(invitation)}
                  disabled={processingId === invitation.id}
                >
                  {processingId === invitation.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4 mr-1" />
                  )}
                  Decline
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAccept(invitation)}
                  disabled={processingId === invitation.id}
                >
                  {processingId === invitation.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-1" />
                  )}
                  Accept
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
