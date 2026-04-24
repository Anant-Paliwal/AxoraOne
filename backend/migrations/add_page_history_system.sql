-- Page History System (Notion-style version history)
-- Auto-cleanup after 7 days

-- Create page_history table
CREATE TABLE IF NOT EXISTS page_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Snapshot data
    title TEXT NOT NULL,
    content JSONB DEFAULT '[]'::jsonb,
    blocks JSONB DEFAULT '[]'::jsonb,
    icon TEXT,
    cover_image TEXT,
    
    -- Metadata
    change_type TEXT NOT NULL DEFAULT 'edit', -- 'edit', 'create', 'restore'
    change_summary TEXT, -- Brief description of what changed
    version_number INTEGER NOT NULL DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- Indexes
    CONSTRAINT page_history_page_version_unique UNIQUE (page_id, version_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_page_history_page_id ON page_history(page_id);
CREATE INDEX IF NOT EXISTS idx_page_history_workspace_id ON page_history(workspace_id);
CREATE INDEX IF NOT EXISTS idx_page_history_created_at ON page_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_history_expires_at ON page_history(expires_at);

-- RLS Policies
ALTER TABLE page_history ENABLE ROW LEVEL SECURITY;

-- Users can view history of pages in their workspace
CREATE POLICY "Users can view page history in their workspace"
    ON page_history FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Users can create history entries for pages they can edit
CREATE POLICY "Users can create page history"
    ON page_history FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Function to auto-create history on page update
CREATE OR REPLACE FUNCTION create_page_history()
RETURNS TRIGGER AS $$
DECLARE
    next_version INTEGER;
    change_desc TEXT;
BEGIN
    -- Skip if page is being deleted
    IF NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    -- Skip on INSERT (only track updates)
    IF TG_OP = 'INSERT' THEN
        RETURN NEW;
    END IF;
    
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 
    INTO next_version
    FROM page_history 
    WHERE page_id = NEW.id;
    
    -- Determine change type
    IF OLD.title != NEW.title THEN
        change_desc := 'Title changed';
    ELSIF OLD.content::text != NEW.content::text THEN
        change_desc := 'Content updated';
    ELSIF OLD.blocks::text != NEW.blocks::text THEN
        change_desc := 'Blocks updated';
    ELSE
        change_desc := 'Page updated';
    END IF;
    
    -- Create history entry with OLD values (before the change)
    INSERT INTO page_history (
        page_id,
        workspace_id,
        user_id,
        title,
        content,
        blocks,
        icon,
        cover_image,
        change_type,
        change_summary,
        version_number,
        expires_at
    ) VALUES (
        NEW.id,
        NEW.workspace_id,
        COALESCE(NEW.updated_by, NEW.created_by, NEW.user_id),
        OLD.title,
        OLD.content,
        OLD.blocks,
        OLD.icon,
        OLD.cover_image,
        'edit',
        change_desc,
        next_version,
        NOW() + INTERVAL '7 days'
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the update
        RAISE WARNING 'Failed to create page history: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create history on page updates
DROP TRIGGER IF EXISTS trigger_create_page_history ON pages;
CREATE TRIGGER trigger_create_page_history
    BEFORE UPDATE ON pages
    FOR EACH ROW
    WHEN (
        OLD.title IS DISTINCT FROM NEW.title OR
        OLD.content IS DISTINCT FROM NEW.content OR
        OLD.blocks IS DISTINCT FROM NEW.blocks OR
        OLD.icon IS DISTINCT FROM NEW.icon OR
        OLD.cover_image IS DISTINCT FROM NEW.cover_image
    )
    EXECUTE FUNCTION create_page_history();

-- Function to restore page from history
CREATE OR REPLACE FUNCTION restore_page_from_history(
    history_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
    history_record RECORD;
    result JSONB;
BEGIN
    -- Get history record
    SELECT * INTO history_record
    FROM page_history
    WHERE id = history_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'History record not found'
        );
    END IF;
    
    -- Restore page to this version
    UPDATE pages
    SET
        title = history_record.title,
        content = history_record.content,
        blocks = history_record.blocks,
        icon = history_record.icon,
        cover_image = history_record.cover_image,
        updated_at = NOW(),
        updated_by = auth.uid()
    WHERE id = history_record.page_id;
    
    -- Create a new history entry for the restore action
    INSERT INTO page_history (
        page_id,
        workspace_id,
        user_id,
        title,
        content,
        blocks,
        icon,
        cover_image,
        change_type,
        change_summary,
        version_number
    )
    SELECT
        page_id,
        workspace_id,
        auth.uid(),
        title,
        content,
        blocks,
        icon,
        cover_image,
        'restore',
        'Restored to version ' || version_number,
        (SELECT COALESCE(MAX(version_number), 0) + 1 FROM page_history WHERE page_id = history_record.page_id)
    FROM page_history
    WHERE id = history_id_param;
    
    RETURN jsonb_build_object(
        'success', true,
        'page_id', history_record.page_id,
        'restored_version', history_record.version_number
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired history (run daily via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_page_history()
RETURNS JSONB AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM page_history
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', true,
        'deleted_count', deleted_count,
        'cleaned_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get page history with diff info
CREATE OR REPLACE FUNCTION get_page_history_with_diff(
    page_id_param UUID,
    limit_param INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    version_number INTEGER,
    user_id UUID,
    user_email TEXT,
    change_type TEXT,
    change_summary TEXT,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_current BOOLEAN,
    days_until_expiry INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ph.id,
        ph.version_number,
        ph.user_id,
        u.email as user_email,
        ph.change_type,
        ph.change_summary,
        ph.created_at,
        ph.expires_at,
        (ph.version_number = (SELECT MAX(ph2.version_number) FROM page_history ph2 WHERE ph2.page_id = page_id_param)) as is_current,
        EXTRACT(DAY FROM (ph.expires_at - NOW()))::INTEGER as days_until_expiry
    FROM page_history ph
    LEFT JOIN auth.users u ON ph.user_id = u.id
    WHERE ph.page_id = page_id_param
    ORDER BY ph.version_number DESC
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT ON page_history TO authenticated;
GRANT EXECUTE ON FUNCTION restore_page_from_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_page_history_with_diff TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_page_history TO service_role;

-- Create a scheduled job to cleanup expired history (if pg_cron is available)
-- Run this separately if you have pg_cron extension:
-- SELECT cron.schedule('cleanup-page-history', '0 2 * * *', 'SELECT cleanup_expired_page_history()');

COMMENT ON TABLE page_history IS 'Stores page version history with 7-day auto-cleanup';
COMMENT ON FUNCTION cleanup_expired_page_history IS 'Removes page history older than 7 days';
COMMENT ON FUNCTION restore_page_from_history IS 'Restores a page to a previous version';
