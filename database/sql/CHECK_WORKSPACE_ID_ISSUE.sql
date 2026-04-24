-- ============================================
-- CHECK IF SKILLS HAVE WORKSPACE_ID
-- This is critical for contribution tracking!
-- ============================================

-- Check skills and their workspace_id
SELECT 
    '=== SKILLS AND WORKSPACE_ID ===' as section;

SELECT 
    id,
    name,
    level,
    workspace_id,
    CASE 
        WHEN workspace_id IS NULL THEN '❌ NO WORKSPACE - Contributions will NOT be tracked'
        ELSE '✅ Has workspace - Contributions will be tracked'
    END as tracking_status,
    user_id,
    created_at
FROM skills
ORDER BY created_at DESC;

-- Summary
SELECT 
    '=== SUMMARY ===' as section;

SELECT 
    'Skills with workspace_id' as metric,
    COUNT(*) as count
FROM skills
WHERE workspace_id IS NOT NULL
UNION ALL
SELECT 
    'Skills WITHOUT workspace_id' as metric,
    COUNT(*) as count
FROM skills
WHERE workspace_id IS NULL;

-- Check skill_evidence
SELECT 
    '=== SKILL EVIDENCE ===' as section;

SELECT 
    se.id,
    s.name as skill_name,
    s.workspace_id as skill_workspace_id,
    p.title as page_title,
    se.user_id,
    se.created_at,
    CASE 
        WHEN s.workspace_id IS NULL THEN '❌ Skill has no workspace - contribution NOT tracked'
        ELSE '✅ Skill has workspace - contribution should be tracked'
    END as tracking_status
FROM skill_evidence se
JOIN skills s ON se.skill_id = s.id
LEFT JOIN pages p ON se.page_id = p.id
ORDER BY se.created_at DESC
LIMIT 20;

-- ============================================
-- THE PROBLEM
-- ============================================

/*
If your skills show "workspace_id IS NULL", that's the problem!

The contribution tracking code in backend/app/api/endpoints/skills.py
only runs if workspace_id exists:

    if workspace_id:
        # Track contribution
        supabase_admin.table("skill_contributions").insert(...)

SOLUTION:
You need to either:

1. Create skills WITH workspace_id from the start
2. OR update existing skills to add workspace_id:

UPDATE skills 
SET workspace_id = 'YOUR_WORKSPACE_ID'
WHERE workspace_id IS NULL;

To find your workspace_id, run:
SELECT id, name FROM workspaces;

Then update skills:
UPDATE skills 
SET workspace_id = 'paste-workspace-id-here'
WHERE workspace_id IS NULL;

After that, when you link pages to skills, contributions will be tracked!
*/
