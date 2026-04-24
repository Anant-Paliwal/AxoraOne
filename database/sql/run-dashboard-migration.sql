-- =====================================================
-- DASHBOARD LAYOUTS MIGRATION
-- Run this in Supabase SQL Editor
-- =====================================================

-- Create dashboard_layouts table
CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  layout JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_workspace_user 
ON dashboard_layouts(workspace_id, user_id);

-- Enable RLS
ALTER TABLE dashboard_layouts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own dashboard layouts" ON dashboard_layouts;
DROP POLICY IF EXISTS "Users can insert their own dashboard layouts" ON dashboard_layouts;
DROP POLICY IF EXISTS "Users can update their own dashboard layouts" ON dashboard_layouts;
DROP POLICY IF EXISTS "Users can delete their own dashboard layouts" ON dashboard_layouts;

-- RLS Policies
CREATE POLICY "Users can view their own dashboard layouts"
ON dashboard_layouts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dashboard layouts"
ON dashboard_layouts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dashboard layouts"
ON dashboard_layouts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dashboard layouts"
ON dashboard_layouts FOR DELETE
USING (auth.uid() = user_id);

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_dashboard_layout_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating timestamp
DROP TRIGGER IF EXISTS update_dashboard_layout_timestamp ON dashboard_layouts;
CREATE TRIGGER update_dashboard_layout_timestamp
BEFORE UPDATE ON dashboard_layouts
FOR EACH ROW
EXECUTE FUNCTION update_dashboard_layout_timestamp();

-- Verify table was created
SELECT 'dashboard_layouts table created successfully!' as status;
