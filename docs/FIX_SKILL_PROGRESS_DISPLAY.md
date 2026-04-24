# 🔧 FIX: Skill Progress Always Shows 0%

## 🔍 PROBLEM

You're linking pages and creating tasks, but skill progress stays at 0%.

## 🎯 ROOT CAUSE

The progress calculation depends on **skill_contributions** table having data. Let me check what's happening:

### Possible Issues:

1. **SQL Fix Not Run**: `skill_evidence.user_id` column missing causes evidence linking to fail
2. **Contributions Not Being Tracked**: Backend code exists but may not be executing
3. **Progress API Returns Empty**: No contributions = 0% progress

## ✅ SOLUTION

### Step 1: Run the SQL Fix (CRITICAL)

```sql
-- Run this in Supabase SQL Editor
ALTER TABLE skill_evidence 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_skill_evidence_user_id ON skill_evidence(user_id);
```

### Step 2: Verify Contributions Are Being Tracked

```sql
-- Check if contributions table has data
SELECT 
    sc.id,
    s.name as skill_name,
    sc.contribution_type,
    sc.impact_score,
    sc.created_at
FROM skill_contributions sc
JOIN skills s ON sc.skill_id = s.id
ORDER BY sc.created_at DESC
LIMIT 10;

-- If empty, contributions aren't being tracked!
```

### Step 3: Check Backend Logs

When you:
- **Link a page to skill**: Look for `✅ Contribution tracked: page_linked to skill`
- **Complete a task**: Look for `✅ Tracked task acceleration`
- **Create a page**: Look for `✅ Auto-linked page to X skills`

If you DON'T see these messages, the backend isn't running the contribution tracking code.

### Step 4: Manual Test

Let's manually create a contribution to test:

```sql
-- Insert a test contribution
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
    'page_linked',
    'test-page-id',
    'page',
    0.15,
    '{"test": true}'::jsonb,
    NOW()
FROM skills s
WHERE s.workspace_id IS NOT NULL
LIMIT 1;

-- Now check if progress API returns data
-- Call: GET /api/v1/intelligence/skills/{skill_id}/real-progress
```

### Step 5: Verify Progress Calculation

The progress is calculated from:
- **Impact Score**: Sum of all contribution impact_scores
- **Contribution Count**: Number of contributions
- **Contribution Types**: Diversity of contribution types

```sql
-- Check what the backend sees
SELECT 
    s.id,
    s.name,
    COUNT(sc.id) as contribution_count,
    COALESCE(SUM(sc.impact_score), 0) as total_impact,
    COUNT(DISTINCT sc.contribution_type) as contribution_types
FROM skills s
LEFT JOIN skill_contributions sc ON s.id = sc.skill_id
WHERE s.workspace_id IS NOT NULL
GROUP BY s.id, s.name;
```

## 🚀 QUICK FIX STEPS

### 1. Run SQL Fix
```bash
# Open Supabase Dashboard
# Go to SQL Editor
# Paste and run FIX_ALL_5_SKILL_ISSUES.sql
```

### 2. Restart Backend
```bash
cd backend
# Stop (Ctrl+C)
python -m uvicorn app.main:app --reload
```

### 3. Test the Flow

**Test 1: Link a Page**
1. Go to Skills page
2. Edit a skill
3. Link a page
4. Check backend logs for: `✅ Contribution tracked: page_linked`
5. Refresh skill - progress should increase by ~15%

**Test 2: Complete a Task**
1. Create a task linked to a skill
2. Mark it as completed
3. Check backend logs for: `✅ Tracked task acceleration`
4. Refresh skill - progress should increase

**Test 3: Create a Page**
1. Create a new page with content related to a skill
2. Check backend logs for: `✅ Auto-linked page to X skills`
3. Check skill - should have new evidence
4. Progress should increase

## 🔍 DEBUGGING

### Check if Evidence is Being Created

```sql
-- Check skill_evidence table
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
```

### Check if Contributions are Being Created

```sql
-- Check skill_contributions table
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
```

### Check Backend Endpoint Directly

```bash
# Test the progress API directly
curl http://localhost:8000/api/v1/intelligence/skills/YOUR_SKILL_ID/real-progress \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return:
# {
#   "progress": 15.5,
#   "can_evolve": false,
#   "total_impact": 0.15,
#   "contribution_count": 1,
#   "contribution_types": 1,
#   "requirements": {...},
#   "breakdown": {...}
# }
```

## 📊 EXPECTED BEHAVIOR

After fixes, when you:

1. **Link a page to skill**:
   - Backend logs: `✅ Contribution tracked: page_linked to skill XXX`
   - Database: New row in `skill_contributions` with `impact_score = 0.15`
   - Frontend: Progress increases by ~15%

2. **Complete a task**:
   - Backend logs: `✅ Tracked task acceleration: X days saved for skill`
   - Database: New row in `skill_contributions` with `contribution_type = 'task_accelerated'`
   - Frontend: Progress increases based on days saved

3. **Create a page**:
   - Backend logs: `✅ Auto-linked page 'XXX' to Y skills`
   - Database: New rows in `skill_evidence` AND `skill_contributions`
   - Frontend: Progress increases for all linked skills

## 🎯 PROGRESS CALCULATION FORMULA

```
Progress = (
  (total_impact / min_impact_required) * 100 +
  (contribution_count / min_contributions_required) * 100 +
  (contribution_types / min_types_required) * 100
) / 3

Where for Beginner level:
- min_impact_required = 0.5
- min_contributions_required = 5
- min_types_required = 2
```

So to reach 100% at Beginner level, you need:
- **0.5 total impact** (e.g., 3-4 page links at 0.15 each)
- **5 contributions** (any type)
- **2 different types** (e.g., page_linked + task_accelerated)

## ✅ VERIFICATION

After applying fixes, run this query:

```sql
-- This should show non-zero progress
SELECT 
    s.id,
    s.name,
    s.level,
    COUNT(sc.id) as contributions,
    COALESCE(SUM(sc.impact_score), 0) as total_impact,
    COUNT(DISTINCT sc.contribution_type) as types,
    -- Calculate progress
    ROUND(
        (
            (COALESCE(SUM(sc.impact_score), 0) / 0.5 * 100) +
            (COUNT(sc.id)::float / 5 * 100) +
            (COUNT(DISTINCT sc.contribution_type)::float / 2 * 100)
        ) / 3,
        1
    ) as calculated_progress
FROM skills s
LEFT JOIN skill_contributions sc ON s.id = sc.skill_id
WHERE s.workspace_id IS NOT NULL
GROUP BY s.id, s.name, s.level;
```

## 🚨 IF STILL SHOWING 0%

1. **Check SQL fix was applied**:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'skill_evidence' AND column_name = 'user_id';
   ```

2. **Check backend is running**:
   - Look for: `🧠 Living Intelligence OS activated`

3. **Check contributions table exists**:
   ```sql
   SELECT COUNT(*) FROM skill_contributions;
   ```

4. **Manually add a contribution** (for testing):
   ```sql
   INSERT INTO skill_contributions (
       id, skill_id, workspace_id, contribution_type, 
       target_id, target_type, impact_score, created_at
   )
   SELECT 
       gen_random_uuid(), id, workspace_id, 'manual_test',
       'test', 'test', 0.20, NOW()
   FROM skills WHERE workspace_id IS NOT NULL LIMIT 1;
   ```

5. **Refresh the skill page** - should now show 20% progress

## 📞 STILL STUCK?

If progress still shows 0% after all fixes:

1. Open browser console (F12)
2. Go to Skills page
3. Look for errors when loading progress
4. Check Network tab for failed API calls
5. Share the error messages

The most common issue is the SQL fix not being run, which causes evidence linking to fail silently.
