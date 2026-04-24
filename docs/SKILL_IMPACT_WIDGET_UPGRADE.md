# Skill Impact Widget - Actionable Intelligence Upgrade

## ✅ COMPLETE

The Skill Impact widget has been upgraded from passive status display to **actionable intelligence** with rule-based reasoning.

---

## What Changed

### Before
- Showed "contributing" or "needs attention" status
- Displayed impact metrics (contributions, pages linked)
- No clear next steps
- Static, informational only

### After
- Shows **reason** (1 line) - why the skill is in this state
- Shows **next_move** (1 line) - what to do about it
- Shows **CTA button** (1 action) - one-click fix
- Pure rule-based logic - NO LLM
- Actionable, decisive, calm

---

## Implementation

### 1. Backend Service
**File**: `backend/app/services/skill_widget_intelligence.py`

Rule-based intelligence engine that analyzes:
- Linked tasks (active, overdue, completed)
- Skill contributions (last 7 days)
- Linked pages (evidence)
- Recent progress

**States**:
- `needs_attention` - Skill has issues requiring action
- `contributing` - Skill is actively helping

**Reasons** (rule-based):
- "No active tasks linked" → needs_attention
- "X tasks overdue" → needs_attention
- "No recent progress" → needs_attention
- "Progress detected — Y contributions" → contributing
- "Progress detected — Completed Z tasks" → contributing

**Next Moves**:
- "Link 1 task to this skill"
- "Reschedule or break down the overdue task"
- "Complete 1 task or update a page"
- "Continue with the next task"

**CTAs**:
- `OPEN_LINK_TASK_MODAL` - Opens tasks page with link action
- `OPEN_TASKS_FILTERED` - Opens tasks filtered by skill + status
- `OPEN_NEXT_TASK` - Opens tasks filtered by skill

### 2. Backend API Endpoint
**File**: `backend/app/api/endpoints/intelligence.py`

```
GET /intelligence/skills/widget-intelligence?workspace_id={id}&exclude_skill_ids={ids}
```

Returns:
```json
{
  "skills": [
    {
      "skill_id": "...",
      "skill_name": "Python Development",
      "state": "needs_attention",
      "reason": "No active tasks linked",
      "next_move": "Link 1 task to this skill",
      "cta": {
        "label": "Link task",
        "action": "OPEN_LINK_TASK_MODAL",
        "payload": {"skill_id": "..."}
      }
    }
  ]
}
```

### 3. Frontend API Method
**File**: `src/lib/api.ts`

```typescript
async getSkillWidgetIntelligence(
  workspaceId: string, 
  excludeSkillIds?: string[]
)
```

### 4. New Widget Component
**File**: `src/components/dashboard/widgets/SkillImpactWidget.tsx`

Replaces `SkillProgressWidget.tsx` with:
- Cleaner, more focused UI
- Shows top 4 skills (2 needs_attention, 2 contributing)
- Each skill shows:
  - Icon (⚠️ or ✓)
  - Name
  - Status line: "Contributing — Progress detected"
  - Next move: "Next: Continue with the next task"
  - CTA button: "Open task"

**Action Handlers**:
- `OPEN_LINK_TASK_MODAL` → `/tasks?skill={id}&action=link`
- `OPEN_TASKS_FILTERED` → `/tasks?skill={id}&filter=overdue`
- `OPEN_NEXT_TASK` → `/tasks?skill={id}`

### 5. Widget Registry Update
**File**: `src/components/dashboard/DashboardWidget.tsx`

Updated to use `SkillImpactWidget` instead of `SkillProgressWidget`

---

## UI Examples

### Needs Attention Skill
```
┌─────────────────────────────────────┐
│ ⚠️  Python Development              │
│ ⚠️ Not contributing — No active     │
│     tasks linked                    │
│ ─────────────────────────────────── │
│ Next: Link 1 task to this skill     │
│                      [Link task] ← CTA
└─────────────────────────────────────┘
```

### Contributing Skill
```
┌─────────────────────────────────────┐
│ ✓  Data Analytics                   │
│ ✓ Contributing — Completed 2 tasks  │
│ ─────────────────────────────────── │
│ Next: Continue with the next task   │
│                      [Open task] ← CTA
└─────────────────────────────────────┘
```

---

## Key Features

### ✅ Rule-Based Intelligence
- NO LLM usage
- Fast, deterministic
- Predictable behavior
- No API costs

### ✅ Actionable
- Every skill has a clear next step
- One-click actions
- No ambiguity

### ✅ Calm Design
- Minimal text
- One voice per skill
- No information overload
- Notion-like aesthetic

### ✅ Deduplication Ready
- Accepts `excludeSkillIds` prop
- Can avoid showing skills already in Next Best Action
- (Not yet wired up, but ready)

---

## Testing

1. **No tasks linked**:
   - Create a skill
   - Don't link any tasks
   - Should show: "No active tasks linked" + "Link task" button

2. **Overdue tasks**:
   - Link a task with past due date
   - Should show: "X tasks overdue" + "View tasks" button

3. **Contributing**:
   - Complete a task linked to a skill
   - Should show: "Completed 1 task" + "Open task" button

4. **No recent progress**:
   - Have linked pages but no activity in 7 days
   - Should show: "No recent progress" + "View tasks" button

---

## Next Steps (Optional)

1. **Deduplication with Next Best Action**:
   - Pass skill_id from NextBestActionWidget
   - Exclude that skill from SkillImpactWidget
   - Avoid showing same skill twice

2. **Task Link Modal**:
   - Implement modal for linking tasks to skills
   - Triggered by `action=link` query param

3. **Analytics**:
   - Track CTA click rates
   - Measure which actions users take most
   - Optimize suggestions based on data

---

## Files Changed

### Backend
- ✅ `backend/app/services/skill_widget_intelligence.py` (NEW)
- ✅ `backend/app/api/endpoints/intelligence.py` (UPDATED)

### Frontend
- ✅ `src/lib/api.ts` (UPDATED)
- ✅ `src/components/dashboard/widgets/SkillImpactWidget.tsx` (NEW)
- ✅ `src/components/dashboard/DashboardWidget.tsx` (UPDATED)
- ✅ `src/components/dashboard/WidgetTypes.ts` (UPDATED)

### Old Files (Can be removed)
- `src/components/dashboard/widgets/SkillProgressWidget.tsx` (REPLACED)

---

## Summary

The Skill Impact widget is now **actionable intelligence** instead of passive status display. Every skill shows:
- **Why** it's in this state (reason)
- **What** to do about it (next_move)
- **How** to do it (CTA button)

All logic is rule-based, fast, and deterministic. No LLM. No complexity. Just clear, actionable guidance.
