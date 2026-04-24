# Learning Memory Usage Guide - Complete Explanation

## 📊 Database Table: `learning_memory`

### Table Schema
```sql
CREATE TABLE learning_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    topic TEXT NOT NULL,
    confidence DECIMAL(3,2) DEFAULT 0.5,
    error_count INTEGER DEFAULT 0,
    last_reviewed TIMESTAMP DEFAULT NOW(),
    last_attempt TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, workspace_id, topic)
);
```

### What It Stores
- **topic**: What the user asked about, planned, or built
- **confidence**: How well the user knows this topic (0.0 to 1.0)
- **error_count**: Number of mistakes in quizzes/flashcards
- **last_reviewed**: When this topic was last accessed
- **workspace_id**: Workspace isolation

---

## 🎯 How Each Mode Uses Learning Memory

### 1. ASK Mode 📚

**When:** After generating a response
**What:** Stores the user's question/query
**Why:** Track what users ask about to identify knowledge gaps

**Code Location:** `backend/app/services/ai_agent.py` (Line ~680)

```python
# In _generate_response method, after response is generated:
if mode == "ask" and workspace_id:
    supabase_admin.table("learning_memory").upsert({
        "user_id": state["user_id"],
        "workspace_id": workspace_id,
        "topic": state["query"][:100],  # Truncate long queries
        "confidence": 0.5,  # Neutral confidence for questions
        "last_reviewed": "now()"
    }, on_conflict="user_id,workspace_id,topic").execute()
```

**Example:**
```
User asks: "What is SQL?"
Stored in learning_memory:
- topic: "What is SQL?"
- confidence: 0.5 (neutral - just asking)
- workspace_id: current workspace
```

**Access Pattern:**
```sql
-- See what user has been asking about
SELECT topic, last_reviewed 
FROM learning_memory 
WHERE user_id = 'user-id' 
  AND workspace_id = 'workspace-id'
  AND confidence = 0.5
ORDER BY last_reviewed DESC;
```

---

### 2. PLAN Mode 📋

**When:** After generating a plan
**What:** Stores the plan topic/goal
**Why:** Track user's learning goals and planning activity

**Code Location:** `backend/app/services/ai_agent.py` (Line ~695)

```python
# In _generate_response method, after plan is generated:
if mode == "plan" and workspace_id:
    supabase_admin.table("learning_memory").upsert({
        "user_id": state["user_id"],
        "workspace_id": workspace_id,
        "topic": f"Plan: {state['query'][:100]}",
        "confidence": 0.7,  # Higher confidence for plans
        "last_reviewed": "now()"
    }, on_conflict="user_id,workspace_id,topic").execute()
```

**Example:**
```
User plans: "Plan to learn Python in 30 days"
Stored in learning_memory:
- topic: "Plan: Plan to learn Python in 30 days"
- confidence: 0.7 (higher - user is committed)
- workspace_id: current workspace
```

**Access Pattern:**
```sql
-- See user's plans
SELECT topic, confidence, last_reviewed 
FROM learning_memory 
WHERE user_id = 'user-id' 
  AND workspace_id = 'workspace-id'
  AND topic LIKE 'Plan:%'
ORDER BY last_reviewed DESC;
```

---

### 3. BUILD Mode 🔨

**When:** After creating learning objects (quizzes/flashcards)
**What:** Stores what was built and tracks performance
**Why:** Track what user has studied and identify weak areas

**Code Location:** `backend/app/services/memory_service.py`

**BUILD mode uses the MemoryService class:**

```python
# When quiz is completed:
await memory_service.record_quiz_attempt(
    user_id=user_id,
    workspace_id=workspace_id,
    topic="Python Basics",
    score=0.8,  # 80% correct
    errors=["loops", "functions"]  # Topics with mistakes
)

# When flashcards are reviewed:
await memory_service.record_flashcard_review(
    user_id=user_id,
    workspace_id=workspace_id,
    topic="SQL Commands",
    known_count=15,
    unknown_count=5
)
```

**Example:**
```
User takes quiz on "Python Basics" and scores 80%
Stored in learning_memory:
- topic: "Python Basics"
- confidence: 0.8 (based on score)
- error_count: 2 (number of wrong answers)
- last_attempt: timestamp
```

**Access Pattern:**
```sql
-- See weak areas (topics with low confidence or high errors)
SELECT topic, confidence, error_count, last_attempt
FROM learning_memory 
WHERE user_id = 'user-id' 
  AND workspace_id = 'workspace-id'
  AND (confidence < 0.6 OR error_count > 3)
ORDER BY error_count DESC, confidence ASC;
```

---

## 🔄 How Memory is Retrieved and Used

### 1. Weak Areas Detection

**Code Location:** `backend/app/services/ai_agent.py` (Line ~150)

```python
# In _retrieve_workspace_context method:
weak_areas = []
if workspace_id:
    from app.services.memory_service import MemoryService
    memory_service = MemoryService(supabase_admin)
    weak_areas = await memory_service.get_weak_areas(user_id, workspace_id)

state["workspace_context"]["weak_areas"] = weak_areas
```

**What get_weak_areas returns:**
```python
[
    {
        "topic": "Python loops",
        "confidence": 0.4,
        "error_count": 5,
        "last_attempt": "2024-12-23T10:30:00"
    },
    {
        "topic": "SQL joins",
        "confidence": 0.5,
        "error_count": 3,
        "last_attempt": "2024-12-22T15:20:00"
    }
]
```

### 2. Used in AI Response Generation

**Code Location:** `backend/app/services/ai_agent.py` (Line ~600)

```python
# In _build_workspace_summary method:
if weak_areas:
    summary_parts.append("=== ⚠️ TOPICS NEEDING REVIEW ===")
    summary_parts.append("These topics have shown difficulty:")
    for area in weak_areas[:5]:
        topic = area.get("topic", "Unknown")
        error_count = area.get("error_count", 0)
        summary_parts.append(f"  ❌ {topic} (errors: {error_count})")
    summary_parts.append("💡 Consider creating review materials.")
```

**AI sees this in context:**
```
=== ⚠️ TOPICS NEEDING REVIEW ===
These topics have shown difficulty:
  ❌ Python loops (errors: 5)
  ❌ SQL joins (errors: 3)
💡 Consider creating review materials.
```

**AI can then:**
- Suggest reviewing weak topics
- Create targeted quizzes for weak areas
- Recommend specific pages to study
- Adjust difficulty based on confidence

---

## 📊 Complete Memory Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERACTION                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    ASK ANYTHING MODES                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ASK Mode                                                   │
│  ├─ User asks: "What is SQL?"                              │
│  ├─ AI answers                                             │
│  └─ SAVE → learning_memory                                 │
│      ├─ topic: "What is SQL?"                              │
│      ├─ confidence: 0.5                                    │
│      └─ last_reviewed: now()                               │
│                                                             │
│  PLAN Mode                                                  │
│  ├─ User plans: "Learn Python in 30 days"                 │
│  ├─ AI creates plan + tasks                               │
│  └─ SAVE → learning_memory                                 │
│      ├─ topic: "Plan: Learn Python in 30 days"            │
│      ├─ confidence: 0.7                                    │
│      └─ last_reviewed: now()                               │
│                                                             │
│  BUILD Mode                                                 │
│  ├─ User builds: "Create quiz on Python"                  │
│  ├─ AI creates quiz                                        │
│  └─ SAVE → learning_memory (via MemoryService)            │
│      ├─ topic: "Python Basics"                            │
│      ├─ confidence: 0.5 (initial)                         │
│      └─ last_reviewed: now()                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  USER TAKES QUIZ/REVIEWS                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Quiz Completed                                             │
│  ├─ Score: 80% (8/10 correct)                             │
│  ├─ Errors on: "loops", "functions"                       │
│  └─ UPDATE → learning_memory                               │
│      ├─ topic: "Python Basics"                            │
│      ├─ confidence: 0.8 (based on score)                  │
│      ├─ error_count: 2                                    │
│      └─ last_attempt: now()                                │
│                                                             │
│  Flashcards Reviewed                                        │
│  ├─ Known: 15 cards                                        │
│  ├─ Unknown: 5 cards                                       │
│  └─ UPDATE → learning_memory                               │
│      ├─ topic: "SQL Commands"                             │
│      ├─ confidence: 0.75 (15/20)                          │
│      └─ last_reviewed: now()                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              MEMORY RETRIEVAL (Next Session)                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  When user asks new question:                               │
│  ├─ LOAD weak_areas from learning_memory                   │
│  ├─ AI sees:                                               │
│  │   ├─ "Python loops" (confidence: 0.4, errors: 5)       │
│  │   └─ "SQL joins" (confidence: 0.5, errors: 3)          │
│  └─ AI suggests:                                           │
│      ├─ "Review Python loops"                              │
│      ├─ "Create practice quiz for loops"                   │
│      └─ "Study SQL joins page"                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Tables Used by Each Mode

### ASK Mode
**Writes to:**
- ✅ `learning_memory` (stores queries)
- ✅ `chat_messages` (stores conversation)

**Reads from:**
- ✅ `pages` (workspace content)
- ✅ `skills` (user skills)
- ✅ `tasks` (user tasks)
- ✅ `learning_memory` (weak areas)

### PLAN Mode
**Writes to:**
- ✅ `learning_memory` (stores plans)
- ✅ `tasks` (creates tasks from plan) ← **NEW!**
- ✅ `chat_messages` (stores conversation)

**Reads from:**
- ✅ `pages` (workspace content)
- ✅ `skills` (user skills)
- ✅ `tasks` (existing tasks for duplicate detection)
- ✅ `learning_memory` (weak areas)

### BUILD Mode
**Writes to:**
- ✅ `pages` (creates pages)
- ✅ `skills` (creates skills)
- ✅ `tasks` (creates tasks)
- ✅ `quizzes` (creates quizzes)
- ✅ `flashcard_decks` (creates flashcard decks)
- ✅ `learning_memory` (via MemoryService when quiz/flashcards used)
- ✅ `chat_messages` (stores conversation)

**Reads from:**
- ✅ `pages` (for duplicate detection)
- ✅ `skills` (for duplicate detection)
- ✅ `tasks` (for duplicate detection)
- ✅ `learning_memory` (weak areas)

---

## ❓ Your Questions Answered

### Q1: "How is learning memory used in all modes?"

**Answer:**
- **ASK Mode:** Stores what you ask about (queries)
- **PLAN Mode:** Stores what you plan to learn (goals)
- **BUILD Mode:** Stores what you build and how well you perform (quiz scores, flashcard reviews)

All modes READ from learning_memory to see weak areas and provide better suggestions.

### Q2: "Which table is used?"

**Answer:** `learning_memory` table in Supabase

**Schema:**
```sql
learning_memory (
    id,
    user_id,
    workspace_id,
    topic,           -- What was learned/asked/planned
    confidence,      -- How well user knows it (0.0 to 1.0)
    error_count,     -- Number of mistakes
    last_reviewed,   -- When last accessed
    last_attempt,    -- When last quiz/flashcard attempt
    created_at
)
```

### Q3: "If PLAN mode creates tasks and BUILD mode also creates tasks, is this a problem?"

**Answer:** ✅ **NO PROBLEM!** This is intentional and good design.

**Why both modes create tasks:**

**PLAN Mode Tasks:**
- Purpose: Break down a goal into actionable steps
- Example: "Plan to learn Python" → Creates tasks like:
  - "Learn Python basics"
  - "Practice data structures"
  - "Build a project"
- Use case: Planning and goal setting

**BUILD Mode Tasks:**
- Purpose: Create specific learning tasks alongside content
- Example: "Build a Python course" → Creates:
  - Pages (course content)
  - Skills (Python skill)
  - Tasks (practice exercises)
  - Quizzes (assessments)
- Use case: Content creation with tasks

**They serve different purposes:**
```
PLAN Mode:  Goal → Tasks (planning)
BUILD Mode: Content → Tasks (execution)
```

**Example Workflow:**
```
1. PLAN: "Plan to learn Python in 30 days"
   → Creates 10 planning tasks (milestones)

2. BUILD: "Create a Python basics course"
   → Creates pages + 5 practice tasks (exercises)

Result: 15 total tasks
- 10 from PLAN (milestones)
- 5 from BUILD (exercises)
```

**Duplicate Detection Prevents Issues:**
Both modes have duplicate detection, so if you create the same task twice, it will be skipped.

---

## 🔍 How to Access Learning Memory

### Via SQL (Direct Database Access)
```sql
-- See all learning memory for a user
SELECT * FROM learning_memory 
WHERE user_id = 'your-user-id' 
  AND workspace_id = 'your-workspace-id'
ORDER BY last_reviewed DESC;

-- See weak areas only
SELECT topic, confidence, error_count 
FROM learning_memory 
WHERE user_id = 'your-user-id' 
  AND workspace_id = 'your-workspace-id'
  AND (confidence < 0.6 OR error_count > 2)
ORDER BY confidence ASC;

-- See what user asked about (ASK mode)
SELECT topic, last_reviewed 
FROM learning_memory 
WHERE user_id = 'your-user-id' 
  AND workspace_id = 'your-workspace-id'
  AND confidence = 0.5
ORDER BY last_reviewed DESC;

-- See user's plans (PLAN mode)
SELECT topic, confidence, last_reviewed 
FROM learning_memory 
WHERE user_id = 'your-user-id' 
  AND workspace_id = 'your-workspace-id'
  AND topic LIKE 'Plan:%'
ORDER BY last_reviewed DESC;
```

### Via Python (MemoryService)
```python
from app.services.memory_service import MemoryService

memory_service = MemoryService(supabase_admin)

# Get weak areas
weak_areas = await memory_service.get_weak_areas(user_id, workspace_id)

# Record quiz attempt
await memory_service.record_quiz_attempt(
    user_id=user_id,
    workspace_id=workspace_id,
    topic="Python Basics",
    score=0.8,
    errors=["loops"]
)

# Record flashcard review
await memory_service.record_flashcard_review(
    user_id=user_id,
    workspace_id=workspace_id,
    topic="SQL Commands",
    known_count=15,
    unknown_count=5
)
```

### Via API (Future Enhancement)
```javascript
// Get learning memory
const memory = await api.getLearningMemory(workspaceId);

// Get weak areas
const weakAreas = await api.getWeakAreas(workspaceId);
```

---

## 📈 Memory Confidence Levels

| Confidence | Meaning | Source |
|-----------|---------|--------|
| 0.0 - 0.3 | Very weak | Multiple quiz failures |
| 0.4 - 0.5 | Weak / Neutral | Just asked about, no assessment |
| 0.6 - 0.7 | Moderate | Planned to learn, some practice |
| 0.8 - 0.9 | Strong | Good quiz scores |
| 1.0 | Mastered | Perfect quiz scores, no errors |

---

## ✅ Summary

### Learning Memory Usage
- **ASK Mode:** ✅ Stores queries (confidence: 0.5)
- **PLAN Mode:** ✅ Stores plans (confidence: 0.7)
- **BUILD Mode:** ✅ Stores performance (confidence: based on scores)

### Database Table
- **Table:** `learning_memory`
- **Columns:** user_id, workspace_id, topic, confidence, error_count, last_reviewed

### Task Creation
- **PLAN Mode:** ✅ Creates planning tasks (milestones)
- **BUILD Mode:** ✅ Creates practice tasks (exercises)
- **No Conflict:** Different purposes, duplicate detection prevents issues

### Access Methods
- ✅ Direct SQL queries
- ✅ MemoryService Python class
- ✅ Retrieved automatically in AI context

**Your system now has complete learning memory tracking across all modes!** 🎉
