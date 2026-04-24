# Safe Skill Authority System - Implementation Complete

## 🎯 Overview

The Axora Skill Engine now enforces **SAFE, TRUSTED, INTELLIGENCE-OS behavior** when interacting with Pages and Tasks.

**Core Principle:**
Skills help users by detecting gaps and reducing friction, NOT by taking control or changing intent.

---

## ✅ What Was Implemented

### 1. Skill Authority Model (3 Levels)

```python
class AuthorityLevel(Enum):
    READ_ONLY = "read_only"              # Insight only, no modifications
    SUGGEST = "suggest"                   # Propose changes (DEFAULT)
    ASSIST_STRUCTURE = "assist_structure" # Limited safe structural updates
```

**Default:** All skills start with `suggest` authority level.

### 2. Change Type Classification

#### ✅ SAFE (Structure Only)
- `add_section` - Add structural placeholder (e.g., "Next Actions")
- `add_checklist` - Add empty checklist
- `add_metadata` - Update page metadata
- `link_entity` - Link page to task/skill

#### ⚠️ MODERATE (Requires Approval)
- `suggest_task` - Suggest task creation
- `suggest_breakdown` - Suggest task breakdown
- `update_task_meta` - Update task metadata

#### 🚫 BLOCKED (Never Allowed)
- `rewrite_content` - Rewrite user text
- `delete_content` - Delete user content
- `change_priority` - Auto-change task priority
- `auto_complete` - Auto-complete tasks
- `change_intent` - Change meaning/intent

### 3. Permission Check Pipeline

Before any update, the system enforces:

```python
# Rule 1: Block if change alters intent
if change_type alters intent → BLOCK

# Rule 2: Check confidence threshold
if confidence < threshold → SUGGEST ONLY

# Rule 3: Check if change is reversible
if not reversible → BLOCK

# Rule 4: Check recent rejection history
if user rejected similar recently → SUPPRESS

# Rule 5: Check suppression status
if ignored 3+ times → SUPPRESS for 7 days
```

### 4. Database Schema

**New Tables:**
- `skill_suggestions` - Stores all skill suggestions awaiting approval
- `skill_feedback` - Tracks user responses (approved/rejected/ignored)

**Updated Tables:**
- `skills.authority_level` - Authority level for each skill

### 5. API Endpoints

```
GET    /api/v1/skill-suggestions/pending?workspace_id=xxx
GET    /api/v1/skill-suggestions/history?workspace_id=xxx
POST   /api/v1/skill-suggestions/{id}/approve
POST   /api/v1/skill-suggestions/{id}/reject
POST   /api/v1/skill-suggestions/{id}/ignore
GET    /api/v1/skill-suggestions/stats?workspace_id=xxx
GET    /api/v1/skill-suggestions/skill/{skill_id}/performance
```

---

## 🔒 Page Update Rules

### Skills MAY NOT:
- ❌ Rewrite paragraphs
- ❌ Change heading text
- ❌ Summarize content automatically
- ❌ Delete sections

### Skills MAY (with approval):
- ✅ Add structural placeholders ("Next Actions", "Open Questions")
- ✅ Link page to tasks
- ✅ Update page metadata (status, skill link)

### Example Allowed Suggestion:
```
"This page shows planning intent but no execution.
Would you like me to add a 'Next Actions' section?"
```
→ Requires explicit user approval

---

## 🔒 Task Update Rules

### Skills MAY:
- ✅ Suggest task creation
- ✅ Suggest task breakdown
- ✅ Auto-update LOW-RISK metadata:
  - Skill linkage
  - Dependency hints
  - Estimated size label

### Skills MAY NOT:
- ❌ Auto-complete tasks
- ❌ Auto-create goals
- ❌ Auto-change task priority
- ❌ Auto-split tasks

**All task creation and decomposition requires user confirmation.**

---

## 📊 Confidence-Based Behavior

### Confidence Thresholds:
- **< 0.25** → Skill stays silent
- **0.25 - 0.79** → Can suggest (requires approval)
- **0.80+** → Can assist with structure (if authority_level = assist_structure)

### Confidence Updates:
- **Suggestion approved** → +0.05 confidence
- **Suggestion rejected** → -0.10 confidence
- **Suggestion ignored** → Track for suppression

### Suppression Rules:
- **3 ignores** → Suppress skill for 7 days
- **Low confidence** → Reduce suggestion frequency
- **Recent rejection** → Don't suggest similar changes

---

## 🔄 Suggestion Workflow

### 1. Skill Detects Pattern
```python
# Example: Oversized task detected
signal = SignalType.OVERSIZED_TASK
```

### 2. Skill Creates Suggestion
```python
suggestion = await skill_authority.create_suggestion(
    skill_id="skill_123",
    change_type=ChangeType.SUGGEST_BREAKDOWN,
    target_type="task",
    target_id="task_456",
    description="Break down this large task into smaller steps",
    why="Task has been delayed 3 times and has no subtasks",
    payload={"suggested_subtasks": [...]},
    workspace_id=workspace_id,
    user_id=user_id
)
```

### 3. User Reviews Suggestion
- **Approve** → Execute change, +confidence
- **Reject** → Learn from feedback, -confidence
- **Ignore** → Track for suppression

### 4. System Learns
- Updates skill confidence
- Tracks contribution
- Adjusts future behavior

---

## 🏠 Home Screen Integration

Skills DO NOT expose raw changes to Home.

Skills emit **JUDGMENTS** only:
- `blocker` - Something is blocking progress
- `next_action` - Suggested next step
- `contributing` - Skill is helping
- `needs_attention` - Requires user input

**Home decides visibility.**

---

## 🚀 Setup Instructions

### 1. Run Database Migration
```bash
# Apply the skill authority system migration
psql $DATABASE_URL -f backend/migrations/add_skill_authority_system.sql
```

### 2. Restart Backend
```bash
cd backend
python main.py
```

The system will automatically:
- Set all existing skills to `suggest` authority level
- Create suggestion and feedback tables
- Enable RLS policies

### 3. Test the System

#### Create a Suggestion (Backend)
```python
from app.services.skill_authority import skill_authority, ChangeType

suggestion = await skill_authority.create_suggestion(
    skill_id="your_skill_id",
    change_type=ChangeType.ADD_SECTION,
    target_type="page",
    target_id="your_page_id",
    description="Add 'Next Actions' section",
    why="Page has planning content but no action items",
    payload={"section_title": "Next Actions"},
    workspace_id="your_workspace_id",
    user_id="your_user_id"
)
```

#### Get Pending Suggestions (API)
```bash
curl -X GET "http://localhost:8000/api/v1/skill-suggestions/pending?workspace_id=xxx" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Approve Suggestion (API)
```bash
curl -X POST "http://localhost:8000/api/v1/skill-suggestions/{suggestion_id}/approve" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📈 Monitoring & Analytics

### Get Suggestion Stats
```bash
GET /api/v1/skill-suggestions/stats?workspace_id=xxx
```

**Response:**
```json
{
  "total": 45,
  "approved": 30,
  "rejected": 10,
  "ignored": 5,
  "pending": 0,
  "acceptance_rate": 66.7,
  "by_risk_level": {
    "low": 25,
    "medium": 15,
    "high": 5
  },
  "by_suggestion_type": {
    "add_section": 15,
    "suggest_task": 20,
    "link_entity": 10
  }
}
```

### Get Skill Performance
```bash
GET /api/v1/skill-suggestions/skill/{skill_id}/performance?workspace_id=xxx
```

**Response:**
```json
{
  "skill_id": "skill_123",
  "total_suggestions": 20,
  "approved": 15,
  "rejected": 3,
  "ignored": 2,
  "acceptance_rate": 75.0,
  "total_confidence_impact": 0.45,
  "recent_7_days": {
    "total": 5,
    "approved": 4,
    "acceptance_rate": 80.0
  }
}
```

---

## 🔧 Configuration

### Adjust Confidence Thresholds
Edit `backend/app/services/skill_authority.py`:

```python
class SkillAuthority:
    # Confidence thresholds
    MIN_CONFIDENCE_SUGGEST = 0.25      # Minimum to suggest
    MIN_CONFIDENCE_STRUCTURE = 0.80    # Minimum for structural changes
    
    # Suppression rules
    IGNORE_THRESHOLD = 3               # Suppress after N ignores
    SUPPRESSION_DAYS = 7               # Days to suppress
```

### Change Authority Level for a Skill
```sql
UPDATE skills
SET authority_level = 'assist_structure'
WHERE id = 'skill_id' AND confidence >= 0.8;
```

---

## 🎓 Best Practices

### For Skill Developers:

1. **Always check authority before acting**
   ```python
   allowed, reason = await skill_authority.can_skill_act(
       skill_id, change_type, target_type, target_id, workspace_id
   )
   if not allowed:
       print(f"Not allowed: {reason}")
       return
   ```

2. **Create suggestions, don't modify directly**
   ```python
   # ❌ DON'T DO THIS
   supabase.table("pages").update({"content": new_content}).execute()
   
   # ✅ DO THIS
   await skill_authority.create_suggestion(...)
   ```

3. **Provide clear explanations**
   ```python
   description="Add 'Next Actions' section",
   why="Page has planning content but no action items tracked"
   ```

4. **Make changes reversible**
   - Prefer additions over modifications
   - Store original state
   - Provide undo mechanism

### For Users:

1. **Review suggestions regularly**
   - Check pending suggestions in Home screen
   - Approve helpful ones
   - Reject unhelpful ones (helps skill learn)

2. **Don't ignore repeatedly**
   - If a skill is annoying, reject suggestions
   - System will learn and suppress the skill

3. **Upgrade trusted skills**
   - Skills with high acceptance rate can be upgraded
   - `assist_structure` allows safe structural updates

---

## 🔍 Troubleshooting

### Skill Not Making Suggestions

**Check:**
1. Confidence level: `SELECT confidence FROM skills WHERE id = 'skill_id'`
2. Suppression status: `SELECT * FROM skill_suppression WHERE skill_id = 'skill_id'`
3. Authority level: `SELECT authority_level FROM skills WHERE id = 'skill_id'`

**Fix:**
```sql
-- Reset suppression
DELETE FROM skill_suppression WHERE skill_id = 'skill_id';

-- Boost confidence
UPDATE skills SET confidence = 0.5 WHERE id = 'skill_id';
```

### Suggestions Not Appearing

**Check:**
1. RLS policies enabled
2. User has workspace access
3. Suggestions not already acted upon

**Query:**
```sql
SELECT * FROM skill_suggestions
WHERE workspace_id = 'workspace_id'
AND approved = false
AND rejected = false
AND ignored = false;
```

---

## 📚 Architecture Files

- `backend/app/services/skill_authority.py` - Core authority system
- `backend/app/api/endpoints/skill_suggestions.py` - API endpoints
- `backend/migrations/add_skill_authority_system.sql` - Database schema
- `backend/app/services/skill_engine.py` - Event-driven skill engine
- `backend/app/services/skill_contribution_tracker.py` - Contribution tracking

---

## 🎯 Key Takeaways

1. ✅ **Skills suggest, users decide** - No automatic content modification
2. ✅ **Confidence-based behavior** - Skills earn trust through helpful suggestions
3. ✅ **Reversible changes only** - All modifications can be undone
4. ✅ **Learn from feedback** - System adapts based on user responses
5. ✅ **Suppression for annoying skills** - Ignored skills get suppressed
6. ✅ **Transparent reasoning** - Every suggestion explains "why"

---

## 🚀 Next Steps

1. **Run the migration** to enable the authority system
2. **Test with existing skills** to see suggestions in action
3. **Monitor acceptance rates** to identify helpful vs annoying skills
4. **Upgrade trusted skills** to `assist_structure` for better UX
5. **Build frontend UI** to display and manage suggestions

---

**This is an Intelligence OS, not an automation engine.**

Skills observe, infer, suggest, and learn. Users stay in control.
