# 🔧 Run These Files in Order

## The Problem

The migration fails because it tries to use `source_skill_id` before adding it. The solution is to run the migration in 3 separate steps.

## Solution: Run in Order

### STEP 1: Add the Missing Column
**File:** `STEP_1_ADD_COLUMN.sql`

1. Open Supabase SQL Editor
2. Copy content from `STEP_1_ADD_COLUMN.sql`
3. Paste and click **Run**
4. Wait for success message

**Expected Result:**
```
column_name      | data_type
-----------------|----------
source_skill_id  | uuid
```

---

### STEP 2: Create Intelligence Tables
**File:** `STEP_2_CREATE_TABLES.sql`

1. In Supabase SQL Editor
2. Copy content from `STEP_2_CREATE_TABLES.sql`
3. Paste and click **Run**
4. Wait for success message

**Expected Result:**
```
table_name            | record_count
---------------------|-------------
skill_memory         | 0
skill_contributions  | 0
skill_chains         | 0
```

---

### STEP 3: Add Security & Automation
**File:** `STEP_3_ADD_SECURITY.sql`

1. In Supabase SQL Editor
2. Copy content from `STEP_3_ADD_SECURITY.sql`
3. Paste and click **Run**
4. Wait for success message

**Expected Result:**
```
status                  | count
------------------------|------
RLS Policies Created    | 6
Triggers Created        | 2
View Created            | 1
```

---

## After All 3 Steps Complete

### Restart Backend
```bash
cd backend
python main.py
```

### Test in UI
1. Create a skill
2. Link a page to it
3. Check progress shows > 0%

## Why 3 Steps?

**Step 1:** Adds the column that was causing the error
**Step 2:** Creates all the intelligence tables
**Step 3:** Adds security policies and automation

Running them separately ensures each part completes before the next one starts.

## If Any Step Fails

- Read the error message
- Check which line failed
- That step might already be done
- Try the next step

## All Done? ✅

After all 3 steps:
- ✅ All intelligence tables created
- ✅ Skills table has intelligence columns
- ✅ RLS policies protect data
- ✅ Triggers auto-track activity
- ✅ System ready to use

The skill intelligence system is now fully operational! 🚀
