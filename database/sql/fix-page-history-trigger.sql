-- Fix page history trigger to prevent 500 errors on page save
-- This adds error handling and skips INSERT operations

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
    IF OLD.title IS DISTINCT FROM NEW.title THEN
        change_desc := 'Title changed';
    ELSIF OLD.content IS DISTINCT FROM NEW.content THEN
        change_desc := 'Content updated';
    ELSIF OLD.blocks IS DISTINCT FROM NEW.blocks THEN
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
