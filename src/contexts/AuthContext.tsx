import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { offlineDB } from '@/lib/offline-db';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const previousUserId = user?.id;
      const newUserId = session?.user?.id;
      
      // If user changed (different user logged in), clear cache
      if (event === 'SIGNED_IN' && previousUserId && newUserId && previousUserId !== newUserId) {
        console.log('🔄 Different user detected, clearing cache...');
        try {
          await offlineDB.pages_local.clear();
          await offlineDB.tasks_local.clear();
          await offlineDB.skills_local.clear();
          await offlineDB.sync_queue.clear();
          await offlineDB.sync_state.clear();
          console.log('✅ Cache cleared for new user');
        } catch (error) {
          console.error('Failed to clear cache:', error);
        }
      }
      
      // If signed out, clear cache
      if (event === 'SIGNED_OUT') {
        console.log('🔄 User signed out, clearing cache...');
        try {
          await offlineDB.pages_local.clear();
          await offlineDB.tasks_local.clear();
          await offlineDB.skills_local.clear();
          await offlineDB.sync_queue.clear();
          await offlineDB.sync_state.clear();
          console.log('✅ Cache cleared');
        } catch (error) {
          console.error('Failed to clear cache:', error);
        }
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [user?.id]);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    navigate('/ask');
  };

  const signOut = async () => {
    // Clear IndexedDB cache before signing out
    try {
      await offlineDB.pages_local.clear();
      await offlineDB.tasks_local.clear();
      await offlineDB.skills_local.clear();
      await offlineDB.sync_queue.clear();
      await offlineDB.sync_state.clear();
      console.log('✅ IndexedDB cache cleared on logout');
    } catch (error) {
      console.error('Failed to clear IndexedDB:', error);
    }
    
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
