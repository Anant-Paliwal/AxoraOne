-- Add offline sync support to pages and tasks tables
-- Adds version tracking for conflict resolution

-- Add version column to pages table
ALTER TABLE pages 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add version column to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Create index on version for faster queries
CREATE INDEX IF NOT EXISTS idx_pages_version ON pages(version);
CREATE INDEX IF NOT EXISTS idx_tasks_version ON tasks(version);

-- Create page_revisions table for conflict resolution
CREATE TABLE IF NOT EXISTS page_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  content TEXT,
  version INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source TEXT DEFAULT 'server', -- 'client' or 'server'
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index for faster revision lookups
CREATE INDEX IF NOT EXISTS idx_page_revisions_page_id ON page_revisions(page_id);
CREATE INDEX IF NOT EXISTS idx_page_revisions_created_at ON page_revisions(created_at DESC);

-- Enable RLS on page_revisions
ALTER TABLE page_revisions ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can view revisions of their own pages
CREATE POLICY "Users can view their page revisions"
  ON page_revisions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pages
      WHERE pages.id = page_revisions.page_id
      AND pages.user_id = auth.uid()
    )
  );

-- RLS policy: System can insert revisions
CREATE POLICY "System can insert page revisions"
  ON page_revisions
  FOR INSERT
  WITH CHECK (true);

-- Function to auto-create revision on page update
CREATE OR REPLACE FUNCTION create_page_revision()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create revision if content changed
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    INSERT INTO page_revisions (page_id, content, version, user_id, source)
    VALUES (NEW.id, OLD.content, OLD.version, NEW.user_id, 'server');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for page revisions
DROP TRIGGER IF EXISTS trigger_create_page_revision ON pages;
CREATE TRIGGER trigger_create_page_revision
  BEFORE UPDATE ON pages
  FOR EACH ROW
  EXECUTE FUNCTION create_page_revision();

-- Comment on tables
COMMENT ON COLUMN pages.version IS 'Version number for optimistic locking and conflict resolution';
COMMENT ON COLUMN tasks.version IS 'Version number for optimistic locking and conflict resolution';
COMMENT ON TABLE page_revisions IS 'Stores historical versions of pages for conflict resolution and recovery';
