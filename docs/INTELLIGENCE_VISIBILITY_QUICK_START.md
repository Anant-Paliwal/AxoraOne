# Intelligence OS Visibility - Quick Start

## What This Does

Transforms Axora from a static workspace into a **Living Intelligence OS** by surfacing existing intelligence in calm, decisive ways.

---

## See It In Action

### 1. Pages Screen
Navigate to **Pages** and look at any page card:

```
📄 SQL Learning Notes
   Last updated: Jan 23

   🟢 Contributing to Data Analytics    ← NEW: Intelligence status

   #database  #learning
```

**What you'll see:**
- 🟢 Contributing to [Skill] — Active work
- 🔵 Planning only — no execution yet
- ⚪ Inactive — no linked tasks
- 🔴 Blocked by delayed tasks

### 2. Tasks Screen
Navigate to **Tasks** and look at any task card:

```
☐ Complete SQL Tutorial
   Trains: Data Analytics              ← NEW: Task context
   
   📅 Today  🚩 High
```

**What you'll see:**
- "Trains: [Skill Name]"
- "Supports: [Page Title]"
- Only shows if task is linked

### 3. Home Screen
Navigate to **Home** and look at the top:

```
🔴 3 tasks overdue — timeline needs adjustment    ← NEW: Primary Insight
   [Review overdue tasks →]
```

**What you'll see:**
- ONE decisive message
- ONE action button
- Changes based on workspace state
- Color-coded by urgency

---

## How It Works

### Intelligence Computation
All status is computed from existing data:
- **Pages** → Analyzes linked tasks and skills
- **Tasks** → Shows what they support/train
- **Home** → Prioritizes most important insight

### No New Features
This doesn't add complexity:
- ✅ No new dashboards
- ✅ No new settings
- ✅ No new data collection
- ✅ Just surfaces what already exists

### Priority-Based
Shows ONE thing per context:
- **Pages:** Blocked > Active > Planning > Inactive
- **Tasks:** Skill > Page > Nothing
- **Home:** Urgent > Progress > Opportunity

---

## Testing Scenarios

### Scenario 1: Active Page
1. Create a page "Python Learning"
2. Create a skill "Python Programming"
3. Create a task linked to both
4. Set task status to "In Progress"
5. **Result:** Page shows "🟢 Contributing to Python Programming"

### Scenario 2: Blocked Task
1. Create a task "Build API"
2. Set status to "Blocked"
3. Link to a page
4. **Result:** Page shows "🔴 Blocked by 1 delayed task"

### Scenario 3: Overdue Tasks
1. Create 3 tasks with past due dates
2. Navigate to Home
3. **Result:** Primary Insight shows "3 tasks overdue — timeline needs adjustment"

### Scenario 4: Task Context
1. Create a task "Study Python"
2. Link to skill "Python Programming"
3. Navigate to Tasks
4. **Result:** Task shows "Trains: Python Programming"

---

## Key Files

### New Files
- `src/lib/intelligenceUtils.ts` — Pure computation functions
- `src/components/intelligence/PrimaryInsightWidget.tsx` — Home insight display

### Updated Files
- `src/pages/PagesPage.tsx` — Shows page intelligence status
- `src/pages/TasksPage.tsx` — Shows task context
- `src/pages/HomePage.tsx` — Shows primary insight

---

## Design Philosophy

### Calm Intelligence
- Small text, muted colors
- No buttons on status lines
- Truth-based, not action-based
- Feels like ambient awareness

### One Voice
- ONE status per page
- ONE context per task
- ONE insight on home
- Decisive, not informative

### Existing Data
- No new API calls
- No new database tables
- Computes from tasks, skills, pages
- Pure functions, no side effects

---

## What's Next (Optional)

These are NOT implemented to keep it minimal:

### Page Detail View
Add intelligence strip under page title:
- "This page is contributing to [Skill]"
- "This page has no active tasks — progress paused"

### Skill Summary
Add to Home below primary insight:
- "3 skills active, 2 need attention"
- Quiet, secondary information

### Pattern Detection
Detect and surface patterns:
- Stalled tasks
- Neglected pages
- Skill bottlenecks

---

## Troubleshooting

### Status Not Showing
- Ensure tasks are linked to pages/skills
- Check that skills exist in workspace
- Verify task status is set correctly

### Context Not Showing
- Ensure task has `linkedSkillId` or `linkedPageId`
- Check that linked page/skill exists
- Context only shows if link exists

### Insight Not Showing
- Ensure workspace has tasks
- Check that tasks have due dates
- Insight computes from task state

---

## Summary

Axora now surfaces intelligence that already exists:
- **Pages** feel alive with purpose
- **Tasks** show their contribution
- **Home** speaks with one voice

The system THINKS, it doesn't just show data.
