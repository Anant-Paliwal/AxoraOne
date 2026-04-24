---
inclusion: always
---

# Ask Anything Architecture

## Core Principle

**Ask Anything is a CONTROL layer, NOT a UI interaction layer.**

Ask Anything should NEVER render quizzes, flashcards, or mindmaps directly.
It should ONLY create learning objects and return actions.
UI components handle all interaction.

## Architecture Flow

```
User Request → Ask Anything (Intent Detection) → Backend API → Create Objects → Return Actions → UI Components
```

## Intent Handling

When user asks:
- "Create a quiz from this page"
- "Create flashcards for SQL"
- "Create a mindmap for Data Analytics"

**DO NOT** return text content or render UI.

**INSTEAD:**
1. Detect intent = BUILD
2. Call backend `/ai/build`
3. Create learning objects in database
4. Return object IDs + navigation actions

## Backend Response Formats (MANDATORY)

### Quiz Creation
```json
{
  "type": "quiz_created",
  "quiz_id": "quiz_123",
  "title": "SQL Basics Quiz",
  "source_page_id": "page_sql_basics",
  "linked_skill": "Data Analytics",
  "actions": [
    {
      "label": "Start Quiz",
      "route": "/quiz/quiz_123"
    }
  ]
}
```

### Flashcards Creation
```json
{
  "type": "flashcards_created",
  "deck_id": "deck_45",
  "title": "SQL Revision Flashcards",
  "actions": [
    {
      "label": "Review Flashcards",
      "route": "/flashcards/deck_45"
    }
  ]
}
```

### Mindmap
Mindmap is NOT a new object. It is a filtered view of the Knowledge Graph.

```json
{
  "type": "mindmap_ready",
  "actions": [
    {
      "label": "View Mindmap",
      "route": "/graph?mode=mindmap&skill=data_analytics"
    }
  ]
}
```

## Frontend Behavior

### Ask Anything UI displays:
- Confirmation message
- Action buttons ONLY

### When user clicks action button:
- Navigate to route
- Render correct component

## Component Responsibilities

### QuizCard.tsx
- Fetch quiz by quiz_id
- Render interactive questions
- Handle submit
- Save score
- Update skill + knowledge graph

### FlashcardDeck.tsx
- Fetch deck by deck_id
- Flip cards
- Known / Unknown tracking
- Track progress
- Update skill confidence

### MindMap.tsx
- Render knowledge graph
- Apply mindmap layout
- Filter by page or skill
- **NO object creation**

## Object Visibility

After creation, objects MUST appear in:
1. **Page screen** (Learning Tools section)
2. **Skill detail screen**
3. **Tasks page** (auto-created task)
4. **Knowledge Graph**

## Key Rules

1. ✅ Ask Anything creates objects
2. ✅ Ask Anything returns actions
3. ❌ Ask Anything does NOT render interactive UI
4. ✅ Components fetch and render objects
5. ✅ All objects are workspace-scoped
6. ✅ All objects are linked to skills/pages
