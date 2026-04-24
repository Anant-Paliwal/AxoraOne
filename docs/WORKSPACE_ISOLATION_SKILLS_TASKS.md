# Workspace Isolation for Skills and Tasks

## Overview
Add workspace isolation to skills and tasks so they belong to specific workspaces, just like pages.

## Database Changes

### Migration SQL (`add-workspace-to-skills-tasks.sql`)

```sql
-- Add workspace_id to skills table
ALTER TABLE public.skills 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Add workspace_id to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_skills_workspace_id ON public.skills(workspace_id);
CREATE INDEX IF NOT EXISTS idx_skills_user_workspace ON public.skills(user_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON public.tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_workspace ON public.tasks(user_id, workspace_id);
```

### To Apply Migration

Run this SQL in your Supabase SQL Editor or via command line:

```bash
psql -h your-db-host -U postgres -d postgres -f add-workspace-to-skills-tasks.sql
```

Or copy-paste the SQL into Supabase Dashboard → SQL Editor → New Query

## Backend Status

### ✅ Skills Endpoint (`backend/app/api/endpoints/skills.py`)
Already supports workspace_id:
- `SkillCreate` model has `workspace_id` field
- `get_skills()` filters by workspace_id
- `create_skill()` includes workspace_id

### ✅ Tasks Endpoint (`backend/app/api/endpoints/tasks.py`)
Already supports workspace_id:
- `TaskCreate` model has `workspace_id` field
- `get_tasks()` filters by workspace_id
- `create_task()` includes workspace_id

## Frontend Changes Needed

### 1. Skills Page
Update skill creation to include current workspace:

```typescript
// In SkillsPage.tsx or CreateSkillDialog
const handleCreateSkill = async (skillData) => {
  await api.createSkill({
    ...skillData,
    workspace_id: currentWorkspace?.id  // Add this
  });
};
```

### 2. Tasks Page
Update task creation to include current workspace:

```typescript
// In TasksPage.tsx or CreateTaskDialog
const handleCreateTask = async (taskData) => {
  await api.createTask({
    ...taskData,
    workspace_id: currentWorkspace?.id  // Add this
  });
};
```

### 3. AI Agent (BUILD Mode)
Update AI agent to include workspace_id when creating skills/tasks:

```python
# In backend/app/services/ai_agent.py
# _execute_actions method

# Create skills
skill_response = supabase_admin.table("skills").insert({
    "user_id": user_id,
    "workspace_id": workspace_id,  # Add this
    "name": skill_data.get("name"),
    ...
}).execute()

# Create tasks
task_response = supabase_admin.table("tasks").insert({
    "user_id": user_id,
    "workspace_id": workspace_id,  # Add this
    "title": task_data.get("title"),
    ...
}).execute()
```

## Benefits

### Before (User-Wide)
- Skills and tasks visible across all workspaces
- Hard to organize by project/topic
- Cluttered lists

### After (Workspace-Specific)
- ✅ Skills isolated to workspace (e.g., "Python" skill in "Data Engineering" workspace)
- ✅ Tasks isolated to workspace (e.g., "Learn SQL" task in "Data Analytics" workspace)
- ✅ Clean, organized workspace experience
- ✅ Better context and focus

## Migration Strategy

### For Existing Data

**Option 1: Assign to Default Workspace**
```sql
-- Assign all existing skills to user's first workspace
UPDATE public.skills s
SET workspace_id = (
  SELECT w.id 
  FROM public.workspaces w 
  WHERE w.user_id = s.user_id 
  ORDER BY w.created_at 
  LIMIT 1
)
WHERE workspace_id IS NULL;

-- Same for tasks
UPDATE public.tasks t
SET workspace_id = (
  SELECT w.id 
  FROM public.workspaces w 
  WHERE w.user_id = t.user_id 
  ORDER BY w.created_at 
  LIMIT 1
)
WHERE workspace_id IS NULL;
```

**Option 2: Keep NULL (User-Wide)**
- Allow `workspace_id` to be NULL
- NULL means "available in all workspaces"
- User can manually assign to workspace later

**Option 3: Duplicate Across Workspaces**
- Create copies in each workspace
- User can delete unwanted copies

## Testing

### Test Workspace Isolation

1. **Create Skill in Workspace A**
   ```
   - Go to Workspace A
   - Create skill "Python Programming"
   - Verify it appears in Workspace A
   ```

2. **Switch to Workspace B**
   ```
   - Go to Workspace B
   - Verify "Python Programming" does NOT appear
   - Create skill "JavaScript"
   - Verify it only appears in Workspace B
   ```

3. **Test Tasks Similarly**
   ```
   - Create task in Workspace A
   - Switch to Workspace B
   - Verify task doesn't appear
   ```

4. **Test AI Generation**
   ```
   - In Workspace A, use AI to generate tasks
   - Verify tasks are created in Workspace A
   - Switch to Workspace B
   - Verify tasks don't appear there
   ```

## API Changes Summary

### Skills API
```typescript
// GET /api/skills?workspace_id=xxx
// Returns only skills for that workspace

// POST /api/skills
{
  "name": "Python",
  "level": "Intermediate",
  "workspace_id": "workspace-uuid"  // Required
}
```

### Tasks API
```typescript
// GET /api/tasks?workspace_id=xxx
// Returns only tasks for that workspace

// POST /api/tasks
{
  "title": "Learn SQL",
  "priority": "high",
  "workspace_id": "workspace-uuid"  // Required
}
```

## Rollout Plan

1. **Phase 1: Database** ✅
   - Run migration SQL
   - Add workspace_id columns
   - Create indexes

2. **Phase 2: Backend** ✅
   - Already done! Endpoints support workspace_id

3. **Phase 3: Frontend** (TODO)
   - Update SkillsPage to pass workspace_id
   - Update TasksPage to pass workspace_id
   - Update CreateSkillDialog
   - Update CreateTaskDialog

4. **Phase 4: AI Agent** (TODO)
   - Update _execute_actions to include workspace_id
   - Test BUILD mode creates workspace-specific items

5. **Phase 5: Migration** (TODO)
   - Decide on strategy for existing data
   - Run migration script
   - Verify data integrity

6. **Phase 6: Testing** (TODO)
   - Test all CRUD operations
   - Test workspace switching
   - Test AI generation
   - Test edge cases

## Current Status

- ✅ Database schema ready (run SQL migration)
- ✅ Backend endpoints ready
- ⏳ Frontend needs updates
- ⏳ AI agent needs updates
- ⏳ Data migration needed

## Next Steps

1. Run the SQL migration
2. Update frontend components to pass workspace_id
3. Update AI agent to include workspace_id
4. Migrate existing data
5. Test thoroughly

Would you like me to:
- A) Update the frontend components now?
- B) Update the AI agent now?
- C) Create a data migration script?
- D) All of the above?
