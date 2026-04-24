# Ask vs Agent Mode - Clear Separation

## The Problem (Fixed)

Previously, "Ask" mode was creating pages, skills, and tasks when users asked questions like:
- "How do I create a page about SQL?"
- "What's the best way to track my Python skills?"

This was wrong because the user was **asking a question**, not **requesting action**.

## The Solution

### Mode Responsibilities

| Mode | Purpose | Creates Objects? | Example Queries |
|------|---------|------------------|-----------------|
| **Ask** | Answer questions, provide guidance | ❌ NO | "What is SQL?", "How do I learn Python?", "Explain databases" |
| **Agent** | Execute actions, create content | ✅ YES | "Create a page about SQL", "Add a Python skill", "Build a learning path" |
| **Plan** | Create learning plans | ⚠️ ONLY TASKS | "Plan my SQL learning journey" |

## How It Works Now

### Ask Mode (Default)
```
User: "How do I create a page about SQL?"
Intent Detected: ASK (question)
Action: Provide guidance text
Result: ❌ NO page created
Response: "To create a page about SQL, click the + button..."
```

### Agent Mode
```
User: "Create a page about SQL"
Intent Detected: CREATE
Action: Call smart_builder.build()
Result: ✅ Page created
Response: "I've created a page about SQL. [View Page]"
```

## Code Changes

### 1. Mode Check in enhanced_ai_agent.py

**Before:**
```python
if mode == "build" or intent.intent_type in [IntentType.CREATE, ...]:
    build_result = await smart_builder.build(...)
```

**After:**
```python
if mode in ["agent"] and intent.intent_type in [IntentType.CREATE, ...]:
    build_result = await smart_builder.build(...)
```

### 2. System Prompts Updated

**Ask Mode:**
- "NEVER create pages, skills, tasks, or any objects"
- "Provide guidance on HOW to do things, not DO them"
- "If user wants to create something, suggest they switch to AGENT mode"

**Agent Mode:**
- "You have FULL CONTROL to create, update, and delete workspace content"
- "Create pages, skills, tasks, quizzes, flashcards as needed"
- "Return structured actions for the UI to navigate to created objects"

## Frontend Integration

The Ask Anything page now has:

1. **Three modes**: Ask 🔍 | Agent 🤖 | Plan 📋
2. **No separate Build mode** - Agent mode handles all creation
3. **Clear mode descriptions** shown in the UI

Example UI:
```
[Ask 🔍] [Agent 🤖] [Plan 📋]

User: "How do I create a page about SQL?"
Response: "To create a page, you can:
1. Click the + button in the sidebar
2. Or switch to Agent mode and ask me to create it for you"

[Switch to Agent Mode]
```

## Benefits

✅ **Clear separation of concerns**
- Ask = Read-only, informational
- Agent = Read-write, action-oriented

✅ **No accidental object creation**
- Users asking questions won't trigger unwanted page/skill creation

✅ **Better user control**
- Users explicitly choose when to let AI create content

✅ **Follows architecture principles**
- Ask Anything is a control layer
- Objects are created intentionally, not accidentally

✅ **No duplicate floating widget**
- Single Ask Anything page with mode selector
- No confusion between "Build" and "Agent"

## Testing

### Test Ask Mode (Should NOT create)
```bash
POST /ai/query/enhanced
{
  "query": "How do I create a page about SQL?",
  "mode": "ask",
  "workspace_id": "..."
}

Expected: Text response only, no objects created
```

### Test Agent Mode (Should create)
```bash
POST /ai/query/agent
{
  "query": "Create a page about SQL",
  "mode": "agent",
  "workspace_id": "..."
}

Expected: Page created + action buttons returned
```

## Migration Notes

If you have existing code that relies on "build" mode:
1. Replace all "build" references with "agent"
2. Update frontend mode selectors
3. Update API endpoint calls

## Summary

**Ask mode** = Information only, no object creation
**Agent mode** = Full CRUD control, creates what user requests
**Plan mode** = Creates learning plans with tasks

This matches the architecture principle: Ask Anything is a control layer that creates objects and returns actions, but only when the user explicitly requests it in Agent mode.
