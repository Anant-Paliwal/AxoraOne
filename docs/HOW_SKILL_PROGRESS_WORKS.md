# 🎯 How Skill Progress Works & How to Check

## How Progress Increases

Skill progress increases when you create **contributions** to that skill. Here are the ways:

### 1. Link a Page to Skill (+15 impact)
```
Action: Link page to skill
↓
Creates: skill_evidence record
↓
Should create: skill_contributions record
↓
Result: Progress increases by ~15%
```

### 2. Complete a Task Linked to Skill (+25 impact)
```
Action: Mark task as complete
↓
Task has linked_skill_id
↓
Should create: skill_contributions record
↓
Result: Progress increases by ~25%
```

### 3. Accept AI Suggestion (+15 impact)
```
Action: Accept a suggestion from skill
↓
API call: POST /intelligence/skills/{id}/contribution/suggestion-accepted
↓
Creates: skill_contributions record
↓
Result: Progress increases by ~15%
```

### 4. Task Completed Faster (+5-20 impact)
```
Action: Complete task before due date
↓
API call: POST /intelligence/skills/{id}/contribution/task-accelerated
↓
Creates: skill_contributions record
↓
Result: Progress increases based on days saved
```

## Why Progress Might Not Update

### Issue 1: No Contributions Being Created
**Check:** Is data being written to `skill_contributions` table?

**Test in Supabase:**
```sql
-- Check if ANY contributions exist
SELECT * FROM skill_contributions 
ORDER BY created_at DESC 
LIMIT 10;

-- Check contributions for specific skill
SELECT * FROM skill_contributions 
WHERE skill_id = 'YOUR_SKILL_ID'
ORDER BY created_at DESC;
```

**Expected:** You should see rows when you link pages or complete tasks.

**If empty:** The backend isn't creating contributions. Check:
1. Backend is running
2. API endpoints are being called
3. No errors in backend logs

### Issue 2: Frontend Not Calling Progress API
**Check:** Is the frontend fetching progress?

**Look in SkillsPage.tsx around line 450:**
```typescript
const loadRealProgress = async () => {
    try {
      setLoadingProgress(true);
      const progress = await api.getSkillRealProgress(skill.id);
      setRealProgress(progress);
    } catch (error) {
      console.error('Error loading real progress:', error);
    }
};
```

**Test:** Open browser console and check for errors when viewing skills page.

### Issue 3: API Endpoint Not Working
**Test the API directly:**

```bash
# Get progress for a skill
curl http://localhost:8000/api/v1/intelligence/skills/YOUR_SKILL_ID/real-progress

# Expected response:
{
  "progress": 15.5,
  "can_evolve": false,
  "total_impact": 0.15,
  "contribution_count": 1,
  "contribution_types": 1,
  "breakdown": {
    "impact": 30.0,
    "count": 20.0,
    "diversity": 33.3
  }
}
```

**If error:** Check backend logs for the issue.

### Issue 4: RLS Policies Blocking Access
**Check:** Can the user access contributions?

**Test in Supabase:**
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'skill_contributions';

-- Check policies exist
SELECT * FROM pg_policies 
WHERE tablename = 'skill_contributions';
```

**If RLS blocks access:** User might not be a workspace member.

## Step-by-Step Debugging

### Step 1: Check Backend is Running
```bash
cd backend
python main.py

# Should see:
# INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 2: Create a Test Contribution Manually
```sql
-- In Supabase SQL Editor
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
) VALUES (
    gen_random_uuid(),
    'YOUR_SKILL_ID',
    'YOUR_WORKSPACE_ID',
    'test_contribution',
    'test_123',
    'test',
    0.15,
    '{"test": true}'::jsonb,
    NOW()
);
```

### Step 3: Check Progress API
```bash
curl http://localhost:8000/api/v1/intelligence/skills/YOUR_SKILL_ID/real-progress
```

**Expected:** Should show progress > 0

### Step 4: Check Frontend Calls API
1. Open browser DevTools (F12)
2. Go to Network tab
3. Go to Skills page
4. Look for request to `/intelligence/skills/.../real-progress`
5. Check response

### Step 5: Check SkillsPage Displays Progress
Look in the skill card for:
```
💪 0.15 impact score from 1 contributions
```

## Manual Test Flow

### Test 1: Link Page to Skill

1. **Create a skill** in UI
2. **Create a page** in UI
3. **Link page to skill:**
   - Open page editor
   - Link to the skill
4. **Check database:**
```sql
SELECT * FROM skill_contributions 
WHERE skill_id = 'YOUR_SKILL_ID'
ORDER BY created_at DESC 
LIMIT 1;
```
5. **Refresh skills page**
6. **Check progress** shows > 0%

### Test 2: Complete Task

1. **Create a task** linked to skill
2. **Mark task as complete**
3. **Check database:**
```sql
SELECT * FROM skill_contributions 
WHERE skill_id = 'YOUR_SKILL_ID'
AND contribution_type = 'task_completed'
ORDER BY created_at DESC 
LIMIT 1;
```
4. **Refresh skills page**
5. **Check progress** increased

## Common Issues & Fixes

### Issue: "Progress always shows 0%"

**Cause:** No contributions in database

**Fix:**
1. Check backend logs for errors
2. Verify API endpoints are registered
3. Test API manually with curl
4. Check RLS policies allow insert

### Issue: "Contributions exist but progress still 0%"

**Cause:** Frontend not calling progress API

**Fix:**
1. Check browser console for errors
2. Verify `api.getSkillRealProgress()` is called
3. Check API response in Network tab
4. Verify `realProgress` state is set

### Issue: "API returns error"

**Cause:** Backend can't access database

**Fix:**
1. Check `SUPABASE_SERVICE_ROLE_KEY` in backend/.env
2. Verify RLS policies allow service role
3. Check backend logs for specific error

### Issue: "Progress shows but doesn't update"

**Cause:** Frontend caching old data

**Fix:**
1. Hard refresh page (Ctrl+Shift+R)
2. Check `loadRealProgress()` is called on mount
3. Add `useEffect` dependency on skill.id

## Quick Diagnostic Script

Run this in Supabase SQL Editor:

```sql
-- Check everything at once
SELECT 
    'Skills' as table_name,
    COUNT(*) as count
FROM skills
UNION ALL
SELECT 
    'Contributions' as table_name,
    COUNT(*) as count
FROM skill_contributions
UNION ALL
SELECT 
    'Memory' as table_name,
    COUNT(*) as count
FROM skill_memory;

-- Check recent contributions
SELECT 
    sc.contribution_type,
    sc.impact_score,
    sc.created_at,
    s.name as skill_name
FROM skill_contributions sc
JOIN skills s ON s.id = sc.skill_id
ORDER BY sc.created_at DESC
LIMIT 5;

-- Check skills with progress
SELECT 
    s.name,
    s.confidence_score,
    COUNT(sc.id) as contribution_count,
    SUM(sc.impact_score) as total_impact
FROM skills s
LEFT JOIN skill_contributions sc ON sc.skill_id = s.id
GROUP BY s.id, s.name, s.confidence_score
ORDER BY total_impact DESC;
```

## Expected Behavior

### After linking 1 page:
- ✅ 1 row in `skill_contributions`
- ✅ Progress shows ~15-20%
- ✅ "1 page linked" in skill card

### After completing 1 task:
- ✅ 2 rows in `skill_contributions`
- ✅ Progress shows ~35-40%
- ✅ Confidence score increases

### After 5-6 contributions:
- ✅ Progress reaches 100%
- ✅ "Evolve" button appears
- ✅ Can upgrade to next level

## Still Not Working?

1. **Check backend logs:**
```bash
cd backend
python main.py
# Watch for errors when you link pages/complete tasks
```

2. **Check browser console:**
```
F12 → Console tab
# Look for API errors
```

3. **Test API directly:**
```bash
# Create contribution
curl -X POST http://localhost:8000/api/v1/intelligence/skills/SKILL_ID/contribution/suggestion-accepted?suggestion_id=test&workspace_id=WORKSPACE_ID

# Check progress
curl http://localhost:8000/api/v1/intelligence/skills/SKILL_ID/real-progress
```

4. **Check database directly:**
```sql
SELECT * FROM skill_contributions WHERE skill_id = 'YOUR_SKILL_ID';
```

If contributions exist in database but progress doesn't show, the issue is in the frontend. If contributions don't exist, the issue is in the backend.
