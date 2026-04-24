# 🧪 Test Skill Intelligence System

## Quick Test After Running Migration

### Step 1: Run the Migration
```sql
-- In Supabase SQL Editor, run:
-- RUN_THIS_SKILL_INTELLIGENCE_SETUP.sql
```

### Step 2: Restart Backend
```bash
# Stop backend if running (Ctrl+C)
cd backend
python main.py
```

### Step 3: Test API Endpoints

#### Test 1: Check Tables Exist
```bash
# Open browser console on your app
# Or use curl/Postman

# Get skills (should work)
GET http://localhost:8000/api/v1/skills?workspace_id=YOUR_WORKSPACE_ID
```

#### Test 2: Create a Test Skill
```bash
POST http://localhost:8000/api/v1/skills
{
  "name": "Test Intelligence",
  "level": "Beginner",
  "description": "Testing skill intelligence",
  "workspace_id": "YOUR_WORKSPACE_ID"
}
```

#### Test 3: Check Memory Auto-Created
```sql
-- In Supabase SQL Editor:
SELECT * FROM skill_memory 
WHERE skill_id = 'YOUR_SKILL_ID';

-- Should return 1 row with empty arrays
```

#### Test 4: Get Real Progress
```bash
GET http://localhost:8000/api/v1/intelligence/skills/YOUR_SKILL_ID/real-progress

# Expected response:
{
  "progress": 0,
  "can_evolve": false,
  "total_impact": 0,
  "contribution_count": 0,
  "breakdown": {
    "impact": 0,
    "count": 0,
    "diversity": 0
  }
}
```

#### Test 5: Track a Contribution
```bash
POST http://localhost:8000/api/v1/intelligence/skills/YOUR_SKILL_ID/contribution/suggestion-accepted?suggestion_id=test_123&workspace_id=YOUR_WORKSPACE_ID

# Expected response:
{
  "success": true,
  "message": "Contribution tracked"
}
```

#### Test 6: Check Contribution Stored
```sql
-- In Supabase SQL Editor:
SELECT * FROM skill_contributions 
WHERE skill_id = 'YOUR_SKILL_ID';

-- Should show the contribution with impact_score
```

#### Test 7: Get Updated Progress
```bash
GET http://localhost:8000/api/v1/intelligence/skills/YOUR_SKILL_ID/real-progress

# Progress should now be > 0
```

#### Test 8: Get Lifecycle Summary
```bash
GET http://localhost:8000/api/v1/intelligence/skills/lifecycle-summary?workspace_id=YOUR_WORKSPACE_ID

# Expected response:
{
  "skills": [
    {
      "id": "...",
      "name": "Test Intelligence",
      "level": "Beginner",
      "confidence_score": 0,
      "activation_count": 0,
      "learning_progress": {
        "successes": 0,
        "failures": 0,
        "last_evolved": null
      }
    }
  ],
  "summary": {
    "total_skills": 1,
    "total_activations": 0,
    "average_confidence": 0,
    "bottleneck_skills": 0,
    "skills_by_level": {
      "Beginner": 1,
      "Intermediate": 0,
      "Advanced": 0,
      "Expert": 0
    }
  }
}
```

## Frontend Test (In UI)

### 1. Create Skill
1. Go to Skills page
2. Click "Add Skill"
3. Fill in details
4. Save

### 2. Link Page to Skill
1. Open any page
2. In page editor, link to the skill
3. This creates a contribution automatically

### 3. Check Progress
1. Go back to Skills page
2. Expand the skill card
3. Should show progress > 0%
4. Should show "1 page linked"

### 4. Complete Task
1. Create a task linked to the skill
2. Mark it as complete
3. Go back to Skills page
4. Progress should increase

### 5. Try Evolution
1. Add more contributions (pages, tasks)
2. When progress reaches 100%
3. Click "Evolve to Intermediate"
4. Skill level should update

## Expected Results

### ✅ Success Indicators
- Tables created without errors
- Skills have memory records
- Contributions are tracked
- Progress calculates correctly
- Evolution works at 100%
- Lifecycle summary shows data

### ❌ Failure Indicators
- "relation does not exist" errors
- Progress always shows 0%
- No contributions in database
- Evolution button doesn't work
- Empty lifecycle summary

## Common Issues

### Issue: "relation skill_memory does not exist"
**Fix:** Run the migration SQL file in Supabase

### Issue: "column activation_count does not exist"
**Fix:** The migration adds this column, run it

### Issue: Progress always 0%
**Fix:** 
1. Check contributions table has data
2. Verify workspace_id matches
3. Check RLS policies allow access

### Issue: Can't evolve skill
**Fix:**
1. Progress must be 100%
2. Check contribution impact scores
3. Verify skill level isn't already Expert

## Verification Queries

Run these in Supabase SQL Editor to verify setup:

```sql
-- 1. Check all intelligence tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('skill_memory', 'skill_contributions', 'skill_chains');

-- 2. Check skills have intelligence columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'skills' 
AND column_name IN ('activation_count', 'confidence_score', 'last_activated_at');

-- 3. Count records in each table
SELECT 
    (SELECT COUNT(*) FROM skills) as skills_count,
    (SELECT COUNT(*) FROM skill_memory) as memory_count,
    (SELECT COUNT(*) FROM skill_contributions) as contributions_count,
    (SELECT COUNT(*) FROM skill_chains) as chains_count;

-- 4. View skill intelligence summary
SELECT * FROM skill_intelligence_summary LIMIT 5;
```

## Success Criteria

After running all tests, you should have:

1. ✅ All 3 intelligence tables created
2. ✅ Skills table has intelligence columns
3. ✅ Memory auto-created for new skills
4. ✅ Contributions tracked with impact scores
5. ✅ Progress calculated from real data
6. ✅ Evolution works when criteria met
7. ✅ Lifecycle summary shows accurate data
8. ✅ RLS policies protect workspace data

## Next Steps

Once all tests pass:

1. Use the system normally
2. Create skills for your work
3. Link pages and complete tasks
4. Watch skills learn and evolve
5. Get intelligent suggestions
6. Track real impact over time

The skill intelligence system is now fully operational! 🎉
