import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export interface UserSettings {
  id?: string;
  user_id?: string;
  full_name?: string;
  avatar_url?: string;
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

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await api.getUserSettings();
      setSettings({ ...defaultSettings, ...data });
      
      // Apply theme on load
      applyTheme(data.theme || 'dark');
    } catch (error) {
      console.error('Error loading settings:', error);
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user, loadSettings]);

  return { settings, loading, refreshSettings: loadSettings };
}

// Helper to apply theme
function applyTheme(theme: 'light' | 'dark' | 'system') {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (theme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', prefersDark);
  }
}
