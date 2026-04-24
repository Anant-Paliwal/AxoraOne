-- ============================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- Creates user_settings and workspace_settings tables
-- for real-time settings sync
-- ============================================

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'system')),
    accent_color TEXT DEFAULT '#8B5CF6',
    font_size TEXT DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large')),
    email_notifications BOOLEAN DEFAULT true,
    task_reminders BOOLEAN DEFAULT true,
    skill_updates BOOLEAN DEFAULT true,
    ai_suggestions BOOLEAN DEFAULT true,
    weekly_digest BOOLEAN DEFAULT false,
    mentions BOOLEAN DEFAULT true,
    default_ai_model TEXT DEFAULT 'gpt-4o-mini',
    auto_suggest BOOLEAN DEFAULT true,
    context_awareness BOOLEAN DEFAULT true,
    streaming_responses BOOLEAN DEFAULT true,
    profile_visibility TEXT DEFAULT 'private',
    show_activity_status BOOLEAN DEFAULT true,
    default_workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    sidebar_collapsed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create workspace_settings table
CREATE TABLE IF NOT EXISTS workspace_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT false,
    allow_invites BOOLEAN DEFAULT true,
    default_page_icon TEXT DEFAULT '📄',
    default_page_template_id UUID,
    workspace_ai_model TEXT,
    ai_context_scope TEXT DEFAULT 'workspace',
    mute_notifications BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_settings_workspace_id ON workspace_settings(workspace_id);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_settings
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON user_settings;

CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own settings" ON user_settings FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for workspace_settings
DROP POLICY IF EXISTS "Users can view own workspace settings" ON workspace_settings;
DROP POLICY IF EXISTS "Users can insert own workspace settings" ON workspace_settings;
DROP POLICY IF EXISTS "Users can update own workspace settings" ON workspace_settings;
DROP POLICY IF EXISTS "Users can delete own workspace settings" ON workspace_settings;

CREATE POLICY "Users can view own workspace settings" ON workspace_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workspace settings" ON workspace_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workspace settings" ON workspace_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workspace settings" ON workspace_settings FOR DELETE USING (auth.uid() = user_id);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_settings_updated_at ON user_settings;
CREATE TRIGGER user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_settings_updated_at();

DROP TRIGGER IF EXISTS workspace_settings_updated_at ON workspace_settings;
CREATE TRIGGER workspace_settings_updated_at BEFORE UPDATE ON workspace_settings FOR EACH ROW EXECUTE FUNCTION update_settings_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE user_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE workspace_settings;

-- Grant service role access
GRANT ALL ON user_settings TO service_role;
GRANT ALL ON workspace_settings TO service_role;

SELECT 'Settings tables created successfully!' as status;


-- ============================================
-- STORAGE BUCKET FOR AVATARS
-- Run this separately if needed
-- ============================================

-- Create avatars bucket (run in Supabase Dashboard > Storage)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies for avatars bucket
-- Run these after creating the bucket:

-- DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
-- CREATE POLICY "Avatar images are publicly accessible"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'avatars');

-- DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
-- CREATE POLICY "Users can upload their own avatar"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
-- CREATE POLICY "Users can update their own avatar"
-- ON storage.objects FOR UPDATE
-- USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
-- CREATE POLICY "Users can delete their own avatar"
-- ON storage.objects FOR DELETE
-- USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
