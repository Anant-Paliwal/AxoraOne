# Human Verification Loop Implementation

## Overview

Implemented the **Perceive → Reason → Plan → Act → Verify** agentic AI loop with human verification for BUILD and PLAN modes in Ask Anything.

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│ AGENTIC AI LOOP WITH HUMAN VERIFICATION                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. PERCEIVE                                               │
│     ├─ Gather context (pages, skills, tasks)              │
│     ├─ Search vectors & web                               │
│     └─ Load conversation history                          │
│                                                             │
│  2. REASON                                                 │
│     ├─ Detect intent (Ask/Plan/Build)                     │
│     ├─ Analyze workspace state                            │
│     └─ Generate response                                  │
│                                                             │
│  3. PLAN                                                   │
│     ├─ Determine actions needed                           │
│     ├─ Extract tasks/pages/skills                         │
│     └─ Generate preview                                   │
│                                                             │
│  ⚠️  HUMAN VERIFICATION (NEW)                              │
│     ├─ Show preview dialog to user                        │
│     ├─ User reviews & selects actions                     │
│     └─ User confirms or cancels                           │
│                                                             │
│  4. ACT                                                    │
│     ├─ Execute confirmed actions only                     │
│     ├─ Create/update/delete items                         │
│     └─ Update knowledge graph                             │
│                                                             │
│  5. VERIFY (NEW)                                           │
│     ├─ Show results to user                               │
│     ├─ Collect feedback (helpful/not)                     │
│     ├─ Offer undo option                                  │
│     └─ Learn from corrections                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## New Components

### Backend

1. **`backend/app/api/endpoints/ai_preview.py`**
   - `POST /ai/actions/preview` - Generate preview without executing
   - `POST /ai/actions/execute` - Execute confirmed actions
   - `POST /ai/actions/undo` - Undo executed actions
   - `POST /ai/actions/feedback` - Record user feedback
   - `GET /ai/actions/preview/{id}` - Get preview by ID

2. **`backend/app/services/ai_agent.py`** (updated)
   - `process_query_preview()` - New method for preview generation
   - `_extract_planned_actions()` - Extract structured actions from AI response

### Frontend

1. **`src/components/ai/ActionPreviewDialog.tsx`**
   - Modal dialog showing pending actions
   - Checkboxes to select/deselect actions
   - Expandable details for each action
   - Confirm/Cancel/Skip buttons

2. **`src/components/ai/ActionFeedback.tsx`**
   - Post-execution feedback UI
   - Thumbs up/down rating
   - Optional comment input
   - Undo all button

3. **`src/hooks/useActionPreview.ts`**
   - Custom hook managing preview state
   - `generatePreview()` - Generate action preview
   - `executeSelectedActions()` - Execute confirmed actions
   - `undoActions()` - Undo executed actions
   - `skipActions()` - Skip without executing
   - `requiresPreview()` - Check if mode needs preview

### API Methods

Added to `src/lib/api.ts`:
- `generateActionPreview()` - Call preview endpoint
- `executeActions()` - Call execute endpoint
- `undoActions()` - Call undo endpoint
- `sendActionFeedback()` - Call feedback endpoint

## User Flow

### BUILD/PLAN Mode (with verification)

1. User enters query in BUILD or PLAN mode
2. AI generates response and extracts planned actions
3. **Preview Dialog** appears showing:
   - AI response summary
   - List of actions to be created (pages, tasks, skills, etc.)
   - Checkboxes to select/deselect each action
   - Expandable details showing full data
4. User reviews and confirms selected actions
5. Actions are executed
6. **Feedback UI** appears showing:
   - Success/failure summary
   - Thumbs up/down rating
   - Undo button

### ASK Mode (no verification needed)

1. User enters query in ASK mode
2. AI generates response
3. Response is displayed immediately (no preview)

## Visual Indicators

- ⚠️ Yellow warning icon on BUILD/PLAN mode buttons
- "Actions pending review" message in AI response
- Color-coded action types (create=green, update=blue, delete=red)

## Database

New table: `ai_action_feedback`
- Stores user feedback for learning
- Tracks which actions were helpful/not helpful
- Enables future AI improvement

## Integration Points

### FloatingAskAnything.tsx
- Uses `useActionPreview` hook
- Shows `ActionPreviewDialog` for BUILD/PLAN
- Shows `ActionFeedback` after execution

### AskAnything.tsx (full page)
- Same integration pattern
- Larger preview dialog for desktop

## Key Benefits

1. **Safety** - Users review before changes are made
2. **Trust** - Users see exactly what will happen
3. **Control** - Users can select/deselect individual actions
4. **Reversibility** - Undo option if something goes wrong
5. **Learning** - Feedback helps improve AI over time

## Migration

Run the SQL migration to create the feedback table:
```sql
-- Run in Supabase SQL Editor
\i backend/migrations/add_ai_action_feedback.sql
```

## Testing

1. Open Ask Anything (floating or full page)
2. Switch to BUILD mode
3. Enter: "Create a page about Python basics"
4. Preview dialog should appear
5. Review and confirm actions
6. Verify page was created
7. Test undo functionality
8. Test feedback submission
