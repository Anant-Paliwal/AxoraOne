-- Fix missing workspace_id in existing data
-- This script assigns workspace_id to all existing pages, skills, and tasks

-- First, let's see what we have
SELECT 
    'Pages without workspace_id' as item,
    COUNT(*) as count
FROM pages
WHERE workspace_id IS NULL
UNION ALL
SELECT 
    'Skills without workspace_id',
    COUNT(*)
FROM skills
WHERE workspace_id IS NULL
UNION ALL
SELECT 
    'Tasks without workspace_id',
    COUNT(*)
FROM tasks
WHERE workspace_id IS NULL;

-- Option 1: Assign all data to the first workspace of each user
-- This is the safest approach if users have one workspace

-- Update pages
UPDATE pages p
SET workspace_id = (
    SELECT w.id 
    FROM workspaces w 
    WHERE w.user_id = p.user_id 
    ORDER BY w.created_at 
    LIMIT 1
)
WHERE p.workspace_id IS NULL
  AND EXISTS (
    SELECT 1 FROM workspaces w WHERE w.user_id = p.user_id
  );

-- Update skills
UPDATE skills s
SET workspace_id = (
    SELECT w.id 
    FROM workspaces w 
    WHERE w.user_id = s.user_id 
    ORDER BY w.created_at 
    LIMIT 1
)
WHERE s.workspace_id IS NULL
  AND EXISTS (
    SELECT 1 FROM workspaces w WHERE w.user_id = s.user_id
  );

-- Update tasks
UPDATE tasks t
SET workspace_id = (
    SELECT w.id 
    FROM workspaces w 
    WHERE w.user_id = t.user_id 
    ORDER BY w.created_at 
    LIMIT 1
)
WHERE t.workspace_id IS NULL
  AND EXISTS (
    SELECT 1 FROM workspaces w WHERE w.user_id = t.user_id
  );

-- Update graph_edges if any exist
UPDATE graph_edges ge
SET workspace_id = (
    SELECT w.id 
    FROM workspaces w 
    WHERE w.user_id = ge.user_id 
    ORDER BY w.created_at 
    LIMIT 1
)
WHERE ge.workspace_id IS NULL
  AND EXISTS (
    SELECT 1 FROM workspaces w WHERE w.user_id = ge.user_id
  );

-- Verify the updates
SELECT 
    'Pages with workspace_id' as item,
    COUNT(*) as count
FROM pages
WHERE workspace_id IS NOT NULL
UNION ALL
SELECT 
    'Skills with workspace_id',
    COUNT(*)
FROM skills
WHERE workspace_id IS NOT NULL
UNION ALL
SELECT 
    'Tasks with workspace_id',
    COUNT(*)
FROM tasks
WHERE workspace_id IS NOT NULL
UNION ALL
SELECT 
    'Graph edges with workspace_id',
    COUNT(*)
FROM graph_edges
WHERE workspace_id IS NOT NULL;

-- Show workspace assignments
SELECT 
    w.id as workspace_id,
    w.name as workspace_name,
    (SELECT COUNT(*) FROM pages WHERE workspace_id = w.id) as pages_count,
    (SELECT COUNT(*) FROM skills WHERE workspace_id = w.id) as skills_count,
    (SELECT COUNT(*) FROM tasks WHERE workspace_id = w.id) as tasks_count
FROM workspaces w
ORDER BY w.created_at;
