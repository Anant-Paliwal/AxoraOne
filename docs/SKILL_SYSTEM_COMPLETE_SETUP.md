# Complete Skill System Setup Guide

## 🎯 Issues Fixed

### 1. ✅ Login Page Enhanced
- Added "Forgot Password" functionality
- Added password visibility toggle (eye icon)
- Password reset email integration with Supabase

### 2. ✅ Skills Showing 0% - Root Cause
**Problem:** The `skill_contributions` table doesn't exist yet, so the backend can't calculate real progress.

**Solution:** Run the complete migration to create all skill tables.

### 3. ✅ All Skill Tables Created
Created complete migration for ALL skill intelligence tables:
- `skill_contributions` - Tracks real impact
- `skill_memory` - Agent learning and evolution
- `skill_executions` - Records when skills run
- `skill_chains` - Skill relationships
- Updated `skills` table with new columns
- Updated `skill_evidence` with confidence scores

## 🚀 Setup Steps

### Step 1: Run Database Migration

```bash
# Connect to your Supabase database
psql postgresql://[YOUR_CONNECTION_STRING]

# Run the complete migration
\i COMPLETE_SKILL_TABLES_MIGRATION.sql
```

Or via Supabase Dashboard:
1. Go to SQL Editor
2. Copy contents of `COMPLETE_SKILL_TABLES_MIGRATION.sql`
3. Run query
4. You should see success messages

### Step 2: Verify Tables Created

```sql
-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'skill%'
ORDER BY table_name;

-- Should show:
-- skill_chains
-- skill_contributions
-- skill_evidence
-- skill_executions
-- skill_memory
-- skills
```

### Step 3: Test Auto-Linking

1. Create a skill named "Python Programming"
2. Create a page with "Python" in the title
3. Check if page auto-links to skill:

```sql
SELECT 
  s.name as skill_name,
  p.title as page_title,
  se.confidence_score,
  se.evidence_type
FROM skill_evidence se
JOIN skills s ON se.skill_id = s.id
JOIN pages p ON se.page_id = p.id
WHERE se.evidence_type = 'auto_linked'
ORDER BY se.created_at DESC;
```

### Step 4: Test Contribution Tracking

When you complete a task linked to a skill:

```sql
-- Check contributions
SELECT 
  s.name as skill_name,
  sc.contribution_type,
  sc.impact_score,
  sc.created_at
FROM skill_contributions sc
JOIN skills s ON sc.skill_id = s.id
ORDER BY sc.created_at DESC
LIMIT 10;
```

## 📊 How Skills Calculate Progress

### Current System (After Migration)

**Progress = Average of 3 factors:**

1. **Impact Progress** (0-100%)
   - Based on `skill_contributions.impact_score`
   - Measures actual help provided
   - Example: +0.15 for accepted suggestion

2. **Contribution Count** (0-100%)
   - Based on number of contributions
   - Beginner needs 5, Intermediate needs 15, etc.

3. **Diversity Progress** (0-100%)
   - Based on different contribution types
   - Beginner needs 2 types, Intermediate needs 3, etc.

### Why Skills Show 0% Now

**Before migration:**
- No `skill_contributions` table
- Backend API returns error
- Frontend falls back to basic calculation
- Basic calculation only counts pages/goals (not real contributions)

**After migration:**
- `skill_contributions` table exists
- Backend can calculate real progress
- Progress based on actual help provided
- Skills start at 0% until they contribute

## 🔄 How to Get Skills to Show Progress

### Method 1: Link Pages (Basic Progress)

1. Create a skill
2. Link pages to it via skill_evidence
3. Basic progress: ~20% per page

### Method 2: Complete Tasks (Real Progress)

1. Create a skill
2. Create tasks linked to that skill
3. Complete tasks
4. System tracks contribution automatically
5. Progress increases based on impact

### Method 3: Accept Suggestions (Best Progress)

1. Skill makes a suggestion
2. User accepts it
3. +0.15 impact score
4. Progress increases significantly

## 📋 Table Purposes

### skill_contributions
**Purpose:** Track REAL impact from skills

**When data is added:**
- User accepts/rejects suggestion
- Task completed faster than expected
- Page quality improved
- Problem prevented

**Example:**
```sql
INSERT INTO skill_contributions (
  skill_id, workspace_id, contribution_type,
  target_id, target_type, impact_score
) VALUES (
  'skill_uuid', 'workspace_uuid', 'suggestion_accepted',
  'suggestion_uuid', 'suggestion', 0.15
);
```

### skill_memory
**Purpose:** Agent learning and evolution

**When data is added:**
- Skill activates
- Skill learns from success/failure
- Skill evolves to next level

**Example:**
```sql
INSERT INTO skill_memory (
  skill_id, successful_patterns, failed_patterns
) VALUES (
  'skill_uuid', 
  '[{"type": "suggestion_accepted", "context": {...}}]',
  '[]'
);
```

### skill_executions
**Purpose:** Record when skills run

**When data is added:**
- User clicks "Get Suggestions" on skill
- Skill runs automatically
- Skill chains to next skill

**Example:**
```sql
INSERT INTO skill_executions (
  skill_id, workspace_id, trigger_source,
  input_context, success
) VALUES (
  'skill_uuid', 'workspace_uuid', 'manual',
  '{"from_skills_page": true}', true
);
```

### skill_chains
**Purpose:** Skill relationships

**When data is added:**
- User links two skills
- System detects prerequisite relationship
- Skill chaining configured

**Example:**
```sql
INSERT INTO skill_chains (
  source_skill_id, target_skill_id, chain_type
) VALUES (
  'python_skill_uuid', 'django_skill_uuid', 'prerequisite'
);
```

### skill_evidence
**Purpose:** Link pages to skills

**When data is added:**
- User manually links page to skill
- Auto-linker detects relevance (60%+ confidence)
- Page content relates to skill

**Example:**
```sql
INSERT INTO skill_evidence (
  skill_id, page_id, evidence_type, confidence_score
) VALUES (
  'skill_uuid', 'page_uuid', 'auto_linked', 0.85
);
```

## 🐛 Troubleshooting

### Skills Still Show 0%

1. **Check if migration ran:**
   ```sql
   SELECT COUNT(*) FROM skill_contributions;
   ```
   If error: Table doesn't exist, run migration

2. **Check if backend is running:**
   ```bash
   curl http://localhost:8000/api/v1/intelligence/skills/{skill_id}/real-progress
   ```

3. **Check browser console:**
   - Look for API errors
   - Check if `getSkillRealProgress` is being called

### Auto-Linking Not Working

1. **Check if auto-linker is called:**
   - Look in backend logs for "Auto-linked page"
   - Check `skill_evidence` table for `evidence_type = 'auto_linked'`

2. **Check confidence threshold:**
   - Default is 60%
   - Lower in `skill_auto_linker.py` if needed

3. **Verify skill keywords:**
   - Skills need keywords/evidence for matching
   - Add keywords to skill description

### Backend Errors

1. **Import errors:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Database connection:**
   - Check `.env` file
   - Verify Supabase credentials

3. **Restart backend:**
   ```bash
   python -m uvicorn app.main:app --reload
   ```

## ✅ Success Criteria

System is working when:

1. ✅ All 5 skill tables exist in database
2. ✅ Skills show real progress (not 0%)
3. ✅ Pages auto-link to skills
4. ✅ Tasks auto-link to skills
5. ✅ Contributions are tracked
6. ✅ Evolve button appears at 100%
7. ✅ Login page has forgot password
8. ✅ Password visibility toggle works

## 📚 Next Steps

1. **Run the migration** - Create all tables
2. **Restart backend** - Load new services
3. **Test auto-linking** - Create page with skill name
4. **Complete tasks** - Watch progress increase
5. **Evolve skills** - Reach 100% and advance

**The complete skill intelligence system is now ready!** 🚀
