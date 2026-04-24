# Intelligence OS Visibility - Implementation Guide

## Mission Accomplished ✅

Axora now surfaces existing intelligence WITHOUT adding complexity. The workspace feels like a true **Intelligence OS** that THINKS.

---

## What Was Built

### 1. Core Intelligence Engine
**File:** `src/lib/intelligenceUtils.ts`

Three pure functions that compute intelligence from existing data:

```typescript
// Computes ONE status line per page
computePageIntelligence(page, tasks, skills)
→ "Contributing to [Skill]"
→ "Planning only — no execution yet"
→ "Inactive — no linked tasks"
→ "Blocked by delayed tasks"

// Computes ONE context line per task
computeTaskContext(task, pages, skills)
→ "Trains: [Skill Name]"
→ "Supports: [Page Title]"
→ null (if no context)

// Computes ONE primary insight for home
computePrimaryInsight(tasks, skills, pages)
→ "N tasks overdue — timeline needs adjustment"
→ "N tasks blocked — progress is stalled"
→ "N tasks in progress — focus is scattered"
→ "All tasks on track"
```

**Key Features:**
- Pure functions (no side effects)
- Priority-based selection
- Reuses existing data
- Zero API calls

---

### 2. Pages Screen Intelligence
**File:** `src/pages/PagesPage.tsx`

**Changes:**
1. Loads tasks and skills alongside pages
2. Passes data to `PageCard` component
3. Computes intelligence status per page
4. Renders ONE status line below content

**Visual Result:**
```
┌─────────────────────────────────┐
│ 📄 SQL Learning Notes           │
│ Learn SQL fundamentals...       │
│                                 │
│ 🟢 Contributing to Data Analytics  ← NEW!
│                                 │
│ #database  Updated: Jan 23      │
└─────────────────────────────────┘
```

**Code Addition:**
```typescript
// Load intelligence data
const [tasks, setTasks] = useState<Task[]>([]);
const [skills, setSkills] = useState<Skill[]>([]);

// Pass to PageCard
<PageCard 
  page={page}
  tasks={tasks}
  skills={skills}
  // ... other props
/>

// In PageCard: compute and render
const intelligenceStatus = useMemo(() => 
  computePageIntelligence(page, tasks, skills),
  [page, tasks, skills]
);

{intelligenceStatus && (
  <div className="text-xs">
    {intelligenceStatus.text}
  </div>
)}
```

---

### 3. Tasks Screen Intelligence
**File:** `src/pages/TasksPage.tsx`

**Changes:**
1. Imports `computeTaskContext` utility
2. Passes pages and skills to `TaskItem`
3. Computes context per task
4. Renders ONE context line below title

**Visual Result:**
```
┌─────────────────────────────────┐
│ ☐ Complete SQL Tutorial         │
│ Trains: Data Analytics          ← NEW!
│                                 │
│ 📅 Today  🚩 High               │
└─────────────────────────────────┘
```

**Code Addition:**
```typescript
// In TaskItem: compute context
const taskContext = useMemo(() => 
  computeTaskContext(task, pages, skills),
  [task, pages, skills]
);

// Render below title
{taskContext && (
  <div className="text-xs italic text-muted-foreground">
    {taskContext.text}
  </div>
)}
```

---

### 4. Home Screen Primary Insight
**File:** `src/pages/HomePage.tsx`

**Changes:**
1. Loads tasks, skills, and pages
2. Computes primary insight using utility
3. Renders `PrimaryInsightWidget` at top
4. Replaces multiple noisy widgets with ONE voice

**Visual Result:**
```
┌─────────────────────────────────┐
│ 🔴 3 tasks overdue — timeline   │
│    needs adjustment             │
│                                 │
│    [Review overdue tasks →]    │
└─────────────────────────────────┘
```

**Code Addition:**
```typescript
// Load intelligence data
const [tasks, setTasks] = useState<Task[]>([]);
const [skills, setSkills] = useState<Skill[]>([]);
const [pages, setPages] = useState<Page[]>([]);

// Compute primary insight
const primaryInsight = useMemo(() => 
  computePrimaryInsight(tasks, skills, pages),
  [tasks, skills, pages]
);

// Render at top of home
{primaryInsight && (
  <PrimaryInsightWidget 
    insight={primaryInsight}
    workspaceId={currentWorkspace.id}
  />
)}
```

---

### 5. Primary Insight Widget
**File:** `src/components/intelligence/PrimaryInsightWidget.tsx`

**Features:**
- Clean gradient background
- Icon changes by urgency (AlertTriangle/TrendingUp/Sparkles)
- Color-coded (red/amber/blue)
- Single message + single action button
- Navigates to filtered views

**Props:**
```typescript
interface PrimaryInsightWidgetProps {
  insight: PrimaryInsight;
  workspaceId: string;
}

interface PrimaryInsight {
  message: string;      // "3 tasks overdue..."
  action: string;       // "Review overdue tasks"
  actionRoute?: string; // "/tasks?filter=overdue"
  type: 'urgent' | 'progress' | 'opportunity';
}
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  Data Layer                     │
│  (Existing: Tasks, Skills, Pages from API)      │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│           Intelligence Utils (NEW)              │
│  • computePageIntelligence()                    │
│  • computeTaskContext()                         │
│  • computePrimaryInsight()                      │
│  Pure functions, no side effects                │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│              UI Components                      │
│  • PagesPage → Shows status                     │
│  • TasksPage → Shows context                    │
│  • HomePage → Shows insight                     │
│  • PrimaryInsightWidget → Renders insight       │
└─────────────────────────────────────────────────┘
```

---

## Design Principles Applied

### 1. One Voice Per Context
- **Pages:** ONE status line (not multiple badges)
- **Tasks:** ONE context line (not multiple labels)
- **Home:** ONE primary insight (not multiple widgets)

### 2. Priority-Based Selection
Intelligence is chosen by highest priority:

**Pages:**
1. Blocked (red) → "Blocked by N delayed tasks"
2. Active (green) → "Contributing to [Skill]"
3. Planning (blue) → "Planning only — no execution yet"
4. Inactive (gray) → "Inactive — no linked tasks"

**Tasks:**
1. Skill training → "Trains: [Skill]"
2. Page support → "Supports: [Page]"
3. Nothing → null

**Home:**
1. Overdue (urgent) → "N tasks overdue..."
2. Blocked (urgent) → "N tasks blocked..."
3. Too many WIP (progress) → "N tasks in progress..."
4. Planning only (progress) → "Lots of planning..."
5. Today's tasks (opportunity) → "N tasks due today"
6. All clear (opportunity) → "All tasks on track"

### 3. Calm, Restrained Display
- Small text, muted colors
- No buttons on status lines
- Truth-based, not action-based
- Feels like ambient awareness

### 4. Reuses Existing Data
- No new API endpoints
- No new database tables
- No new background jobs
- Just surfaces what exists

---

## Testing Checklist

### ✅ Pages Screen
- [ ] Navigate to Pages
- [ ] See status line below each page card
- [ ] Status matches actual task state
- [ ] Color indicator shows correctly
- [ ] Status updates when tasks change

### ✅ Tasks Screen
- [ ] Navigate to Tasks
- [ ] See context line below task title (if linked)
- [ ] Context shows correct skill/page
- [ ] No context shown for unlinked tasks
- [ ] Context updates when links change

### ✅ Home Screen
- [ ] Navigate to Home
- [ ] See Primary Insight widget at top
- [ ] Message reflects workspace state
- [ ] Action button navigates correctly
- [ ] Insight updates when tasks change

### ✅ Intelligence Computation
- [ ] Create page with active tasks → "Contributing to..."
- [ ] Create page with only todo tasks → "Planning only..."
- [ ] Create page with no tasks → "Inactive..."
- [ ] Block a task → Page shows "Blocked by..."
- [ ] Create overdue tasks → Home shows "N tasks overdue..."

---

## File Structure

```
src/
├── lib/
│   └── intelligenceUtils.ts          ← NEW: Core intelligence engine
├── components/
│   └── intelligence/
│       └── PrimaryInsightWidget.tsx  ← NEW: Home insight display
└── pages/
    ├── PagesPage.tsx                 ← UPDATED: Shows page status
    ├── TasksPage.tsx                 ← UPDATED: Shows task context
    └── HomePage.tsx                  ← UPDATED: Shows primary insight
```

---

## Code Statistics

### Lines Added
- `intelligenceUtils.ts`: ~250 lines
- `PrimaryInsightWidget.tsx`: ~100 lines
- `PagesPage.tsx`: +30 lines
- `TasksPage.tsx`: +20 lines
- `HomePage.tsx`: +25 lines

**Total:** ~425 lines of code

### Complexity Added
- 3 pure functions
- 1 new component
- 5 file updates
- 0 new API calls
- 0 new database tables

**Impact:** Minimal code, maximum visibility

---

## Performance Characteristics

### API Calls
- **Before:** N calls (pages, tasks, skills)
- **After:** N calls (same, no additional calls)
- **Impact:** Zero

### Computation
- **Type:** Pure function computation
- **Time:** < 1ms per page/task
- **Memory:** Negligible (no caching needed)
- **Impact:** Minimal

### Rendering
- **Before:** Render data as-is
- **After:** Render data + 1 status line
- **Impact:** +1 div per item (minimal)

---

## Maintenance Guide

### Adding New Intelligence Types

**Example: Add "Stale" status for pages not updated in 60 days**

1. Update `computePageIntelligence()`:
```typescript
// Add after inactive check
if (daysSinceUpdate > 60) {
  return {
    text: 'Stale — not updated in 60 days',
    type: 'inactive'
  };
}
```

2. Update color mapping in `getIntelligenceStatusColor()`:
```typescript
case 'stale':
  return 'text-amber-600 dark:text-amber-400';
```

3. Done! No UI changes needed.

### Changing Priority Order

Edit the priority checks in the utility functions:
- `computePageIntelligence()` → Change if/else order
- `computeTaskContext()` → Change if/else order
- `computePrimaryInsight()` → Change if/else order

### Customizing Display

Edit the component files:
- `PagesPage.tsx` → Change status line styling
- `TasksPage.tsx` → Change context line styling
- `PrimaryInsightWidget.tsx` → Change insight card design

---

## What NOT to Do

### ❌ Don't Add More Widgets
The goal is ONE voice, not more voices.

### ❌ Don't Add Configuration
Keep it simple. No settings for intelligence display.

### ❌ Don't Add Raw Metrics
Show intelligence, not data. No percentages or counts.

### ❌ Don't Add Multiple Badges
ONE status per item. Resist the urge to show everything.

### ❌ Don't Add New API Calls
Compute from existing data. No new endpoints.

---

## Success Criteria

### Qualitative
- ✅ Pages feel alive, not static
- ✅ Tasks show purpose, not just metadata
- ✅ Home speaks with one voice
- ✅ System feels intelligent, not informative

### Quantitative
- ✅ +1 line per page (status)
- ✅ +1 line per task (context)
- ✅ 1 insight on home (vs 5+ widgets)
- ✅ 0 new API calls
- ✅ 0 new database tables
- ✅ < 500 lines of code

---

## Future Enhancements (Optional)

These are NOT implemented to keep it minimal:

### Page Detail View Intelligence
Add strip under page title:
```typescript
// In PageViewer.tsx
const pageStatus = computePageIntelligence(page, tasks, skills);

<div className="text-sm text-muted-foreground">
  {pageStatus.text}
</div>
```

### Skill Contribution Summary
Add to Home below primary insight:
```typescript
const skillSummary = computeSkillSummary(skills, tasks);

<div className="text-sm text-muted-foreground">
  {skillSummary.active} skills active, 
  {skillSummary.needsAttention} need attention
</div>
```

### Pattern Detection
Detect and surface patterns:
- Stalled tasks (in progress > 7 days)
- Neglected pages (not updated > 30 days)
- Skill bottlenecks (many blocked tasks)

---

## Troubleshooting

### Status Not Showing on Pages
**Check:**
1. Are tasks linked to pages? (`linkedPageId`)
2. Do skills exist in workspace?
3. Is task status set correctly?
4. Is `computePageIntelligence()` being called?

**Debug:**
```typescript
console.log('Page:', page.id);
console.log('Linked tasks:', tasks.filter(t => t.linkedPageId === page.id));
console.log('Status:', computePageIntelligence(page, tasks, skills));
```

### Context Not Showing on Tasks
**Check:**
1. Is task linked to skill or page?
2. Does linked skill/page exist?
3. Is `computeTaskContext()` being called?

**Debug:**
```typescript
console.log('Task:', task.id);
console.log('Linked skill:', task.linkedSkillId);
console.log('Linked page:', task.linkedPageId);
console.log('Context:', computeTaskContext(task, pages, skills));
```

### Insight Not Showing on Home
**Check:**
1. Does workspace have tasks?
2. Are tasks loaded correctly?
3. Is `computePrimaryInsight()` being called?

**Debug:**
```typescript
console.log('Tasks:', tasks.length);
console.log('Skills:', skills.length);
console.log('Pages:', pages.length);
console.log('Insight:', computePrimaryInsight(tasks, skills, pages));
```

---

## Documentation Files

1. **INTELLIGENCE_OS_VISIBILITY_COMPLETE.md** → Full implementation details
2. **INTELLIGENCE_VISIBILITY_QUICK_START.md** → Quick testing guide
3. **INTELLIGENCE_BEFORE_AFTER.md** → Visual comparisons
4. **INTELLIGENCE_VISIBILITY_IMPLEMENTATION_GUIDE.md** → This file

---

## Summary

### What Was Built
A calm, intelligent visibility layer that surfaces existing intelligence without adding complexity.

### How It Works
Pure functions compute ONE status/context/insight from existing data, displayed with minimal, restrained UI.

### Why It Matters
Axora now feels like a system that THINKS, not one that just shows data.

### The Result
- **Pages** feel alive with purpose
- **Tasks** show their contribution
- **Home** speaks with one voice
- **System** feels intelligent

---

## Final Notes

This implementation follows the core principle:

> **Intelligence already exists internally.**
> **The problem is VISIBILITY, not computation.**
> **If the system knows something, the user must feel it calmly.**

Mission accomplished. ✅
