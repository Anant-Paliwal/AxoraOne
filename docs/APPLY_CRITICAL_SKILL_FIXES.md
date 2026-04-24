# 🔧 APPLY CRITICAL SKILL FIXES
**Quick Implementation Guide**

## 🎯 PRIORITY FIXES (Do These First)

### FIX #1: Verify & Fix skill_evidence Table

**Run in Supabase SQL Editor:**
```sql
-- Check current schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'skill_evidence'
ORDER BY ordinal_position;

-- Add user_id if missing (safe - won't fail if exists)
ALTER TABLE skill_evidence 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Verify it worked
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'skill_evidence' AND column_name = 'user_id';
```

---

### FIX #2: Enable Auto-linking on Page Creation

**File**: `backend/app/api/endpoints/pages.py`

**Find this section** (around line 300-350 in the `create_page` function):
```python
response = supabase_admin.table("pages").insert(page_data).execute()
new_page = response.data[0]
```

**Add immediately after**:
```python
# ============================================
# AUTO-LINK TO RELEVANT SKILLS
# ============================================
if new_page.get("workspace_id"):
    try:
        from app.services.skill_auto_linker import auto_linker
        
        # Extract text content from blocks if present
        content_text = page.content or ""
        if page.blocks:
            block_texts = []
            for block in page.blocks:
                if isinstance(block, dict) and block.get("data"):
                    block_data = block["data"]
                    if isinstance(block_data, dict):
                        text = block_data.get("content", "")
                        if text:
                            block_texts.append(text)
            if block_texts:
                content_text = " ".join(block_texts)
        
        # Auto-link to skills
        links = await auto_linker.analyze_and_link_page(
            page_id=new_page["id"],
            page_title=page.title,
            page_content=content_text,
            page_tags=page.tags,
            workspace_id=new_page["workspace_id"],
            user_id=user_id
        )
        
        if links:
            print(f"✅ Auto-linked page '{page.title}' to {len(links)} skills:")
            for link in links:
                print(f"   - {link['skill_name']} ({link['confidence']:.0%} confidence)")
    except Exception as e:
        # Non-fatal - page still created successfully
        print(f"⚠️ Auto-linking failed (non-fatal): {e}")
        import traceback
        traceback.print_exc()
```

---

### FIX #3: Track Contributions on Task Completion

**File**: `backend/app/api/endpoints/tasks.py`

**Find the `update_task` function** (around line 100-150):
```python
@router.patch("/{task_id}")
async def update_task(task_id: str, task: TaskUpdate, user_id: str = Depends(get_current_user)):
```

**Add this code AFTER the task is updated** (after `response = supabase_admin.table("tasks").update(...).execute()`):
```python
# ============================================
# TRACK SKILL CONTRIBUTION ON COMPLETION
# ============================================
if task.status == "completed":
    # Get the updated task to check linked_skill_id
    updated_task = response.data[0] if response.data else None
    
    if updated_task and updated_task.get("linked_skill_id"):
        try:
            from app.services.skill_contribution_tracker import contribution_tracker
            
            # Calculate days saved (if task completed before due date)
            days_saved = 0
            if updated_task.get("due_date"):
                from datetime import datetime
                try:
                    due_date = datetime.fromisoformat(updated_task["due_date"].replace('Z', '+00:00'))
                    now = datetime.utcnow()
                    if now < due_date:
                        days_saved = (due_date.date() - now.date()).days
                except:
                    pass
            
            # Track the contribution
            await contribution_tracker.track_task_accelerated(
                skill_id=updated_task["linked_skill_id"],
                task_id=task_id,
                workspace_id=updated_task.get("workspace_id", ""),
                days_saved=max(0, days_saved)
            )
            
            print(f"✅ Tracked skill contribution for task completion")
            
        except Exception as e:
            # Non-fatal - task still updated successfully
            print(f"⚠️ Contribution tracking failed (non-fatal): {e}")
```

---

### FIX #4: Start Background Runner on App Startup

**File**: `backend/app/main.py`

**Find the app initialization** (near the top):
```python
app = FastAPI(title="Axora API", version="1.0.0")
```

**Add these imports at the top**:
```python
from app.services.skill_background_runner import start_skill_runner, stop_skill_runner
```

**Add these event handlers** (after app initialization):
```python
@app.on_event("startup")
async def startup_event():
    """Start background services"""
    print("🚀 Starting Axora backend...")
    
    # Start skill background runner
    try:
        await start_skill_runner()
        print("✅ Skill agents are now autonomous and running")
    except Exception as e:
        print(f"⚠️ Failed to start skill runner: {e}")
        # Non-fatal - app can still run

@app.on_event("shutdown")
async def shutdown_event():
    """Stop background services"""
    print("🛑 Shutting down Axora backend...")
    
    try:
        await stop_skill_runner()
        print("✅ Skill agents stopped gracefully")
    except Exception as e:
        print(f"⚠️ Error stopping skill runner: {e}")
```

---

## 🧪 TESTING AFTER FIXES

### Test #1: Verify skill_evidence Works
```python
# Run this in Python console or create test_skill_evidence.py
import asyncio
from app.core.supabase import supabase_admin

async def test_skill_evidence():
    # Get a skill and page
    skills = supabase_admin.table("skills").select("id").limit(1).execute()
    pages = supabase_admin.table("pages").select("id").limit(1).execute()
    
    if skills.data and pages.data:
        skill_id = skills.data[0]["id"]
        page_id = pages.data[0]["id"]
        
        # Try to create evidence
        result = supabase_admin.table("skill_evidence").insert({
            "skill_id": skill_id,
            "page_id": page_id,
            "evidence_type": "test",
            "notes": "Test evidence"
        }).execute()
        
        print("✅ skill_evidence insert works!")
        print(f"Created: {result.data}")
    else:
        print("⚠️ Need at least one skill and one page to test")

asyncio.run(test_skill_evidence())
```

### Test #2: Verify Auto-linking Works
```bash
# Create a page via API and check logs
curl -X POST http://localhost:8000/api/v1/pages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Python Programming Guide",
    "content": "Learn Python basics and advanced concepts",
    "tags": ["python", "programming"],
    "workspace_id": "YOUR_WORKSPACE_ID"
  }'

# Check backend logs for:
# "✅ Auto-linked page 'Python Programming Guide' to X skills"
```

### Test #3: Verify Task Contribution Tracking
```bash
# Complete a task via API
curl -X PATCH http://localhost:8000/api/v1/tasks/TASK_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'

# Check backend logs for:
# "✅ Tracked skill contribution for task completion"

# Verify in database:
SELECT * FROM skill_contributions 
WHERE contribution_type = 'task_accelerated' 
ORDER BY created_at DESC 
LIMIT 5;
```

### Test #4: Verify Background Runner Started
```bash
# Start backend and check logs
cd backend
python -m uvicorn app.main:app --reload

# Look for these messages:
# "🚀 Starting Axora backend..."
# "🧠 Skill Background Runner started - Skills are now autonomous agents"
# "✅ Skill agents are now autonomous and running"
```

---

## 📊 VERIFICATION QUERIES

Run these in Supabase SQL Editor to verify everything works:

```sql
-- 1. Check skills have workspace_id
SELECT 
    id, 
    name, 
    workspace_id, 
    confidence_score,
    activation_count,
    last_activated_at
FROM skills 
WHERE workspace_id IS NOT NULL
LIMIT 10;

-- 2. Check skill evidence is being created
SELECT 
    se.id,
    s.name as skill_name,
    p.title as page_title,
    se.confidence_score,
    se.evidence_type,
    se.created_at
FROM skill_evidence se
JOIN skills s ON se.skill_id = s.id
JOIN pages p ON se.page_id = p.id
ORDER BY se.created_at DESC
LIMIT 10;

-- 3. Check contributions are being tracked
SELECT 
    sc.id,
    s.name as skill_name,
    sc.contribution_type,
    sc.target_type,
    sc.impact_score,
    sc.created_at
FROM skill_contributions sc
JOIN skills s ON sc.skill_id = s.id
ORDER BY sc.created_at DESC
LIMIT 10;

-- 4. Check skill executions
SELECT 
    se.id,
    s.name as skill_name,
    se.trigger_source,
    se.output_type,
    se.executed_at
FROM skill_executions se
JOIN skills s ON se.skill_id = s.id
ORDER BY se.executed_at DESC
LIMIT 10;

-- 5. Calculate real skill progress
SELECT 
    s.id,
    s.name,
    s.level,
    s.confidence_score,
    s.activation_count,
    COUNT(DISTINCT sc.id) as total_contributions,
    COALESCE(SUM(sc.impact_score), 0) as total_impact,
    COUNT(DISTINCT se.id) as total_executions
FROM skills s
LEFT JOIN skill_contributions sc ON s.id = sc.skill_id
LEFT JOIN skill_executions se ON s.id = se.skill_id
WHERE s.workspace_id IS NOT NULL
GROUP BY s.id, s.name, s.level, s.confidence_score, s.activation_count
ORDER BY total_impact DESC
LIMIT 10;
```

---

## 🎯 SUCCESS CRITERIA

After applying these fixes, you should see:

### ✅ Database
- [ ] skill_evidence has user_id column
- [ ] New pages create skill_evidence records automatically
- [ ] Completed tasks create skill_contributions records
- [ ] Skills have non-zero confidence_score and activation_count

### ✅ Backend Logs
- [ ] "🧠 Skill Background Runner started"
- [ ] "✅ Auto-linked page to X skills"
- [ ] "✅ Tracked skill contribution for task completion"
- [ ] No errors related to skill_evidence.user_id

### ✅ Frontend
- [ ] Skills show in dashboard widget
- [ ] Skills have workspace_id when created
- [ ] Evidence linking works without errors
- [ ] Task completion updates skill progress

---

## 🚨 TROUBLESHOOTING

### Issue: "column user_id does not exist"
**Solution**: Run FIX #1 SQL script again

### Issue: "Auto-linking not working"
**Solution**: 
1. Check backend logs for errors
2. Verify workspace_id is being passed
3. Check if skills exist in workspace

### Issue: "Background runner not starting"
**Solution**:
1. Check for syntax errors in main.py
2. Verify imports are correct
3. Check if asyncio is working

### Issue: "Contributions not being tracked"
**Solution**:
1. Verify skill_contributions table exists
2. Check if workspace_id is present
3. Look for errors in backend logs

---

## 📝 ROLLBACK PLAN

If something breaks, you can rollback:

### Rollback FIX #2 (Auto-linking)
Just remove the added code block from pages.py

### Rollback FIX #3 (Task contributions)
Just remove the added code block from tasks.py

### Rollback FIX #4 (Background runner)
Comment out the startup/shutdown event handlers in main.py

### Rollback FIX #1 (Database)
```sql
-- Only if you need to remove user_id column
ALTER TABLE skill_evidence DROP COLUMN IF EXISTS user_id;
```

---

## ✅ COMPLETION CHECKLIST

- [ ] Applied FIX #1 (skill_evidence.user_id)
- [ ] Applied FIX #2 (Auto-linking on page creation)
- [ ] Applied FIX #3 (Task contribution tracking)
- [ ] Applied FIX #4 (Background runner startup)
- [ ] Tested skill creation with workspace_id
- [ ] Tested page creation triggers auto-linking
- [ ] Tested task completion tracks contribution
- [ ] Verified background runner is running
- [ ] Ran all verification queries
- [ ] Checked backend logs for errors
- [ ] Tested frontend skill widget

**Once all checked, your skill system will be fully operational!**
