# 🎯 Skill Widgets Guide - What They Do & How They Help

## 📊 Current Widgets in Your Workspace

You have **16 dashboard widgets** already built. Here are the key ones for skills and intelligence:

---

## 🧠 SKILL-FOCUSED WIDGETS

### 1. **UnifiedSkillHubWidget** ⭐ MAIN SKILL WIDGET
**File**: `src/components/dashboard/widgets/UnifiedSkillHubWidget.tsx`

**What it shows**:
- Skills that need attention (low progress, stalled)
- Learning path suggestions (what to learn next)
- Skill growth progress (real-time contributions)
- Quick access to pages linked to skills
- Quick access to tasks linked to skills

**Intelligence features**:
- ✅ Loads REAL progress from contributions
- ✅ Shows which skills are stalled
- ✅ Suggests next learning steps
- ✅ Tracks activation count (how often skill runs)
- ✅ Shows confidence score

**Best for**: Main skill dashboard, seeing all skill activity

---

### 2. **SkillProgressWidget**
**File**: `src/components/dashboard/widgets/SkillProgressWidget.tsx`

**What it shows**:
- Individual skill progress bars
- Beginner → Intermediate → Advanced → Expert levels
- Progress percentage (0-100%)
- Skills ready to evolve

**Intelligence features**:
- ✅ Real-time progress tracking
- ✅ Evolution notifications
- ✅ Level-up indicators

**Best for**: Tracking progress toward skill evolution

---

## 💡 INTELLIGENCE WIDGETS

### 3. **WorkspacePulseWidget** ⭐ WORKSPACE INSIGHTS
**File**: `src/components/dashboard/widgets/WorkspacePulseWidget.tsx`

**What it shows**:
- Blocking insights (what's slowing you down)
- Overdue task clusters
- Skills that are stalled
- Planning vs execution balance
- Critical warnings

**Intelligence features**:
- ✅ Analyzes task patterns
- ✅ Detects skill bottlenecks
- ✅ Identifies overdue clusters
- ✅ Suggests actions to unblock work
- ✅ Severity levels (info, warning, critical)

**Example insights**:
```
⚠️ CRITICAL: 3 tasks overdue in "Data Analytics" skill
💡 INFO: You're planning a lot but not executing
🔴 WARNING: "Web Development" skill hasn't been used in 14 days
```

**Best for**: Understanding workspace health and blockers

---

### 4. **SuggestedActionWidget** ⭐ AI SUGGESTIONS
**File**: `src/components/dashboard/widgets/SuggestedActionWidget.tsx`

**What it shows**:
- ONE best next action to take
- Smart suggestions based on workspace state
- Action buttons to execute suggestions

**Intelligence features**:
- ✅ Analyzes all tasks, skills, pages
- ✅ Calculates skill health
- ✅ Finds struggling skills
- ✅ Suggests specific actions
- ✅ Prioritizes by impact

**Example suggestions**:
```
🎯 "Break down 'Build Dashboard' task - it's been open 7 days"
✅ "Complete 3 overdue tasks in Data Analytics skill"
📅 "Plan your week - you have 5 unscheduled tasks"
🧠 "Add tasks to Python skill - it has no active work"
```

**Best for**: Knowing exactly what to do next

---

## 📄 CONTENT WIDGETS

### 5. **QuickPagesWidget**
**What it shows**:
- Recent pages
- Pages linked to skills
- Quick access to important pages

**Best for**: Fast navigation to skill-related content

---

### 6. **MyTasksWidget**
**What it shows**:
- Tasks linked to skills
- Task status and priority
- Due dates

**Best for**: Seeing skill-related work

---

## 📅 PLANNING WIDGETS

### 7. **CalendarInsightWidget**
**What it shows**:
- Upcoming deadlines
- Task distribution over time
- Skill-related events

**Best for**: Time-based planning

---

### 8. **UpcomingWidget**
**What it shows**:
- Upcoming tasks
- Deadlines
- Priorities

**Best for**: Short-term planning

---

## 🎨 OTHER WIDGETS

- **RecentActivityWidget** - Recent workspace activity
- **RecentPagesWidget** - Recently viewed pages
- **PinnedPagesWidget** - Favorite pages
- **QuickActionsWidget** - Common actions
- **LearningStreakWidget** - Learning consistency
- **KnowledgeGraphPreviewWidget** - Visual connections
- **UpcomingDeadlinesWidget** - Deadline tracking

---

## 🎯 RECOMMENDED WIDGET SETUP FOR SKILLS

### **Home Dashboard Layout**:

```
┌─────────────────────────────────────────────┐
│  UnifiedSkillHubWidget (Main)               │
│  - Skills need you                          │
│  - Learning path                            │
│  - Skill growth                             │
└─────────────────────────────────────────────┘

┌──────────────────────┐ ┌──────────────────────┐
│ WorkspacePulseWidget │ │ SuggestedActionWidget│
│ - Blocking insights  │ │ - Next best action   │
│ - Critical warnings  │ │ - Smart suggestions  │
└──────────────────────┘ └──────────────────────┘

┌──────────────────────┐ ┌──────────────────────┐
│ SkillProgressWidget  │ │ MyTasksWidget        │
│ - Progress bars      │ │ - Skill tasks        │
│ - Evolution status   │ │ - Priorities         │
└──────────────────────┘ └──────────────────────┘
```

---

## 🚀 WHAT EACH WIDGET CONTRIBUTES

### **UnifiedSkillHubWidget** contributes:
- ✅ Real-time skill progress
- ✅ Learning path guidance
- ✅ Quick access to skill content
- ✅ Skill activation tracking

### **WorkspacePulseWidget** contributes:
- ✅ Workspace health insights
- ✅ Blocker detection
- ✅ Skill bottleneck identification
- ✅ Critical warnings

### **SuggestedActionWidget** contributes:
- ✅ AI-powered next action
- ✅ Skill health analysis
- ✅ Priority recommendations
- ✅ Actionable suggestions

---

## 💡 HOW WIDGETS UPDATE WITH SKILLS

### When you link a page to a skill:
```
1. UnifiedSkillHubWidget updates:
   - Shows new page in "Quick Pages"
   - Updates skill progress (+15%)
   
2. WorkspacePulseWidget updates:
   - Removes "skill stalled" warning if present
   - Updates workspace health score
   
3. SuggestedActionWidget updates:
   - May suggest linking more pages
   - May suggest creating tasks for the skill
```

### When you complete a task:
```
1. UnifiedSkillHubWidget updates:
   - Updates skill progress (+10-20%)
   - Shows skill activation
   
2. WorkspacePulseWidget updates:
   - Removes overdue warnings
   - Updates execution metrics
   
3. SuggestedActionWidget updates:
   - Suggests next task
   - May suggest skill evolution
```

### When a skill evolves:
```
1. UnifiedSkillHubWidget updates:
   - Shows new level (Intermediate, Advanced, etc.)
   - Resets progress bar for next level
   
2. WorkspacePulseWidget updates:
   - Shows positive insight
   - Updates skill health
   
3. SuggestedActionWidget updates:
   - Suggests advanced tasks
   - Recommends skill chaining
```

---

## 🎯 BEST WIDGET FOR EACH USE CASE

| Use Case | Best Widget | Why |
|----------|-------------|-----|
| See all skill activity | UnifiedSkillHubWidget | Shows everything in one place |
| Track progress | SkillProgressWidget | Focused on progress bars |
| Find blockers | WorkspacePulseWidget | Analyzes what's slowing you down |
| Know what to do next | SuggestedActionWidget | AI picks ONE best action |
| Quick navigation | QuickPagesWidget | Fast access to pages |
| Task management | MyTasksWidget | Shows all tasks |
| Deadline tracking | CalendarInsightWidget | Time-based view |
| Workspace health | WorkspacePulseWidget | Overall health score |

---

## 🔧 HOW TO ENABLE WIDGETS

Widgets are already built! They just need workspace_id to work properly.

### Fix workspace_id first:
```sql
-- Run this in Supabase
UPDATE skills 
SET workspace_id = 'YOUR_WORKSPACE_ID'
WHERE workspace_id IS NULL;
```

### Then widgets will show:
- ✅ Real skill progress
- ✅ Contribution tracking
- ✅ Smart insights
- ✅ AI suggestions
- ✅ Blocker detection

---

## 📊 WIDGET DATA FLOW

```
User Action (link page, complete task)
  ↓
Backend tracks contribution
  ↓
skill_contributions table updated
  ↓
Widgets fetch data
  ↓
UnifiedSkillHubWidget: Shows progress
WorkspacePulseWidget: Analyzes health
SuggestedActionWidget: Suggests action
  ↓
User sees insights and suggestions
```

---

## ✅ SUMMARY

You have **3 main intelligence widgets**:

1. **UnifiedSkillHubWidget** - Main skill dashboard
   - Shows all skill activity
   - Tracks real progress
   - Provides learning paths

2. **WorkspacePulseWidget** - Workspace insights
   - Detects blockers
   - Analyzes health
   - Shows critical warnings

3. **SuggestedActionWidget** - AI suggestions
   - Picks ONE best action
   - Analyzes skill health
   - Provides actionable steps

**All widgets work together** to give you:
- 📊 Real-time progress tracking
- 💡 Smart insights
- 🎯 Actionable suggestions
- ⚠️ Critical warnings
- 🚀 Learning guidance

**Just fix workspace_id** and all widgets will start showing real data!
