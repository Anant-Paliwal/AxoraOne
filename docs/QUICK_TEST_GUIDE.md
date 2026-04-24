# 🧪 Living Intelligence OS - Quick Test Guide

**Run these tests after deploying to verify everything works.**

---

## Prerequisites

1. ✅ Run migration: `run-intelligence-migration.sql` in Supabase
2. ✅ Restart backend: `python -m uvicorn main:app --reload`
3. ✅ Verify console shows: `🧠 Skill Background Runner started`

---

## Test 1: Page Creation Triggers Skills ⚡

### What to Test
When you create a page, skills should automatically detect relevance and propose actions.

### Steps

1. **Create a page with skill-related content:**
```bash
POST http://localhost:8000/api/v1/pages
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "title": "SQL Tutorial",
  "content": "Learn SQL basics for data analytics. SELECT, JOIN, WHERE clauses.",
  "workspace_id": "YOUR_WORKSPACE_ID",
  "tags": ["sql", "database"]
}
```

2. **Check if signal was emitted:**
Look for console output:
```
Processing signal: PAGE_CREATED
Skill {skill_id} activated with X patterns
```

3. **Check proposed actions:**
```bash
GET http://localhost:8000/api/v1/intelligence/actions/proposed?workspace_id=YOUR_WORKSPACE_ID
```

**Expected Result:**
- Should see proposed action to link page to "Data Analytics" skill
- Action should have `reason`, `expected_impact`, `source_skill_id`

---

## Test 2: Skill Lifecycle Status 🔄

### What to Test
Check if skills are running and have proper lifecycle state.

### Steps

1. **Get all skills' lifecycle summary:**
```bash
GET http://localhost:8000/api/v1/intelligence/skills/lifecycle-summary?workspace_id=YOUR_WORKSPACE_ID
```

**Expected Result:**
```json
{
  "skills": [
    {
      "id": "...",
      "name": "Data Analytics",
      "level": "Beginner",
      "confidence_score": 0.0,
      "activation_count": 1,
      "last_activated_at": "2026-01-12T...",
      "learning_progress": {
        "successes": 0,
        "failures": 0
      }
    }
  ],
  "summary": {
    "total_skills": 3,
    "total_activations": 1,
    "average_confidence": 0.0
  }
}
```

2. **Get detailed status for one skill:**
```bash
GET http://localhost:8000/api/v1/intelligence/skills/{SKILL_ID}/status?workspace_id=YOUR_WORKSPACE_ID
```

**Expected Result:**
```json
{
  "skill_id": "...",
  "state": "dormant",
  "activation_threshold": 0.6,
  "skill_data": {
    "name": "Data Analytics",
    "level": "Beginner",
    "confidence_score": 0.0
  },
  "memory": {
    "successful_patterns_count": 0,
    "failed_patterns_count": 0,
    "activation_count": 1
  },
  "context": {
    "related_pages": 1,
    "related_tasks": 0
  }
}
```

---

## Test 3: Approve Action & Skill Learning 🧠

### What to Test
When you approve an action, the skill should learn from the outcome.

### Steps

1. **Get a proposed action:**
```bash
GET http://localhost:8000/api/v1/intelligence/actions/proposed?workspace_id=YOUR_WORKSPACE_ID
```

2. **Approve the action:**
```bash
POST http://localhost:8000/api/v1/intelligence/actions/{ACTION_ID}/approve
```

**Expected Result:**
```json
{
  "success": true,
  "result": {
    "linked": true,
    "skill_id": "..."
  }
}
```

3. **Check skill learned:**
```bash
GET http://localhost:8000/api/v1/intelligence/skills/{SKILL_ID}/status?workspace_id=YOUR_WORKSPACE_ID
```

**Expected Result:**
- `memory.successful_patterns_count` should increase
- `skill_data.confidence_score` should increase slightly

4. **Verify link was created:**
```bash
# Check skill_evidence table in Supabase
SELECT * FROM skill_evidence WHERE skill_id = 'SKILL_ID' AND page_id = 'PAGE_ID';
```

---

## Test 4: Home Intelligence Dashboard 🏠

### What to Test
The home screen should show intelligent insights and ranked tasks.

### Steps

1. **Get home intelligence:**
```bash
GET http://localhost:8000/api/v1/intelligence/home?workspace_id=YOUR_WORKSPACE_ID
```

**Expected Result:**
```json
{
  "high_impact_tasks": [
    {
      "id": "...",
      "title": "Complete SQL tutorial",
      "calculated_priority": {
        "score": 5.5,
        "factors": {
          "base": 2,
          "urgency": 2,
          "skill_bottleneck": 1.5
        },
        "recommendation": "High priority - Schedule for today"
      }
    }
  ],
  "active_contexts": [
    {
      "id": "...",
      "title": "SQL Tutorial",
      "icon": "📄",
      "updated_at": "..."
    }
  ],
  "skill_intelligence": {
    "active": [],
    "needs_attention": [
      {
        "id": "...",
        "name": "Data Analytics",
        "level": "Beginner"
      }
    ],
    "total": 3
  },
  "insights": [],
  "pending_actions": [
    {
      "id": "...",
      "action_type": "link_page_to_skill",
      "reason": "Page content relates to skill 'Data Analytics'"
    }
  ],
  "patterns": [],
  "stats": {
    "total_active_tasks": 5,
    "completed_today": 0,
    "overdue": 0
  }
}
```

2. **Check frontend:**
- Navigate to home page
- Click "Intelligence" tab
- Should see all sections populated

---

## Test 5: Pattern Detection 🔍

### What to Test
Skills should detect patterns automatically in the background.

### Steps

1. **Create a blocked task:**
```bash
POST http://localhost:8000/api/v1/tasks
{
  "title": "Advanced SQL queries",
  "status": "blocked",
  "linked_skill_id": "DATA_ANALYTICS_SKILL_ID",
  "workspace_id": "YOUR_WORKSPACE_ID"
}
```

2. **Wait 5 minutes** (or manually trigger pattern detection)

3. **Check for patterns:**
```bash
GET http://localhost:8000/api/v1/intelligence/patterns?workspace_id=YOUR_WORKSPACE_ID
```

**Expected Result:**
```json
{
  "patterns": [
    {
      "type": "blocked_tasks",
      "severity": "high",
      "data": {
        "count": 1,
        "tasks": [
          {
            "id": "...",
            "title": "Advanced SQL queries",
            "status": "blocked"
          }
        ]
      }
    }
  ]
}
```

4. **Check if insight was created:**
```bash
GET http://localhost:8000/api/v1/intelligence/insights?workspace_id=YOUR_WORKSPACE_ID
```

**Expected Result:**
- Should see insight about blocked tasks
- Insight should have suggested actions

---

## Test 6: Manual Skill Activation 🎯

### What to Test
You can manually trigger a skill's lifecycle to see what it detects.

### Steps

1. **Manually activate a skill:**
```bash
POST http://localhost:8000/api/v1/intelligence/skills/{SKILL_ID}/activate?workspace_id=YOUR_WORKSPACE_ID
```

**Expected Result:**
```json
{
  "success": true,
  "activated": true,
  "patterns_detected": [
    {
      "type": "needs_content",
      "severity": "low",
      "data": {
        "current_pages": 1
      }
    }
  ],
  "actions_proposed": ["action-id-1", "action-id-2"],
  "relevance_score": 0.8
}
```

2. **Check proposed actions:**
```bash
GET http://localhost:8000/api/v1/intelligence/actions/proposed?workspace_id=YOUR_WORKSPACE_ID
```

Should see new actions proposed by this skill.

---

## Test 7: Background Runner 🔄

### What to Test
Skills should run automatically in the background.

### Steps

1. **Check backend console logs:**
After 5 minutes, you should see:
```
🎯 Skill {skill_id} activated with 2 patterns
```

2. **Create an overdue task:**
```bash
POST http://localhost:8000/api/v1/tasks
{
  "title": "Overdue task",
  "due_date": "2026-01-10",  # Past date
  "status": "todo",
  "workspace_id": "YOUR_WORKSPACE_ID"
}
```

3. **Wait 60 seconds** (background runner checks every 60s)

4. **Check console logs:**
Should see:
```
Checking overdue tasks for workspace {workspace_id}
Emitting TASK_OVERDUE signal
```

5. **Check insights:**
```bash
GET http://localhost:8000/api/v1/intelligence/insights?workspace_id=YOUR_WORKSPACE_ID
```

Should see insight about overdue task.

---

## Test 8: Skill Evolution 🧬

### What to Test
Skills should evolve based on accumulated learning.

### Steps

1. **Approve 5 actions from the same skill:**
```bash
# Repeat 5 times
POST http://localhost:8000/api/v1/intelligence/actions/{ACTION_ID}/approve
```

2. **Force evolution:**
```bash
POST http://localhost:8000/api/v1/intelligence/skills/{SKILL_ID}/evolve?workspace_id=YOUR_WORKSPACE_ID
```

**Expected Result:**
```json
{
  "success": true,
  "new_activation_threshold": 0.55,  # Lower = activates more easily
  "evolved_at": "2026-01-12T..."
}
```

3. **Check skill status:**
```bash
GET http://localhost:8000/api/v1/intelligence/skills/{SKILL_ID}/status?workspace_id=YOUR_WORKSPACE_ID
```

**Expected Result:**
- `activation_threshold` should be lower (skill activates more easily)
- `confidence_score` should be higher
- `success_rate` should be > 0

---

## Test 9: Task Priority Calculation 📊

### What to Test
Tasks should have dynamically calculated priority.

### Steps

1. **Create a task with due date:**
```bash
POST http://localhost:8000/api/v1/tasks
{
  "title": "Urgent task",
  "due_date": "2026-01-13",  # Tomorrow
  "priority": "high",
  "linked_skill_id": "SKILL_ID",
  "workspace_id": "YOUR_WORKSPACE_ID"
}
```

2. **Get task priority:**
```bash
GET http://localhost:8000/api/v1/intelligence/tasks/{TASK_ID}/priority
```

**Expected Result:**
```json
{
  "score": 6.0,
  "factors": {
    "base": 3,      # High priority
    "urgency": 1,   # Due tomorrow
    "goal_alignment": 0,
    "skill_bottleneck": 0,
    "calendar_pressure": 0
  },
  "recommendation": "Critical - Do this immediately"
}
```

3. **Get ranked tasks:**
```bash
GET http://localhost:8000/api/v1/intelligence/tasks/ranked?workspace_id=YOUR_WORKSPACE_ID
```

**Expected Result:**
- Tasks sorted by calculated priority score
- Each task has `calculated_priority` object

---

## Test 10: Frontend Integration 🎨

### What to Test
The frontend should display all intelligence data.

### Steps

1. **Navigate to home page:**
```
http://localhost:5173/workspace/YOUR_WORKSPACE_ID
```

2. **Click "Intelligence" tab**

3. **Verify sections:**
- [ ] Quick Stats shows correct counts
- [ ] Pattern Alerts shows detected patterns
- [ ] High Impact Tasks shows ranked tasks with reasoning
- [ ] Active Contexts shows recent pages
- [ ] AI Insights shows insights with actions
- [ ] Pending Actions shows proposed actions
- [ ] Skill Intelligence shows active/needs attention skills

4. **Test interactions:**
- [ ] Click "Dismiss" on an insight
- [ ] Click "Approve" on a proposed action
- [ ] Click "Reject" on a proposed action
- [ ] Click on a task to see details

---

## 🐛 Troubleshooting

### Issue: No signals emitted
**Check:**
- Backend console for errors
- Page has `workspace_id` set
- Signal emission code is not throwing errors

### Issue: Skills not activating
**Check:**
- Skills exist in workspace
- Background runner is running (check console)
- Relevance score is high enough (≥ 0.6)

### Issue: No proposed actions
**Check:**
- Patterns were detected
- Skill reasoning logic ran
- Actions were stored in `proposed_actions` table

### Issue: Skill not learning
**Check:**
- Action has `source_skill_id` set
- Approve/reject endpoint is being called
- `skill_memory` table exists

### Issue: Background runner not running
**Check:**
- Server startup logs show "🧠 Skill Background Runner started"
- No errors in `skill_background_runner.py`
- `start_skill_runner()` is called in `main.py`

---

## ✅ Success Criteria

All tests pass if:

1. ✅ Pages emit signals when created
2. ✅ Skills detect patterns automatically
3. ✅ Actions are proposed with reasoning
4. ✅ Approving actions triggers learning
5. ✅ Skills evolve based on outcomes
6. ✅ Home intelligence shows relevant data
7. ✅ Background runner processes continuously
8. ✅ Task priority is calculated dynamically
9. ✅ Frontend displays all intelligence data
10. ✅ Everything is linked (pages ↔ skills ↔ tasks)

---

**The Living Intelligence OS is working if the system feels like it's thinking and working FOR you, not just reacting to your commands.** 🧠✨
