-- ============================================
-- NESTED SUB-PAGES SUPPORT (Multi-Level Hierarchy)
-- ============================================

-- Add depth column to track nesting level (0 = root, 1 = first level, etc.)
ALTER TABLE pages 
ADD COLUMN IF NOT EXISTS depth INTEGER DEFAULT 0;

-- Add path column to store full ancestry path for efficient queries
ALTER TABLE pages 
ADD COLUMN IF NOT EXISTS path TEXT[] DEFAULT '{}';

-- Create indexes for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_pages_depth ON pages(depth);
CREATE INDEX IF NOT EXISTS idx_pages_path ON pages USING GIN(path);

-- Function to get page ancestors (breadcrumb)
CREATE OR REPLACE FUNCTION get_page_ancestors(page_uuid UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    icon TEXT,
    depth INTEGER,
    parent_page_id UUID
) AS $$
DECLARE
    current_id UUID := page_uuid;
    current_parent UUID;
BEGIN
    -- Get the parent of the starting page
    SELECT p.parent_page_id INTO current_parent
    FROM pages p WHERE p.id = current_id;
    
    -- Walk up the tree
    WHILE current_parent IS NOT NULL LOOP
        RETURN QUERY
        SELECT p.id, p.title, p.icon, p.depth, p.parent_page_id
        FROM pages p WHERE p.id = current_parent;
        
        SELECT p.parent_page_id INTO current_parent
        FROM pages p WHERE p.id = current_parent;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to get all descendants of a page (recursive)
CREATE OR REPLACE FUNCTION get_page_descendants(page_uuid UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    icon TEXT,
    depth INTEGER,
    parent_page_id UUID,
    page_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE descendants AS (
        -- Base case: direct children
        SELECT p.id, p.title, p.icon, p.depth, p.parent_page_id, p.page_order
        FROM pages p
        WHERE p.parent_page_id = page_uuid
        
        UNION ALL
        
        -- Recursive case: children of children
        SELECT p.id, p.title, p.icon, p.depth, p.parent_page_id, p.page_order
        FROM pages p
        INNER JOIN descendants d ON p.parent_page_id = d.id
    )
    SELECT * FROM descendants
    ORDER BY depth, page_order;
END;
$$ LANGUAGE plpgsql;

-- Function to update depth and path when page is created/moved
CREATE OR REPLACE FUNCTION update_page_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
    parent_depth INTEGER;
    parent_path TEXT[];
BEGIN
    IF NEW.parent_page_id IS NULL THEN
        -- Root page
        NEW.depth := 0;
        NEW.path := ARRAY[NEW.id::TEXT];
    ELSE
        -- Get parent's depth and path
        SELECT p.depth, p.path INTO parent_depth, parent_path
        FROM pages p WHERE p.id = NEW.parent_page_id;
        
        NEW.depth := COALESCE(parent_depth, 0) + 1;
        NEW.path := COALESCE(parent_path, ARRAY[]::TEXT[]) || NEW.id::TEXT;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for hierarchy updates
DROP TRIGGER IF EXISTS trigger_update_page_hierarchy ON pages;
CREATE TRIGGER trigger_update_page_hierarchy
    BEFORE INSERT OR UPDATE OF parent_page_id ON pages
    FOR EACH ROW
    EXECUTE FUNCTION update_page_hierarchy();

-- Function to move a page (with all descendants)
CREATE OR REPLACE FUNCTION move_page(
    page_uuid UUID,
    new_parent_uuid UUID,
    new_order INTEGER DEFAULT 0
)
RETURNS BOOLEAN AS $$
DECLARE
    old_depth INTEGER;
    new_depth INTEGER;
    depth_diff INTEGER;
    new_parent_path TEXT[];
BEGIN
    -- Prevent moving page to itself or its descendants
    IF new_parent_uuid IS NOT NULL AND (
        page_uuid = new_parent_uuid OR
        EXISTS (
            SELECT 1 FROM get_page_descendants(page_uuid) d
            WHERE d.id = new_parent_uuid
        )
    ) THEN
        RAISE EXCEPTION 'Cannot move page to itself or its descendants';
    END IF;
    
    -- Get current depth
    SELECT depth INTO old_depth FROM pages WHERE id = page_uuid;
    
    -- Calculate new depth
    IF new_parent_uuid IS NULL THEN
        new_depth := 0;
        new_parent_path := ARRAY[]::TEXT[];
    ELSE
        SELECT p.depth + 1, p.path INTO new_depth, new_parent_path
        FROM pages p WHERE p.id = new_parent_uuid;
    END IF;
    
    depth_diff := new_depth - old_depth;
    
    -- Update the page
    UPDATE pages SET
        parent_page_id = new_parent_uuid,
        page_order = new_order,
        depth = new_depth,
        path = new_parent_path || page_uuid::TEXT
    WHERE id = page_uuid;
    
    -- Update all descendants' depth and path
    WITH RECURSIVE descendants_cte AS (
        SELECT id, parent_page_id, depth, path
        FROM pages WHERE parent_page_id = page_uuid
        
        UNION ALL
        
        SELECT p.id, p.parent_page_id, p.depth, p.path
        FROM pages p
        INNER JOIN descendants_cte d ON p.parent_page_id = d.id
    )
    UPDATE pages p SET
        depth = p.depth + depth_diff,
        path = new_parent_path || page_uuid::TEXT || (
            SELECT array_agg(elem) FROM unnest(p.path) WITH ORDINALITY AS t(elem, ord)
            WHERE ord > array_position(p.path, page_uuid::TEXT)
        )
    FROM descendants_cte d WHERE p.id = d.id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get page tree (hierarchical structure)
CREATE OR REPLACE FUNCTION get_page_tree(workspace_uuid UUID, user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    WITH RECURSIVE page_tree AS (
        -- Root pages
        SELECT 
            p.id,
            p.title,
            p.icon,
            p.depth,
            p.parent_page_id,
            p.page_order,
            p.updated_at,
            p.is_favorite,
            ARRAY[p.page_order, EXTRACT(EPOCH FROM p.created_at)::INTEGER] as sort_path
        FROM pages p
        WHERE p.workspace_id = workspace_uuid 
          AND p.user_id = user_uuid
          AND p.parent_page_id IS NULL
          AND p.is_archived = FALSE
        
        UNION ALL
        
        -- Child pages
        SELECT 
            p.id,
            p.title,
            p.icon,
            p.depth,
            p.parent_page_id,
            p.page_order,
            p.updated_at,
            p.is_favorite,
            pt.sort_path || ARRAY[p.page_order, EXTRACT(EPOCH FROM p.created_at)::INTEGER]
        FROM pages p
        INNER JOIN page_tree pt ON p.parent_page_id = pt.id
        WHERE p.is_archived = FALSE
    )
    SELECT json_agg(
        json_build_object(
            'id', id,
            'title', title,
            'icon', icon,
            'depth', depth,
            'parent_page_id', parent_page_id,
            'page_order', page_order,
            'updated_at', updated_at,
            'is_favorite', is_favorite
        ) ORDER BY sort_path
    ) INTO result
    FROM page_tree;
    
    RETURN COALESCE(result, '[]'::JSON);
END;
$$ LANGUAGE plpgsql;

-- Update existing pages to have correct depth and path
DO $$
DECLARE
    page_record RECORD;
BEGIN
    -- First, set all root pages
    UPDATE pages SET depth = 0, path = ARRAY[id::TEXT]
    WHERE parent_page_id IS NULL;
    
    -- Then recursively update children (up to 10 levels deep)
    FOR i IN 1..10 LOOP
        UPDATE pages p SET
            depth = parent.depth + 1,
            path = parent.path || p.id::TEXT
        FROM pages parent
        WHERE p.parent_page_id = parent.id
          AND (p.depth IS NULL OR p.depth != parent.depth + 1);
        
        -- Exit if no more updates needed
        IF NOT FOUND THEN
            EXIT;
        END IF;
    END LOOP;
END $$;

COMMENT ON COLUMN pages.depth IS 'Nesting level: 0 = root, 1 = first level child, etc.';
COMMENT ON COLUMN pages.path IS 'Array of ancestor page IDs for efficient hierarchy queries';
