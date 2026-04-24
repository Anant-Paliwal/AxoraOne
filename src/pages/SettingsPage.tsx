import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Bell, Save, Loader2, Check, Infinity, Globe, Palette, Users, 
  CreditCard, Link2, Download, Upload, X, LogOut, Trash2, Mail, Lock,
  Eye, EyeOff, AlertCircle, CheckCircle, Copy, ExternalLink, Smartphone
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import { applyAccentColor as applyAccentColorTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { InstallButton } from '@/components/InstallButton';
import { NotificationPermissionButton } from '@/components/NotificationPermissionButton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';

type SettingsSection = 
  | 'account' | 'preferences' | 'notifications' | 'workspace' 
  | 'ai' | 'people' | 'connections' | 'import' | 'billing';

interface UserSettings {
  full_name: string;
  avatar_url: string;
  theme: 'light' | 'dark' | 'system';
  accent_color: string;
  font_size: 'small' | 'medium' | 'large';
  email_notifications: boolean;
  task_reminders: boolean;
  skill_updates: boolean;
  ai_suggestions: boolean;
  weekly_digest: boolean;
  mentions: boolean;
  default_ai_model: string;
  auto_suggest: boolean;
  context_awareness: boolean;
  streaming_responses: boolean;
}

const defaultSettings: UserSettings = {
  full_name: '',
  avatar_url: '',
  theme: 'dark',
  accent_color: '#8B5CF6',
  font_size: 'medium',
  email_notifications: true,
  task_reminders: true,
  skill_updates: true,
  ai_suggestions: true,
  weekly_digest: false,
  mentions: true,
  default_ai_model: 'gpt-4o-mini',
  auto_suggest: true,
  context_awareness: true,
  streaming_responses: true
};

export function SettingsPage() {
  const { user } = useAuth();
  const { currentWorkspace, updateWorkspace, canAdmin, isOwner } = useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<SettingsSection>('account');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Local state for form
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Workspace settings
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDesc, setWorkspaceDesc] = useState('');
  const [wsPublic, setWsPublic] = useState(false);
  const [wsAllowInvites, setWsAllowInvites] = useState(true);
  const [wsHasChanges, setWsHasChanges] = useState(false);

  // Dialogs
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  
  // Form states for dialogs
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [dialogLoading, setDialogLoading] = useState(false);
  
  // Workspace members state
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    loadSettings();
    loadAIModels();
  }, [user]);

  useEffect(() => {
    if (currentWorkspace) {
      setWorkspaceName(currentWorkspace.name || '');
      setWorkspaceDesc(currentWorkspace.description || '');
      loadWorkspaceMembers();
    }
  }, [currentWorkspace]);

  const loadWorkspaceMembers = async () => {
    if (!currentWorkspace) return;
    try {
      setLoadingMembers(true);
      
      // Always load members
      const members = await api.getWorkspaceMembers(currentWorkspace.id);
      setWorkspaceMembers(members || []);
      
      // Only load invitations if user is admin or owner
      if (canAdmin() || isOwner()) {
        try {
          const invitations = await api.getWorkspaceInvitations(currentWorkspace.id);
          setPendingInvitations(invitations?.filter((i: any) => i.status === 'pending') || []);
        } catch (error) {
          // Silently fail for invitations - user might not have permission
          console.log('Could not load invitations (permission denied)');
          setPendingInvitations([]);
        }
      } else {
        setPendingInvitations([]);
      }
    } catch (error) {
      console.error('Error loading workspace members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadSettings = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await api.getUserSettings();
      
      // ✅ IMPORTANT: localStorage is the source of truth for theme
      // Only use database theme if localStorage is empty
      const localStorageTheme = localStorage.getItem('theme');
      const themeToUse = localStorageTheme || data.theme || 'dark';
      
      setSettings({
        ...defaultSettings,
        ...data,
        full_name: data.full_name || user.user_metadata?.full_name || '',
        avatar_url: data.avatar_url || user.user_metadata?.avatar_url || '',
        theme: themeToUse as 'light' | 'dark' | 'system'
      });
      
      // Don't change theme if localStorage already has it
      // This prevents database from overwriting user's current preference
      if (!localStorageTheme && data.theme && data.theme !== theme) {
        setTheme(data.theme === 'dark' ? 'dark' : 'light');
      }
      
      applyAccentColor(data.accent_color || '#8B5CF6');
      applyFontSize(data.font_size || 'medium');
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAIModels = async () => {
    try {
      const response = await api.getAIModels();
      const models = Array.isArray(response) ? response : (response?.models || []);
      setAvailableModels(models.map((m: any) => typeof m === 'string' ? m : m.id));
    } catch (error) {
      console.error('Error loading AI models:', error);
      setAvailableModels(['gpt-4o-mini', 'gpt-4o', 'gemini-pro']);
    }
  };

  const updateLocalSettings = (updates: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
    
    // Apply theme immediately (instant preview) AND save to localStorage
    if (updates.theme) {
      const themeValue = updates.theme === 'system' ? 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : 
        updates.theme;
      
      // ✅ Save to localStorage immediately (don't wait for Save button)
      localStorage.setItem('theme', themeValue);
      console.log('✅ Theme saved to localStorage immediately:', themeValue);
      
      setTheme(themeValue as 'light' | 'dark');
    }
    
    // Apply accent color immediately for live preview
    if (updates.accent_color) {
      applyAccentColorTheme(updates.accent_color);
    }
    
    // Apply font size immediately
    if (updates.font_size) {
      applyFontSize(updates.font_size);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await api.updateUserSettings(settings);
      // Also update Supabase auth metadata for name
      if (settings.full_name) {
        await supabase.auth.updateUser({ data: { full_name: settings.full_name } });
      }
      applyTheme(settings.theme);
      applyAccentColor(settings.accent_color);
      applyFontSize(settings.font_size);
      setHasChanges(false);
      toast({ title: 'Settings saved successfully' });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const saveWorkspaceSettings = async () => {
    if (!currentWorkspace) return;
    try {
      setSaving(true);
      await updateWorkspace(currentWorkspace.id, { name: workspaceName, description: workspaceDesc });
      setWsHasChanges(false);
      toast({ title: 'Workspace settings saved' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save workspace settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Photo upload handler - uses backend API to bypass RLS
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    try {
      setUploadingPhoto(true);
      
      // Use backend API which uses service role to bypass RLS
      const result = await api.uploadProfilePhoto(file);
      
      // Update local state
      setSettings(prev => ({ ...prev, avatar_url: result.url }));
      
      // Also update Supabase auth metadata
      await supabase.auth.updateUser({ data: { avatar_url: result.url } });
      
      // Dispatch event to update sidebar avatar
      window.dispatchEvent(new CustomEvent('avatar-updated', { detail: { avatar_url: result.url } }));
      
      toast({ title: 'Profile photo updated successfully' });
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast({ title: 'Error', description: error.message || 'Failed to upload photo', variant: 'destructive' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setUploadingPhoto(true);
      await api.deleteAvatar();
      await supabase.auth.updateUser({ data: { avatar_url: null } });
      setSettings(prev => ({ ...prev, avatar_url: '' }));
      
      // Dispatch event to update sidebar avatar
      window.dispatchEvent(new CustomEvent('avatar-updated', { detail: { avatar_url: '' } }));
      
      toast({ title: 'Photo removed' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to remove photo', variant: 'destructive' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Change email handler
  const handleChangeEmail = async () => {
    if (!newEmail) {
      toast({ title: 'Error', description: 'Please enter a new email', variant: 'destructive' });
      return;
    }
    try {
      setDialogLoading(true);
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast({ title: 'Verification email sent', description: 'Please check your new email to confirm the change' });
      setShowEmailDialog(false);
      setNewEmail('');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to change email', variant: 'destructive' });
    } finally {
      setDialogLoading(false);
    }
  };

  // Change password handler
  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    try {
      setDialogLoading(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: 'Password updated successfully' });
      setShowPasswordDialog(false);
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to change password', variant: 'destructive' });
    } finally {
      setDialogLoading(false);
    }
  };

  // Invite member handler
  const handleInviteMember = async () => {
    if (!inviteEmail || !currentWorkspace) {
      toast({ title: 'Error', description: 'Please enter an email', variant: 'destructive' });
      return;
    }
    try {
      setDialogLoading(true);
      await api.inviteMember(currentWorkspace.id, inviteEmail, inviteRole);
      toast({ title: 'Invitation sent', description: `Invite sent to ${inviteEmail}` });
      setShowInviteDialog(false);
      setInviteEmail('');
      setInviteRole('member');
      // Refresh invitations list
      loadWorkspaceMembers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to send invite', variant: 'destructive' });
    } finally {
      setDialogLoading(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!currentWorkspace) return;
    try {
      await api.cancelInvitation(currentWorkspace.id, invitationId);
      toast({ title: 'Invitation cancelled' });
      loadWorkspaceMembers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to cancel invitation', variant: 'destructive' });
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!currentWorkspace) return;
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      await api.removeMember(currentWorkspace.id, memberUserId);
      toast({ title: 'Member removed' });
      loadWorkspaceMembers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to remove member', variant: 'destructive' });
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!currentWorkspace) return;
    if (!confirm(`Are you sure you want to leave "${currentWorkspace.name}"? You will lose access to all workspace content.`)) return;
    try {
      await api.leaveWorkspace(currentWorkspace.id);
      toast({ title: 'Left workspace successfully' });
      // Redirect to home or workspace selection
      navigate('/home');
      // Reload workspaces to update the list
      window.location.reload();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to leave workspace', variant: 'destructive' });
    }
  };

  const handleUpdateMemberRole = async (memberUserId: string, newRole: string) => {
    if (!currentWorkspace) return;
    try {
      await api.updateMemberRole(currentWorkspace.id, memberUserId, newRole);
      toast({ title: 'Role updated' });
      loadWorkspaceMembers();
      
      // Dispatch event to notify other components (like sidebar) about role change
      window.dispatchEvent(new CustomEvent('workspace-role-updated', { 
        detail: { workspaceId: currentWorkspace.id, userId: memberUserId, newRole } 
      }));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update role', variant: 'destructive' });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    // This would need backend support for full deletion
    toast({ title: 'Contact support', description: 'Please contact support to delete your account' });
    setShowDeleteAccountDialog(false);
  };

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  };

  const applyAccentColor = (color: string) => {
    // Use the proper theme utility that converts hex to HSL and updates CSS variables
    applyAccentColorTheme(color);
  };

  const applyFontSize = (size: 'small' | 'medium' | 'large') => {
    const sizes = { small: '14px', medium: '16px', large: '18px' };
    document.documentElement.style.fontSize = sizes[size];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const sidebarSections = [
    { id: 'account' as SettingsSection, label: 'Account', icon: User, category: 'Account' },
    { id: 'preferences' as SettingsSection, label: 'Preferences', icon: Palette, category: 'Account' },
    { id: 'notifications' as SettingsSection, label: 'Notifications', icon: Bell, category: 'Account' },
    { id: 'connections' as SettingsSection, label: 'Connections', icon: Link2, category: 'Account' },
    { id: 'workspace' as SettingsSection, label: 'General', icon: Globe, category: 'Workspace' },
    { id: 'people' as SettingsSection, label: 'People', icon: Users, category: 'Workspace' },
    { id: 'ai' as SettingsSection, label: 'Axora AI', icon: Infinity, category: 'Workspace' },
    { id: 'import' as SettingsSection, label: 'Import', icon: Download, category: 'Workspace' },
  ];

  const handleSectionClick = (sectionId: SettingsSection) => {
    if (sectionId === 'billing') {
      // Navigate to subscription page with workspace_id
      if (currentWorkspace?.id) {
        navigate(`/workspace/${currentWorkspace.id}/subscription`);
      } else {
        navigate('/subscription');
      }
    } else {
      setActiveSection(sectionId);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-64 border-b md:border-r md:border-b-0 border-border bg-card/30 p-4 flex flex-col">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-3 py-2 mb-4 md:mb-6 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" /> Close
        </button>

        {/* Mobile: Horizontal scroll tabs */}
        <div className="md:hidden flex gap-2 overflow-x-auto pb-2 mb-4 hide-scrollbar">
          {sidebarSections.map((section) => (
            <button key={section.id} onClick={() => handleSectionClick(section.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors flex-shrink-0 ${
                activeSection === section.id ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/50'
              }`}>
              <section.icon className="w-4 h-4" /> {section.label}
            </button>
          ))}
          {/* Billing & Plans button */}
          <button onClick={() => currentWorkspace?.id ? navigate(`/workspace/${currentWorkspace.id}/subscription`) : navigate('/subscription')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors flex-shrink-0 text-muted-foreground hover:bg-secondary/50">
            <CreditCard className="w-4 h-4" /> Billing & Plans
          </button>
        </div>

        {/* Desktop: Vertical menu */}
        <div className="hidden md:block">
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-muted-foreground px-3 mb-2 uppercase tracking-wider">Account</h2>
            {sidebarSections.filter(s => s.category === 'Account').map((section) => (
              <button key={section.id} onClick={() => handleSectionClick(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeSection === section.id ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/50'
                }`}>
                <section.icon className="w-4 h-4" /> {section.label}
              </button>
            ))}
          </div>

          <div className="mb-6">
            <h2 className="text-xs font-semibold text-muted-foreground px-3 mb-2 uppercase tracking-wider">Workspace</h2>
            {sidebarSections.filter(s => s.category === 'Workspace').map((section) => (
              <button key={section.id} onClick={() => handleSectionClick(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeSection === section.id ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/50'
                }`}>
                <section.icon className="w-4 h-4" /> {section.label}
              </button>
            ))}
            {/* Billing & Plans button */}
            <button onClick={() => currentWorkspace?.id ? navigate(`/workspace/${currentWorkspace.id}/subscription`) : navigate('/subscription')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-muted-foreground hover:bg-secondary/50">
              <CreditCard className="w-4 h-4" /> Billing & Plans
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4 sm:p-6 md:p-12">
          
          {/* ==================== ACCOUNT TAB ==================== */}
          {activeSection === 'account' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <h1 className="text-3xl font-bold text-foreground">Account</h1>

              {/* Profile Section */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Profile</Label>
                <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                  <div className="relative group mx-auto sm:mx-0">
                    {settings.avatar_url ? (
                      <img src={settings.avatar_url} alt="Profile" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-border" />
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/10 flex items-center justify-center border-2 border-border">
                        <span className="text-2xl sm:text-3xl font-bold text-primary">{settings.full_name?.charAt(0) || user?.email?.charAt(0) || 'A'}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-3 w-full">
                    <div>
                      <Label className="text-sm text-muted-foreground">Display Name</Label>
                      <Input value={settings.full_name} onChange={(e) => updateLocalSettings({ full_name: e.target.value })} 
                        placeholder="Enter your name" className="mt-1 w-full sm:max-w-md" />
                    </div>
                    <p className="text-sm text-muted-foreground break-all">{user?.email}</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button variant="outline" size="sm" disabled={uploadingPhoto} onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file'; input.accept = 'image/*';
                        input.onchange = (e) => handlePhotoUpload(e as any);
                        input.click();
                      }} className="w-full sm:w-auto">
                        {uploadingPhoto ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                        {uploadingPhoto ? 'Uploading...' : 'Upload photo'}
                      </Button>
                      {settings.avatar_url && (
                        <Button variant="outline" size="sm" onClick={handleRemovePhoto} disabled={uploadingPhoto} className="w-full sm:w-auto">
                          <Trash2 className="w-4 h-4 mr-2" />Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Security Section */}
              <div className="space-y-4 pt-6 border-t border-border">
                <h3 className="text-lg font-semibold">Account Security</h3>
                
                {/* Email */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-muted-foreground break-all">{user?.email}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowEmailDialog(true)} className="w-full sm:w-auto">Change email</Button>
                </div>

                {/* Password */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="font-medium">Password</p>
                      <p className="text-sm text-muted-foreground">Set a permanent password to login</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(true)} className="w-full sm:w-auto">
                    {user?.user_metadata?.has_password ? 'Change password' : 'Add password'}
                  </Button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="space-y-4 pt-6 border-t border-border">
                <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 bg-destructive/5 rounded-lg px-4">
                  <div>
                    <p className="font-medium">Delete Account</p>
                    <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => setShowDeleteAccountDialog(true)} className="w-full sm:w-auto">Delete Account</Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border">
                <Button variant="outline" onClick={handleLogout} className="w-full sm:w-auto"><LogOut className="w-4 h-4 mr-2" />Log out</Button>
                {hasChanges && (
                  <Button onClick={saveSettings} disabled={saving} className="w-full sm:w-auto">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {/* ==================== PREFERENCES TAB ==================== */}
          {activeSection === 'preferences' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Preferences</h1>
                <p className="text-muted-foreground mt-1">Customize your experience</p>
              </div>

              {/* Theme */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Theme</Label>
                <p className="text-sm text-muted-foreground">Choose how Axora looks to you</p>
                <div className="flex gap-3">
                  {(['light', 'dark', 'system'] as const).map((theme) => (
                    <button key={theme} onClick={() => updateLocalSettings({ theme })}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                        settings.theme === theme 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}>
                      <div className={`w-full h-20 rounded-lg mb-3 ${
                        theme === 'light' ? 'bg-white border' : theme === 'dark' ? 'bg-zinc-900' : 'bg-gradient-to-r from-white to-zinc-900'
                      }`} />
                      <p className="font-medium capitalize">{theme}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Font Size</Label>
                <p className="text-sm text-muted-foreground">Adjust text size for better readability across the workspace</p>
                <div className="grid grid-cols-3 gap-3">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button 
                      key={size} 
                      onClick={() => updateLocalSettings({ font_size: size })}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all capitalize flex flex-col items-center gap-2",
                        settings.font_size === size 
                          ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20' 
                          : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                      )}
                    >
                      <div className="text-center">
                        <div 
                          className="font-semibold mb-1"
                          style={{ fontSize: size === 'small' ? '14px' : size === 'large' ? '18px' : '16px' }}
                        >
                          Aa
                        </div>
                        <div className="text-xs opacity-75">{size}</div>
                      </div>
                      {settings.font_size === size && (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p 
                    className="text-foreground"
                    style={{ 
                      fontSize: settings.font_size === 'small' ? '14px' : settings.font_size === 'large' ? '18px' : '16px' 
                    }}
                  >
                    Preview: This is how your text will look with the selected font size.
                  </p>
                </div>
              </div>

              {/* Accent Color */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Accent Color</Label>
                <p className="text-sm text-muted-foreground">Choose your preferred accent color for the workspace</p>
                <div className="grid grid-cols-9 gap-2">
                  {[
                    { color: '#8B5CF6', name: 'Purple' },
                    { color: '#3B82F6', name: 'Blue' },
                    { color: '#0EA5E9', name: 'Sky' },
                    { color: '#06B6D4', name: 'Cyan' },
                    { color: '#14B8A6', name: 'Teal' },
                    { color: '#10B981', name: 'Green' },
                    { color: '#84CC16', name: 'Lime' },
                    { color: '#EAB308', name: 'Yellow' },
                    { color: '#F59E0B', name: 'Amber' },
                    { color: '#F97316', name: 'Orange' },
                    { color: '#EF4444', name: 'Red' },
                    { color: '#F43F5E', name: 'Rose' },
                    { color: '#EC4899', name: 'Pink' },
                    { color: '#D946EF', name: 'Fuchsia' },
                    { color: '#A855F7', name: 'Violet' },
                    { color: '#6366F1', name: 'Indigo' },
                    { color: '#64748B', name: 'Slate' },
                    { color: '#6B7280', name: 'Gray' },
                  ].map(({ color, name }) => (
                    <button 
                      key={color} 
                      onClick={() => updateLocalSettings({ accent_color: color })}
                      className={cn(
                        "w-12 h-12 rounded-xl border-2 transition-all flex items-center justify-center hover:scale-110",
                        settings.accent_color === color 
                          ? 'border-foreground ring-2 ring-offset-2 ring-foreground scale-110' 
                          : 'border-border hover:border-foreground/50'
                      )} 
                      style={{ backgroundColor: color }} 
                      title={name}
                    >
                      {settings.accent_color === color && <Check className="w-5 h-5 text-white drop-shadow-lg" />}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <div 
                    className="w-16 h-16 rounded-xl border-2 border-border shadow-sm"
                    style={{ backgroundColor: settings.accent_color }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Current Color</p>
                    <p className="text-xs text-muted-foreground">{settings.accent_color}</p>
                  </div>
                </div>
              </div>

              {/* Mobile App Installation */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Mobile App</Label>
                <p className="text-sm text-muted-foreground">Install Axora as a mobile app for offline access and better performance</p>
                <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-border bg-secondary/30">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Progressive Web App</p>
                    <p className="text-sm text-muted-foreground">Works offline, faster loading, push notifications</p>
                  </div>
                  <InstallButton />
                </div>
              </div>

              <Button onClick={saveSettings} disabled={saving || !hasChanges} className="mt-6">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Preferences
              </Button>
            </motion.div>
          )}

          {/* ==================== NOTIFICATIONS TAB ==================== */}
          {activeSection === 'notifications' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
                <p className="text-muted-foreground mt-1">Manage how you receive notifications</p>
              </div>

              {/* Browser Notification Permission */}
              <div className="p-6 border border-border rounded-xl bg-card space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bell className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">Browser Notifications</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Enable browser notifications to receive real-time alerts for tasks, mentions, and updates even when the app is in the background.
                    </p>
                    <NotificationPermissionButton />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {[
                  { key: 'email_notifications', label: 'Email Notifications', desc: 'Receive important updates via email', icon: Mail },
                  { key: 'task_reminders', label: 'Task Reminders', desc: 'Get reminded about upcoming and overdue tasks', icon: Bell },
                  { key: 'skill_updates', label: 'Skill Progress Updates', desc: 'Notifications when your skills level up', icon: CheckCircle },
                  { key: 'ai_suggestions', label: 'AI Suggestions', desc: 'Receive AI-powered learning suggestions', icon: Infinity },
                  { key: 'weekly_digest', label: 'Weekly Digest', desc: 'Get a weekly summary of your progress', icon: Mail },
                  { key: 'mentions', label: 'Mentions', desc: 'Get notified when someone mentions you', icon: User },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-4 px-4 rounded-lg hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                    <Switch checked={settings[item.key as keyof UserSettings] as boolean}
                      onCheckedChange={(checked) => updateLocalSettings({ [item.key]: checked })} />
                  </div>
                ))}
              </div>

              <Button onClick={saveSettings} disabled={saving || !hasChanges}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Notification Settings
              </Button>
            </motion.div>
          )}

          {/* ==================== CONNECTIONS TAB ==================== */}
          {activeSection === 'connections' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Connections</h1>
                <p className="text-muted-foreground mt-1">Connect external services and integrations</p>
              </div>

              <div className="space-y-4">
                {[
                  { name: 'Google Drive', desc: 'Import documents from Google Drive', icon: '📁', connected: false },
                  { name: 'Notion', desc: 'Import pages from Notion', icon: '📝', connected: false },
                  { name: 'GitHub', desc: 'Connect your repositories', icon: '🐙', connected: false },
                  { name: 'Slack', desc: 'Get notifications in Slack', icon: '💬', connected: false },
                ].map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-4 border border-border rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-2xl">
                        {service.icon}
                      </div>
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground">{service.desc}</p>
                      </div>
                    </div>
                    <Button variant={service.connected ? "outline" : "default"} size="sm">
                      {service.connected ? 'Disconnect' : 'Connect'}
                    </Button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ==================== WORKSPACE GENERAL TAB ==================== */}
          {activeSection === 'workspace' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Workspace Settings</h1>
                <p className="text-muted-foreground mt-1">Manage your workspace configuration</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Workspace Name</Label>
                  <Input value={workspaceName} onChange={(e) => { setWorkspaceName(e.target.value); setWsHasChanges(true); }} 
                    placeholder="Enter workspace name" className="max-w-md" />
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold">Description</Label>
                  <textarea value={workspaceDesc} onChange={(e) => { setWorkspaceDesc(e.target.value); setWsHasChanges(true); }}
                    placeholder="Describe your workspace"
                    className="w-full max-w-md px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px] resize-none" />
                </div>

                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between py-4 px-4 rounded-lg border border-border">
                    <div>
                      <p className="font-medium">Public Workspace</p>
                      <p className="text-sm text-muted-foreground">Allow anyone with the link to view this workspace</p>
                    </div>
                    <Switch checked={wsPublic} onCheckedChange={(v) => { setWsPublic(v); setWsHasChanges(true); }} />
                  </div>

                  <div className="flex items-center justify-between py-4 px-4 rounded-lg border border-border">
                    <div>
                      <p className="font-medium">Allow Member Invites</p>
                      <p className="text-sm text-muted-foreground">Members can invite others to this workspace</p>
                    </div>
                    <Switch checked={wsAllowInvites} onCheckedChange={(v) => { setWsAllowInvites(v); setWsHasChanges(true); }} />
                  </div>
                </div>

                {/* Workspace ID for sharing */}
                <div className="space-y-2 pt-4">
                  <Label className="text-base font-semibold">Workspace ID</Label>
                  <div className="flex gap-2 max-w-md">
                    <Input value={currentWorkspace?.id || ''} readOnly className="font-mono text-sm" />
                    <Button variant="outline" size="icon" onClick={() => {
                      navigator.clipboard.writeText(currentWorkspace?.id || '');
                      toast({ title: 'Copied to clipboard' });
                    }}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <Button onClick={saveWorkspaceSettings} disabled={saving || !wsHasChanges}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Workspace Settings
              </Button>
            </motion.div>
          )}

          {/* ==================== PEOPLE TAB ==================== */}
          {activeSection === 'people' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground">People</h1>
                <p className="text-muted-foreground mt-1">Manage workspace members and permissions</p>
              </div>

              <Button onClick={() => setShowInviteDialog(true)}>
                <Users className="w-4 h-4 mr-2" />Invite Members
              </Button>

              {/* Current Members */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Members ({workspaceMembers.length})</h3>
                {loadingMembers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="border border-border rounded-xl divide-y divide-border">
                    {workspaceMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          {member.avatar_url ? (
                            <img src={member.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="font-bold text-primary">{member.full_name?.charAt(0) || member.email?.charAt(0) || 'U'}</span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{member.full_name || member.email?.split('@')[0]}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.role === 'owner' ? (
                            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">Owner</span>
                          ) : (
                            <>
                              <select
                                value={member.role}
                                onChange={(e) => handleUpdateMemberRole(member.user_id, e.target.value)}
                                className="px-2 py-1 bg-background border border-border rounded text-sm"
                              >
                                <option value="admin">Admin</option>
                                <option value="member">Member</option>
                                <option value="viewer">Viewer</option>
                              </select>
                              <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(member.user_id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {workspaceMembers.length === 0 && (
                      <div className="p-4 text-center text-muted-foreground">
                        No members yet. Invite someone to collaborate!
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Pending Invitations */}
              {pendingInvitations.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Pending Invitations ({pendingInvitations.length})</h3>
                  <div className="border border-border rounded-xl divide-y divide-border">
                    {pendingInvitations.map((invitation) => (
                      <div key={invitation.id} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                            <Mail className="w-5 h-5 text-yellow-500" />
                          </div>
                          <div>
                            <p className="font-medium">{invitation.email}</p>
                            <p className="text-sm text-muted-foreground">Invited as {invitation.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded text-xs">Pending</span>
                          <Button variant="ghost" size="sm" onClick={() => handleCancelInvitation(invitation.id)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Leave Workspace Section - Only show if user is not the owner */}
              {!isOwner() && (
                <div className="space-y-4 pt-6 border-t border-border">
                  <h3 className="text-lg font-semibold text-destructive">Leave Workspace</h3>
                  <div className="flex items-center justify-between py-4 bg-destructive/5 rounded-lg px-4">
                    <div>
                      <p className="font-medium">Leave "{currentWorkspace?.name}"</p>
                      <p className="text-sm text-muted-foreground">You will lose access to all workspace content</p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={handleLeaveWorkspace}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Leave Workspace
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ==================== AI SETTINGS TAB ==================== */}
          {activeSection === 'ai' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Axora AI</h1>
                <p className="text-muted-foreground mt-1">Configure AI behavior and preferences</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Default AI Model</Label>
                  <p className="text-sm text-muted-foreground">Choose the AI model for Ask Anything</p>
                  <select value={settings.default_ai_model} onChange={(e) => updateLocalSettings({ default_ai_model: e.target.value })}
                    className="w-full max-w-md px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                    {availableModels.length > 0 ? availableModels.map((model) => (
                      <option key={model} value={model}>{model}</option>
                    )) : (
                      <>
                        <option value="gpt-4o-mini">GPT-4o Mini (Fast)</option>
                        <option value="gpt-4o">GPT-4o (Powerful)</option>
                        <option value="gemini-pro">Gemini Pro</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-2 pt-4">
                  {[
                    { key: 'auto_suggest', label: 'Auto-Suggest', desc: 'Automatically suggest actions and learning paths' },
                    { key: 'context_awareness', label: 'Context Awareness', desc: 'Use your workspace content for better responses' },
                    { key: 'streaming_responses', label: 'Streaming Responses', desc: 'Show AI responses as they are generated' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-4 px-4 rounded-lg border border-border">
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch checked={settings[item.key as keyof UserSettings] as boolean}
                        onCheckedChange={(checked) => updateLocalSettings({ [item.key]: checked })} />
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={saveSettings} disabled={saving || !hasChanges}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save AI Settings
              </Button>
            </motion.div>
          )}

          {/* ==================== IMPORT TAB ==================== */}
          {activeSection === 'import' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Import</h1>
                <p className="text-muted-foreground mt-1">Import data from other platforms</p>
              </div>

              <div className="grid gap-4">
                {[
                  { name: 'Notion', desc: 'Import pages and databases from Notion', icon: '📝' },
                  { name: 'Markdown Files', desc: 'Import .md files from your computer', icon: '📄' },
                  { name: 'Evernote', desc: 'Import notes from Evernote', icon: '🐘' },
                  { name: 'Google Docs', desc: 'Import documents from Google Docs', icon: '📑' },
                ].map((source) => (
                  <div key={source.name} className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-2xl">
                        {source.icon}
                      </div>
                      <div>
                        <p className="font-medium">{source.name}</p>
                        <p className="text-sm text-muted-foreground">{source.desc}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />Import
                    </Button>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-secondary/30 rounded-xl">
                <p className="text-sm text-muted-foreground">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  Import features are coming soon. Stay tuned for updates!
                </p>
              </div>
            </motion.div>
          )}

        </div>
      </div>

      {/* ==================== DIALOGS ==================== */}
      
      {/* Change Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Email</DialogTitle>
            <DialogDescription>Enter your new email address. You'll receive a verification link.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Email</Label>
              <Input value={user?.email || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>New Email</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Enter new email" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>Cancel</Button>
            <Button onClick={handleChangeEmail} disabled={dialogLoading}>
              {dialogLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Send Verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Enter a new password for your account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input type={showPassword ? 'text' : 'password'} value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
            </div>
            {newPassword && newPassword.length < 6 && (
              <p className="text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Password must be at least 6 characters
              </p>
            )}
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Passwords do not match
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowPasswordDialog(false); setNewPassword(''); setConfirmPassword(''); }}>Cancel</Button>
            <Button onClick={handleChangePassword} disabled={dialogLoading || newPassword.length < 6 || newPassword !== confirmPassword}>
              {dialogLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>Invite someone to join your workspace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} 
                placeholder="colleague@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <select 
                value={inviteRole} 
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="viewer">Viewer - Can view content</option>
                <option value="member">Member - Can edit content</option>
                <option value="admin">Admin - Can manage members</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
            <Button onClick={handleInviteMember} disabled={dialogLoading || !inviteEmail}>
              {dialogLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All your data will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm">
                <AlertCircle className="w-4 h-4 inline mr-2 text-destructive" />
                You will lose access to all your workspaces, pages, skills, and learning progress.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteAccountDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              <Trash2 className="w-4 h-4 mr-2" />Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
