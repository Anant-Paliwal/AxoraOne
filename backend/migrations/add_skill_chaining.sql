-- Add Skill Chaining Support
-- Phase 1: linked_skills for skill-to-skill recommendations

-- 1. Add linked_skills column to skills table
ALTER TABLE public.skills 
ADD COLUMN IF NOT EXISTS linked_skills UUID[] DEFAULT '{}';

-- 2. Add skill_type for categorization (helps with smart suggestions)
ALTER TABLE public.skills 
ADD COLUMN IF NOT EXISTS skill_type TEXT DEFAULT 'learning' 
CHECK (skill_type IN ('learning', 'research', 'creation', 'analysis', 'practice'));

-- 3. Add prerequisite_skills (skills that should be learned first)
ALTER TABLE public.skills 
ADD COLUMN IF NOT EXISTS prerequisite_skills UUID[] DEFAULT '{}';

-- 4. Create skill_chains table for tracking execution chains
CREATE TABLE IF NOT EXISTS public.skill_chains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    skill_sequence UUID[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create skill_executions table for tracking when skills are "run"
CREATE TABLE IF NOT EXISTS public.skill_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    trigger_source TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_source IN ('manual', 'ask_anything', 'task', 'chain')),
    input_context JSONB DEFAULT '{}'::jsonb,
    output_type TEXT CHECK (output_type IN ('page', 'task', 'quiz', 'flashcards', 'insight')),
    output_id UUID,
    execution_status TEXT DEFAULT 'completed' CHECK (execution_status IN ('pending', 'running', 'completed', 'failed')),
    suggested_next_skills UUID[] DEFAULT '{}',
    executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Enable RLS
ALTER TABLE public.skill_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_executions ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for skill_chains
CREATE POLICY "Users can manage their own skill chains" ON public.skill_chains
    FOR ALL USING (auth.uid() = user_id);

-- 8. RLS Policies for skill_executions
CREATE POLICY "Users can manage their own skill executions" ON public.skill_executions
    FOR ALL USING (auth.uid() = user_id);

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_skill_chains_user ON public.skill_chains(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_chains_workspace ON public.skill_chains(workspace_id);
CREATE INDEX IF NOT EXISTS idx_skill_executions_skill ON public.skill_executions(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_executions_user ON public.skill_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_executions_workspace ON public.skill_executions(workspace_id);

-- 10. Function to get suggested next skills based on current skill
CREATE OR REPLACE FUNCTION get_suggested_next_skills(
    p_skill_id UUID,
    p_user_id UUID,
    p_workspace_id UUID DEFAULT NULL
)
RETURNS TABLE (
    skill_id UUID,
    skill_name TEXT,
    skill_level TEXT,
    reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- First: Get explicitly linked skills
    SELECT 
        s.id,
        s.name,
        s.level,
        'Linked skill'::TEXT as reason
    FROM public.skills s
    WHERE s.id = ANY(
        SELECT unnest(linked_skills) FROM public.skills WHERE id = p_skill_id
    )
    AND s.user_id = p_user_id
    AND (p_workspace_id IS NULL OR s.workspace_id = p_workspace_id)
    
    UNION ALL
    
    -- Second: Get skills that have this skill as prerequisite (natural progression)
    SELECT 
        s.id,
        s.name,
        s.level,
        'Natural progression'::TEXT as reason
    FROM public.skills s
    WHERE p_skill_id = ANY(s.prerequisite_skills)
    AND s.user_id = p_user_id
    AND (p_workspace_id IS NULL OR s.workspace_id = p_workspace_id)
    
    UNION ALL
    
    -- Third: Get skills of same type at next level
    SELECT 
        s.id,
        s.name,
        s.level,
        'Same category, higher level'::TEXT as reason
    FROM public.skills s
    WHERE s.skill_type = (SELECT skill_type FROM public.skills WHERE id = p_skill_id)
    AND s.id != p_skill_id
    AND s.user_id = p_user_id
    AND (p_workspace_id IS NULL OR s.workspace_id = p_workspace_id)
    AND s.level IN (
        CASE (SELECT level FROM public.skills WHERE id = p_skill_id)
            WHEN 'Beginner' THEN 'Intermediate'
            WHEN 'Intermediate' THEN 'Advanced'
            WHEN 'Advanced' THEN 'Expert'
            ELSE 'Expert'
        END
    )
    LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Function to log skill execution and get suggestions
CREATE OR REPLACE FUNCTION log_skill_execution(
    p_skill_id UUID,
    p_user_id UUID,
    p_workspace_id UUID,
    p_trigger_source TEXT DEFAULT 'manual',
    p_input_context JSONB DEFAULT '{}'::jsonb,
    p_output_type TEXT DEFAULT NULL,
    p_output_id UUID DEFAULT NULL
)
RETURNS TABLE (
    execution_id UUID,
    suggested_skills JSONB
) AS $$
DECLARE
    v_execution_id UUID;
    v_suggested JSONB;
BEGIN
    -- Insert execution record
    INSERT INTO public.skill_executions (
        skill_id, user_id, workspace_id, trigger_source, 
        input_context, output_type, output_id
    ) VALUES (
        p_skill_id, p_user_id, p_workspace_id, p_trigger_source,
        p_input_context, p_output_type, p_output_id
    ) RETURNING id INTO v_execution_id;
    
    -- Get suggested next skills
    SELECT jsonb_agg(jsonb_build_object(
        'skill_id', skill_id,
        'skill_name', skill_name,
        'skill_level', skill_level,
        'reason', reason
    ))
    INTO v_suggested
    FROM get_suggested_next_skills(p_skill_id, p_user_id, p_workspace_id);
    
    -- Update execution with suggestions
    UPDATE public.skill_executions 
    SET suggested_next_skills = ARRAY(
        SELECT (s->>'skill_id')::UUID 
        FROM jsonb_array_elements(COALESCE(v_suggested, '[]'::jsonb)) s
    )
    WHERE id = v_execution_id;
    
    RETURN QUERY SELECT v_execution_id, COALESCE(v_suggested, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
