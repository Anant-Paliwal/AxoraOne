# Ask Anything Workspace Isolation - Complete Fix

## Problem
When using "Ask Anything" in a specific workspace (e.g., "Data Analytics"), the AI was showing sources (pages) from ALL workspaces, including "Data Engineer" and others. This broke workspace isolation.

## Root Cause
The frontend was passing `selectedWorkspaceId` to the AI query, which is only set when you explicitly mention a workspace using @ (e.g., @DataAnalytics). If you don't use @, it was `null`, so the AI searched across ALL workspaces.

## Solution

### Frontend Fix (`src/pages/AskAnything.tsx`)

Changed the query to use the current workspace by default:

```typescript
// BEFORE - Only used workspace if mentioned with @
const result = await api.query(query, mode, scope, selectedModel, selectedWorkspaceId);

// AFTER - Uses current workspace by default, or mentioned workspace if @ used
const workspaceIdForQuery = selectedWorkspaceId || currentWorkspace?.id;
const result = await api.query(query, mode, scope, selectedModel, workspaceIdForQuery);
```

### Backend Fixes (Already Applied)

1. **Vector Store** (`backend/app/services/vector_store.py`)
   - Filters search results by `workspace_id`
   - Only returns pages from the specified workspace

2. **AI Agent** (`backend/app/services/ai_agent.py`)
   - Passes `workspace_id` to vector store search
   - Filters workspace context by `workspace_id`

3. **Pages Endpoint** (`backend/app/api/endpoints/pages.py`)
   - Includes `workspace_id` in vector store metadata
   - Ensures proper filtering when indexing

## How It Works Now

### Scenario 1: Normal Query (No @ Mention)
```
User is in: "Data Analytics" workspace
User asks: "What topics am I covering?"

Behavior:
- Uses currentWorkspace.id = "Data Analytics" workspace ID
- AI searches ONLY pages in "Data Analytics" workspace
- Sources shown are ONLY from "Data Analytics"
- Skills and tasks are user-wide (no workspace filter yet)
```

### Scenario 2: With @ Mention
```
User is in: "Data Analytics" workspace
User asks: "What topics am I covering in @DataEngineering?"

Behavior:
- Uses selectedWorkspaceId = "Data Engineering" workspace ID
- AI searches ONLY pages in "Data Engineering" workspace
- Sources shown are ONLY from "Data Engineering"
- Allows cross-workspace queries when explicitly requested
```

### Scenario 3: Web Search
```
User is in: Any workspace
User sets scope to: "Web Search"
User asks: "What is machine learning?"

Behavior:
- Workspace filtering is NOT applied (web results are global)
- Sources are web URLs, not pages
- This is expected behavior
```

## What Gets Filtered by Workspace

✅ **Pages** - Fully isolated by workspace
- Vector store search filtered
- Workspace context filtered
- Sources filtered

⚠️ **Skills** - Currently user-wide (no workspace field)
- Shows all user's skills regardless of workspace
- Future enhancement: Add workspace_id to skills table

⚠️ **Tasks** - Currently user-wide (no workspace field)
- Shows all user's tasks regardless of workspace
- Future enhancement: Add workspace_id to tasks table

❌ **Web Search** - Not filtered (intentional)
- Web results are global
- No workspace isolation needed

## Testing

### Test 1: Workspace Isolation
1. Create pages in "Data Analytics" workspace
2. Create pages in "Data Engineer" workspace
3. Switch to "Data Analytics" workspace
4. Go to "Ask Anything"
5. Ask: "What topics am I covering?"
6. **Expected:** Only see pages from "Data Analytics" in sources
7. **Check console:** Should log `Querying with workspace_id: <Data Analytics ID>`

### Test 2: Cross-Workspace Query
1. Stay in "Data Analytics" workspace
2. Type: "What topics am I covering in @DataEngineer"
3. Select "Data Engineer" from @ mentions
4. Send query
5. **Expected:** See pages from "Data Engineer" workspace
6. **Check console:** Should log `Querying with workspace_id: <Data Engineer ID>`

### Test 3: Web Search (No Filtering)
1. In any workspace
2. Change scope to "Web Search"
3. Ask: "What is Python?"
4. **Expected:** See web results (not pages)
5. **Expected:** No workspace filtering applied

## Console Logs to Verify

When you send a query, check browser console (F12):
```
Querying with workspace_id: <current-workspace-uuid>
```

This confirms the correct workspace is being used.

## Future Enhancements

### Add Workspace to Skills
```sql
ALTER TABLE public.skills 
ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

CREATE INDEX idx_skills_workspace_id ON public.skills(workspace_id);
```

### Add Workspace to Tasks
```sql
ALTER TABLE public.tasks 
ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

CREATE INDEX idx_tasks_workspace_id ON public.tasks(workspace_id);
```

Then update AI agent to filter skills and tasks by workspace too.

## Summary

The workspace isolation is now complete for pages in "Ask Anything":
- ✅ Uses current workspace by default
- ✅ Allows cross-workspace queries with @ mentions
- ✅ Filters vector store search by workspace
- ✅ Filters workspace context by workspace
- ✅ Shows only relevant sources
- ✅ Web search remains global (as intended)

Skills and tasks remain user-wide for now, which may be desired behavior (skills are personal, not workspace-specific).
