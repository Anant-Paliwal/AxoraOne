-- ============================================
-- ADD SUB-PAGES SUPPORT
-- ============================================

-- Add parent_page_id to pages table for hierarchical structure
ALTER TABLE pages 
ADD COLUMN IF NOT EXISTS parent_page_id UUID REFERENCES pages(id) ON DELETE CASCADE;

-- Add order column for sub-page ordering
ALTER TABLE pages 
ADD COLUMN IF NOT EXISTS page_order INTEGER DEFAULT 0;

-- Create index for faster sub-page queries
CREATE INDEX IF NOT EXISTS idx_pages_parent ON pages(parent_page_id);
CREATE INDEX IF NOT EXISTS idx_pages_parent_order ON pages(parent_page_id, page_order);

-- Add constraint to prevent circular references (page can't be its own parent)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_not_self_parent'
    ) THEN
        ALTER TABLE pages 
        ADD CONSTRAINT check_not_self_parent 
        CHECK (id != parent_page_id);
    END IF;
END $$;

-- Function to get all sub-pages for a page
CREATE OR REPLACE FUNCTION get_subpages(page_uuid UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    icon TEXT,
    content TEXT,
    blocks JSONB,
    page_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.icon,
        p.content,
        p.blocks,
        p.page_order,
        p.created_at,
        p.updated_at
    FROM pages p
    WHERE p.parent_page_id = page_uuid
    ORDER BY p.page_order ASC, p.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to check if page has sub-pages
CREATE OR REPLACE FUNCTION has_subpages(page_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM pages WHERE parent_page_id = page_uuid
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON COLUMN pages.parent_page_id IS 'Reference to parent page for sub-page hierarchy';
COMMENT ON COLUMN pages.page_order IS 'Order of sub-pages within parent page';
