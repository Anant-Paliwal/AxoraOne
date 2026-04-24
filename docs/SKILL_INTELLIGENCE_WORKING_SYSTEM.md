# Skill Intelligence - Complete Working System

## 🎯 Core Concept

**Skills work FOR you, not just display information.**

A skill is an **autonomous agent** that:
- ✅ Auto-links to relevant pages and tasks
- ✅ Tracks REAL impact (did it help?)
- ✅ Builds confidence from actual results
- ✅ Evolves to next level at 100% completion
- ✅ Works silently in the background

## 📊 How Skills Measure Real Progress

### What Counts as Contribution?

Skills don't get stronger because they run.
**They get stronger because they HELP.**

| Area | What Improves | Impact Score |
|------|---------------|--------------|
| **Tasks** | Finished faster / fewer delays | +0.05 per day saved |
| **Pages** | Better structure / less rewrites | +0.10 to +0.12 |
| **Decisions** | Fewer reversals | +0.10 (good) / -0.15 (bad) |
| **Suggestions** | User accepts them | +0.15 (accept) / -0.10 (reject) |
| **Problems** | Prevented recurring issues | +0.20 |

### Progress Calculation

Each skill level has specific requirements:

**Beginner → Intermediate:**
- Minimum 0.5 total impact
- At least 5 contributions
- At least 2 different contribution types

**Intermediate → Advanced:**
- Minimum 1.5 total impact
- At least 15 contributions
- At least 3 different contribution types

**Advanced → Expert:**
- Minimum 3.0 total impact
- At least 30 contributions
- At least 4 different contribution types

**Progress = Average of:**
1. Impact progress (total impact / required)
2. Count progress (contributions / required)
3. Diversity progress (types / required)

## 🔗 Auto-Linking System

### When Pages are Created/Edited

Skills automatically analyze content and link if confident:

```typescript
// Confidence calculation:
- Skill name in title: +40%
- Skill name in content: +20%
- Keyword matches: up to +30%
- Tag matches: up to +20%
- Description overlap: up to +10%

// Auto-link threshold: 60%+
```

### When Tasks are Created

Skills find the best match and auto-link:

```typescript
// Finds skill with highest confidence
// Links task if confidence >= 60%
// Updates task.linked_skill_id
```

### Learning from Corrections

When users remove/add links manually:
- System learns what was wrong
- Adjusts future auto-linking behavior
- Improves confidence calculations

## 🎮 User Experience

### Skills Page

Each skill card shows:

1. **Circular Progress Indicator**
   - Real progress percentage (0-100%)
   - Based on actual contributions

2. **Intelligence Status**
   - Impact score from contributions
   - Linked pages count
   - Connected skills count
   - Goals tracked
   - Confidence from completed tasks

3. **Evolve Button** (only at 100%)
   - Appears when all requirements met
   - Click to advance to next level
   - Resets progress for new level

4. **Progress Breakdown** (before 100%)
   - Impact: X%
   - Contributions: Y%
   - Diversity: Z%

### Example Display

```
┌─────────────────────────────────────┐
│ ◉ 73%  Data Analytics  [Advanced]  │
│                                     │
│ Intelligence Status:                │
│ 💪 2.3 impact from 18 contributions│
│ 📚 5 pages linked                   │
│ 🔗 3 connected skills               │
│ ✅ 85% confidence from tasks        │
│                                     │
│ Progress to Expert:                 │
│ Impact: 77%                         │
│ Contributions: 60%                  │
│ Diversity: 75%                      │
└─────────────────────────────────────┘
```

At 100%:

```
┌─────────────────────────────────────┐
│ ◉ 100% Data Analytics  [Advanced]  │
│                                     │
│ Intelligence Status:                │
│ 💪 3.2 impact from 32 contributions│
│ 📚 8 pages linked                   │
│ 🔗 5 connected skills               │
│ ✅ 92% confidence from tasks        │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ⚡ Evolve to Expert             │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## 🔧 Backend Architecture

### 1. Contribution Tracker
**File:** `backend/app/services/skill_contribution_tracker.py`

Tracks real contributions:
- `track_suggestion_accepted()` - User accepted suggestion (+0.15)
- `track_suggestion_rejected()` - User rejected suggestion (-0.10)
- `track_task_accelerated()` - Task finished faster (+0.05/day)
- `track_page_improved()` - Page quality improved (+0.10)
- `track_decision_quality()` - Decision was good/bad (±0.15)
- `track_problem_prevented()` - Prevented recurring issue (+0.20)
- `calculate_real_progress()` - Returns progress & can_evolve

### 2. Auto-Linker
**File:** `backend/app/services/skill_auto_linker.py`

Automatically links content:
- `analyze_and_link_page()` - Auto-link page to skills
- `analyze_and_link_task()` - Auto-link task to best skill
- `suggest_links()` - Get suggestions for user review
- `learn_from_correction()` - Learn when user corrects links

### 3. API Endpoints
**File:** `backend/app/api/endpoints/intelligence.py`

New endpoints:
- `POST /intelligence/skills/{id}/contribution/suggestion-accepted`
- `POST /intelligence/skills/{id}/contribution/suggestion-rejected`
- `POST /intelligence/skills/{id}/contribution/task-accelerated`
- `GET /intelligence/skills/{id}/real-progress`
- `POST /intelligence/skills/{id}/evolve`
- `POST /intelligence/skills/auto-link/page`
- `POST /intelligence/skills/auto-link/task`
- `GET /intelligence/skills/suggest-links/page/{id}`

### 4. Database Schema
**File:** `create-skill-contributions-table.sql`

New table:
```sql
CREATE TABLE skill_contributions (
    id UUID PRIMARY KEY,
    skill_id UUID REFERENCES skills(id),
    workspace_id UUID REFERENCES workspaces(id),
    contribution_type TEXT, -- suggestion_accepted, task_accelerated, etc.
    target_id TEXT,
    target_type TEXT,
    impact_score FLOAT, -- -1 to 1
    metadata JSONB,
    created_at TIMESTAMPTZ
);
```

New columns on skills:
- `confidence_score` - Real confidence (0-1)
- `success_rate` - Acceptance rate (0-1)
- `activation_count` - Times activated
- `last_activated_at` - Last activation time
- `is_bottleneck` - Blocking progress?

## 🚀 Integration Points

### When Page is Created

```typescript
// In page creation handler
const page = await api.createPage(pageData);

// Auto-link to skills (background)
if (workspace_id) {
  api.autoLinkPageToSkills(
    page.id,
    page.title,
    page.content,
    page.tags || [],
    workspace_id
  ).catch(err => console.log('Auto-link failed:', err));
}
```

### When Task is Created

```typescript
// In task creation handler
const task = await api.createTask(taskData);

// Auto-link to best skill (background)
if (workspace_id) {
  api.autoLinkTaskToSkill(
    task.id,
    task.title,
    task.description || '',
    workspace_id
  ).catch(err => console.log('Auto-link failed:', err));
}
```

### When Task is Completed

```typescript
// In task completion handler
if (task.linked_skill_id) {
  // Calculate if task was completed faster than expected
  const expectedDays = 7; // Default estimate
  const actualDays = daysBetween(task.created_at, task.completed_at);
  const daysSaved = Math.max(0, expectedDays - actualDays);
  
  if (daysSaved > 0) {
    api.trackTaskAccelerated(
      task.linked_skill_id,
      task.id,
      daysSaved,
      workspace_id
    );
  }
}
```

### When User Accepts/Rejects Suggestion

```typescript
// In suggestion handler
if (userAccepted) {
  api.trackSuggestionAccepted(
    suggestion.skill_id,
    suggestion.id,
    workspace_id
  );
} else {
  api.trackSuggestionRejected(
    suggestion.skill_id,
    suggestion.id,
    workspace_id
  );
}
```

## 📈 Example Flow

### Day 1: User Creates "SQL Basics" Skill
- Skill created at Beginner level
- Progress: 0%
- No contributions yet

### Day 2: User Creates Page "SQL SELECT Queries"
- Auto-linker detects "SQL" in title
- Confidence: 75%
- **Auto-links page to skill**
- Progress: 15% (page linked)

### Day 3: User Creates Task "Practice SQL Joins"
- Auto-linker detects "SQL" in title
- Confidence: 80%
- **Auto-links task to skill**
- Progress: 25% (task linked)

### Day 5: User Completes Task (2 days early)
- Expected: 7 days
- Actual: 2 days
- Days saved: 5
- **Contribution tracked: +0.25 impact**
- Progress: 45%

### Day 10: Skill Suggests "Create SQL Practice Quiz"
- User accepts suggestion
- **Contribution tracked: +0.15 impact**
- Progress: 65%

### Day 15: More Tasks Completed
- 3 more tasks finished
- 2 more pages linked
- Total impact: 1.2
- **Progress: 100%**

### Day 16: User Clicks "Evolve"
- Skill advances: Beginner → Intermediate
- Progress resets for new level
- Requirements increase
- Skill continues learning

## 🎯 Key Benefits

1. **Autonomous Operation**
   - Skills work in background
   - No manual linking needed
   - Learns from user behavior

2. **Real Progress Tracking**
   - Based on actual help provided
   - Not just usage metrics
   - Meaningful advancement

3. **User Trust**
   - Clear progress indicators
   - Visible contributions
   - Transparent requirements

4. **Continuous Improvement**
   - Skills learn from corrections
   - Confidence adjusts over time
   - Better suggestions over time

## 🔄 Next Steps

1. **Run Migration**
   ```bash
   # Apply database changes
   psql -f create-skill-contributions-table.sql
   ```

2. **Restart Backend**
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload
   ```

3. **Test Auto-Linking**
   - Create a skill
   - Create a page with skill name in title
   - Check if auto-linked

4. **Test Progress**
   - Complete tasks linked to skill
   - Check progress updates
   - Verify evolve button appears at 100%

## 📝 Summary

Skills are now **intelligent agents** that:
- ✅ Auto-link to relevant content (60%+ confidence)
- ✅ Track real contributions (not just usage)
- ✅ Build confidence from actual results
- ✅ Show evolve button at 100% completion
- ✅ Work silently in background
- ✅ Learn from user corrections

**Skills work FOR you, making your workspace smarter over time.**
