-- ============================================
-- FINAL SETUP - Only Missing Parts
-- Tables already exist, just add what's missing
-- ============================================

-- 1. Add intelligence columns to skills table (if missing)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='skills' AND column_name='activation_count') THEN
        ALTER TABLE skills ADD COLUMN activation_count INT DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='skills' AND column_name='last_activated_at') THEN
        ALTER TABLE skills ADD COLUMN last_activated_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='skills' AND column_name='confidence_score') THEN
        ALTER TABLE skills ADD COLUMN confidence_score DECIMAL(3,2) DEFAULT 0.0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='skills' AND column_name='success_rate') THEN
        ALTER TABLE skills ADD COLUMN success_rate DECIMAL(3,2) DEFAULT 0.0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='skills' AND column_name='is_bottleneck') THEN
        ALTER TABLE skills ADD COLUMN is_bottleneck BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Enable RLS on intelligence tables
ALTER TABLE skill_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_chains ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for skill_memory
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

-- 4. RLS Policies for skill_contributions
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

-- 5. RLS Policies for skill_chains
DROP POLICY IF EXISTS "Users can view their chains" ON skill_chains;
CREATE POLICY "Users can view their chains" ON skill_chains
    FOR SELECT USING (
        user_id = auth.uid() OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage their chains" ON skill_chains;
CREATE POLICY "Users can manage their chains" ON skill_chains
    FOR ALL USING (
        user_id = auth.uid()
    );

-- 6. Auto-create skill memory trigger
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

-- 7. Update activation count trigger (if skill_executions exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'skill_executions') THEN
        CREATE OR REPLACE FUNCTION update_skill_activation()
        RETURNS TRIGGER AS $func$
        BEGIN
            UPDATE skills
            SET 
                activation_count = COALESCE(activation_count, 0) + 1,
                last_activated_at = NOW()
            WHERE id = NEW.skill_id;
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trigger_update_skill_activation ON skill_executions;
        CREATE TRIGGER trigger_update_skill_activation
            AFTER INSERT ON skill_executions
            FOR EACH ROW
            EXECUTE FUNCTION update_skill_activation();
    END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

-- Check tables exist
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM (
    VALUES 
        ('skill_memory'),
        ('skill_contributions'),
        ('skill_chains'),
        ('skills')
) AS t(table_name)
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = t.table_name
);

-- Check skills intelligence columns
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'skills' 
AND column_name IN ('activation_count', 'confidence_score', 'last_activated_at', 'success_rate', 'is_bottleneck')
ORDER BY column_name;

-- Check RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('skill_memory', 'skill_contributions', 'skill_chains')
AND schemaname = 'public';

-- ============================================
-- SETUP COMPLETE!
-- Your existing tables are now fully integrated
-- with the skill intelligence system
-- ============================================
