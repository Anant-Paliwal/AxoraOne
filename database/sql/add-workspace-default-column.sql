-- Add is_default column to workspaces table
-- Run this in Supabase SQL Editor

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_workspaces_user_default ON workspaces(user_id, is_default);
