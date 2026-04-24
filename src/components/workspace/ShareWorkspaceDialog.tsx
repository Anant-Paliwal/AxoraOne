import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Mail, Copy, Check, Globe, Lock, Loader2, X, 
  UserPlus, Link2, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface ShareWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: {
    id: string;
    name: string;
    is_public?: boolean;
  } | null;
  onWorkspaceUpdate?: () => void;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
}

export function ShareWorkspaceDialog({ 
  open, 
  onOpenChange, 
  workspace,
  onWorkspaceUpdate 
}: ShareWorkspaceDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'invite' | 'members' | 'settings'>('invite');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (open && workspace) {
      loadMembers();
      setIsPublic(workspace.is_public || false);
    }
  }, [open, workspace]);

  const loadMembers = async () => {
    if (!workspace) return;
    try {
      setLoadingMembers(true);
      const [membersData, invitationsData] = await Promise.all([
        api.getWorkspaceMembers(workspace.id),
        api.getWorkspaceInvitations(workspace.id)
      ]);
      setMembers(membersData || []);
      setInvitations(invitationsData?.filter((i: Invitation) => i.status === 'pending') || []);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !workspace) return;
    try {
      setLoading(true);
      await api.inviteMember(workspace.id, inviteEmail, inviteRole);
      toast({ title: 'Invitation sent!', description: `Invited ${inviteEmail} as ${inviteRole}` });
      setInviteEmail('');
      loadMembers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to send invitation', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/workspace/${workspace?.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: 'Link copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTogglePublic = async (value: boolean) => {
    if (!workspace) return;
    try {
      await api.updateWorkspace(workspace.id, { is_public: value });
      setIsPublic(value);
      toast({ title: value ? 'Workspace is now public' : 'Workspace is now private' });
      onWorkspaceUpdate?.();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update visibility', variant: 'destructive' });
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!workspace) return;
    try {
      await api.cancelInvitation(workspace.id, invitationId);
      toast({ title: 'Invitation cancelled' });
      loadMembers();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to cancel invitation', variant: 'destructive' });
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!workspace) return;
    if (!confirm('Remove this member from the workspace?')) return;
    try {
      await api.removeMember(workspace.id, memberUserId);
      toast({ title: 'Member removed' });
      loadMembers();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to remove member', variant: 'destructive' });
    }
  };

  if (!workspace) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Share "{workspace.name}"
          </DialogTitle>
          <DialogDescription>
            Invite people to collaborate on this workspace
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg">
          {[
            { id: 'invite', label: 'Invite', icon: UserPlus },
            { id: 'members', label: 'Members', icon: Users },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Invite Tab */}
        {activeTab === 'invite' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Email address</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
                >
                  <option value="viewer">Viewer</option>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <Button onClick={handleInvite} disabled={loading || !inviteEmail} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              Send Invitation
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or share link</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                readOnly
                value={`${window.location.origin}/workspace/${workspace.id}`}
                className="font-mono text-sm"
              />
              <Button variant="outline" onClick={handleCopyLink}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            {/* Pending Invitations */}
            {invitations.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-border">
                <Label className="text-muted-foreground">Pending invitations</Label>
                {invitations.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between py-2 px-3 bg-secondary/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm">{inv.email}</span>
                      <span className="text-xs text-muted-foreground">({inv.role})</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleCancelInvitation(inv.id)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2 max-h-80 overflow-y-auto"
          >
            {loadingMembers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : members.length > 0 ? (
              members.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-3 px-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {member.full_name?.charAt(0) || member.email?.charAt(0) || 'U'}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{member.full_name || member.email?.split('@')[0]}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.role === 'owner' ? (
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">Owner</span>
                    ) : (
                      <>
                        <span className="px-2 py-1 bg-secondary text-muted-foreground rounded text-xs capitalize">{member.role}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(member.user_id)}>
                          <X className="w-4 h-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No members yet</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between py-4 px-4 bg-secondary/30 rounded-lg">
              <div className="flex items-center gap-3">
                {isPublic ? (
                  <Globe className="w-5 h-5 text-green-500" />
                ) : (
                  <Lock className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">Public Workspace</p>
                  <p className="text-sm text-muted-foreground">
                    {isPublic ? 'Anyone with the link can view' : 'Only invited members can access'}
                  </p>
                </div>
              </div>
              <Switch checked={isPublic} onCheckedChange={handleTogglePublic} />
            </div>

            <div className="p-4 bg-secondary/30 rounded-lg">
              <Label className="text-muted-foreground">Workspace ID</Label>
              <div className="flex gap-2 mt-2">
                <Input value={workspace.id} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={() => {
                  navigator.clipboard.writeText(workspace.id);
                  toast({ title: 'Copied!' });
                }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
