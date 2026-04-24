-- Add blocks column to pages table to store block data
-- This allows saving DatabaseBlock, FormBlock, and other block data

-- Add blocks column as JSONB to store structured block data
ALTER TABLE pages 
ADD COLUMN IF NOT EXISTS blocks JSONB DEFAULT '[]'::jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN pages.blocks IS 'Stores block data (DatabaseBlock, FormBlock, etc.) as JSON array';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_pages_blocks ON pages USING GIN (blocks);

-- Example block structure:
-- [
--   {
--     "id": "block-123",
--     "type": "database",
--     "data": {
--       "columns": [...],
--       "rows": [...]
--     }
--   },
--   {
--     "id": "block-456",
--     "type": "form",
--     "data": {
--       "fields": [...]
--     }
--   }
-- ]
