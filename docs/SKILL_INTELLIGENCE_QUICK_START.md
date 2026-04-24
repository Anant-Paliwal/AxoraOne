# Skill Intelligence - Quick Start Guide

## 🚀 How to Use the New Skill System

### 1. Restart Your Backend

The new metrics updater needs to start with the backend:

```bash
cd backend
python -m uvicorn main:app --reload
```

**Look for these messages:**
```
🧠 Living Intelligence OS activated - Skills are autonomous agents
📊 Skill Metrics Updater activated - Real-time progress tracking
```

### 2. Create or Update a Skill

Go to **Skills Page** and create a skill (or use an existing one):

```
Name: Data Analytics
Level: Intermediate
Type: Learning
Goals: Master SQL queries
```

### 3. Link Pages to the Skill

**Option A: Manual Linking**
1. Go to Skills page
2. Expand the skill card
3. Click "Link Page"
4. Select pages to link

**Option B: Automatic (via Intelligence Engine)**
1. Create a page with relevant content
2. Intelligence Engine will suggest linking
3. Approve the suggestion

### 4. Create Tasks Linked to the Skill

```
Title: Complete SQL tutorial
Linked Skill: Data Analytics
Status: todo
```

### 5. Complete Tasks and Watch Skills Evolve!

When you mark a task as "completed":
- ✅ Skill confidence increases by 5%
- ✅ Activation count increments
- ✅ Progress bar updates in real-time
- ✅ All stored in Supabase

### 6. Check Real-Time Progress

Go to **Skills Page** and see:
- 🔵 Round progress indicator (no extra colors)
- 📊 Real percentage based on actual data
- 💪 Confidence score from completed tasks
- 🔢 Activation count

---

## 🧪 Quick Test Scenarios

### Test 1: Task Completion Updates Skill (30 seconds)

```bash
1. Create skill "Python Programming"
2. Create task "Learn Python basics" linked to that skill
3. Mark task as completed
4. Go to Skills page
5. See progress increase!
```

**Expected Result:**
- Progress bar fills up
- Confidence score increases
- Activation count shows +1

### Test 2: Real Progress Calculation (2 minutes)

```bash
1. Create skill with 0 pages, 0 goals
   → Progress: ~0%

2. Link 2 pages to the skill
   → Progress: ~40%

3. Add 2 goals
   → Progress: ~70%

4. Complete 1 task
   → Progress: ~75%
```

### Test 3: Background Metrics (5 minutes)

```bash
1. Start backend
2. Wait 5 minutes
3. Check console for: "📊 Updating metrics for X skills..."
4. Check Skills page - all metrics refreshed
```

### Test 4: Neglected Skill Alert (Instant with SQL)

```sql
-- Manually set a skill as neglected
UPDATE skills 
SET last_activated_at = NOW() - INTERVAL '31 days'
WHERE name = 'Your Skill Name';
```

Wait 5 minutes for metrics updater, then check:
- Insights page for "Skill needs attention" alert
- Skills page for notification

---

## 📊 How to Verify Data in Supabase

### Check Skill Metrics:

```sql
SELECT 
    name,
    confidence_score,
    activation_count,
    last_activated_at,
    is_bottleneck
FROM skills
ORDER BY confidence_score DESC;
```

### Check Task-Skill Relationships:

```sql
SELECT 
    t.title,
    t.status,
    s.name as skill_name,
    s.confidence_score
FROM tasks t
JOIN skills s ON t.linked_skill_id = s.id
ORDER BY t.updated_at DESC;
```

### Check Insights Generated:

```sql
SELECT 
    insight_type,
    title,
    description,
    created_at
FROM insights
WHERE dismissed = false
ORDER BY created_at DESC;
```

---

## 🎯 What Each Component Does

### Frontend (Skills Page)
- Shows round progress indicators
- Displays real data from Supabase
- Updates in real-time when tasks complete

### Backend (Tasks API)
- Automatically updates skills on task completion
- Emits signals to Intelligence Engine
- Stores everything in Supabase

### Background Service (Metrics Updater)
- Runs every 5 minutes
- Recalculates all skill metrics
- Detects neglect and bottlenecks
- Creates insights

### Intelligence Engine
- Observes all entity changes
- Suggests skill-page links
- Triggers skill agent lifecycle
- Maintains knowledge graph

---

## 🔍 Troubleshooting

### Skills not updating when tasks complete?

**Check:**
1. Backend is running
2. Task has `linked_skill_id` set
3. Task status changed to "completed" (not "done")
4. Check backend console for errors

**Fix:**
```bash
# Restart backend
cd backend
python -m uvicorn main:app --reload
```

### Progress showing 0% even with data?

**Check:**
1. Skill has linked pages in `skill_evidence` table
2. Skill has goals in `skills.goals` array
3. Skill has `confidence_score` > 0

**Fix:**
```sql
-- Manually set confidence if needed
UPDATE skills 
SET confidence_score = 0.25
WHERE id = 'your-skill-id';
```

### Metrics updater not running?

**Check backend console for:**
```
📊 Skill Metrics Updater activated
```

**If missing:**
```python
# Check backend/main.py has:
from app.services.skill_metrics_updater import skill_metrics_updater
metrics_task = asyncio.create_task(skill_metrics_updater.start())
```

### Round progress not showing?

**Check:**
1. Frontend has latest code
2. Browser cache cleared
3. Skill has data (pages, goals, tasks)

**Fix:**
```bash
# Clear cache and rebuild
npm run build
# Or hard refresh: Ctrl+Shift+R
```

---

## 📈 Expected Behavior

### When You Complete a Task:

```
1. Click "Mark as Complete" on task
   ↓
2. Task status → "completed" in Supabase
   ↓
3. Backend calls _update_skill_on_task_completion()
   ↓
4. Skill confidence_score increases by 0.05
   ↓
5. Skill activation_count increments
   ↓
6. Skills page updates immediately
   ↓
7. Progress bar fills up
   ↓
8. Intelligence Engine may suggest next actions
```

### Every 5 Minutes (Background):

```
1. Metrics updater wakes up
   ↓
2. Fetches all skills from Supabase
   ↓
3. For each skill:
   - Counts linked pages
   - Counts completed tasks
   - Calculates success rate
   - Checks for neglect
   - Checks for bottlenecks
   ↓
4. Updates Supabase
   ↓
5. Creates insights if needed
   ↓
6. Skills page shows fresh data
```

---

## 🎉 Success Indicators

You'll know it's working when:

✅ **Task completion immediately updates skill progress**
✅ **Progress percentages are based on real data**
✅ **Round progress indicators show (no extra colors)**
✅ **Backend console shows metrics updates every 5 minutes**
✅ **Supabase tables have fresh data**
✅ **Insights appear for neglected/bottleneck skills**
✅ **Pages, tasks, and skills interact seamlessly**

---

## 📚 Related Documentation

- `SKILL_INTELLIGENCE_COMPLETE.md` - Full implementation details
- `SKILL_SYSTEM_BEFORE_AFTER.md` - Visual comparison
- `LIVING_INTELLIGENCE_OS.md` - Overall system architecture
- `run-intelligence-migration.sql` - Database schema

---

## 💡 Pro Tips

1. **Link pages to skills** - Each page adds 20% to progress
2. **Set goals** - Each goal adds 15% to progress
3. **Complete tasks** - Each task adds 5% confidence
4. **Connect skills** - Each link adds 10% to progress
5. **Check insights** - System will alert you to neglected skills

**Result:** Your skills become intelligent agents that learn and evolve with you! 🚀
