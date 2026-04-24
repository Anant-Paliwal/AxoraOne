-- ============================================
-- USER SETTINGS TABLE
-- Stores all user preferences with real-time sync
-- ============================================

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Profile settings
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    
    -- Appearance settings
    theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'system')),
    accent_color TEXT DEFAULT '#8B5CF6',
    font_size TEXT DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large')),
    
    -- Notification settings
    email_notifications BOOLEAN DEFAULT true,
    task_reminders BOOLEAN DEFAULT true,
    skill_updates BOOLEAN DEFAULT true,
    ai_suggestions BOOLEAN DEFAULT true,
    weekly_digest BOOLEAN DEFAULT false,
    mentions BOOLEAN DEFAULT true,
    
    -- AI settings
    default_ai_model TEXT DEFAULT 'gpt-4o-mini',
    auto_suggest BOOLEAN DEFAULT true,
    context_awareness BOOLEAN DEFAULT true,
    streaming_responses BOOLEAN DEFAULT true,
    
    -- Privacy settings
    profile_visibility TEXT DEFAULT 'private' CHECK (profile_visibility IN ('public', 'private', 'workspace')),
    show_activity_status BOOLEAN DEFAULT true,
    
    -- Workspace preferences (per-user defaults)
    default_workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    sidebar_collapsed BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one settings row per user
    UNIQUE(user_id)
);

-- Create workspace_settings table for workspace-specific settings
CREATE TABLE IF NOT EXISTS workspace_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Workspace-specific preferences
    is_public BOOLEAN DEFAULT false,
    allow_invites BOOLEAN DEFAULT true,
    default_page_icon TEXT DEFAULT '📄',
    default_page_template_id UUID,
    
    -- AI settings for this workspace
    workspace_ai_model TEXT,
    ai_context_scope TEXT DEFAULT 'workspace' CHECK (ai_context_scope IN ('page', 'workspace', 'all')),
    
    -- Notification overrides for this workspace
    mute_notifications BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One settings row per user per workspace
    UNIQUE(workspace_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_settings_workspace_id ON workspace_settings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_settings_user_id ON workspace_settings(user_id);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON user_settings;

DROP POLICY IF EXISTS "Users can view own workspace settings" ON workspace_settings;
DROP POLICY IF EXISTS "Users can insert own workspace settings" ON workspace_settings;
DROP POLICY IF EXISTS "Users can update own workspace settings" ON workspace_settings;
DROP POLICY IF EXISTS "Users can delete own workspace settings" ON workspace_settings;

-- RLS Policies for user_settings
CREATE POLICY "Users can view own settings" ON user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings" ON user_settings
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for workspace_settings
CREATE POLICY "Users can view own workspace settings" ON workspace_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workspace settings" ON workspace_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workspace settings" ON workspace_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workspace settings" ON workspace_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS user_settings_updated_at ON user_settings;
CREATE TRIGGER user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_settings_updated_at();

DROP TRIGGER IF EXISTS workspace_settings_updated_at ON workspace_settings;
CREATE TRIGGER workspace_settings_updated_at
    BEFORE UPDATE ON workspace_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_settings_updated_at();

-- Function to create default settings for new users
CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_settings (user_id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for settings tables
ALTER PUBLICATION supabase_realtime ADD TABLE user_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE workspace_settings;

-- Grant service role access
GRANT ALL ON user_settings TO service_role;
GRANT ALL ON workspace_settings TO service_role;

SELECT 'User settings tables created successfully!' as status;
