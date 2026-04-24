-- Page Linking System
-- Enables wiki-style linking between pages, skills, tasks, and concepts

-- 1. Page Links table (explicit links between pages)
CREATE TABLE IF NOT EXISTS public.page_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    target_page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    relation_type TEXT DEFAULT 'references' CHECK (relation_type IN (
        'references',      -- Generic link
        'explains',        -- Source explains target concept
        'example_of',      -- Source is example of target
        'depends_on',      -- Source depends on target
        'related_to',      -- Loosely related
        'contradicts',     -- Opposing viewpoints
        'extends',         -- Source extends/builds on target
        'summarizes'       -- Source summarizes target
    )),
    context TEXT,  -- Optional context about why linked
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(source_page_id, target_page_id)
);

-- 2. Page Mentions table (inline @mentions in content)
CREATE TABLE IF NOT EXISTS public.page_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    mention_type TEXT NOT NULL CHECK (mention_type IN ('page', 'skill', 'task', 'concept')),
    mention_id UUID,  -- ID of mentioned item (null for concepts)
    mention_text TEXT NOT NULL,  -- The actual text mentioned
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    position_start INT,  -- Character position in content
    position_end INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Concepts table (for #Concept tags that don't have pages yet)
CREATE TABLE IF NOT EXISTS public.concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    description TEXT,
    linked_page_id UUID REFERENCES public.pages(id) ON DELETE SET NULL,  -- If concept becomes a page
    mention_count INT DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(name, user_id, workspace_id)
);

-- 4. AI Suggested Relations table
CREATE TABLE IF NOT EXISTS public.ai_suggested_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    suggested_page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    relation_type TEXT DEFAULT 'related_to',
    confidence FLOAT DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
    reason TEXT,  -- Why AI suggested this
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(page_id, suggested_page_id)
);

-- 5. Enable RLS
ALTER TABLE public.page_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_suggested_relations ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
CREATE POLICY "Users can manage their own page links" ON public.page_links
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own page mentions" ON public.page_mentions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own concepts" ON public.concepts
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own AI suggestions" ON public.ai_suggested_relations
    FOR ALL USING (auth.uid() = user_id);

-- 7. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_page_links_source ON public.page_links(source_page_id);
CREATE INDEX IF NOT EXISTS idx_page_links_target ON public.page_links(target_page_id);
CREATE INDEX IF NOT EXISTS idx_page_links_user ON public.page_links(user_id);

CREATE INDEX IF NOT EXISTS idx_page_mentions_source ON public.page_mentions(source_page_id);
CREATE INDEX IF NOT EXISTS idx_page_mentions_type ON public.page_mentions(mention_type);
CREATE INDEX IF NOT EXISTS idx_page_mentions_id ON public.page_mentions(mention_id);

CREATE INDEX IF NOT EXISTS idx_concepts_user ON public.concepts(user_id);
CREATE INDEX IF NOT EXISTS idx_concepts_workspace ON public.concepts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_concepts_name ON public.concepts(name);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_page ON public.ai_suggested_relations(page_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_status ON public.ai_suggested_relations(status);

-- 8. Function to get backlinks (pages that link TO this page)
CREATE OR REPLACE FUNCTION get_page_backlinks(p_page_id UUID, p_user_id UUID)
RETURNS TABLE (
    link_id UUID,
    source_page_id UUID,
    source_title TEXT,
    source_icon TEXT,
    relation_type TEXT,
    context TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pl.id as link_id,
        pl.source_page_id,
        p.title as source_title,
        p.icon as source_icon,
        pl.relation_type,
        pl.context,
        pl.created_at
    FROM public.page_links pl
    JOIN public.pages p ON p.id = pl.source_page_id
    WHERE pl.target_page_id = p_page_id
    AND pl.user_id = p_user_id
    ORDER BY pl.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function to get outgoing links (pages this page links TO)
CREATE OR REPLACE FUNCTION get_page_outlinks(p_page_id UUID, p_user_id UUID)
RETURNS TABLE (
    link_id UUID,
    target_page_id UUID,
    target_title TEXT,
    target_icon TEXT,
    relation_type TEXT,
    context TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pl.id as link_id,
        pl.target_page_id,
        p.title as target_title,
        p.icon as target_icon,
        pl.relation_type,
        pl.context,
        pl.created_at
    FROM public.page_links pl
    JOIN public.pages p ON p.id = pl.target_page_id
    WHERE pl.source_page_id = p_page_id
    AND pl.user_id = p_user_id
    ORDER BY pl.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Function to get all mentions in a page
CREATE OR REPLACE FUNCTION get_page_mentions(p_page_id UUID, p_user_id UUID)
RETURNS TABLE (
    mention_id UUID,
    mention_type TEXT,
    target_id UUID,
    mention_text TEXT,
    target_title TEXT,
    target_icon TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.id as mention_id,
        pm.mention_type,
        pm.mention_id as target_id,
        pm.mention_text,
        CASE 
            WHEN pm.mention_type = 'page' THEN (SELECT title FROM public.pages WHERE id = pm.mention_id)
            WHEN pm.mention_type = 'skill' THEN (SELECT name FROM public.skills WHERE id = pm.mention_id)
            WHEN pm.mention_type = 'task' THEN (SELECT title FROM public.tasks WHERE id = pm.mention_id)
            WHEN pm.mention_type = 'concept' THEN pm.mention_text
        END as target_title,
        CASE 
            WHEN pm.mention_type = 'page' THEN (SELECT icon FROM public.pages WHERE id = pm.mention_id)
            ELSE NULL
        END as target_icon
    FROM public.page_mentions pm
    WHERE pm.source_page_id = p_page_id
    AND pm.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Function to find related pages (for AI suggestions)
CREATE OR REPLACE FUNCTION find_related_pages(
    p_page_id UUID, 
    p_user_id UUID,
    p_workspace_id UUID DEFAULT NULL,
    p_limit INT DEFAULT 5
)
RETURNS TABLE (
    page_id UUID,
    title TEXT,
    icon TEXT,
    similarity_score FLOAT,
    relation_reason TEXT
) AS $$
DECLARE
    v_page_tags TEXT[];
    v_page_title TEXT;
BEGIN
    -- Get current page info
    SELECT tags, title INTO v_page_tags, v_page_title
    FROM public.pages WHERE id = p_page_id;
    
    RETURN QUERY
    -- Find pages with matching tags
    SELECT DISTINCT
        p.id as page_id,
        p.title,
        p.icon,
        CASE 
            WHEN p.tags && v_page_tags THEN 0.8
            ELSE 0.5
        END::FLOAT as similarity_score,
        CASE 
            WHEN p.tags && v_page_tags THEN 'Shares tags: ' || array_to_string(p.tags & v_page_tags, ', ')
            ELSE 'Same workspace'
        END as relation_reason
    FROM public.pages p
    WHERE p.id != p_page_id
    AND p.user_id = p_user_id
    AND (p_workspace_id IS NULL OR p.workspace_id = p_workspace_id)
    AND p.id NOT IN (
        -- Exclude already linked pages
        SELECT target_page_id FROM public.page_links WHERE source_page_id = p_page_id
        UNION
        SELECT source_page_id FROM public.page_links WHERE target_page_id = p_page_id
    )
    ORDER BY similarity_score DESC, p.updated_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Trigger to sync page links to graph_edges
CREATE OR REPLACE FUNCTION sync_page_link_to_graph()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Add edge to knowledge graph
        INSERT INTO public.graph_edges (user_id, source_id, source_type, target_id, target_type, edge_type, weight)
        VALUES (NEW.user_id, NEW.source_page_id, 'page', NEW.target_page_id, 'page', NEW.relation_type, 1.0)
        ON CONFLICT DO NOTHING;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Remove edge from knowledge graph
        DELETE FROM public.graph_edges 
        WHERE source_id = OLD.source_page_id 
        AND target_id = OLD.target_page_id
        AND user_id = OLD.user_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_page_link_to_graph
AFTER INSERT OR DELETE ON public.page_links
FOR EACH ROW EXECUTE FUNCTION sync_page_link_to_graph();