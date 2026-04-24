-- Add page sharing column
-- This allows pages to be shared publicly or kept private

-- Add is_public column to pages table
ALTER TABLE pages ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Create index for public pages
CREATE INDEX IF NOT EXISTS idx_pages_public ON pages(is_public) WHERE is_public = TRUE;

-- Add comment
COMMENT ON COLUMN pages.is_public IS 'Whether this page is publicly accessible (true) or private (false)';
