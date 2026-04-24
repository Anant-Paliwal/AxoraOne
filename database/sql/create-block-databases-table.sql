-- Create block_databases table for storing database block data (like Notion databases)
-- Fixed: Changed owner_id to user_id to match workspaces table

-- Create the block_databases table
CREATE TABLE IF NOT EXISTS public.block_databases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id TEXT NOT NULL,  -- References the block ID in page.blocks array
    page_id UUID REFERENCES public.pages(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Database schema
    name TEXT DEFAULT 'Untitled Database',
    columns JSONB DEFAULT '[]'::jsonb,  -- Array of column definitions
    rows JSONB DEFAULT '[]'::jsonb,     -- Array of row data
    
    -- View settings
    view_type TEXT DEFAULT 'table' CHECK (view_type IN ('table', 'board', 'calendar', 'gallery', 'list')),
    sort_config JSONB DEFAULT '[]'::jsonb,
    filter_config JSONB DEFAULT '[]'::jsonb,
    group_config JSONB DEFAULT '{}'::jsonb,
    hidden_columns JSONB DEFAULT '[]'::jsonb,
    column_widths JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    row_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_block_databases_block_id ON public.block_databases(block_id);
CREATE INDEX IF NOT EXISTS idx_block_databases_page_id ON public.block_databases(page_id);
CREATE INDEX IF NOT EXISTS idx_block_databases_workspace_id ON public.block_databases(workspace_id);
CREATE INDEX IF NOT EXISTS idx_block_databases_user_id ON public.block_databases(user_id);

-- Enable RLS
ALTER TABLE public.block_databases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own block databases" ON public.block_databases;
DROP POLICY IF EXISTS "Users can view workspace block databases" ON public.block_databases;
DROP POLICY IF EXISTS "Users can insert their own block databases" ON public.block_databases;
DROP POLICY IF EXISTS "Users can update their own block databases" ON public.block_databases;
DROP POLICY IF EXISTS "Users can update workspace block databases" ON public.block_databases;
DROP POLICY IF EXISTS "Users can delete their own block databases" ON public.block_databases;

-- RLS Policies (Fixed: using user_id instead of owner_id)
CREATE POLICY "Users can view their own block databases"
    ON public.block_databases FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can view workspace block databases"
    ON public.block_databases FOR SELECT
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE user_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own block databases"
    ON public.block_databases FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own block databases"
    ON public.block_databases FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can update workspace block databases"
    ON public.block_databases FOR UPDATE
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE user_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

CREATE POLICY "Users can delete their own block databases"
    ON public.block_databases FOR DELETE
    USING (user_id = auth.uid());

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_block_databases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.row_count = jsonb_array_length(COALESCE(NEW.rows, '[]'::jsonb));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_block_databases_updated_at ON public.block_databases;
CREATE TRIGGER trigger_block_databases_updated_at
    BEFORE UPDATE ON public.block_databases
    FOR EACH ROW
    EXECUTE FUNCTION update_block_databases_updated_at();

-- Grant permissions
GRANT ALL ON public.block_databases TO authenticated;
GRANT ALL ON public.block_databases TO service_role;

SELECT 'block_databases table created successfully' as status;
