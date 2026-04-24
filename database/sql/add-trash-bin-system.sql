-- Add Trash/Bin System for Soft Delete
-- Pages can be moved to trash before permanent deletion

-- Add deleted_at column to pages table for soft delete
ALTER TABLE pages 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Create index for faster trash queries
CREATE INDEX IF NOT EXISTS idx_pages_deleted_at ON pages(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pages_workspace_deleted ON pages(workspace_id, deleted_at);

-- Create trash_items view for easy querying
CREATE OR REPLACE VIEW trash_items AS
SELECT 
  p.id,
  p.title,
  p.icon,
  p.page_type,
  p.workspace_id,
  p.user_id,
  p.deleted_at,
  p.deleted_by,
  p.parent_page_id,
  p.created_at,
  p.updated_at,
  COALESCE(
    (SELECT COUNT(*) FROM pages WHERE parent_page_id = p.id AND deleted_at IS NULL),
    0
  ) as active_subpages_count,
  COALESCE(
    (SELECT COUNT(*) FROM pages WHERE parent_page_id = p.id AND deleted_at IS NOT NULL),
    0
  ) as deleted_subpages_count
FROM pages p
WHERE p.deleted_at IS NOT NULL
ORDER BY p.deleted_at DESC;

-- Function to soft delete a page
CREATE OR REPLACE FUNCTION soft_delete_page(
  page_id_param UUID,
  user_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  deleted_count INT := 0;
BEGIN
  -- Soft delete the page and all its subpages
  WITH deleted_pages AS (
    UPDATE pages
    SET 
      deleted_at = NOW(),
      deleted_by = user_id_param
    WHERE id = page_id_param 
       OR parent_page_id = page_id_param
    RETURNING id, title
  )
  SELECT COUNT(*), jsonb_agg(jsonb_build_object('id', id, 'title', title))
  INTO deleted_count, result
  FROM deleted_pages;
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'pages', result
  );
END;
$$;

-- Function to restore a page from trash
CREATE OR REPLACE FUNCTION restore_page(
  page_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  restored_count INT := 0;
BEGIN
  -- Restore the page and all its subpages
  WITH restored_pages AS (
    UPDATE pages
    SET 
      deleted_at = NULL,
      deleted_by = NULL
    WHERE id = page_id_param 
       OR parent_page_id = page_id_param
    RETURNING id, title
  )
  SELECT COUNT(*), jsonb_agg(jsonb_build_object('id', id, 'title', title))
  INTO restored_count, result
  FROM restored_pages;
  
  RETURN jsonb_build_object(
    'success', true,
    'restored_count', restored_count,
    'pages', result
  );
END;
$$;

-- Function to permanently delete a page from trash
CREATE OR REPLACE FUNCTION permanently_delete_page(
  page_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  deleted_count INT := 0;
BEGIN
  -- Permanently delete the page and all its subpages
  WITH deleted_pages AS (
    DELETE FROM pages
    WHERE (id = page_id_param OR parent_page_id = page_id_param)
      AND deleted_at IS NOT NULL  -- Only delete if already in trash
    RETURNING id, title
  )
  SELECT COUNT(*), jsonb_agg(jsonb_build_object('id', id, 'title', title))
  INTO deleted_count, result
  FROM deleted_pages;
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'pages', result
  );
END;
$$;

-- Function to empty entire trash for a workspace
CREATE OR REPLACE FUNCTION empty_trash(
  workspace_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INT := 0;
BEGIN
  -- Permanently delete all pages in trash for this workspace
  WITH deleted_pages AS (
    DELETE FROM pages
    WHERE workspace_id = workspace_id_param
      AND deleted_at IS NOT NULL
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted_pages;
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', deleted_count
  );
END;
$$;

-- Auto-cleanup: Delete items older than 30 days from trash
CREATE OR REPLACE FUNCTION auto_cleanup_trash()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM pages
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Update RLS policies to exclude deleted pages from normal queries
DROP POLICY IF EXISTS "Users can view pages in their workspace" ON pages;
CREATE POLICY "Users can view pages in their workspace"
  ON pages FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    AND deleted_at IS NULL  -- Exclude deleted pages
  );

-- New policy for viewing trash
CREATE POLICY "Users can view trash in their workspace"
  ON pages FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    AND deleted_at IS NOT NULL  -- Only deleted pages
  );

-- Grant permissions
GRANT SELECT ON trash_items TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_page TO authenticated;
GRANT EXECUTE ON FUNCTION restore_page TO authenticated;
GRANT EXECUTE ON FUNCTION permanently_delete_page TO authenticated;
GRANT EXECUTE ON FUNCTION empty_trash TO authenticated;

-- Create a scheduled job to auto-cleanup trash (if pg_cron is available)
-- SELECT cron.schedule('cleanup-trash', '0 2 * * *', 'SELECT auto_cleanup_trash()');

COMMENT ON COLUMN pages.deleted_at IS 'Timestamp when page was moved to trash (soft delete)';
COMMENT ON COLUMN pages.deleted_by IS 'User who deleted the page';
COMMENT ON FUNCTION soft_delete_page IS 'Move page and subpages to trash (soft delete)';
COMMENT ON FUNCTION restore_page IS 'Restore page and subpages from trash';
COMMENT ON FUNCTION permanently_delete_page IS 'Permanently delete page from trash';
COMMENT ON FUNCTION empty_trash IS 'Empty all trash items for a workspace';
