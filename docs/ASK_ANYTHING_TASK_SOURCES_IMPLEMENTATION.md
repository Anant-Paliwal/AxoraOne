# Ask Anything - Task Sources Implementation

## Overview

Ask Anything can now access tasks and their linked sources (pages and skills), providing richer context for AI responses. When a task is mentioned or found relevant, the system automatically includes the content from its linked page and skill.

## What Changed

### 1. Frontend Updates

#### FloatingAskAnything.tsx
- Added "Tasks" to available sources list
- Updated `enabledSources` to include 'tasks' by default
- Enhanced source display to show task sources with visual indicators
- Added icons for tasks (ListTodo) and skills (Brain)
- Sources linked from tasks show with a subtle highlight and "→ from task" indicator

#### AskAnything.tsx (Main Page)
- Added "Tasks" to available sources list
- Updated `enabledSources` to include 'tasks' by default
- Enhanced source display with task/skill icons
- Updated `handleSourceClick` to navigate to tasks and skills pages
- Visual distinction for sources linked from tasks

### 2. Backend Updates

#### context_gatherer.py
**Enhanced `_get_relevant_tasks()` method:**
- Now fetches tasks WITH their linked page and skill data using Supabase joins
- Query includes: `linked_page:pages!tasks_linked_page_id_fkey(id, title, content)`
- Query includes: `linked_skill:skills!tasks_linked_skill_id_fkey(id, name, description)`
- Relevance scoring now considers linked content (50% weight for pages, 30% for skills)
- Tasks with relevant linked content rank higher in results

**Enhanced `_get_mentioned_items_data()` method:**
- When a task is @mentioned, automatically fetches its linked sources
- Includes full page content and skill details for context

#### enhanced_ai_agent.py
**Enhanced `_build_user_message()` method:**
- Shows task information with linked sources in context
- Format: "Task 'X' (Status: Y) → Linked to page: Z → Linked to skill: W"
- Adds relevant tasks section showing linked content

**Enhanced `_extract_sources()` method:**
- Extracts sources from tasks and their linked content
- Marks sources with `linked_from: "task"` for visual distinction
- Prevents duplicate sources in the list
- Includes up to 5 relevant tasks and their linked sources

## Database Structure

Tasks table has these linking columns:
```sql
linked_page_id UUID REFERENCES pages(id) ON DELETE SET NULL
linked_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL
```

## How It Works

### Example Flow

1. **User asks:** "What tasks do I have for SQL?"

2. **Context Gatherer:**
   - Searches tasks matching "SQL" keyword
   - Finds task: "Complete SQL Tutorial"
   - Task is linked to page: "SQL Basics Guide"
   - Task is linked to skill: "Database Management"
   - Fetches all three items with full content

3. **AI Agent:**
   - Receives task + linked page content + linked skill info
   - Generates response using all context
   - Returns sources: [Task, Page (from task), Skill (from task)]

4. **Frontend Display:**
   - Shows task as a source with ListTodo icon
   - Shows linked page with FileText icon + "→ from task" indicator
   - Shows linked skill with Brain icon + "→ from task" indicator
   - Linked sources have subtle highlight (primary/5 background)

## Benefits

### 1. Richer Context
- AI has access to full page content when discussing tasks
- Can reference learning materials linked to tasks
- Understands skill relationships with tasks

### 2. Better Answers
- "What's my task about SQL?" → AI can read the linked SQL page
- "Help me with this task" → AI knows the skill level and content
- "What should I learn for this task?" → AI sees linked skill requirements

### 3. Improved Navigation
- Click on task source → Navigate to tasks page
- Click on linked page → Navigate directly to that page
- Click on linked skill → Navigate to skills page
- Visual indicators show content relationships

### 4. Workspace Intelligence
- Tasks become knowledge connectors
- Learning materials (pages) linked to action items (tasks)
- Skills tracked through task completion
- Knowledge graph automatically includes these relationships

## Architecture Compliance

✅ **Follows Ask Anything Architecture:**
- Ask Anything remains a CONTROL layer
- Does NOT render task UI directly
- Returns task data as sources
- UI components handle task display
- Tasks link to pages/skills (learning objects)

✅ **Object Linking:**
- Tasks properly linked to pages (source_page_id pattern)
- Tasks properly linked to skills (linked_skill_id pattern)
- Follows same pattern as quizzes and flashcards

## Visual Indicators

### Source Display
```
┌─────────────────────────────────────┐
│ 📋 Complete SQL Tutorial            │  ← Task (normal background)
│    task                              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 📄 SQL Basics Guide                 │  ← Linked Page (highlighted)
│    page → from task                  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🧠 Database Management              │  ← Linked Skill (highlighted)
│    skill → from task                 │
└─────────────────────────────────────┘
```

## Testing

### Test Scenarios

1. **Mention a task with linked page:**
   - Type: "@Complete SQL Tutorial"
   - Expected: AI response includes SQL page content
   - Sources show: Task + Linked Page

2. **Ask about tasks for a topic:**
   - Query: "What tasks do I have for Python?"
   - Expected: Finds tasks with "Python" in title/description OR linked pages
   - Sources show relevant tasks and their linked content

3. **Task with both page and skill:**
   - Query: "@Learn React Hooks"
   - Expected: AI has access to React page content AND skill level
   - Sources show: Task + Page + Skill

4. **Navigate from sources:**
   - Click task source → Goes to /tasks
   - Click linked page → Goes to /pages/{id}
   - Click linked skill → Goes to /skills

## Future Enhancements

### Potential Improvements
1. Show task status in source display (pending/completed)
2. Show task priority with color coding
3. Add task due date in source tooltip
4. Filter tasks by status in source selection
5. Show task progress percentage
6. Link tasks to quizzes/flashcards
7. Auto-suggest tasks when viewing related pages

### Advanced Features
1. Task chains: "What tasks depend on this one?"
2. Learning paths: "What should I complete first?"
3. Skill gaps: "What tasks will improve my weak skills?"
4. Smart scheduling: "When should I do this task?"

## Summary

Ask Anything now provides comprehensive task context by accessing linked pages and skills. This creates a more intelligent assistant that understands the full context of your work, not just isolated task titles. The implementation follows the existing architecture patterns and enhances the knowledge graph connectivity.

**Key Achievement:** Tasks are no longer isolated action items—they're now knowledge connectors that link learning materials (pages) with skill development (skills) and action items (tasks).
