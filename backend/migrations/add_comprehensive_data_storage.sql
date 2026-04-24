-- Comprehensive Data Storage Migration
-- This migration ensures ALL user actions and data are persisted in Supabase

-- ============================================
-- 1. ENHANCE PAGES TABLE FOR BLOCKS STORAGE
-- ============================================

-- Add blocks column if not exists (stores all block types)
ALTER TABLE pages 
ADD COLUMN IF NOT EXISTS blocks JSONB DEFAULT '[]'::jsonb;

-- Add metadata column for additional page data
ALTER TABLE pages 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add version tracking for conflict resolution
ALTER TABLE pages 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add last_edited_at for tracking changes
ALTER TABLE pages 
ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pages_blocks ON pages USING GIN (blocks);
CREATE INDEX IF NOT EXISTS idx_pages_metadata ON pages USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_pages_last_edited ON pages(last_edited_at DESC);

-- Add comments
COMMENT ON COLUMN pages.blocks IS 'Stores all block data (Database, Form, Timeline, Gallery, etc.) as JSON array';
COMMENT ON COLUMN pages.metadata IS 'Additional page metadata (view settings, permissions, etc.)';
COMMENT ON COLUMN pages.version IS 'Version number for optimistic locking and conflict resolution';

-- ============================================
-- 2. CREATE DATA FILES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS data_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
    
    -- File metadata
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'csv', 'json', 'excel', 'sql', etc.
    file_size BIGINT NOT NULL, -- in bytes
    mime_type TEXT,
    
    -- Storage info
    storage_path TEXT, -- Path in Supabase Storage if using file storage
    
    -- Parsed data (for structured files like CSV, JSON)
    parsed_data JSONB, -- Stores the actual data content
    column_types JSONB, -- Stores column type information
    row_count INTEGER,
    column_count INTEGER,
    
    -- Processing status
    status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'processed', 'error')),
    error_message TEXT,
    
    -- Timestamps
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[]
);

-- Indexes for data_files
CREATE INDEX IF NOT EXISTS idx_data_files_user ON data_files(user_id);
CREATE INDEX IF NOT EXISTS idx_data_files_workspace ON data_files(workspace_id);
CREATE INDEX IF NOT EXISTS idx_data_files_page ON data_files(page_id);
CREATE INDEX IF NOT EXISTS idx_data_files_type ON data_files(file_type);
CREATE INDEX IF NOT EXISTS idx_data_files_uploaded ON data_files(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_files_parsed_data ON data_files USING GIN (parsed_data);

-- Enable RLS
ALTER TABLE data_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own data files"
    ON data_files FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own data files"
    ON data_files FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own data files"
    ON data_files FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own data files"
    ON data_files FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 3. CREATE USER ACTIVITY LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Activity details
    activity_type TEXT NOT NULL, -- 'page_created', 'block_added', 'file_uploaded', 'task_completed', etc.
    entity_type TEXT, -- 'page', 'block', 'task', 'skill', 'file', etc.
    entity_id UUID,
    
    -- Activity data
    action TEXT NOT NULL, -- 'create', 'update', 'delete', 'view', 'download', etc.
    details JSONB DEFAULT '{}'::jsonb,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for activity log
CREATE INDEX IF NOT EXISTS idx_activity_user ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_workspace ON user_activity_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_type ON user_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_created ON user_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON user_activity_log(entity_type, entity_id);

-- Enable RLS
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own activity"
    ON user_activity_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can log their own activity"
    ON user_activity_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 4. CREATE BLOCK TEMPLATES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS block_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Template info
    name TEXT NOT NULL,
    description TEXT,
    block_type TEXT NOT NULL, -- 'database', 'form', 'timeline', 'gallery', etc.
    
    -- Template data
    template_data JSONB NOT NULL,
    preview_image TEXT,
    
    -- Sharing
    is_public BOOLEAN DEFAULT FALSE,
    is_system_template BOOLEAN DEFAULT FALSE,
    
    -- Usage stats
    usage_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_block_templates_user ON block_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_block_templates_workspace ON block_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_block_templates_type ON block_templates(block_type);
CREATE INDEX IF NOT EXISTS idx_block_templates_public ON block_templates(is_public) WHERE is_public = TRUE;

-- Enable RLS
ALTER TABLE block_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own templates and public templates"
    ON block_templates FOR SELECT
    USING (auth.uid() = user_id OR is_public = TRUE);

CREATE POLICY "Users can create their own templates"
    ON block_templates FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
    ON block_templates FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
    ON block_templates FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 5. CREATE AUTO-SAVE SNAPSHOTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS page_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Snapshot data
    content TEXT,
    blocks JSONB,
    version INTEGER NOT NULL,
    
    -- Snapshot metadata
    snapshot_type TEXT DEFAULT 'auto' CHECK (snapshot_type IN ('auto', 'manual', 'before_major_change')),
    description TEXT,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_snapshots_page ON page_snapshots(page_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_created ON page_snapshots(created_at DESC);

-- Enable RLS
ALTER TABLE page_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view snapshots of their own pages"
    ON page_snapshots FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create snapshots of their own pages"
    ON page_snapshots FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 6. CREATE TRIGGERS FOR AUTO-TRACKING
-- ============================================

-- Function to update last_edited_at
CREATE OR REPLACE FUNCTION update_page_last_edited()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_edited_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for pages
DROP TRIGGER IF EXISTS trigger_update_page_last_edited ON pages;
CREATE TRIGGER trigger_update_page_last_edited
    BEFORE UPDATE ON pages
    FOR EACH ROW
    EXECUTE FUNCTION update_page_last_edited();

-- Function to create auto-snapshots
CREATE OR REPLACE FUNCTION create_auto_snapshot()
RETURNS TRIGGER AS $$
BEGIN
    -- Create snapshot every 10 versions or if blocks changed significantly
    IF (NEW.version % 10 = 0) OR (OLD.blocks IS DISTINCT FROM NEW.blocks) THEN
        INSERT INTO page_snapshots (page_id, user_id, content, blocks, version, snapshot_type)
        VALUES (NEW.id, NEW.user_id, NEW.content, NEW.blocks, NEW.version, 'auto');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-snapshots
DROP TRIGGER IF EXISTS trigger_create_auto_snapshot ON pages;
CREATE TRIGGER trigger_create_auto_snapshot
    AFTER UPDATE ON pages
    FOR EACH ROW
    EXECUTE FUNCTION create_auto_snapshot();

-- ============================================
-- 7. ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE data_files IS 'Stores uploaded data files (CSV, JSON, Excel, etc.) with parsed content';
COMMENT ON TABLE user_activity_log IS 'Tracks all user actions for analytics and audit trail';
COMMENT ON TABLE block_templates IS 'Stores reusable block templates for quick page creation';
COMMENT ON TABLE page_snapshots IS 'Auto-save snapshots for version history and recovery';

-- ============================================
-- 8. EXAMPLE BLOCK STRUCTURES
-- ============================================

/*
Example blocks structure in pages.blocks column:

[
  {
    "id": "block-123",
    "type": "database",
    "position": 0,
    "data": {
      "columns": [
        {"id": "1", "name": "Name", "type": "text"},
        {"id": "2", "name": "Status", "type": "select"}
      ],
      "rows": [
        {"id": "1", "Name": "Task 1", "Status": "Done"}
      ]
    },
    "metadata": {
      "view_type": "table",
      "filters": [],
      "sorts": []
    }
  },
  {
    "id": "block-456",
    "type": "datafile",
    "position": 1,
    "data": {
      "file_id": "uuid-of-data-file",
      "display_mode": "table",
      "visible_columns": ["col1", "col2"]
    }
  },
  {
    "id": "block-789",
    "type": "form",
    "position": 2,
    "data": {
      "fields": [
        {"id": "1", "label": "Name", "type": "text", "required": true}
      ],
      "submissions": []
    }
  }
]
*/

