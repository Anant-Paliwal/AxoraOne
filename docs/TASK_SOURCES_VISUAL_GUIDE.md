# Task Sources - Visual Guide

## 🎨 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FloatingAskAnything.tsx          AskAnything.tsx              │
│  ┌─────────────────┐              ┌─────────────────┐          │
│  │ Sources:        │              │ Sources:        │          │
│  │ ☑ Web           │              │ ☑ Web           │          │
│  │ ☑ Pages         │              │ ☑ Pages         │          │
│  │ ☑ Skills        │              │ ☑ Skills        │          │
│  │ ☑ Tasks  ← NEW  │              │ ☑ Tasks  ← NEW  │          │
│  │ ☑ Graph         │              │ ☑ Graph         │          │
│  │ ☑ KB            │              │ ☑ KB            │          │
│  └─────────────────┘              └─────────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVICES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  enhanced_ai_agent.py                                          │
│  ┌───────────────────────────────────────────────────────┐    │
│  │ process_query()                                        │    │
│  │   ↓                                                    │    │
│  │ _build_user_message()  ← Includes task sources        │    │
│  │   ↓                                                    │    │
│  │ _extract_sources()     ← Extracts tasks + linked      │    │
│  └───────────────────────────────────────────────────────┘    │
│                              ↓                                  │
│  context_gatherer.py                                           │
│  ┌───────────────────────────────────────────────────────┐    │
│  │ gather_context()                                       │    │
│  │   ↓                                                    │    │
│  │ _get_relevant_tasks()  ← Fetches with Supabase joins  │    │
│  │   ↓                                                    │    │
│  │ _get_mentioned_items_data() ← Fetches task sources    │    │
│  └───────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         DATABASE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐         ┌──────────┐         ┌──────────┐       │
│  │  tasks   │────────→│  pages   │         │  skills  │       │
│  │          │         │          │         │          │       │
│  │ id       │         │ id       │         │ id       │       │
│  │ title    │         │ title    │         │ name     │       │
│  │ status   │         │ content  │         │ level    │       │
│  │ linked_  │         │          │         │          │       │
│  │ page_id ─┘         └──────────┘         └──────────┘       │
│  │ linked_  │                                     ↑            │
│  │ skill_id ─────────────────────────────────────┘            │
│  └──────────┘                                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: User Query                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
        "What tasks do I have for SQL?"
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Context Gathering                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Supabase Query:                                               │
│  SELECT tasks.*,                                               │
│         linked_page:pages(id, title, content),                 │
│         linked_skill:skills(id, name, description)             │
│  WHERE workspace_id = ? AND user_id = ?                        │
│                                                                 │
│  Results:                                                      │
│  ┌─────────────────────────────────────────────────────┐      │
│  │ Task: "Complete SQL Tutorial"                       │      │
│  │   ├─ linked_page: {                                 │      │
│  │   │    id: "page-123",                              │      │
│  │   │    title: "SQL Basics Guide",                   │      │
│  │   │    content: "SQL is a language for..."          │      │
│  │   │  }                                               │      │
│  │   └─ linked_skill: {                                │      │
│  │        id: "skill-456",                             │      │
│  │        name: "Database Management",                 │      │
│  │        description: "Working with databases"        │      │
│  │      }                                               │      │
│  └─────────────────────────────────────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Relevance Scoring                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Base Score (task title/description):        0.8               │
│  + Linked Page Score (50% weight):          +0.4               │
│  + Linked Skill Score (30% weight):         +0.2               │
│  ─────────────────────────────────────────────────             │
│  Total Relevance Score:                       1.4 (capped 1.0) │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: AI Processing                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Context Message to AI:                                        │
│  ┌─────────────────────────────────────────────────────┐      │
│  │ User Query: "What tasks do I have for SQL?"         │      │
│  │                                                      │      │
│  │ [Related Tasks:]                                     │      │
│  │ - Complete SQL Tutorial (pending)                    │      │
│  │   [from: SQL Basics Guide]                          │      │
│  │   [skill: Database Management]                      │      │
│  │                                                      │      │
│  │ [Page Content Available:]                           │      │
│  │ SQL Basics Guide: "SQL is a language for..."        │      │
│  └─────────────────────────────────────────────────────┘      │
│                                                                 │
│  AI generates response using full context                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: Source Extraction                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Sources Array:                                                │
│  [                                                             │
│    {                                                           │
│      type: "task",                                            │
│      id: "task-789",                                          │
│      title: "Complete SQL Tutorial",                          │
│      source: "workspace"                                      │
│    },                                                          │
│    {                                                           │
│      type: "page",                                            │
│      id: "page-123",                                          │
│      title: "SQL Basics Guide",                               │
│      source: "workspace",                                     │
│      linked_from: "task"  ← Marker for visual distinction     │
│    },                                                          │
│    {                                                           │
│      type: "skill",                                           │
│      id: "skill-456",                                         │
│      title: "Database Management",                            │
│      source: "workspace",                                     │
│      linked_from: "task"  ← Marker for visual distinction     │
│    }                                                           │
│  ]                                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: Frontend Display                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐      │
│  │ AI Response:                                         │      │
│  │ "You have 1 SQL task: Complete SQL Tutorial.        │      │
│  │  This task is linked to your SQL Basics Guide       │      │
│  │  page and will develop your Database Management     │      │
│  │  skill. I recommend starting with..."               │      │
│  └─────────────────────────────────────────────────────┘      │
│                                                                 │
│  Sources:                                                      │
│  ┌─────────────────────────────────────────────────────┐      │
│  │ 📋 Complete SQL Tutorial                            │      │
│  │    task                                              │      │
│  └─────────────────────────────────────────────────────┘      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐      │
│  │ 📄 SQL Basics Guide                    ← Highlighted│      │
│  │    page → from task                                  │      │
│  └─────────────────────────────────────────────────────┘      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐      │
│  │ 🧠 Database Management                 ← Highlighted│      │
│  │    skill → from task                                 │      │
│  └─────────────────────────────────────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 Source Display Comparison

### Before (No Task Sources)
```
┌─────────────────────────────────────┐
│ AI Response about SQL tasks         │
│                                     │
│ "You have a task called Complete    │
│  SQL Tutorial. It's pending."       │
│                                     │
│ Sources: None                       │
└─────────────────────────────────────┘
```

### After (With Task Sources)
```
┌─────────────────────────────────────┐
│ AI Response about SQL tasks         │
│                                     │
│ "You have Complete SQL Tutorial     │
│  task. Based on the linked SQL      │
│  Basics Guide page, I recommend     │
│  starting with SELECT statements... │
│  This will develop your Database    │
│  Management skill."                 │
│                                     │
│ Sources:                            │
│ ┌─────────────────────────────────┐ │
│ │ 📋 Complete SQL Tutorial        │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 📄 SQL Basics Guide             │ │
│ │    → from task                  │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🧠 Database Management          │ │
│ │    → from task                  │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## 🔗 Relationship Diagram

```
                    WORKSPACE
                        │
        ┌───────────────┼───────────────┐
        │               │               │
    ┌───▼───┐      ┌───▼───┐      ┌───▼───┐
    │ Pages │      │ Tasks │      │Skills │
    │       │      │       │      │       │
    │ SQL   │◄─────│ Learn │─────►│ DB    │
    │ Guide │      │ SQL   │      │ Mgmt  │
    └───────┘      └───────┘      └───────┘
        ▲               │               ▲
        │               │               │
        └───────────────┴───────────────┘
              Ask Anything can now
              access all three together!
```

## 📊 Visual Indicators Legend

```
┌─────────────────────────────────────────────────────────┐
│ ICON LEGEND                                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 📋 = Task (ListTodo icon)                              │
│ 📄 = Page (FileText icon)                              │
│ 🧠 = Skill (Brain icon)                                │
│ 🌐 = Web (ExternalLink icon)                           │
│ 🔗 = Graph (GitBranch icon)                            │
│ 📚 = Knowledge Base (Bookmark icon)                    │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ BACKGROUND COLORS                                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Normal Source:                                          │
│ ┌─────────────────────────────────┐                    │
│ │ bg-muted/50                     │ ← Gray background  │
│ └─────────────────────────────────┘                    │
│                                                         │
│ Linked Source (from task):                             │
│ ┌─────────────────────────────────┐                    │
│ │ bg-primary/5                    │ ← Subtle highlight │
│ │ → from task                     │                    │
│ └─────────────────────────────────┘                    │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ INTERACTION STATES                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Default:     border-border                              │
│ Hover:       border-primary/30 + shadow                 │
│ Linked:      border-primary/20 (always visible)         │
│ Linked Hover: border-primary/40                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 🎬 User Journey

```
1. User opens Ask Anything
   ↓
2. Types: "What tasks do I have for SQL?"
   ↓
3. Backend fetches tasks with linked sources
   ↓
4. AI reads task + SQL page content + skill level
   ↓
5. AI generates contextual response
   ↓
6. Frontend displays response with sources
   ↓
7. User sees:
   - Task source (normal)
   - Linked page (highlighted)
   - Linked skill (highlighted)
   ↓
8. User clicks linked page source
   ↓
9. Navigates to SQL Basics Guide page
   ↓
10. User can now read the full tutorial!
```

## 🔍 Code Flow Visualization

```
FloatingAskAnything.tsx
    │
    ├─ handleSearch()
    │   │
    │   └─ api.queryEnhanced(query, mode, workspace_id, mentioned_items)
    │       │
    │       └─ POST /api/ai/query
    │           │
    │           └─ enhanced_ai_agent.process_query()
    │               │
    │               ├─ context_gatherer.gather_context()
    │               │   │
    │               │   └─ _get_relevant_tasks()
    │               │       │
    │               │       └─ supabase.table("tasks").select(
    │               │             "*, linked_page:pages(...), linked_skill:skills(...)"
    │               │           )
    │               │
    │               ├─ _build_user_message()
    │               │   └─ Includes task + linked page + linked skill
    │               │
    │               ├─ LLM generates response
    │               │
    │               └─ _extract_sources()
    │                   └─ Returns [task, page (linked), skill (linked)]
    │
    └─ Display sources with visual indicators
```

## 📱 Responsive Display

```
Desktop View:
┌─────────────────────────────────────────────────────────┐
│ Sources:                                                │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│ │ 📋 Task      │ │ 📄 Page      │ │ 🧠 Skill     │    │
│ │              │ │ → from task  │ │ → from task  │    │
│ └──────────────┘ └──────────────┘ └──────────────┘    │
└─────────────────────────────────────────────────────────┘

Mobile View:
┌─────────────────────┐
│ Sources:            │
│ ┌─────────────────┐ │
│ │ 📋 Task         │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ 📄 Page         │ │
│ │ → from task     │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ 🧠 Skill        │ │
│ │ → from task     │ │
│ └─────────────────┘ │
└─────────────────────┘
```

---

**This visual guide helps understand how task sources work throughout the system!** 🎨
