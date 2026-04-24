import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export function InvitationPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'pending' | 'accepted' | 'declined' | 'error'>('pending');
  const [errorMessage, setErrorMessage] = useState('');

  const handleAccept = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const result = await api.acceptInvitation(token);
      setStatus('accepted');
      toast({ title: 'Welcome!', description: result.message });
      
      // Navigate to the workspace after a short delay
      setTimeout(() => {
        navigate(`/workspace/${result.workspace_id}`);
      }, 1500);
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'Failed to accept invitation');
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!token) return;
    try {
      setLoading(true);
      await api.declineInvitation(token);
      setStatus('declined');
      toast({ title: 'Invitation declined' });
      
      setTimeout(() => {
        navigate('/home');
      }, 1500);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // If not logged in, redirect to login with return URL
  useEffect(() => {
    if (!user) {
      navigate(`/login?redirect=/invitation/${token}`);
    }
  }, [user, token, navigate]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center"
      >
        {status === 'pending' && (
          <>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Workspace Invitation</h1>
            <p className="text-muted-foreground mb-8">
              You've been invited to join a workspace. Would you like to accept?
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handleDecline} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
                Decline
              </Button>
              <Button onClick={handleAccept} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                Accept Invitation
              </Button>
            </div>
          </>
        )}

        {status === 'accepted' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6"
            >
              <Check className="w-8 h-8 text-green-500" />
            </motion.div>
            <h1 className="text-2xl font-bold mb-2">Welcome!</h1>
            <p className="text-muted-foreground">
              You've successfully joined the workspace. Redirecting...
            </p>
          </>
        )}

        {status === 'declined' && (
          <>
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <X className="w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Invitation Declined</h1>
            <p className="text-muted-foreground">
              You've declined the invitation. Redirecting...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">{errorMessage}</p>
            <Button onClick={() => navigate('/home')}>Go to Home</Button>
          </>
        )}
      </motion.div>
    </div>
  );
}
