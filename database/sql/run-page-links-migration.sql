-- Run this in Supabase SQL Editor to create page linking tables

-- 1. Page Links table
CREATE TABLE IF NOT EXISTS public.page_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    target_page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    relation_type TEXT DEFAULT 'references',
    context TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(source_page_id, target_page_id)
);

-- 2. Page Mentions table
CREATE TABLE IF NOT EXISTS public.page_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    mention_type TEXT NOT NULL,
    mention_id UUID,
    mention_text TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    position_start INT,
    position_end INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Concepts table
CREATE TABLE IF NOT EXISTS public.concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    description TEXT,
    linked_page_id UUID REFERENCES public.pages(id) ON DELETE SET NULL,
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
    confidence FLOAT DEFAULT 0.5,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(page_id, suggested_page_id)
);

-- 5. Enable RLS
ALTER TABLE public.page_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_suggested_relations ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies (allow service key to bypass)
DROP POLICY IF EXISTS "Users can manage their own page links" ON public.page_links;
CREATE POLICY "Users can manage their own page links" ON public.page_links
    FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Users can manage their own page mentions" ON public.page_mentions;
CREATE POLICY "Users can manage their own page mentions" ON public.page_mentions
    FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Users can manage their own concepts" ON public.concepts;
CREATE POLICY "Users can manage their own concepts" ON public.concepts
    FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Users can manage their own AI suggestions" ON public.ai_suggested_relations;
CREATE POLICY "Users can manage their own AI suggestions" ON public.ai_suggested_relations
    FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_page_links_source ON public.page_links(source_page_id);
CREATE INDEX IF NOT EXISTS idx_page_links_target ON public.page_links(target_page_id);
CREATE INDEX IF NOT EXISTS idx_page_links_user ON public.page_links(user_id);
CREATE INDEX IF NOT EXISTS idx_page_mentions_source ON public.page_mentions(source_page_id);
CREATE INDEX IF NOT EXISTS idx_concepts_user ON public.concepts(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_page ON public.ai_suggested_relations(page_id);

-- 8. Trigger to sync page links to graph_edges (FIXED - removed weight column)
CREATE OR REPLACE FUNCTION sync_page_link_to_graph()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Add edge to knowledge graph (without weight column)
        INSERT INTO public.graph_edges (user_id, source_id, source_type, target_id, target_type, edge_type)
        VALUES (NEW.user_id, NEW.source_page_id, 'page', NEW.target_page_id, 'page', NEW.relation_type)
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

DROP TRIGGER IF EXISTS trigger_sync_page_link_to_graph ON public.page_links;
CREATE TRIGGER trigger_sync_page_link_to_graph
AFTER INSERT OR DELETE ON public.page_links
FOR EACH ROW EXECUTE FUNCTION sync_page_link_to_graph();

SELECT 'Page linking tables created successfully!' as status;
