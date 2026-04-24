# Skills Update Error Fix

## Problem
Getting 500 Internal Server Error when trying to update skills:
```
PATCH /api/v1/skills/{skill_id} - 500 Internal Server Error
Error: Failed to update skill
```

## Root Cause
The issue was likely caused by trying to update the `workspace_id` field when editing an existing skill. The `workspace_id` should only be set when creating a new skill, not when updating.

## Changes Made

### 1. Backend - Enhanced Error Logging (`backend/app/api/endpoints/skills.py`)
Added detailed logging to the `update_skill` endpoint to help diagnose issues:
- Log the skill_id and user_id
- Log the incoming update data
- Log the filtered update data
- Log the Supabase response
- Print full stack trace on errors

### 2. Frontend - Fixed Update Logic (`src/pages/SkillsPage.tsx`)
**Before:**
```typescript
const data = {
  name,
  level,
  description: purpose,
  goals: longTermGoals ? [longTermGoals] : [],
  evidence: keywords,
  workspace_id: currentWorkspace?.id, // ❌ Always sending workspace_id
};
```

**After:**
```typescript
const data: any = {
  name,
  level,
  description: purpose,
  goals: longTermGoals ? [longTermGoals] : [],
  evidence: keywords,
};

// Only add workspace_id when creating a new skill
if (!skill && currentWorkspace?.id) {
  data.workspace_id = currentWorkspace.id; // ✅ Only on create
}
```

### 3. Added workspace_id to Skill Interface
```typescript
interface Skill {
  // ... other fields
  workspace_id?: string; // Added this field
}
```

### 4. Improved Error Handling
```typescript
catch (error: any) {
  const errorMessage = error?.message || 'Failed to save skill';
  toast.error(errorMessage); // Show actual error message
  console.error('Error saving skill:', error);
}
```

## How It Works Now

1. **Creating a Skill:**
   - Includes `workspace_id` in the data
   - Associates skill with current workspace

2. **Updating a Skill:**
   - Does NOT include `workspace_id` in the update data
   - Prevents foreign key constraint issues
   - Workspace association remains unchanged

3. **Error Reporting:**
   - Backend logs detailed information
   - Frontend shows specific error messages
   - Better debugging capabilities

## Testing

Try updating a skill now:
1. Open any skill
2. Edit the name, level, description, goals, or keywords
3. Click "Update Skill"
4. Should save successfully without 500 error

If you still see errors, check the backend console for detailed logs showing exactly what's failing.

## Additional Notes

- The `workspace_id` is set once when creating a skill and should not be changed
- Skills remain associated with their original workspace
- RLS policies ensure users can only access their own skills
- The enhanced logging will help diagnose any future issues

## Files Modified
- `backend/app/api/endpoints/skills.py` - Added detailed logging
- `src/pages/SkillsPage.tsx` - Fixed update logic and added workspace_id field
