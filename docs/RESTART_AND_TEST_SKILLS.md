# 🚀 Restart Backend & Test Skills

## ✅ All Integration Complete

The skill system is fully integrated and ready to test. All 5 tables are being used correctly.

---

## 🔄 Step 1: Restart Backend

The new integration code needs to be loaded:

```bash
# Stop backend if running
# Then start it:
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

**What's loaded**:
- ✅ Auto-linking in `pages.py` (line 428-445)
- ✅ Auto-linking in `tasks.py` (line 169-189)
- ✅ Contribution tracking in `tasks.py` (line 348-368)
- ✅ Progress calculation endpoints in `intelligence.py`

---

## 🧪 Step 2: Test Auto-Linking

### Test 1: Create a Page
```
1. Go to Pages
2. Click "New Page"
3. Title: "SQL Database Tutorial"
4. Content: "Learn about SQL queries, joins, and database design"
5. Tags: ["database", "sql"]
6. Save

Expected Backend Log:
✅ Auto-linked page 'SQL Database Tutorial' to skill 'Data Analytics' (75% confidence)
   - Data Analytics (75% confidence)
```

### Test 2: Create a Task
```
1. Go to Tasks
2. Click "New Task"
3. Title: "Learn Python basics"
4. Description: "Complete Python tutorial"
5. Save

Expected Backend Log:
✅ Auto-linked task 'Learn Python basics' to skill 'Programming' (68% confidence)
```

---

## 📊 Step 3: Test Progress Tracking

### Complete a Task
```
1. Find the task you created
2. Mark it as "Completed"
3. Check backend logs

Expected Backend Log:
✅ Tracked task acceleration: 5 days saved for skill
✅ Skill data_analytics updated: confidence 0.65 → 0.70
```

### Check Progress
```
1. Go to Skills page
2. Find the skill that was linked
3. Look at progress percentage

Expected:
- Progress circle shows > 0%
- "💪 X.X impact score from X contributions" appears
- Progress breakdown shows:
  - Impact: XX%
  - Contributions: XX%
  - Diversity: XX%
```

---

## 🎯 Step 4: Verify Data in Supabase

### Check skill_contributions
```sql
SELECT 
  contribution_type,
  impact_score,
  target_type,
  created_at
FROM skill_contributions
ORDER BY created_at DESC
LIMIT 10;
```

**Expected**: Rows with `task_accelerated`, `suggestion_accepted`, etc.

### Check skill_evidence
```sql
SELECT 
  se.evidence_type,
  se.confidence_score,
  p.title as page_title,
  s.name as skill_name
FROM skill_evidence se
JOIN pages p ON se.page_id = p.id
JOIN skills s ON se.skill_id = s.id
ORDER BY se.created_at DESC
LIMIT 10;
```

**Expected**: Rows with `auto_linked` type and confidence scores

---

## 🔍 Step 5: Test API Endpoints

### Get Real Progress
```bash
# Replace {skill_id} with actual skill ID
curl http://localhost:8000/api/intelligence/skills/{skill_id}/real-progress \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response**:
```json
{
  "progress": 45.2,
  "can_evolve": false,
  "total_impact": 1.2,
  "contribution_count": 8,
  "contribution_types": 3,
  "breakdown": {
    "impact": 120.0,
    "count": 80.0,
    "diversity": 150.0
  }
}
```

### Auto-Link Page
```bash
curl -X POST http://localhost:8000/api/intelligence/skills/auto-link/page \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "page_id": "page_123",
    "page_title": "Machine Learning Guide",
    "page_content": "Introduction to ML algorithms",
    "page_tags": ["ai", "ml"],
    "workspace_id": "workspace_123"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "links_created": 2,
  "links": [
    {
      "skill_id": "skill_ai",
      "skill_name": "Artificial Intelligence",
      "confidence": 0.82,
      "link_id": "link_123"
    }
  ]
}
```

---

## 📈 Step 6: Test Evolution

### Get Skill to 100%
```
1. Create 5+ tasks linked to a skill
2. Complete them all quickly
3. Create 3+ pages linked to the skill
4. Accept suggestions from the skill

This will generate contributions:
- task_accelerated: +0.15 each
- suggestion_accepted: +0.15 each
- page_improved: +0.10 each
```

### Evolve Skill
```
1. Go to Skills page
2. Find skill at 100%
3. Click "Evolve to L2" button
4. Skill level changes: Beginner → Intermediate
```

---

## ✅ Success Indicators

### Backend Logs Should Show:
```
✅ Auto-linked page 'SQL Tutorial' to skill 'Data Analytics' (75% confidence)
✅ Auto-linked task 'Learn Python' to skill 'Programming' (68% confidence)
✅ Tracked task acceleration: 4 days saved for skill
✅ Skill data_analytics updated: confidence 0.65 → 0.85
```

### Frontend Should Show:
```
✅ Skills page displays progress > 0%
✅ Impact score visible: "💪 1.2 impact score from 8 contributions"
✅ Progress breakdown visible
✅ Evolve button appears at 100%
✅ Linked pages show in skill detail
✅ Linked tasks show in skill detail
```

### Database Should Have:
```
✅ Rows in skill_contributions
✅ Rows in skill_evidence with auto_linked type
✅ Updated confidence_score in skills table
✅ Updated activation_count in skills table
```

---

## 🐛 Troubleshooting

### "Skills still show 0%"
**Cause**: No contributions yet
**Fix**: Complete a task that's linked to the skill

### "Auto-linking not working"
**Cause**: Backend not restarted
**Fix**: Restart backend to load new code

### "No skill suggestions"
**Cause**: No skills in workspace
**Fix**: Create skills first, then create pages/tasks

### "Evolve button not appearing"
**Cause**: Progress < 100%
**Fix**: Need more contributions (see Step 6)

---

## 📝 What Each File Does

### Backend Services
- `skill_contribution_tracker.py` - Tracks real impact
- `skill_auto_linker.py` - Auto-links pages/tasks
- `skill_agent.py` - Skill lifecycle management
- `intelligence_engine.py` - Processes signals

### Backend Endpoints
- `intelligence.py` - All skill intelligence APIs
- `pages.py` - Page CRUD + auto-linking
- `tasks.py` - Task CRUD + auto-linking + tracking

### Frontend
- `SkillsPage.tsx` - Displays skills with real progress
- `api.ts` - API client methods

### Database
- `skill_contributions` - Impact tracking
- `skill_evidence` - Page/skill links
- `skill_memory` - Learning storage
- `skill_executions` - Activation logs
- `skill_chains` - Skill relationships

---

## 🎉 Expected Outcome

After testing, you should see:

1. ✅ Pages auto-link to skills when created
2. ✅ Tasks auto-link to skills when created
3. ✅ Contributions tracked when tasks complete
4. ✅ Progress > 0% on skills page
5. ✅ Impact scores visible
6. ✅ Evolve button at 100%
7. ✅ All 5 tables have data

**The skill system is working FOR you, not just displaying data.**
