-- ============================================
-- FIX: Add workspace_id to existing skills
-- This enables contribution tracking!
-- ============================================

-- Step 1: Check your workspace ID
SELECT 
    '=== YOUR WORKSPACES ===' as section;

SELECT 
    id,
    name,
    created_at
FROM workspaces
ORDER BY created_at DESC;

-- Step 2: Check which skills need workspace_id
SELECT 
    '=== SKILLS WITHOUT WORKSPACE ===' as section;

SELECT 
    id,
    name,
    level,
    user_id,
    created_at
FROM skills
WHERE workspace_id IS NULL;

-- ============================================
-- APPLY THE FIX
-- ============================================

-- Step 3: Update skills to add workspace_id
-- IMPORTANT: Replace 'YOUR_WORKSPACE_ID' with actual workspace ID from Step 1

/*
UPDATE skills 
SET workspace_id = 'YOUR_WORKSPACE_ID'
WHERE workspace_id IS NULL;
*/

-- ============================================
-- ALTERNATIVE: Update based on user's default workspace
-- ============================================

-- If you want to automatically assign skills to user's first workspace:

/*
UPDATE skills s
SET workspace_id = (
    SELECT w.id 
    FROM workspaces w
    WHERE w.owner_id = s.user_id
    ORDER BY w.created_at ASC
    LIMIT 1
)
WHERE s.workspace_id IS NULL;
*/

-- ============================================
-- VERIFY THE FIX
-- ============================================

-- Step 4: Verify all skills now have workspace_id
SELECT 
    '=== VERIFICATION ===' as section;

SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All skills have workspace_id'
        ELSE '❌ ' || COUNT(*) || ' skills still missing workspace_id'
    END as status
FROM skills
WHERE workspace_id IS NULL;

-- Show updated skills
SELECT 
    id,
    name,
    workspace_id,
    '✅ Ready for contribution tracking' as status
FROM skills
WHERE workspace_id IS NOT NULL
ORDER BY created_at DESC;

-- ============================================
-- INSTRUCTIONS
-- ============================================

/*
HOW TO USE THIS FIX:

1. Run Step 1 to see your workspace IDs
2. Copy the workspace ID you want to use
3. Uncomment the UPDATE statement in Step 3
4. Replace 'YOUR_WORKSPACE_ID' with your actual workspace ID
5. Run the UPDATE statement
6. Run Step 4 to verify

EXAMPLE:
If your workspace ID is: abc-123-def-456

UPDATE skills 
SET workspace_id = 'abc-123-def-456'
WHERE workspace_id IS NULL;

AFTER THIS FIX:
- Link a page to a skill
- Backend will track contribution
- skill_contributions table will have data
- Progress will show correctly!
*/
