# Build Mode Fix

## Issues Fixed

### 1. Task Priority Constraint Violation
**Problem:** Tasks were failing to create with error:
```
new row for relation "tasks" violates check constraint "tasks_priority_check"
```

**Root Cause:** The AI was generating task priorities as "High", "Medium", "Low" (capitalized), but the database constraint requires lowercase values: "low", "medium", "high".

**Solution:**
- Added `.lower()` conversion for all task priorities
- Added validation to ensure priority is one of: "low", "medium", "high"
- Defaults to "medium" if invalid value provided
- Updated AI prompt to explicitly request lowercase priorities
- Updated extraction prompt to emphasize lowercase requirement

### 2. Build Mode Workspace Requirement
**Problem:** Build mode was creating content without a workspace context, which could lead to disorganized content.

**Root Cause:** The system allowed BUILD mode to execute even when no workspace was mentioned with @.

**Solution:**
- Added workspace_id check in `_execute_actions`
- Build mode now ONLY creates content when a workspace is specified via @ mention
- If no workspace is mentioned, shows helpful message:
  ```
  ⚠️ Note: To create content in Build mode, please mention a workspace using @ 
  (e.g., @MyWorkspace). This ensures content is organized properly.
  ```
- Updated system prompt to inform AI about workspace requirement

## Changes Made

### File: `backend/app/services/ai_agent.py`

#### 1. Task Creation with Lowercase Priority
```python
# Ensure priority is lowercase
priority = task_data.get("priority", "medium").lower()
if priority not in ["low", "medium", "high"]:
    priority = "medium"

task_response = supabase_admin.table("tasks").insert({
    "user_id": user_id,
    "title": task_data.get("title", "Untitled Task"),
    "priority": priority,  # Now guaranteed to be lowercase
    "status": task_data.get("status", "todo")
}).execute()
```

#### 2. Workspace Requirement Check
```python
async def _execute_actions(self, state: AgentState) -> AgentState:
    mode = state.get("mode", "ask")
    workspace_id = state.get("workspace_id")
    
    # Only BUILD mode can create content
    if mode != "build":
        return state
    
    # ONLY if workspace is specified
    if not workspace_id:
        state["response"] += "\n\n⚠️ **Note:** To create content in Build mode, please mention a workspace using @ (e.g., @MyWorkspace)."
        return state
    
    # Continue with content creation...
```

#### 3. Updated System Prompt
```python
"build": """You are an AI assistant that helps build and create workspace content.

IMPORTANT: The user MUST mention a workspace using @ (e.g., @DataEngineering) for content to be created.
If no workspace is mentioned, remind them to specify one.

For tasks: Include title, priority (MUST be lowercase: low/medium/high), and any relevant details
```

#### 4. Updated Extraction Prompt
```python
extraction_prompt = f"""...
IMPORTANT: 
- Task priority MUST be lowercase: "low", "medium", or "high" (not "Low", "Medium", "High")
- Only include items that should actually be created
```

## How It Works Now

### Build Mode Workflow

1. **User asks in Build mode** (e.g., "Build a learning plan for SQL")
   - Without @ mention → Shows warning, no content created
   - With @ mention (e.g., "@DataEngineering Build a learning plan") → Creates content

2. **AI generates response** with structured content

3. **System extracts JSON** with pages, skills, tasks

4. **Validation happens:**
   - Task priorities converted to lowercase
   - Invalid priorities default to "medium"
   - Workspace ID must be present

5. **Content created** in specified workspace

6. **Summary shown:**
   ```
   ✅ Created 2 page(s)
   ✅ Created 3 skill(s)
   ✅ Created 5 task(s)
   ```

## Testing

### Test Case 1: Build Without Workspace
```
Mode: Build
Query: "Create a learning plan for Python"
Result: ⚠️ Warning message, no content created
```

### Test Case 2: Build With Workspace
```
Mode: Build
Query: "@DataEngineering Create a learning plan for SQL"
Result: ✅ Pages, skills, and tasks created successfully
```

### Test Case 3: Task Priority Validation
```
Input: {"priority": "High"}  → Converted to "high" ✅
Input: {"priority": "MEDIUM"} → Converted to "medium" ✅
Input: {"priority": "invalid"} → Defaults to "medium" ✅
```

## Database Constraints

### Tasks Table Priority Constraint
```sql
CREATE TABLE public.tasks (
  ...
  priority TEXT NOT NULL DEFAULT 'medium' 
    CHECK (priority IN ('low', 'medium', 'high')),
  ...
);
```

This constraint ensures data integrity and prevents invalid priority values.

## Benefits

1. **No More Constraint Violations**: All task priorities are validated and lowercase
2. **Organized Content**: Build mode requires workspace context
3. **Better UX**: Clear messaging when workspace is needed
4. **Data Integrity**: Validation at multiple levels (AI prompt, extraction, insertion)
5. **Fail-Safe**: Defaults to valid values if something goes wrong

## Future Enhancements

- Add workspace selector UI for Build mode
- Show workspace context in Build mode interface
- Add preview before creating content
- Batch creation with progress indicator
- Undo/rollback for created content
