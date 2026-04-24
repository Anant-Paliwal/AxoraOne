-- Add grid_columns and spacing columns to dashboard_layouts table
-- This allows users to save their layout preferences across devices

-- Add grid_columns column (1, 2, or 3 columns)
ALTER TABLE dashboard_layouts 
ADD COLUMN IF NOT EXISTS grid_columns INTEGER DEFAULT 3 CHECK (grid_columns IN (1, 2, 3));

-- Add spacing column (none, compact, or comfortable)
ALTER TABLE dashboard_layouts 
ADD COLUMN IF NOT EXISTS spacing TEXT DEFAULT 'none' CHECK (spacing IN ('none', 'compact', 'comfortable'));

-- Add comment to explain the columns
COMMENT ON COLUMN dashboard_layouts.grid_columns IS 'Number of columns in grid layout: 1 (single), 2 (2x2), or 3 (3x3)';
COMMENT ON COLUMN dashboard_layouts.spacing IS 'Widget spacing preference: none (Notion-style), compact, or comfortable';

-- Update existing rows to have default values
UPDATE dashboard_layouts 
SET grid_columns = 3, spacing = 'none' 
WHERE grid_columns IS NULL OR spacing IS NULL;
