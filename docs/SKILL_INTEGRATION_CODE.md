# Skill System Integration Code

## 🎯 Exact Code to Add

This document contains the EXACT code to add to make skills work perfectly.

---

## 1. Auto-Link Pages to Skills (pages.py)

**File:** `backend/app/api/endpoints/pages.py`

**Find the `create_page` endpoint and add this AFTER the page is created:**

```python
@router.post("")
async def create_page(
    page: PageCreate,
    user_id: str = Depends(get_current_user)
):
    # ... existing code to create page ...
    
    # NEW: Auto-link to skills
    try:
        from app.services.skill_auto_linker import auto_linker
        
        links = await auto_linker.analyze_and_link_page(
            page_id=new_page["id"],
            page_title=new_page["title"],
            page_content=new_page.get("content", ""),
            page_tags=new_page.get("tags", []),
            workspace_id=new_page.get("workspace_id"),
            user_id=user_id
        )
        
        if links:
            print(f"✅ Auto-linked page '{new_page['title']}' to {len(links)} skills")
    except Exception as e:
        # Don't fail page creation if auto-linking fails
        print(f"⚠️ Auto-linking failed: {e}")
    
    return new_page
```

---

## 2. Track Task Completion (tasks.py)

**File:** `backend/app/api/endpoints/tasks.py`

**Find the `update_task` endpoint and add this AFTER status is updated to 'completed':**

```python
@router.patch("/{task_id}")
async def update_task(
    task_id: str,
    updates: TaskUpdate,
    user_id: str = Depends(get_current_user)
):
    # ... existing code to update task ...
    
    # NEW: Track contribution when task completed
    if updates.status == "completed" and updated_task.get("linked_skill_id"):
        try:
            from app.services.skill_contribution_tracker import contribution_tracker
            from datetime import datetime
            
            # Calculate if task was completed faster than expected
            created_at = updated_task.get("created_at")
            if created_at:
                if isinstance(created_at, str):
                    created_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                else:
                    created_date = created_at
                
                actual_days = (datetime.utcnow() - created_date.replace(tzinfo=None)).days
                expected_days = 7  # Default estimate
                days_saved = max(0, expected_days - actual_days)
                
                if days_saved > 0:
                    await contribution_tracker.track_task_accelerated(
                        skill_id=updated_task["linked_skill_id"],
                        task_id=task_id,
                        workspace_id=updated_task.get("workspace_id"),
                        days_saved=days_saved
                    )
                    print(f"✅ Tracked task acceleration: {days_saved} days saved for skill")
        except Exception as e:
            print(f"⚠️ Contribution tracking failed: {e}")
    
    return updated_task
```

---

## 3. Auto-Link Tasks to Skills (tasks.py)

**File:** `backend/app/api/endpoints/tasks.py`

**Find the `create_task` endpoint and add this AFTER the task is created:**

```python
@router.post("")
async def create_task(
    task: TaskCreate,
    user_id: str = Depends(get_current_user)
):
    # ... existing code to create task ...
    
    # NEW: Auto-link to skill if not manually linked
    if not new_task.get("linked_skill_id") and new_task.get("workspace_id"):
        try:
            from app.services.skill_auto_linker import auto_linker
            
            link = await auto_linker.analyze_and_link_task(
                task_id=new_task["id"],
                task_title=new_task["title"],
                task_description=new_task.get("description", ""),
                workspace_id=new_task["workspace_id"]
            )
            
            if link:
                # Update task with linked skill
                supabase_admin.table("tasks").update({
                    "linked_skill_id": link["skill_id"]
                }).eq("id", new_task["id"]).execute()
                
                new_task["linked_skill_id"] = link["skill_id"]
                print(f"✅ Auto-linked task to skill: {link['skill_name']}")
        except Exception as e:
            print(f"⚠️ Auto-linking task failed: {e}")
    
    return new_task
```

---

## 4. Record Skill Executions (skills.py or wherever executeSkill is)

**File:** `backend/app/api/endpoints/skills.py` (or similar)

**Find the skill execution endpoint and add:**

```python
@router.post("/{skill_id}/execute")
async def execute_skill(
    skill_id: str,
    execution: SkillExecution,
    workspace_id: str = Query(None),
    user_id: str = Depends(get_current_user)
):
    # ... existing code to execute skill ...
    
    # NEW: Record execution
    try:
        import uuid
        from app.core.supabase import supabase_admin
        from datetime import datetime
        
        supabase_admin.table("skill_executions").insert({
            "id": str(uuid.uuid4()),
            "skill_id": skill_id,
            "workspace_id": workspace_id,
            "trigger_source": execution.trigger_source or "manual",
            "input_context": execution.input_context or {},
            "output_result": result,  # The result from execution
            "success": True,
            "executed_at": datetime.utcnow().isoformat()
        }).execute()
        
        print(f"✅ Recorded skill execution for {skill_id}")
    except Exception as e:
        print(f"⚠️ Failed to record execution: {e}")
    
    return result
```

---

## 5. Update Skill on Evolution (intelligence.py)

**File:** `backend/app/api/endpoints/intelligence.py`

**The evolve endpoint already exists, but add this to update memory:**

```python
@router.post("/skills/{skill_id}/evolve")
async def evolve_skill_to_next_level(
    skill_id: str,
    user_id: str = Depends(get_current_user)
):
    # ... existing evolution code ...
    
    # NEW: Update skill memory
    try:
        from datetime import datetime
        
        supabase_admin.table("skill_memory").upsert({
            "skill_id": skill_id,
            "last_evolved_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }, on_conflict="skill_id").execute()
        
        print(f"✅ Updated skill memory for evolution")
    except Exception as e:
        print(f"⚠️ Failed to update memory: {e}")
    
    return {
        "success": True,
        "previous_level": current_level,
        "new_level": next_level,
        "message": f"Skill evolved from {current_level} to {next_level}!"
    }
```

---

## 6. Frontend: Track Suggestion Acceptance

**File:** `src/components/intelligence/ProposedActionCard.tsx` (or wherever suggestions are shown)

**Add when user accepts a suggestion:**

```typescript
const handleAcceptSuggestion = async (suggestion: any) => {
  try {
    // Execute the suggestion
    await executeSuggestion(suggestion);
    
    // NEW: Track acceptance
    if (suggestion.source_skill_id && currentWorkspace?.id) {
      await api.trackSuggestionAccepted(
        suggestion.source_skill_id,
        suggestion.id,
        currentWorkspace.id
      );
      console.log('✅ Tracked suggestion acceptance');
    }
    
    toast.success('Suggestion applied!');
  } catch (error) {
    toast.error('Failed to apply suggestion');
  }
};

const handleRejectSuggestion = async (suggestion: any) => {
  try {
    // NEW: Track rejection
    if (suggestion.source_skill_id && currentWorkspace?.id) {
      await api.trackSuggestionRejected(
        suggestion.source_skill_id,
        suggestion.id,
        currentWorkspace.id
      );
      console.log('✅ Tracked suggestion rejection');
    }
    
    toast.info('Suggestion dismissed');
  } catch (error) {
    console.error('Failed to track rejection:', error);
  }
};
```

---

## 7. Initialize Skill Memory on Creation

**File:** `backend/app/api/endpoints/skills.py`

**Add to create_skill endpoint:**

```python
@router.post("")
async def create_skill(
    skill: SkillCreate,
    user_id: str = Depends(get_current_user)
):
    # ... existing code to create skill ...
    
    # NEW: Initialize skill memory
    try:
        from datetime import datetime
        
        supabase_admin.table("skill_memory").insert({
            "skill_id": new_skill["id"],
            "successful_patterns": [],
            "failed_patterns": [],
            "user_preferences": {},
            "activation_history": [],
            "confidence_adjustments": [],
            "last_evolved_at": None,
            "updated_at": datetime.utcnow().isoformat()
        }).execute()
        
        print(f"✅ Initialized skill memory for {new_skill['name']}")
    except Exception as e:
        print(f"⚠️ Failed to initialize memory: {e}")
    
    # NEW: Auto-scan existing pages for relevance
    try:
        from app.services.skill_auto_linker import auto_linker
        
        # Get all pages in workspace
        if new_skill.get("workspace_id"):
            pages = supabase_admin.table("pages")\
                .select("id, title, content, tags")\
                .eq("workspace_id", new_skill["workspace_id"])\
                .execute()
            
            links_created = 0
            for page in pages.data or []:
                links = await auto_linker.analyze_and_link_page(
                    page_id=page["id"],
                    page_title=page["title"],
                    page_content=page.get("content", ""),
                    page_tags=page.get("tags", []),
                    workspace_id=new_skill["workspace_id"],
                    user_id=user_id
                )
                links_created += len(links)
            
            if links_created > 0:
                print(f"✅ Auto-linked {links_created} existing pages to new skill")
    except Exception as e:
        print(f"⚠️ Auto-scanning pages failed: {e}")
    
    return new_skill
```

---

## 📋 Integration Checklist

### Backend Changes

**pages.py:**
- [ ] Add auto-linking after page creation
- [ ] Add auto-linking after page edit (optional)

**tasks.py:**
- [ ] Add contribution tracking on task completion
- [ ] Add auto-linking after task creation

**skills.py:**
- [ ] Add skill memory initialization on creation
- [ ] Add auto-scan of existing pages on creation
- [ ] Add execution recording (if endpoint exists)

**intelligence.py:**
- [ ] Add memory update on evolution (already has endpoint)

### Frontend Changes

**ProposedActionCard.tsx (or similar):**
- [ ] Add `trackSuggestionAccepted()` call
- [ ] Add `trackSuggestionRejected()` call

### Database

- [ ] Run `COMPLETE_SKILL_TABLES_MIGRATION.sql`

---

## 🧪 Testing After Integration

### Test 1: Auto-Linking Pages
```bash
1. Create skill "Python Programming"
2. Create page with "Python" in title
3. Check: SELECT * FROM skill_evidence WHERE evidence_type = 'auto_linked'
4. Expected: 1 row linking page to skill
```

### Test 2: Task Contributions
```bash
1. Create skill "Data Analysis"
2. Create task linked to skill
3. Complete task within 2 days
4. Check: SELECT * FROM skill_contributions WHERE contribution_type = 'task_accelerated'
5. Expected: 1 row with impact_score = 0.25 (5 days saved * 0.05)
```

### Test 3: Skill Progress
```bash
1. Complete steps above
2. Go to Skills page
3. Check: Skill should show > 0% progress
4. Expected: Progress based on contributions
```

### Test 4: Skill Memory
```bash
1. Create skill
2. Check: SELECT * FROM skill_memory WHERE skill_id = '{skill_id}'
3. Expected: 1 row with empty arrays
```

### Test 5: Skill Executions
```bash
1. Click "Get Suggestions" on skill
2. Check: SELECT * FROM skill_executions WHERE skill_id = '{skill_id}'
3. Expected: 1 row with trigger_source = 'manual'
```

---

## 🎯 Expected Results

After all integrations:

1. **Skills show real progress** (not 0%)
2. **Pages auto-link** to relevant skills
3. **Tasks auto-link** to relevant skills
4. **Contributions tracked** when tasks complete
5. **Memory persists** across sessions
6. **Executions recorded** for analytics
7. **Suggestions tracked** for learning

**Total time to integrate:** ~1 hour
**Impact:** Complete skill intelligence system working perfectly
