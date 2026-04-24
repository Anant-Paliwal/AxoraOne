# Intelligence OS Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Run Database Migration (2 min)

```bash
# Open Supabase SQL Editor and run:
```

```sql
-- Copy entire contents of ADVANCED_SKILL_SYSTEM_MIGRATION.sql
-- Paste into Supabase SQL Editor
-- Click "Run"
```

**Expected Output:**
```
✅ Advanced Intelligence OS Skill System installed!
📊 Tables: skill_events, llm_cache, skill_cooldowns, skill_suppression
🧠 Skills upgraded with: category, confidence, status, signals
🚀 Event-driven learning enabled
💰 LLM calls minimized with caching + cooldowns
🔒 RLS policies applied
```

### Step 2: Restart Backend (1 min)

```bash
cd backend
python -m uvicorn app.main:app --reload
```

### Step 3: Create Your First Advanced Skill (1 min)

**Via API:**
```bash
POST http://localhost:8000/api/v1/skills
Content-Type: application/json

{
  "name": "Project Planning",
  "category": "planning",
  "purpose": "Help me break down large projects into manageable tasks",
  "goal_type": ["clarity", "execution"],
  "workspace_id": "your-workspace-id"
}
```

**What Happens:**
- ✅ System auto-generates `activation_signals`: `["oversized_task", "no_subtasks", "task_blocked"]`
- ✅ Sets `confidence`: `0.3` (learning)
- ✅ Sets `status`: `"learning"`
- ✅ Sets `authority_level`: `"suggest"` (needs approval)

### Step 4: Test It! (1 min)

**Create a task linked to your skill:**
```bash
POST http://localhost:8000/api/v1/tasks
Content-Type: application/json

{
  "title": "Build new feature",
  "linked_skill_id": "your-skill-id",
  "workspace_id": "your-workspace-id"
}
```

**Complete the task:**
```bash
PATCH http://localhost:8000/api/v1/tasks/{task-id}
Content-Type: application/json

{
  "status": "completed"
}
```

**Check skill confidence:**
```bash
GET http://localhost:8000/api/v1/skills?workspace_id=your-workspace-id
```

**Expected:**
```json
{
  "id": "skill-id",
  "name": "Project Planning",
  "confidence": 0.35,  // ← Increased from 0.3!
  "status": "learning",
  "activation_count": 1,
  "last_activated_at": "2026-01-19T..."
}
```

## 🎯 How It Works

### Event Flow

```
Task Completed
    ↓
Skill Engine detects signal
    ↓
Creates skill_event record
    ↓
Updates confidence: +0.05
    ↓
Status auto-calculated
```

### Confidence Progression

```
0.30 → learning    (new skill)
0.35 → learning    (1 task completed)
0.40 → learning    (2 tasks completed)
0.50 → helping     (4 tasks completed)
0.70 → reliable    (8 tasks completed)
0.90 → trusted     (12 tasks completed)
```

### Signal Detection (NO LLM)

**Oversized Task:**
- Task delayed 2+ times
- No subtasks
- → Suggests: "Break this task into smaller steps"

**Task Blocked:**
- Status = "blocked"
- → Suggests: "Identify and remove blockers"

**Deadline Pressure:**
- Due in ≤ 2 days
- Not completed
- → Suggests: "Prioritize this task"

## 🧪 Test Scenarios

### Scenario 1: Skill Learns from Success
```bash
# Create skill
POST /api/v1/skills { "name": "SQL", "category": "learning" }

# Link page to skill
POST /api/v1/skills/{skill-id}/evidence { "page_id": "sql-notes-page" }

# Complete task
PATCH /api/v1/tasks/{task-id} { "status": "completed" }

# Result: confidence += 0.05
```

### Scenario 2: Skill Detects Pattern
```bash
# Create task with no subtasks
POST /api/v1/tasks { "title": "Big project", "linked_skill_id": "planning-skill" }

# Delay task twice (update without completing)
PATCH /api/v1/tasks/{task-id} { "delayed_count": 2 }

# Result: OVERSIZED_TASK signal detected
# skill_events table has new record
```

### Scenario 3: LLM Call Control
```bash
# Try to call LLM with low confidence
# Result: BLOCKED (confidence < 0.4)

# Complete 3 tasks to boost confidence to 0.45
# Detect same signal 2+ times
# Wait 24h since last LLM call
# Result: LLM call ALLOWED
```

### Scenario 4: Skill Suppression
```bash
# Ignore skill suggestion 3 times
POST /api/v1/skills/{skill-id}/ignore

# Result: Skill suppressed for 7 days
# skill_suppression table has record
```

## 📊 Check Your Data

### View Skill Events
```sql
SELECT 
  s.name,
  se.event_type,
  se.signal,
  se.outcome,
  se.confidence_delta,
  se.created_at
FROM skill_events se
JOIN skills s ON se.skill_id = s.id
ORDER BY se.created_at DESC
LIMIT 10;
```

### View Skill Status Distribution
```sql
SELECT 
  status,
  COUNT(*) as count,
  AVG(confidence) as avg_confidence
FROM skills
GROUP BY status;
```

### View LLM Cache
```sql
SELECT 
  s.name,
  lc.signal,
  lc.output_type,
  lc.use_count,
  lc.created_at
FROM llm_cache lc
JOIN skills s ON lc.skill_id = s.id
ORDER BY lc.created_at DESC
LIMIT 10;
```

## 🎨 Skill Categories & Signals

### Planning Skills
**Signals:** `oversized_task`, `no_subtasks`, `task_blocked`
**Use Case:** Breaking down large projects

### Execution Skills
**Signals:** `task_delayed`, `deadline_pressure`, `task_blocked`
**Use Case:** Getting things done on time

### Learning Skills
**Signals:** `page_created`, `page_edited`, `page_neglected`
**Use Case:** Building knowledge base

### Decision Skills
**Signals:** `task_blocked`, `deadline_pressure`
**Use Case:** Making choices under pressure

### Research Skills
**Signals:** `page_created`, `page_neglected`
**Use Case:** Gathering and organizing information

### Startup Skills
**Signals:** `task_delayed`, `oversized_task`, `deadline_pressure`
**Use Case:** Moving fast and shipping

## 🔧 Configuration

### Adjust Confidence Thresholds
Edit `backend/app/services/skill_engine.py`:

```python
# Current thresholds
CONFIDENCE_THRESHOLDS = {
    "learning": 0.3,
    "helping": 0.6,
    "reliable": 0.8,
    "trusted": 1.0
}

# Adjust as needed
```

### Adjust Confidence Deltas
Edit `backend/app/services/skill_engine.py`:

```python
# Current deltas
CONFIDENCE_DELTAS = {
    "success": 0.05,
    "ignored": -0.03,
    "failed": -0.08,
    "decay": -0.01
}
```

### Adjust LLM Rules
Edit `ADVANCED_SKILL_SYSTEM_MIGRATION.sql`:

```sql
-- Current rules in can_call_llm function:
-- 1. confidence >= 0.4
-- 2. signal_count >= 2
-- 3. cooldown >= 24 hours

-- Modify as needed
```

## 🚨 Troubleshooting

### Confidence Not Updating?
```bash
# Check if task is linked to skill
GET /api/v1/tasks/{task-id}
# Look for: "linked_skill_id": "..."

# Check skill_events table
SELECT * FROM skill_events WHERE skill_id = 'your-skill-id';

# Check backend logs
tail -f backend/logs/app.log
```

### Signals Not Detected?
```bash
# Check activation_signals
GET /api/v1/skills/{skill-id}
# Look for: "activation_signals": ["oversized_task", ...]

# Check signal detection rules
# Edit: backend/app/services/skill_engine.py
# Look for: _init_signal_rules()
```

### LLM Calls Blocked?
```bash
# Check confidence
GET /api/v1/skills/{skill-id}
# Must be >= 0.4

# Check cooldown
SELECT * FROM skill_cooldowns WHERE skill_id = 'your-skill-id';

# Check signal count
SELECT signal_counts FROM skill_cooldowns WHERE skill_id = 'your-skill-id';
# Must be >= 2 for the signal
```

## 📈 Next Steps

1. ✅ Create skills for different categories
2. ✅ Link tasks to skills
3. ✅ Complete tasks and watch confidence grow
4. ⏳ Add page event processing (see ADVANCED_INTELLIGENCE_OS_IMPLEMENTATION.md)
5. ⏳ Add background decay job
6. ⏳ Build UI widgets to show skill status
7. ⏳ Add skill marketplace

## 🎉 You're Done!

Your Intelligence OS is now running. Skills will:
- ✅ Learn from every task completion
- ✅ Detect patterns automatically
- ✅ Suggest actions when confident
- ✅ Suppress themselves when ignored
- ✅ Decay when inactive
- ✅ Minimize LLM costs

**This is a background intelligence layer, not a chatbot.**

It runs continuously, learns from your work, and gets smarter over time.

Enjoy your Living Intelligence OS! 🚀
