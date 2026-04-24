-- ============================================
-- COMPREHENSIVE BLOCK PERSISTENCE MIGRATION
-- Ensures ALL user actions and block data are saved
-- ============================================

-- ============================================
-- 1. ENHANCE PAGES TABLE
-- ============================================

-- Add blocks column if not exists
ALTER TABLE pages 
ADD COLUMN IF NOT EXISTS blocks JSONB DEFAULT '[]'::jsonb;

-- Add metadata for page settings
ALTER TABLE pages 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add version tracking
ALTER TABLE pages 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add last_edited_at
ALTER TABLE pages 
ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pages_blocks ON pages USING GIN (blocks);
CREATE INDEX IF NOT EXISTS idx_pages_metadata ON pages USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_pages_last_edited ON pages(last_edited_at DESC);
CREATE INDEX IF NOT EXISTS idx_pages_workspace_user ON pages(workspace_id, user_id);

-- ============================================
-- 2. CREATE DATA_FILES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS data_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
    block_id TEXT, -- Reference to block in page.blocks array
    
    -- File metadata
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'csv', 'json', 'excel', 'sql'
    file_size BIGINT NOT NULL,
    mime_type TEXT,
    
    -- Storage
    storage_path TEXT, -- Supabase Storage path
    
    -- Parsed data (for CSV, JSON, etc.)
    parsed_data JSONB, -- Actual data content
    column_types JSONB, -- Column type information
    row_count INTEGER,
    column_count INTEGER,
    
    -- Processing
    status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'processed', 'error')),
    error_message TEXT,
    
    -- Timestamps
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[]
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_data_files_user ON data_files(user_id);
CREATE INDEX IF NOT EXISTS idx_data_files_workspace ON data_files(workspace_id);
CREATE INDEX IF NOT EXISTS idx_data_files_page ON data_files(page_id);
CREATE INDEX IF NOT EXISTS idx_data_files_block ON data_files(block_id);
CREATE INDEX IF NOT EXISTS idx_data_files_type ON data_files(file_type);
CREATE INDEX IF NOT EXISTS idx_data_files_parsed_data ON data_files USING GIN (parsed_data);

-- RLS
ALTER TABLE data_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data files"
    ON data_files FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can upload data files"
    ON data_files FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their data files"
    ON data_files FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their data files"
    ON data_files FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 3. CREATE FORM_SUBMISSIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    block_id TEXT NOT NULL, -- Reference to FormBlock
    
    -- Submission data
    form_data JSONB NOT NULL, -- All form field values
    
    -- Metadata
    submitted_by UUID REFERENCES auth.users(id),
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_form_submissions_user ON form_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_workspace ON form_submissions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_page ON form_submissions(page_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_block ON form_submissions(block_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted ON form_submissions(submitted_at DESC);

-- RLS
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view submissions in their workspace"
    ON form_submissions FOR SELECT
    USING (auth.uid() = user_id OR workspace_id IN (
        SELECT id FROM workspaces WHERE user_id = auth.uid()
    ));

CREATE POLICY "Anyone can submit forms"
    ON form_submissions FOR INSERT
    WITH CHECK (true);

-- ============================================
-- 4. CREATE USER_ACTIVITY_LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Activity details
    activity_type TEXT NOT NULL, -- 'page_created', 'block_added', 'file_uploaded', etc.
    entity_type TEXT, -- 'page', 'block', 'task', 'skill', 'file'
    entity_id UUID,
    
    -- Action
    action TEXT NOT NULL, -- 'create', 'update', 'delete', 'view', 'download'
    details JSONB DEFAULT '{}'::jsonb,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_user ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_workspace ON user_activity_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_type ON user_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_created ON user_activity_log(created_at DESC);

-- RLS
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity"
    ON user_activity_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can log their activity"
    ON user_activity_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 5. CREATE PAGE_SNAPSHOTS TABLE (Auto-save)
-- ============================================

CREATE TABLE IF NOT EXISTS page_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Snapshot data
    content TEXT,
    blocks JSONB,
    version INTEGER NOT NULL,
    
    -- Snapshot type
    snapshot_type TEXT DEFAULT 'auto' CHECK (snapshot_type IN ('auto', 'manual', 'before_major_change')),
    description TEXT,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_snapshots_page ON page_snapshots(page_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_created ON page_snapshots(created_at DESC);

-- RLS
ALTER TABLE page_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their page snapshots"
    ON page_snapshots FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create snapshots"
    ON page_snapshots FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 6. CREATE BLOCK_TEMPLATES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS block_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Template info
    name TEXT NOT NULL,
    description TEXT,
    block_type TEXT NOT NULL, -- 'database', 'form', 'timeline', 'gallery'
    
    -- Template data
    template_data JSONB NOT NULL,
    preview_image TEXT,
    
    -- Sharing
    is_public BOOLEAN DEFAULT FALSE,
    
    -- Usage
    usage_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_block_templates_user ON block_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_block_templates_type ON block_templates(block_type);

-- RLS
ALTER TABLE block_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their templates and public templates"
    ON block_templates FOR SELECT
    USING (auth.uid() = user_id OR is_public = TRUE);

CREATE POLICY "Users can create templates"
    ON block_templates FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their templates"
    ON block_templates FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================
-- 7. CREATE TRIGGERS
-- ============================================

-- Update last_edited_at and version on page update
CREATE OR REPLACE FUNCTION update_page_last_edited()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_edited_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_page_last_edited ON pages;
CREATE TRIGGER trigger_update_page_last_edited
    BEFORE UPDATE ON pages
    FOR EACH ROW
    EXECUTE FUNCTION update_page_last_edited();

-- Auto-create snapshots
CREATE OR REPLACE FUNCTION create_auto_snapshot()
RETURNS TRIGGER AS $$
BEGIN
    -- Create snapshot every 10 versions or if blocks changed
    IF (NEW.version % 10 = 0) OR (OLD.blocks IS DISTINCT FROM NEW.blocks) THEN
        INSERT INTO page_snapshots (page_id, user_id, content, blocks, version, snapshot_type)
        VALUES (NEW.id, NEW.user_id, NEW.content, NEW.blocks, NEW.version, 'auto');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_auto_snapshot ON pages;
CREATE TRIGGER trigger_create_auto_snapshot
    AFTER UPDATE ON pages
    FOR EACH ROW
    EXECUTE FUNCTION create_auto_snapshot();

-- ============================================
-- 8. COMMENTS
-- ============================================

COMMENT ON COLUMN pages.blocks IS 'Stores all block data (Database, Form, Timeline, Gallery, etc.) as JSON array';
COMMENT ON COLUMN pages.metadata IS 'Page settings and configuration';
COMMENT ON COLUMN pages.version IS 'Version number for conflict resolution';

COMMENT ON TABLE data_files IS 'Stores uploaded data files with parsed content';
COMMENT ON TABLE form_submissions IS 'Stores form submission data from FormBlocks';
COMMENT ON TABLE user_activity_log IS 'Tracks all user actions for analytics';
COMMENT ON TABLE page_snapshots IS 'Auto-save snapshots for version history';
COMMENT ON TABLE block_templates IS 'Reusable block templates';

-- ============================================
-- EXAMPLE BLOCK STRUCTURES
-- ============================================

/*
pages.blocks structure:

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
      "display_mode": "table"
    }
  },
  {
    "id": "block-789",
    "type": "form",
    "position": 2,
    "data": {
      "fields": [
        {"id": "1", "label": "Name", "type": "text", "required": true}
      ]
    }
  },
  {
    "id": "block-101",
    "type": "timeline",
    "position": 3,
    "data": {
      "events": [
        {"id": "1", "title": "Event", "date": "2024-01-01", "description": "..."}
      ]
    }
  },
  {
    "id": "block-102",
    "type": "gallery",
    "position": 4,
    "data": {
      "images": [
        {"id": "1", "url": "...", "caption": "..."}
      ]
    }
  }
]
*/
