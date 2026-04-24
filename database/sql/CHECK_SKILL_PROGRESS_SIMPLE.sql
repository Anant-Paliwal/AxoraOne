-- ============================================
-- SKILL PROGRESS DIAGNOSTIC SCRIPT (SIMPLIFIED)
-- Run this in Supabase to see why progress is 0%
-- ============================================

-- 1. Check if skill_evidence.user_id column exists
SELECT 
    'FIX #1: skill_evidence.user_id column' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'skill_evidence' AND column_name = 'user_id'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING - Run FIX_ALL_5_SKILL_ISSUES.sql'
    END as status;

-- 2. Check if skills exist
SELECT 
    'Skills in database' as check_name,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*) || ' skills found'
        ELSE '❌ No skills - Create a skill first'
    END as status
FROM skills;

-- 3. Check if skill_evidence exists
SELECT 
    'Skill evidence (linked pages)' as check_name,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*) || ' evidence records'
        ELSE '⚠️ No evidence - Link pages to skills'
    END as status
FROM skill_evidence;

-- 4. Check if skill_contributions exist
SELECT 
    'Skill contributions (progress data)' as check_name,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*) || ' contributions'
        ELSE '❌ No contributions - This is why progress is 0%'
    END as status
FROM skill_contributions;

-- 5. Check if skill_executions exist
SELECT 
    'Skill executions' as check_name,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*) || ' executions'
        ELSE '⚠️ No executions yet'
    END as status
FROM skill_executions;

-- ============================================
-- DETAILED BREAKDOWN
-- ============================================

-- Show skills with their progress data
SELECT 
    '=== SKILL PROGRESS BREAKDOWN ===' as section;

SELECT 
    s.id,
    s.name,
    s.level,
    s.workspace_id,
    COUNT(DISTINCT se.id) as linked_pages,
    COUNT(DISTINCT sc.id) as contributions,
    COALESCE(SUM(sc.impact_score), 0) as total_impact,
    COUNT(DISTINCT sc.contribution_type) as contribution_types,
    -- Calculate progress (Beginner level requirements) - simplified without ROUND
    CAST(
        (
            (COALESCE(SUM(sc.impact_score), 0) / 0.5 * 100) +
            (COUNT(DISTINCT sc.id)::float / 5 * 100) +
            (COUNT(DISTINCT sc.contribution_type)::float / 2 * 100)
        ) / 3
    AS integer) as calculated_progress_percent
FROM skills s
LEFT JOIN skill_evidence se ON s.id = se.skill_id
LEFT JOIN skill_contributions sc ON s.id = sc.skill_id
WHERE s.workspace_id IS NOT NULL
GROUP BY s.id, s.name, s.level, s.workspace_id
ORDER BY calculated_progress_percent DESC;

-- ============================================
-- CONTRIBUTION DETAILS
-- ============================================

SELECT 
    '=== RECENT CONTRIBUTIONS ===' as section;

SELECT 
    sc.id,
    s.name as skill_name,
    sc.contribution_type,
    sc.target_type,
    sc.impact_score,
    sc.created_at
FROM skill_contributions sc
JOIN skills s ON sc.skill_id = s.id
ORDER BY sc.created_at DESC
LIMIT 10;

-- ============================================
-- EVIDENCE DETAILS
-- ============================================

SELECT 
    '=== SKILL EVIDENCE (LINKED PAGES) ===' as section;

SELECT 
    se.id,
    s.name as skill_name,
    p.title as page_title,
    se.evidence_type,
    se.confidence_score,
    se.created_at
FROM skill_evidence se
JOIN skills s ON se.skill_id = s.id
LEFT JOIN pages p ON se.page_id = p.id
ORDER BY se.created_at DESC
LIMIT 10;

-- ============================================
-- RECOMMENDATIONS
-- ============================================

SELECT 
    '=== RECOMMENDATIONS ===' as section;

-- Check 1: SQL fix needed?
SELECT 
    'ACTION 1' as priority,
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'skill_evidence' AND column_name = 'user_id'
        ) THEN '🔴 CRITICAL: Run FIX_ALL_5_SKILL_ISSUES.sql in Supabase'
        ELSE '✅ SQL fix already applied'
    END as recommendation;

-- Check 2: Contributions missing?
SELECT 
    'ACTION 2' as priority,
    CASE 
        WHEN (SELECT COUNT(*) FROM skill_contributions) = 0 
        THEN '🔴 CRITICAL: No contributions tracked. Backend may not be running or tracking code not executing.'
        ELSE '✅ Contributions are being tracked'
    END as recommendation;

-- Check 3: Evidence missing?
SELECT 
    'ACTION 3' as priority,
    CASE 
        WHEN (SELECT COUNT(*) FROM skill_evidence) = 0 
        THEN '⚠️ WARNING: No pages linked to skills. Link pages to see progress.'
        ELSE '✅ Pages are linked to skills'
    END as recommendation;

-- Check 4: Skills exist?
SELECT 
    'ACTION 4' as priority,
    CASE 
        WHEN (SELECT COUNT(*) FROM skills WHERE workspace_id IS NOT NULL) = 0 
        THEN '⚠️ WARNING: No skills in workspace. Create skills first.'
        ELSE '✅ Skills exist in workspace'
    END as recommendation;

-- ============================================
-- SUMMARY
-- ============================================

SELECT 
    '=== SUMMARY ===' as section;

SELECT 
    'Total Skills' as metric,
    COUNT(*)::text as value
FROM skills WHERE workspace_id IS NOT NULL
UNION ALL
SELECT 
    'Skills with Evidence' as metric,
    COUNT(DISTINCT skill_id)::text as value
FROM skill_evidence
UNION ALL
SELECT 
    'Skills with Contributions' as metric,
    COUNT(DISTINCT skill_id)::text as value
FROM skill_contributions
UNION ALL
SELECT 
    'Total Contributions' as metric,
    COUNT(*)::text as value
FROM skill_contributions
UNION ALL
SELECT 
    'Total Impact Score' as metric,
    CAST(COALESCE(SUM(impact_score), 0) AS text) as value
FROM skill_contributions;

-- ============================================
-- EXPECTED RESULTS
-- ============================================

/*
If progress is showing 0%, you'll see:
- ❌ No contributions in skill_contributions table
- Possibly ❌ Missing user_id column in skill_evidence

To fix:
1. Run FIX_ALL_5_SKILL_ISSUES.sql
2. Restart backend
3. Link a page to a skill
4. Check backend logs for "✅ Contribution tracked"
5. Refresh skill page - should show ~15% progress

For quick testing, run this to manually insert a test contribution:

INSERT INTO skill_contributions (
    id,
    skill_id,
    workspace_id,
    contribution_type,
    target_id,
    target_type,
    impact_score,
    metadata,
    created_at
)
SELECT 
    gen_random_uuid(),
    s.id,
    s.workspace_id,
    'manual_test',
    'test-page-id',
    'page',
    0.20,
    '{"test": true, "note": "Manual test contribution"}'::jsonb,
    NOW()
FROM skills s
WHERE s.workspace_id IS NOT NULL
LIMIT 1;

Then refresh Skills page - should show 20% progress!
*/
