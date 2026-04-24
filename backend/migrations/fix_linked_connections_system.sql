-- ============================================
-- FIX LINKED CONNECTIONS SYSTEM
-- Adds workspace_id to page_links, creates sync triggers,
-- and optimizes the connection system
-- ============================================

-- 1. Add workspace_id to page_links if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'page_links' AND column_name = 'workspace_id'
    ) THEN
        ALTER TABLE page_links ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Populate workspace_id from source page
UPDATE page_links pl
SET workspace_id = p.workspace_id
FROM pages p
WHERE pl.source_page_id = p.id
AND pl.workspace_id IS NULL;

-- 3. Create index for workspace filtering
CREATE INDEX IF NOT EXISTS idx_page_links_workspace ON page_links(workspace_id);
CREATE INDEX IF NOT EXISTS idx_page_links_source ON page_links(source_page_id);
CREATE INDEX IF NOT EXISTS idx_page_links_target ON page_links(target_page_id);

-- 4. Create function to sync page_links to graph_edges
CREATE OR REPLACE FUNCTION sync_page_link_to_graph_edge()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Check if edge already exists
        IF NOT EXISTS (
            SELECT 1 FROM graph_edges 
            WHERE source_id = NEW.source_page_id 
            AND target_id = NEW.target_page_id
            AND user_id = NEW.user_id
        ) THEN
            INSERT INTO graph_edges (
                user_id, workspace_id, source_id, source_type, 
                target_id, target_type, edge_type, strength
            ) VALUES (
                NEW.user_id, NEW.workspace_id, NEW.source_page_id, 'page',
                NEW.target_page_id, 'page', COALESCE(NEW.relation_type, 'links_to'), 0.8
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Remove corresponding graph edge
        DELETE FROM graph_edges 
        WHERE source_id = OLD.source_page_id 
        AND target_id = OLD.target_page_id
        AND user_id = OLD.user_id
        AND edge_type = COALESCE(OLD.relation_type, 'links_to');
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Update edge type if relation changed
        UPDATE graph_edges 
        SET edge_type = COALESCE(NEW.relation_type, 'links_to'),
            workspace_id = NEW.workspace_id
        WHERE source_id = NEW.source_page_id 
        AND target_id = NEW.target_page_id
        AND user_id = NEW.user_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger for page_links sync
DROP TRIGGER IF EXISTS sync_page_link_trigger ON page_links;
CREATE TRIGGER sync_page_link_trigger
    AFTER INSERT OR UPDATE OR DELETE ON page_links
    FOR EACH ROW EXECUTE FUNCTION sync_page_link_to_graph_edge();

-- 6. Create function to get connected items count (cached)
CREATE OR REPLACE FUNCTION get_connection_counts(p_workspace_id UUID, p_user_id UUID)
RETURNS TABLE (
    item_id UUID,
    item_type TEXT,
    connection_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(source_counts.id, target_counts.id) as item_id,
        COALESCE(source_counts.type, target_counts.type) as item_type,
        COALESCE(source_counts.cnt, 0) + COALESCE(target_counts.cnt, 0) as connection_count
    FROM (
        SELECT source_id as id, source_type as type, COUNT(*) as cnt
        FROM graph_edges
        WHERE workspace_id = p_workspace_id AND user_id = p_user_id
        GROUP BY source_id, source_type
    ) source_counts
    FULL OUTER JOIN (
        SELECT target_id as id, target_type as type, COUNT(*) as cnt
        FROM graph_edges
        WHERE workspace_id = p_workspace_id AND user_id = p_user_id
        GROUP BY target_id, target_type
    ) target_counts ON source_counts.id = target_counts.id;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to get connected items for a specific item
CREATE OR REPLACE FUNCTION get_connected_items(
    p_item_id UUID,
    p_workspace_id UUID,
    p_user_id UUID
)
RETURNS TABLE (
    id UUID,
    type TEXT,
    label TEXT,
    edge_type TEXT,
    icon TEXT,
    direction TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Outgoing connections
    SELECT 
        ge.target_id as id,
        ge.target_type as type,
        CASE 
            WHEN ge.target_type = 'page' THEN (SELECT title FROM pages WHERE pages.id = ge.target_id)
            WHEN ge.target_type = 'skill' THEN (SELECT name FROM skills WHERE skills.id = ge.target_id)
            WHEN ge.target_type = 'task' THEN (SELECT title FROM tasks WHERE tasks.id = ge.target_id)
            ELSE 'Unknown'
        END as label,
        ge.edge_type,
        CASE 
            WHEN ge.target_type = 'page' THEN (SELECT icon FROM pages WHERE pages.id = ge.target_id)
            ELSE NULL
        END as icon,
        'outgoing'::TEXT as direction
    FROM graph_edges ge
    WHERE ge.source_id = p_item_id 
    AND ge.workspace_id = p_workspace_id 
    AND ge.user_id = p_user_id
    
    UNION ALL
    
    -- Incoming connections
    SELECT 
        ge.source_id as id,
        ge.source_type as type,
        CASE 
            WHEN ge.source_type = 'page' THEN (SELECT title FROM pages WHERE pages.id = ge.source_id)
            WHEN ge.source_type = 'skill' THEN (SELECT name FROM skills WHERE skills.id = ge.source_id)
            WHEN ge.source_type = 'task' THEN (SELECT title FROM tasks WHERE tasks.id = ge.source_id)
            ELSE 'Unknown'
        END as label,
        ge.edge_type,
        CASE 
            WHEN ge.source_type = 'page' THEN (SELECT icon FROM pages WHERE pages.id = ge.source_id)
            ELSE NULL
        END as icon,
        'incoming'::TEXT as direction
    FROM graph_edges ge
    WHERE ge.target_id = p_item_id 
    AND ge.workspace_id = p_workspace_id 
    AND ge.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Sync existing page_links to graph_edges (one-time migration)
INSERT INTO graph_edges (user_id, workspace_id, source_id, source_type, target_id, target_type, edge_type, strength)
SELECT 
    pl.user_id,
    pl.workspace_id,
    pl.source_page_id,
    'page',
    pl.target_page_id,
    'page',
    COALESCE(pl.relation_type, 'links_to'),
    0.8
FROM page_links pl
WHERE NOT EXISTS (
    SELECT 1 FROM graph_edges ge
    WHERE ge.source_id = pl.source_page_id
    AND ge.target_id = pl.target_page_id
    AND ge.user_id = pl.user_id
)
AND pl.workspace_id IS NOT NULL;

-- 9. Add RLS policy for page_links with workspace
DROP POLICY IF EXISTS "Users can view own page_links" ON page_links;
CREATE POLICY "Users can view own page_links" ON page_links
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own page_links" ON page_links;
CREATE POLICY "Users can create own page_links" ON page_links
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own page_links" ON page_links;
CREATE POLICY "Users can update own page_links" ON page_links
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own page_links" ON page_links;
CREATE POLICY "Users can delete own page_links" ON page_links
    FOR DELETE USING (auth.uid() = user_id);

SELECT 'Linked connections system migration complete!' as status;
