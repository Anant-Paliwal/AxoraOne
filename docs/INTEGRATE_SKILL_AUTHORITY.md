# Integrating Skill Authority into Existing Skills

## 🎯 Overview

This guide shows how to update existing skills to use the new Safe Skill Authority System.

---

## 🔄 Migration Pattern

### Before (Unsafe):
```python
# ❌ Direct modification - NOT ALLOWED
supabase.table("pages").update({
    "content": new_content
}).eq("id", page_id).execute()
```

### After (Safe):
```python
# ✅ Create suggestion - REQUIRED
from app.services.skill_authority import skill_authority, ChangeType

await skill_authority.create_suggestion(
    skill_id=self.skill_id,
    change_type=ChangeType.ADD_SECTION,
    target_type="page",
    target_id=page_id,
    description="Add 'Next Actions' section",
    why="Page has planning content but no action items",
    payload={"section_title": "Next Actions"},
    workspace_id=workspace_id,
    user_id=user_id
)
```

---

## 📝 Step-by-Step Integration

### Step 1: Import Authority System

```python
from app.services.skill_authority import (
    skill_authority,
    ChangeType,
    RiskLevel
)
```

### Step 2: Check Permission Before Acting

```python
async def suggest_page_improvement(self, page_id: str, workspace_id: str):
    """Suggest improvement to a page"""
    
    # Check if skill has authority
    allowed, reason = await skill_authority.can_skill_act(
        skill_id=self.skill_id,
        change_type=ChangeType.ADD_SECTION,
        target_type="page",
        target_id=page_id,
        workspace_id=workspace_id
    )
    
    if not allowed:
        print(f"Cannot suggest: {reason}")
        return None
    
    # Create suggestion
    suggestion = await skill_authority.create_suggestion(
        skill_id=self.skill_id,
        change_type=ChangeType.ADD_SECTION,
        target_type="page",
        target_id=page_id,
        description="Add 'Next Actions' section",
        why="Page has planning content but no tracked action items",
        payload={
            "section_title": "Next Actions",
            "section_type": "checklist"
        },
        workspace_id=workspace_id,
        user_id=self.user_id
    )
    
    return suggestion
```

### Step 3: Replace Direct Modifications

#### Example 1: Page Modification

**Before:**
```python
# ❌ Direct update
supabase.table("pages").update({
    "metadata": {"status": "needs_review"}
}).eq("id", page_id).execute()
```

**After:**
```python
# ✅ Create suggestion
await skill_authority.create_suggestion(
    skill_id=self.skill_id,
    change_type=ChangeType.ADD_METADATA,
    target_type="page",
    target_id=page_id,
    description="Mark page as needs review",
    why="Page hasn't been updated in 30 days",
    payload={"metadata": {"status": "needs_review"}},
    workspace_id=workspace_id,
    user_id=user_id
)
```

#### Example 2: Task Creation

**Before:**
```python
# ❌ Auto-create task
supabase.table("tasks").insert({
    "title": "Review page",
    "workspace_id": workspace_id,
    "user_id": user_id
}).execute()
```

**After:**
```python
# ✅ Suggest task creation
await skill_authority.create_suggestion(
    skill_id=self.skill_id,
    change_type=ChangeType.SUGGEST_TASK,
    target_type="task",
    target_id=None,  # New task, no ID yet
    description="Create task: Review page",
    why="Page hasn't been reviewed in 30 days",
    payload={
        "task_data": {
            "title": "Review page",
            "priority": "medium",
            "linked_page_id": page_id
        }
    },
    workspace_id=workspace_id,
    user_id=user_id
)
```

#### Example 3: Task Breakdown

**Before:**
```python
# ❌ Auto-split task
for subtask in subtasks:
    supabase.table("tasks").insert({
        "title": subtask["title"],
        "parent_task_id": task_id,
        "workspace_id": workspace_id
    }).execute()
```

**After:**
```python
# ✅ Suggest breakdown
await skill_authority.create_suggestion(
    skill_id=self.skill_id,
    change_type=ChangeType.SUGGEST_BREAKDOWN,
    target_type="task",
    target_id=task_id,
    description="Break down into 3 smaller tasks",
    why="Task delayed 3 times, likely too large",
    payload={
        "subtasks": [
            {"title": "Step 1", "priority": "high"},
            {"title": "Step 2", "priority": "medium"},
            {"title": "Step 3", "priority": "low"}
        ]
    },
    workspace_id=workspace_id,
    user_id=user_id
)
```

---

## 🔧 Updating Existing Skill Classes

### Pattern 1: Skill Engine Integration

```python
# In skill_engine.py or similar

async def process_page_event(self, page_id: str, workspace_id: str, user_id: str):
    """Process page event and create suggestions"""
    
    # Get page
    page = await self._get_page(page_id)
    if not page:
        return
    
    # Detect if page needs structure
    if self._needs_structure(page):
        # Check authority
        allowed, reason = await skill_authority.can_skill_act(
            skill_id=self.skill_id,
            change_type=ChangeType.ADD_SECTION,
            target_type="page",
            target_id=page_id,
            workspace_id=workspace_id
        )
        
        if allowed:
            # Create suggestion
            await skill_authority.create_suggestion(
                skill_id=self.skill_id,
                change_type=ChangeType.ADD_SECTION,
                target_type="page",
                target_id=page_id,
                description="Add 'Next Actions' section",
                why="Page has planning content but no action items",
                payload={"section_title": "Next Actions"},
                workspace_id=workspace_id,
                user_id=user_id
            )
```

### Pattern 2: Intelligence Engine Integration

```python
# In intelligence_engine.py

async def _detect_implied_tasks(self, page_data: Dict, workspace_id: str, user_id: str):
    """Detect tasks implied by page content"""
    
    content = page_data.get('content', '')
    
    # Look for action-oriented phrases
    if self._has_action_items(content):
        # Don't create tasks directly - suggest instead
        await skill_authority.create_suggestion(
            skill_id="intelligence_engine",
            change_type=ChangeType.SUGGEST_TASK,
            target_type="page",
            target_id=page_data.get('id'),
            description="Extract action items as tasks",
            why="Page contains action items that could be tracked as tasks",
            payload={
                "extracted_items": self._extract_action_items(content)
            },
            workspace_id=workspace_id,
            user_id=user_id
        )
```

### Pattern 3: Smart Builder Integration

```python
# In smart_builder.py

async def _update_page(self, intent, user_id, workspace_id, ai_response, existing_pages):
    """Update page - but only with user approval"""
    
    page_id = intent.target_id
    
    # Don't update directly - create suggestion
    await skill_authority.create_suggestion(
        skill_id="smart_builder",
        change_type=ChangeType.ADD_METADATA,
        target_type="page",
        target_id=page_id,
        description="Update page metadata",
        why="User requested page update via Ask Anything",
        payload={
            "metadata": intent.metadata
        },
        workspace_id=workspace_id,
        user_id=user_id
    )
```

---

## 🎯 Change Type Selection Guide

### For Page Modifications:

| What You Want | Change Type | Authority Required |
|---------------|-------------|-------------------|
| Add section | `ADD_SECTION` | assist_structure |
| Add checklist | `ADD_CHECKLIST` | assist_structure |
| Update metadata | `ADD_METADATA` | suggest |
| Link to task | `LINK_ENTITY` | suggest |

### For Task Modifications:

| What You Want | Change Type | Authority Required |
|---------------|-------------|-------------------|
| Create task | `SUGGEST_TASK` | suggest |
| Break down task | `SUGGEST_BREAKDOWN` | suggest |
| Update metadata | `UPDATE_TASK_META` | suggest |
| Link to skill | `LINK_ENTITY` | suggest |

---

## 🚫 What NOT to Do

### ❌ Don't Bypass Authority System
```python
# ❌ WRONG - Direct modification
supabase.table("pages").update({"content": new_content}).execute()

# ❌ WRONG - Checking authority but modifying anyway
allowed, _ = await skill_authority.can_skill_act(...)
if allowed:
    supabase.table("pages").update(...).execute()  # Still wrong!
```

### ❌ Don't Create Vague Suggestions
```python
# ❌ WRONG - Vague explanation
description="Update page"
why="Needs update"

# ✅ CORRECT - Clear explanation
description="Add 'Next Actions' section"
why="Page has planning content but no tracked action items"
```

### ❌ Don't Ignore Permission Checks
```python
# ❌ WRONG - No permission check
await skill_authority.create_suggestion(...)

# ✅ CORRECT - Check first
allowed, reason = await skill_authority.can_skill_act(...)
if allowed:
    await skill_authority.create_suggestion(...)
else:
    print(f"Cannot suggest: {reason}")
```

---

## 🧪 Testing Your Integration

### Test 1: Permission Check
```python
# Test that skill respects authority
allowed, reason = await skill_authority.can_skill_act(
    skill_id="test_skill",
    change_type=ChangeType.REWRITE_CONTENT,  # Should be blocked
    target_type="page",
    target_id="page_123",
    workspace_id="workspace_456"
)

assert not allowed, "Should block content rewriting"
assert "not allowed" in reason.lower()
```

### Test 2: Suggestion Creation
```python
# Test that suggestion is created correctly
suggestion = await skill_authority.create_suggestion(
    skill_id="test_skill",
    change_type=ChangeType.ADD_SECTION,
    target_type="page",
    target_id="page_123",
    description="Add section",
    why="Test reason",
    payload={"section_title": "Test"},
    workspace_id="workspace_456",
    user_id="user_789"
)

assert suggestion is not None
assert suggestion.requires_approval == True
```

### Test 3: Confidence Impact
```python
# Test that approval increases confidence
initial_confidence = await get_skill_confidence("test_skill")

await skill_authority.approve_suggestion(suggestion_id, user_id)

final_confidence = await get_skill_confidence("test_skill")
assert final_confidence > initial_confidence
```

---

## 📊 Monitoring Integration

### Check Suggestion Rate
```python
# Get suggestions created by your skill
suggestions = supabase.table("skill_suggestions")\
    .select("*")\
    .eq("skill_id", your_skill_id)\
    .execute()

print(f"Total suggestions: {len(suggestions.data)}")
```

### Check Acceptance Rate
```python
# Calculate acceptance rate
approved = len([s for s in suggestions.data if s["approved"]])
total = len(suggestions.data)
acceptance_rate = (approved / total * 100) if total > 0 else 0

print(f"Acceptance rate: {acceptance_rate:.1f}%")
```

### Check Suppression Status
```python
# Check if skill is suppressed
is_suppressed = await skill_authority._is_suppressed(your_skill_id)
if is_suppressed:
    print("⚠️ Skill is currently suppressed")
```

---

## 🎓 Best Practices

### 1. Always Check Authority First
```python
allowed, reason = await skill_authority.can_skill_act(...)
if not allowed:
    return  # Don't proceed
```

### 2. Provide Clear Explanations
```python
description="Add 'Next Actions' section"  # What
why="Page has planning content but no action items"  # Why
```

### 3. Make Payloads Actionable
```python
payload={
    "section_title": "Next Actions",
    "section_type": "checklist",
    "default_items": ["Review", "Approve", "Deploy"]
}
```

### 4. Handle Rejection Gracefully
```python
# Don't retry immediately if rejected
# Learn from the rejection and adjust behavior
```

### 5. Monitor Performance
```python
# Regularly check acceptance rate
# Adjust suggestions based on feedback
```

---

## ✅ Integration Checklist

- [ ] Import skill_authority module
- [ ] Replace all direct modifications with suggestions
- [ ] Add permission checks before creating suggestions
- [ ] Provide clear descriptions and reasons
- [ ] Use appropriate ChangeType for each action
- [ ] Test with different authority levels
- [ ] Test with different confidence levels
- [ ] Monitor acceptance rates
- [ ] Handle suppression gracefully
- [ ] Update documentation

---

## 🚀 Deployment

### 1. Update Code
```bash
git add backend/app/services/skill_authority.py
git add backend/app/api/endpoints/skill_suggestions.py
git add backend/migrations/add_skill_authority_system.sql
git commit -m "Add Safe Skill Authority System"
```

### 2. Run Migration
```bash
psql $DATABASE_URL -f backend/migrations/add_skill_authority_system.sql
```

### 3. Restart Backend
```bash
cd backend
python main.py
```

### 4. Verify
```bash
# Check that endpoints are available
curl http://localhost:8000/api/v1/skill-suggestions/pending?workspace_id=xxx
```

---

## 📚 Additional Resources

- `SAFE_SKILL_AUTHORITY_IMPLEMENTATION.md` - Complete implementation guide
- `SKILL_AUTHORITY_QUICK_REFERENCE.md` - Quick reference
- `SKILL_AUTHORITY_SYSTEM_COMPLETE.md` - System overview

---

**Remember: Skills suggest, users decide. This is an Intelligence OS, not an automation engine.**
