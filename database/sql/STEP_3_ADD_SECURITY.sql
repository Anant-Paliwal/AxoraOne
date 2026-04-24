-- ============================================
-- STEP 3: Add RLS Policies and Triggers
-- Run this AFTER STEP 2 completes successfully
-- ============================================

-- 1. Enable RLS on new tables
ALTER TABLE skill_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_chains ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies for skill_memory
DROP POLICY IF EXISTS "Users can view their skill memory" ON skill_memory;
CREATE POLICY "Users can view their skill memory" ON skill_memory
    FOR SELECT USING (
        skill_id IN (
            SELECT id FROM skills WHERE user_id = auth.uid()
            OR workspace_id IN (
                SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can update their skill memory" ON skill_memory;
CREATE POLICY "Users can update their skill memory" ON skill_memory
    FOR ALL USING (
        skill_id IN (
            SELECT id FROM skills WHERE user_id = auth.uid()
            OR workspace_id IN (
                SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
            )
        )
    );

-- 3. RLS Policies for skill_contributions
DROP POLICY IF EXISTS "Users can view workspace contributions" ON skill_contributions;
CREATE POLICY "Users can view workspace contributions" ON skill_contributions
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert contributions" ON skill_contributions;
CREATE POLICY "Users can insert contributions" ON skill_contributions
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

-- 4. RLS Policies for skill_chains
DROP POLICY IF EXISTS "Users can view workspace chains" ON skill_chains;
CREATE POLICY "Users can view workspace chains" ON skill_chains
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage workspace chains" ON skill_chains;
CREATE POLICY "Users can manage workspace chains" ON skill_chains
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

-- 5. Auto-create skill memory trigger
CREATE OR REPLACE FUNCTION create_skill_memory()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO skill_memory (skill_id)
    VALUES (NEW.id)
    ON CONFLICT (skill_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_skill_memory ON skills;
CREATE TRIGGER trigger_create_skill_memory
    AFTER INSERT ON skills
    FOR EACH ROW
    EXECUTE FUNCTION create_skill_memory();

-- 6. Update activation count trigger
CREATE OR REPLACE FUNCTION update_skill_activation()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE skills
    SET 
        activation_count = COALESCE(activation_count, 0) + 1,
        last_activated_at = NOW()
    WHERE id = NEW.skill_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_skill_activation ON skill_executions;
CREATE TRIGGER trigger_update_skill_activation
    AFTER INSERT ON skill_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_skill_activation();

-- 7. Create intelligence summary view
CREATE OR REPLACE VIEW skill_intelligence_summary AS
SELECT 
    s.id,
    s.name,
    s.level,
    s.workspace_id,
    s.activation_count,
    s.confidence_score,
    s.success_rate,
    s.last_activated_at,
    COUNT(DISTINCT sc.id) as total_contributions,
    COALESCE(SUM(sc.impact_score), 0) as total_impact,
    COUNT(DISTINCT CASE WHEN sc.contribution_type = 'suggestion_accepted' THEN sc.id END) as accepted_suggestions,
    COUNT(DISTINCT CASE WHEN sc.contribution_type = 'suggestion_rejected' THEN sc.id END) as rejected_suggestions,
    (SELECT COUNT(*) FROM skill_chains WHERE source_skill_id = s.id) as outgoing_chains,
    (SELECT COUNT(*) FROM skill_chains WHERE target_skill_id = s.id) as incoming_chains
FROM skills s
LEFT JOIN skill_contributions sc ON s.id = sc.skill_id
GROUP BY s.id, s.name, s.level, s.workspace_id, s.activation_count, 
         s.confidence_score, s.success_rate, s.last_activated_at;

-- Verification
SELECT 'RLS Policies Created' as status, COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename IN ('skill_memory', 'skill_contributions', 'skill_chains');

SELECT 'Triggers Created' as status, COUNT(*) as trigger_count
FROM pg_trigger 
WHERE tgname IN ('trigger_create_skill_memory', 'trigger_update_skill_activation');

SELECT 'View Created' as status, COUNT(*) as view_count
FROM pg_views 
WHERE viewname = 'skill_intelligence_summary';
