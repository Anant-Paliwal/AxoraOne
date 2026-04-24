-- Enhanced Page History System (Notion 2026 Style)
-- Adds automated snapshots, subscription-based retention, and better tracking

-- Add new columns to page_history
ALTER TABLE page_history 
ADD COLUMN IF NOT EXISTS snapshot_type TEXT DEFAULT 'manual', -- 'auto', 'manual', 'pre_restore'
ADD COLUMN IF NOT EXISTS edited_by_name TEXT,
ADD COLUMN IF NOT EXISTS edited_by_email TEXT,
ADD COLUMN IF NOT EXISTS blocks_changed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS chars_added INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS chars_removed INTEGER DEFAULT 0;

-- Create index for auto-snapshot queries
CREATE INDEX IF NOT EXISTS idx_page_history_snapshot_type ON page_history(snapshot_type);
CREATE INDEX IF NOT EXISTS idx_page_history_page_created ON page_history(page_id, created_at DESC);

-- Function to calculate retention days based on user-level subscription
CREATE OR REPLACE FUNCTION get_retention_days(workspace_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    workspace_owner_id UUID;
    plan_name TEXT;
    retention_days INTEGER;
BEGIN
    -- Get workspace owner
    SELECT user_id INTO workspace_owner_id
    FROM workspaces
    WHERE id = workspace_id_param;
    
    IF workspace_owner_id IS NULL THEN
        RETURN 7; -- Default to free tier if workspace not found
    END IF;
    
    -- Get user's subscription plan name
    SELECT sp.name INTO plan_name
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = workspace_owner_id
    AND us.status = 'active'
    ORDER BY us.created_at DESC
    LIMIT 1;
    
    -- Set retention based on plan name
    CASE plan_name
        WHEN 'free' THEN retention_days := 7;
        WHEN 'plus', 'starter' THEN retention_days := 30;
        WHEN 'pro', 'professional' THEN retention_days := 90;
        WHEN 'business', 'enterprise' THEN retention_days := 36500; -- ~100 years (unlimited)
        ELSE retention_days := 7; -- Default to free tier
    END CASE;
    
    RETURN retention_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to auto-create history with better tracking
CREATE OR REPLACE FUNCTION create_page_history_enhanced()
RETURNS TRIGGER AS $$
DECLARE
    next_version INTEGER;
    change_desc TEXT;
    retention_days INTEGER;
    last_snapshot_time TIMESTAMPTZ;
    blocks_diff INTEGER;
    content_old_len INTEGER;
    content_new_len INTEGER;
    user_name TEXT;
    user_email TEXT;
BEGIN
    -- Skip if page is being deleted
    IF NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    -- Skip on INSERT (only track updates)
    IF TG_OP = 'INSERT' THEN
        RETURN NEW;
    END IF;
    
    -- Get retention days for workspace
    retention_days := get_retention_days(NEW.workspace_id);
    
    -- Check last auto-snapshot time (10-minute rule)
    SELECT created_at INTO last_snapshot_time
    FROM page_history
    WHERE page_id = NEW.id
    AND snapshot_type = 'auto'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Skip if last auto-snapshot was less than 10 minutes ago
    IF last_snapshot_time IS NOT NULL 
       AND (NOW() - last_snapshot_time) < INTERVAL '10 minutes' THEN
        RETURN NEW;
    END IF;
    
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 
    INTO next_version
    FROM page_history 
    WHERE page_id = NEW.id;
    
    -- Calculate changes
    blocks_diff := COALESCE(jsonb_array_length(NEW.blocks), 0) - COALESCE(jsonb_array_length(OLD.blocks), 0);
    content_old_len := LENGTH(COALESCE(OLD.content::text, ''));
    content_new_len := LENGTH(COALESCE(NEW.content::text, ''));
    
    -- Determine change description
    IF OLD.title IS DISTINCT FROM NEW.title THEN
        change_desc := 'Title changed from "' || OLD.title || '" to "' || NEW.title || '"';
    ELSIF blocks_diff != 0 THEN
        change_desc := ABS(blocks_diff) || ' block(s) ' || CASE WHEN blocks_diff > 0 THEN 'added' ELSE 'removed' END;
    ELSIF content_new_len != content_old_len THEN
        change_desc := ABS(content_new_len - content_old_len) || ' character(s) ' || CASE WHEN content_new_len > content_old_len THEN 'added' ELSE 'removed' END;
    ELSE
        change_desc := 'Page updated';
    END IF;
    
    -- Get user info
    SELECT raw_user_meta_data->>'full_name', email
    INTO user_name, user_email
    FROM auth.users
    WHERE id = COALESCE(NEW.updated_by, NEW.created_by, NEW.user_id)
    LIMIT 1;
    
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
        snapshot_type,
        edited_by_name,
        edited_by_email,
        blocks_changed,
        chars_added,
        chars_removed,
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
        'auto',
        user_name,
        user_email,
        ABS(blocks_diff),
        CASE WHEN content_new_len > content_old_len THEN content_new_len - content_old_len ELSE 0 END,
        CASE WHEN content_old_len > content_new_len THEN content_old_len - content_new_len ELSE 0 END,
        NOW() + (retention_days || ' days')::INTERVAL
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the update
        RAISE WARNING 'Failed to create page history: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger to use enhanced function
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
    EXECUTE FUNCTION create_page_history_enhanced();

-- Enhanced restore function with pre-restore snapshot
CREATE OR REPLACE FUNCTION restore_page_from_history_enhanced(
    history_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
    history_record RECORD;
    current_page RECORD;
    next_version INTEGER;
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
    
    -- Get current page state
    SELECT * INTO current_page
    FROM pages
    WHERE id = history_record.page_id;
    
    -- Create pre-restore snapshot of current state
    SELECT COALESCE(MAX(version_number), 0) + 1 
    INTO next_version
    FROM page_history 
    WHERE page_id = history_record.page_id;
    
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
        snapshot_type
    ) VALUES (
        current_page.id,
        current_page.workspace_id,
        auth.uid(),
        current_page.title,
        current_page.content,
        current_page.blocks,
        current_page.icon,
        current_page.cover_image,
        'pre_restore',
        'Snapshot before restoring to version ' || history_record.version_number,
        next_version,
        'pre_restore'
    );
    
    -- Restore page to historical version
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
    
    RETURN jsonb_build_object(
        'success', true,
        'page_id', history_record.page_id,
        'restored_version', history_record.version_number,
        'pre_restore_version', next_version
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get enhanced history with stats
CREATE OR REPLACE FUNCTION get_page_history_enhanced(
    page_id_param UUID,
    limit_param INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    version_number INTEGER,
    user_id UUID,
    user_email TEXT,
    user_name TEXT,
    change_type TEXT,
    change_summary TEXT,
    snapshot_type TEXT,
    blocks_changed INTEGER,
    chars_added INTEGER,
    chars_removed INTEGER,
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
        COALESCE(ph.edited_by_email, u.email::TEXT) as user_email,
        ph.edited_by_name as user_name,
        ph.change_type::TEXT,
        ph.change_summary::TEXT,
        ph.snapshot_type::TEXT,
        ph.blocks_changed,
        ph.chars_added,
        ph.chars_removed,
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
GRANT EXECUTE ON FUNCTION get_retention_days TO authenticated;
GRANT EXECUTE ON FUNCTION restore_page_from_history_enhanced TO authenticated;
GRANT EXECUTE ON FUNCTION get_page_history_enhanced TO authenticated;

COMMENT ON FUNCTION get_retention_days IS 'Returns retention days based on workspace subscription tier';
COMMENT ON FUNCTION create_page_history_enhanced IS 'Auto-creates snapshots every 10 minutes with detailed change tracking';
COMMENT ON FUNCTION restore_page_from_history_enhanced IS 'Restores page and creates pre-restore snapshot';
COMMENT ON FUNCTION get_page_history_enhanced IS 'Returns enhanced history with change statistics';
