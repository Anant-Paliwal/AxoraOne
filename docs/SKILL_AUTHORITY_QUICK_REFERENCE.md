# Skill Authority System - Quick Reference

## 🎯 Core Rules (Non-Negotiable)

### Skills MUST NOT:
- ❌ Rewrite user-written content
- ❌ Change meaning or intent
- ❌ Delete content
- ❌ Silently reprioritize work
- ❌ Auto-complete tasks
- ❌ Auto-create goals

### Skills MAY (with approval):
- ✅ Add structural placeholders
- ✅ Suggest task creation
- ✅ Link entities
- ✅ Update low-risk metadata

---

## 📊 Authority Levels

| Level | Behavior | Confidence Required |
|-------|----------|---------------------|
| `read_only` | Insights only, no modifications | Any |
| `suggest` | Propose changes (DEFAULT) | ≥ 0.25 |
| `assist_structure` | Limited safe structural updates | ≥ 0.80 |

---

## 🔒 Permission Checks

```python
from app.services.skill_authority import skill_authority, ChangeType

# Check if skill can act
allowed, reason = await skill_authority.can_skill_act(
    skill_id="skill_123",
    change_type=ChangeType.ADD_SECTION,
    target_type="page",
    target_id="page_456",
    workspace_id="workspace_789"
)

if not allowed:
    print(f"Blocked: {reason}")
    return
```

---

## 💡 Creating Suggestions

```python
# Create a suggestion (requires user approval)
suggestion = await skill_authority.create_suggestion(
    skill_id="skill_123",
    change_type=ChangeType.SUGGEST_TASK,
    target_type="task",
    target_id="task_456",
    description="Break down this large task",
    why="Task delayed 3 times with no subtasks",
    payload={"subtasks": [...]},
    workspace_id="workspace_789",
    user_id="user_abc"
)
```

---

## 📡 API Endpoints

### Get Pending Suggestions
```bash
GET /api/v1/skill-suggestions/pending?workspace_id=xxx
```

### Approve Suggestion
```bash
POST /api/v1/skill-suggestions/{id}/approve
```

### Reject Suggestion
```bash
POST /api/v1/skill-suggestions/{id}/reject
```

### Ignore Suggestion
```bash
POST /api/v1/skill-suggestions/{id}/ignore
```

### Get Stats
```bash
GET /api/v1/skill-suggestions/stats?workspace_id=xxx
```

---

## 🎯 Change Types

### ✅ SAFE (Low Risk)
- `add_section` - Add structural section
- `add_checklist` - Add empty checklist
- `add_metadata` - Update metadata
- `link_entity` - Link to task/skill

### ⚠️ MODERATE (Requires Approval)
- `suggest_task` - Suggest task creation
- `suggest_breakdown` - Suggest task breakdown
- `update_task_meta` - Update task metadata

### 🚫 BLOCKED (Never Allowed)
- `rewrite_content` - Rewrite text
- `delete_content` - Delete content
- `change_priority` - Change priority
- `auto_complete` - Auto-complete
- `change_intent` - Change meaning

---

## 📈 Confidence Impact

| Action | Confidence Delta |
|--------|------------------|
| Suggestion approved | +0.05 |
| Suggestion rejected | -0.10 |
| Suggestion ignored | 0 (tracked) |
| 3 ignores | Suppress 7 days |

---

## 🔧 Quick Fixes

### Reset Suppression
```sql
DELETE FROM skill_suppression WHERE skill_id = 'skill_id';
```

### Boost Confidence
```sql
UPDATE skills SET confidence = 0.5 WHERE id = 'skill_id';
```

### Change Authority Level
```sql
UPDATE skills 
SET authority_level = 'assist_structure' 
WHERE id = 'skill_id' AND confidence >= 0.8;
```

### Check Pending Suggestions
```sql
SELECT * FROM skill_suggestions
WHERE workspace_id = 'workspace_id'
AND approved = false
AND rejected = false
AND ignored = false;
```

---

## 🎓 Example: Page Modification

```python
# ❌ WRONG - Direct modification
supabase.table("pages").update({
    "content": "New content"
}).eq("id", page_id).execute()

# ✅ CORRECT - Create suggestion
await skill_authority.create_suggestion(
    skill_id=skill_id,
    change_type=ChangeType.ADD_SECTION,
    target_type="page",
    target_id=page_id,
    description="Add 'Next Actions' section",
    why="Page has planning but no tracked actions",
    payload={"section_title": "Next Actions"},
    workspace_id=workspace_id,
    user_id=user_id
)
```

---

## 🎓 Example: Task Modification

```python
# ❌ WRONG - Auto-complete task
supabase.table("tasks").update({
    "status": "completed"
}).eq("id", task_id).execute()

# ✅ CORRECT - Suggest breakdown
await skill_authority.create_suggestion(
    skill_id=skill_id,
    change_type=ChangeType.SUGGEST_BREAKDOWN,
    target_type="task",
    target_id=task_id,
    description="Break down into smaller tasks",
    why="Task delayed 3 times, likely too large",
    payload={
        "suggested_subtasks": [
            {"title": "Step 1", "priority": "high"},
            {"title": "Step 2", "priority": "medium"}
        ]
    },
    workspace_id=workspace_id,
    user_id=user_id
)
```

---

## 🚨 Common Mistakes

### ❌ Mistake 1: Modifying content directly
```python
# DON'T
page["content"] = new_content
```

### ✅ Solution: Create suggestion
```python
# DO
await skill_authority.create_suggestion(...)
```

---

### ❌ Mistake 2: Not checking authority
```python
# DON'T
await execute_change(...)
```

### ✅ Solution: Check first
```python
# DO
allowed, reason = await skill_authority.can_skill_act(...)
if allowed:
    await skill_authority.create_suggestion(...)
```

---

### ❌ Mistake 3: Vague explanations
```python
# DON'T
description="Update page"
why="Needs update"
```

### ✅ Solution: Be specific
```python
# DO
description="Add 'Next Actions' section"
why="Page has planning content but no action items tracked"
```

---

## 📊 Monitoring

### Check Skill Performance
```python
GET /api/v1/skill-suggestions/skill/{skill_id}/performance?workspace_id=xxx
```

**Response:**
```json
{
  "acceptance_rate": 75.0,
  "total_confidence_impact": 0.45,
  "recent_7_days": {
    "acceptance_rate": 80.0
  }
}
```

### Identify Problem Skills
```sql
-- Skills with low acceptance rate
SELECT 
  s.id,
  s.name,
  COUNT(*) as total_suggestions,
  SUM(CASE WHEN ss.approved THEN 1 ELSE 0 END) as approved,
  ROUND(SUM(CASE WHEN ss.approved THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 1) as acceptance_rate
FROM skills s
JOIN skill_suggestions ss ON s.id = ss.skill_id
GROUP BY s.id, s.name
HAVING COUNT(*) >= 5
ORDER BY acceptance_rate ASC;
```

---

## 🎯 Key Principles

1. **Skills suggest, users decide**
2. **Confidence earned through helpful suggestions**
3. **All changes are reversible**
4. **Learn from user feedback**
5. **Suppress annoying skills**
6. **Transparent reasoning**

---

**Remember: This is an Intelligence OS, not an automation engine.**
