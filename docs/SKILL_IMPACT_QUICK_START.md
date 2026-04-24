# Skill Impact Widget - Quick Start

## What It Does

Converts the Skill Impact widget from passive status display to **actionable intelligence**.

Each skill now shows:
- **Reason** (1 line) - why it's in this state
- **Next Move** (1 line) - what to do about it  
- **CTA Button** (1 action) - one-click fix

**NO LLM. Pure rule-based logic.**

---

## How It Works

### Rule-Based Intelligence

The backend analyzes each skill and determines:

1. **State**: `needs_attention` or `contributing`
2. **Reason**: Short explanation (e.g., "No active tasks linked")
3. **Next Move**: Clear action (e.g., "Link 1 task to this skill")
4. **CTA**: Button with action (e.g., "Link task")

### Decision Rules

**Needs Attention** (priority order):
1. No tasks linked → "Link 1 task to this skill"
2. Has overdue tasks → "Reschedule or break down the overdue task"
3. No progress in 7 days → "Complete 1 task or update a page"

**Contributing**:
1. Has contributions → "Continue with the next task"
2. Completed tasks this week → "Continue with the next task"
3. Has linked pages → "Continue with the next task"

---

## UI Changes

### Before
```
Machine Learning
Not contributing to any work
```

### After
```
┌─────────────────────────────────────┐
│ ⚠️  Machine Learning                │
│ ⚠️ Not contributing — No active     │
│     tasks linked                    │
│ ─────────────────────────────────── │
│ Next: Link 1 task to this skill     │
│                      [Link task]    │
└─────────────────────────────────────┘
```

---

## Testing

### 1. Start Backend
```bash
cd backend
python -m uvicorn app.main:app --reload
```

### 2. Start Frontend
```bash
npm run dev
```

### 3. Test Scenarios

**Scenario A: No Tasks Linked**
1. Go to Skills page
2. Create a new skill (e.g., "Python")
3. Don't link any tasks
4. Go to Home page
5. Check Skill Impact widget
6. Should show: "⚠️ Not contributing — No active tasks linked"
7. Should show button: "Link task"

**Scenario B: Overdue Tasks**
1. Create a task with past due date
2. Link it to a skill
3. Go to Home page
4. Should show: "⚠️ Not contributing — 1 task overdue"
5. Should show button: "View tasks"

**Scenario C: Contributing**
1. Complete a task linked to a skill
2. Go to Home page
3. Should show: "✓ Contributing — Completed 1 task"
4. Should show button: "Open task"

---

## API Endpoint

```
GET /intelligence/skills/widget-intelligence
  ?workspace_id={workspace_id}
  &exclude_skill_ids={skill_id1,skill_id2}
```

**Response**:
```json
{
  "skills": [
    {
      "skill_id": "uuid",
      "skill_name": "Python Development",
      "state": "needs_attention",
      "reason": "No active tasks linked",
      "next_move": "Link 1 task to this skill",
      "cta": {
        "label": "Link task",
        "action": "OPEN_LINK_TASK_MODAL",
        "payload": {"skill_id": "uuid"}
      }
    }
  ]
}
```

---

## CTA Actions

### OPEN_LINK_TASK_MODAL
- Navigates to: `/tasks?skill={skill_id}&action=link`
- Use case: No tasks linked to skill

### OPEN_TASKS_FILTERED (overdue)
- Navigates to: `/tasks?skill={skill_id}&filter=overdue`
- Use case: Skill has overdue tasks

### OPEN_TASKS_FILTERED (active)
- Navigates to: `/tasks?skill={skill_id}&filter=active`
- Use case: No recent progress

### OPEN_NEXT_TASK
- Navigates to: `/tasks?skill={skill_id}`
- Use case: Skill is contributing, continue work

---

## Deduplication (Future)

To avoid showing the same skill in both Next Best Action and Skill Impact:

```tsx
<SkillImpactWidget excludeSkillIds={['skill-id-from-next-best-action']} />
```

The backend will filter out excluded skills.

---

## Files

### Backend
- `backend/app/services/skill_widget_intelligence.py` - Rule engine
- `backend/app/api/endpoints/intelligence.py` - API endpoint

### Frontend
- `src/components/dashboard/widgets/SkillImpactWidget.tsx` - Widget UI
- `src/lib/api.ts` - API method
- `src/components/dashboard/DashboardWidget.tsx` - Widget registry

---

## Key Benefits

✅ **Actionable** - Every skill has a clear next step  
✅ **Fast** - No LLM, pure rules  
✅ **Calm** - Minimal text, one voice  
✅ **Decisive** - One CTA per skill  
✅ **Predictable** - Same input = same output  

---

## Troubleshooting

**Widget shows "No skills tracked yet"**
- Create skills in the Skills page
- Link them to tasks

**CTA button doesn't work**
- Check browser console for errors
- Verify navigation routes exist

**Backend error**
- Check backend logs
- Verify Supabase connection
- Ensure tables exist (skills, tasks, skill_contributions, skill_evidence)

**Skills not showing**
- Check workspace_id is correct
- Verify skills belong to current workspace
- Check excludeSkillIds prop

---

## Next Steps

1. Test all scenarios
2. Verify CTA navigation works
3. Check mobile responsive design
4. Add deduplication with Next Best Action
5. Implement task link modal (for `action=link`)

---

Done! The Skill Impact widget is now actionable intelligence.
