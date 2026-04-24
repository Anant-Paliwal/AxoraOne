# Skill Intelligence Architecture

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    LIVING INTELLIGENCE OS                        │
│                                                                  │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐             │
│  │  PAGES   │◄────►│  SKILLS  │◄────►│  TASKS   │             │
│  └──────────┘      └──────────┘      └──────────┘             │
│       │                  │                  │                   │
│       └──────────────────┼──────────────────┘                   │
│                          │                                      │
│                          ▼                                      │
│              ┌───────────────────────┐                         │
│              │ INTELLIGENCE ENGINE   │                         │
│              │  - Observes signals   │                         │
│              │  - Detects patterns   │                         │
│              │  - Proposes actions   │                         │
│              └───────────────────────┘                         │
│                          │                                      │
│         ┌────────────────┼────────────────┐                    │
│         │                │                │                    │
│         ▼                ▼                ▼                    │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐               │
│  │  SKILL   │    │ METRICS  │    │ KNOWLEDGE│               │
│  │  AGENTS  │    │ UPDATER  │    │  GRAPH   │               │
│  └──────────┘    └──────────┘    └──────────┘               │
│                                                                  │
│                          ▼                                      │
│                   ┌──────────┐                                 │
│                   │ SUPABASE │                                 │
│                   │ DATABASE │                                 │
│                   └──────────┘                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow: Task Completion

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER COMPLETES TASK                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (React)                                                │
│  - User clicks "Mark as Complete"                                │
│  - Calls: PATCH /api/v1/tasks/{task_id}                         │
│  - Payload: { status: "completed" }                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND (FastAPI)                                               │
│  1. Update task status in Supabase                               │
│  2. Check if task has linked_skill_id                            │
│  3. Call: _update_skill_on_task_completion()                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  SKILL UPDATE                                                    │
│  - Get current confidence_score                                  │
│  - Calculate: new_confidence = min(1.0, current + 0.05)         │
│  - Update Supabase:                                              │
│    • confidence_score = new_confidence                           │
│    • activation_count += 1                                       │
│    • last_activated_at = NOW()                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  INTELLIGENCE ENGINE                                             │
│  - Emit TASK_COMPLETED signal                                    │
│  - Notify all skill agents in workspace                          │
│  - Skill agents observe and may activate                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  SKILL AGENTS (Autonomous)                                       │
│  1. OBSERVE: Calculate relevance score                           │
│  2. DETECT: Check for patterns                                   │
│  3. ACTIVATE: If threshold met                                   │
│  4. REASON: Determine actions                                    │
│  5. PROPOSE: Create suggested actions                            │
│  6. LEARN: Update memory                                         │
│  7. EVOLVE: Improve behavior                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND UPDATE                                                 │
│  - Skills page refreshes                                         │
│  - Progress bar updates                                          │
│  - Confidence score increases                                    │
│  - Activation count increments                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow: Background Metrics Update

```
┌─────────────────────────────────────────────────────────────────┐
│                    EVERY 5 MINUTES                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  METRICS UPDATER (Background Service)                            │
│  - Wakes up automatically                                        │
│  - Fetches all skills from Supabase                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  FOR EACH SKILL:                                                 │
│                                                                  │
│  1. Count linked pages (skill_evidence table)                    │
│  2. Count completed tasks (tasks table)                          │
│  3. Count total tasks                                            │
│  4. Calculate success_rate = completed / total                   │
│  5. Calculate confidence from activity                           │
│  6. Check last_activated_at for neglect                          │
│  7. Count blocked tasks for bottlenecks                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  UPDATE SUPABASE                                                 │
│  - skills.confidence_score                                       │
│  - skills.success_rate                                           │
│  - skills.is_bottleneck                                          │
│  - skills.updated_at                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  CREATE INSIGHTS (if needed)                                     │
│                                                                  │
│  IF neglected (30+ days):                                        │
│    → Create "skill_neglected" insight                            │
│                                                                  │
│  IF bottleneck (3+ blocked tasks):                               │
│    → Create "skill_bottleneck" insight                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND SHOWS UPDATED DATA                                     │
│  - Fresh progress percentages                                    │
│  - Updated confidence scores                                     │
│  - New insights/alerts                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

```
┌─────────────────────────────────────────────────────────────────┐
│  SKILLS TABLE                                                    │
├─────────────────────────────────────────────────────────────────┤
│  id                    UUID PRIMARY KEY                          │
│  name                  TEXT                                      │
│  level                 TEXT (Beginner/Intermediate/Advanced)     │
│  description           TEXT                                      │
│  goals                 JSONB (array of goals)                    │
│  evidence              JSONB (array of keywords)                 │
│  linked_skills         JSONB (array of skill IDs)                │
│  prerequisite_skills   JSONB (array of skill IDs)                │
│  workspace_id          UUID → workspaces(id)                     │
│  user_id               UUID → auth.users(id)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ INTELLIGENCE COLUMNS (NEW)                               │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ confidence_score      FLOAT (0-1.0)                      │   │
│  │ activation_count      INTEGER                            │   │
│  │ last_activated_at     TIMESTAMPTZ                        │   │
│  │ success_rate          FLOAT (0-1.0)                      │   │
│  │ is_bottleneck         BOOLEAN                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│  created_at            TIMESTAMPTZ                               │
│  updated_at            TIMESTAMPTZ                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ linked_skill_id
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  TASKS TABLE                                                     │
├─────────────────────────────────────────────────────────────────┤
│  id                    UUID PRIMARY KEY                          │
│  title                 TEXT                                      │
│  description           TEXT                                      │
│  status                TEXT (todo/in-progress/completed/blocked) │
│  priority              TEXT (low/medium/high)                    │
│  due_date              TIMESTAMPTZ                               │
│  linked_skill_id       UUID → skills(id)  ◄── CONNECTS HERE     │
│  linked_page_id        UUID → pages(id)                          │
│  workspace_id          UUID → workspaces(id)                     │
│  user_id               UUID → auth.users(id)                     │
│  created_at            TIMESTAMPTZ                               │
│  updated_at            TIMESTAMPTZ                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  SKILL_EVIDENCE TABLE (Page-Skill Links)                         │
├─────────────────────────────────────────────────────────────────┤
│  id                    UUID PRIMARY KEY                          │
│  skill_id              UUID → skills(id)                         │
│  page_id               UUID → pages(id)                          │
│  evidence_type         TEXT                                      │
│  notes                 TEXT                                      │
│  created_at            TIMESTAMPTZ                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  SKILL_MEMORY TABLE (Learning & Evolution)                       │
├─────────────────────────────────────────────────────────────────┤
│  skill_id              UUID PRIMARY KEY → skills(id)             │
│  successful_patterns   JSONB (array of successful actions)       │
│  failed_patterns       JSONB (array of rejected actions)         │
│  user_preferences      JSONB (learned preferences)               │
│  activation_history    JSONB (activation log)                    │
│  confidence_adjustments JSONB (confidence changes)               │
│  last_evolved_at       TIMESTAMPTZ                               │
│  created_at            TIMESTAMPTZ                               │
│  updated_at            TIMESTAMPTZ                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  INSIGHTS TABLE (AI-Generated Alerts)                            │
├─────────────────────────────────────────────────────────────────┤
│  id                    UUID PRIMARY KEY                          │
│  workspace_id          UUID → workspaces(id)                     │
│  user_id               UUID → auth.users(id)                     │
│  insight_type          TEXT (skill_neglected/skill_bottleneck)   │
│  title                 TEXT                                      │
│  description           TEXT                                      │
│  severity              TEXT (info/warning/critical)              │
│  source_signals        JSONB (array of entity IDs)               │
│  suggested_actions     JSONB (array of action objects)           │
│  dismissed             BOOLEAN                                   │
│  acted_upon            BOOLEAN                                   │
│  created_at            TIMESTAMPTZ                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Frontend Component Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  SkillsPage.tsx                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Stats Cards                                              │  │
│  │  - Total Skills                                           │  │
│  │  - Advanced Level                                         │  │
│  │  - Active Goals                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Skills Grid                                              │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  SkillCard (for each skill)                         │  │  │
│  │  │  ┌───────────────────────────────────────────────┐  │  │  │
│  │  │  │  Round Progress Indicator                     │  │  │  │
│  │  │  │  ╭─────╮                                       │  │  │  │
│  │  │  │ ╱   🧠  ╲  ← SVG circle with progress        │  │  │  │
│  │  │  ││  ████   │  ← Primary color only             │  │  │  │
│  │  │  │ ╲  75%  ╱  ← Real percentage                 │  │  │  │
│  │  │  │  ╰─────╯                                       │  │  │  │
│  │  │  └───────────────────────────────────────────────┘  │  │  │
│  │  │  ┌───────────────────────────────────────────────┐  │  │  │
│  │  │  │  Skill Info                                   │  │  │  │
│  │  │  │  - Name + Level badge                         │  │  │  │
│  │  │  │  - Progress percentage                        │  │  │  │
│  │  │  │  - Activation count                           │  │  │  │
│  │  │  └───────────────────────────────────────────────┘  │  │  │
│  │  │  ┌───────────────────────────────────────────────┐  │  │  │
│  │  │  │  Expanded Details (when clicked)              │  │  │  │
│  │  │  │  - Intelligence Status                        │  │  │  │
│  │  │  │    • Pages linked                             │  │  │  │
│  │  │  │    • Connected skills                         │  │  │  │
│  │  │  │    • Goals tracked                            │  │  │  │
│  │  │  │    • Confidence from tasks                    │  │  │  │
│  │  │  │  - Connected Items                            │  │  │  │
│  │  │  │  - Goals list                                 │  │  │  │
│  │  │  └───────────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔢 Progress Calculation Formula

```
┌─────────────────────────────────────────────────────────────────┐
│  REAL PROGRESS CALCULATION                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Input Data (from Supabase):                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ pagesCount        = skill_evidence.count()                 │ │
│  │ goalsCount        = skills.goals.length                    │ │
│  │ linkedSkillsCount = skills.linked_skills.length            │ │
│  │ confidenceScore   = skills.confidence_score (0-1.0)        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Formula:                                                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                                                            │ │
│  │  rawScore = (pagesCount × 20)                             │ │
│  │           + (goalsCount × 15)                             │ │
│  │           + (linkedSkillsCount × 10)                      │ │
│  │           + (confidenceScore × 100)                       │ │
│  │                                                            │ │
│  │  progress = min(100, round(rawScore / 2.4))               │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Examples:                                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 0 pages, 0 goals, 0 links, 0 confidence                   │ │
│  │ → 0% progress                                              │ │
│  │                                                            │ │
│  │ 2 pages, 0 goals, 0 links, 0 confidence                   │ │
│  │ → (2×20) / 2.4 = 17% progress                             │ │
│  │                                                            │ │
│  │ 2 pages, 2 goals, 0 links, 0 confidence                   │ │
│  │ → (40 + 30) / 2.4 = 29% progress                          │ │
│  │                                                            │ │
│  │ 2 pages, 2 goals, 2 links, 0.5 confidence                 │ │
│  │ → (40 + 30 + 20 + 50) / 2.4 = 58% progress                │ │
│  │                                                            │ │
│  │ 5 pages, 5 goals, 5 links, 1.0 confidence                 │ │
│  │ → (100 + 75 + 50 + 100) / 2.4 = 100% progress (capped)    │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Performance & Optimization

### Background Services:
```
┌─────────────────────────────────────────────────────────────────┐
│  Skill Background Runner                                         │
│  - Runs continuously                                             │
│  - Processes signals in real-time                                │
│  - Activates skill agents when needed                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Metrics Updater                                                 │
│  - Runs every 5 minutes                                          │
│  - Updates all skill metrics                                     │
│  - Creates insights                                              │
│  - Low overhead (batch processing)                               │
└─────────────────────────────────────────────────────────────────┘
```

### Database Optimization:
```sql
-- Indexes for fast queries
CREATE INDEX idx_tasks_skill ON tasks(linked_skill_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_skill_evidence_skill ON skill_evidence(skill_id);
CREATE INDEX idx_insights_workspace ON insights(workspace_id, dismissed);
```

---

## 🎯 Summary

This architecture provides:

✅ **Automatic Evolution** - Skills update when tasks complete
✅ **Real-Time Updates** - Immediate feedback on progress
✅ **Background Processing** - Periodic metrics refresh
✅ **Intelligent Insights** - Automatic alerts for neglect/bottlenecks
✅ **Full Interconnection** - Pages ↔ Tasks ↔ Skills
✅ **Persistent Storage** - Everything in Supabase
✅ **Clean UI** - Round progress, minimal colors
✅ **Scalable** - Efficient batch processing

**Result: A true Living Intelligence OS!** 🚀
