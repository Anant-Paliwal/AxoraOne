# Skill Intelligence - Quick Setup Guide

## ✅ What's Been Implemented

### Backend Services
- ✅ `skill_contribution_tracker.py` - Tracks real contributions
- ✅ `skill_auto_linker.py` - Auto-links pages/tasks to skills
- ✅ Intelligence API endpoints added
- ✅ Database migration created

### Frontend Updates
- ✅ API client methods added
- ✅ SkillsPage shows real progress
- ✅ Evolve button appears at 100%
- ✅ Progress breakdown displayed

### Database Schema
- ✅ `skill_contributions` table
- ✅ New columns on `skills` table
- ✅ RLS policies configured

## 🚀 Setup Steps

### 1. Apply Database Migration

```bash
# Connect to your Supabase database
psql postgresql://[YOUR_CONNECTION_STRING]

# Run the migration
\i create-skill-contributions-table.sql
```

Or via Supabase Dashboard:
1. Go to SQL Editor
2. Copy contents of `create-skill-contributions-table.sql`
3. Run query

### 2. Restart Backend

```bash
cd backend
python -m uvicorn app.main:app --reload
```

### 3. Test the System

#### Test 1: Auto-Linking Pages
```bash
# 1. Create a skill named "Python Programming"
# 2. Create a page with "Python" in the title
# 3. Check if page auto-links to skill
# Expected: Link created with confidence score
```

#### Test 2: Auto-Linking Tasks
```bash
# 1. Create a task with "Python" in title
# 2. Check if task.linked_skill_id is set
# Expected: Task linked to Python skill
```

#### Test 3: Real Progress
```bash
# 1. Complete a task linked to a skill
# 2. Check skill progress
# Expected: Progress increases based on contribution
```

#### Test 4: Evolve Button
```bash
# 1. Get a skill to 100% progress
# 2. Check if "Evolve" button appears
# 3. Click to advance level
# Expected: Skill advances to next level
```

## 🔧 Configuration

### Auto-Link Confidence Threshold

Default: 60% (only auto-link if 60%+ confident)

To adjust:
```python
# In skill_auto_linker.py
self.confidence_threshold = 0.6  # Change to 0.5 for more aggressive linking
```

### Contribution Impact Scores

Default scores in `skill_contribution_tracker.py`:
```python
suggestion_accepted: +0.15
suggestion_rejected: -0.10
task_accelerated: +0.05 per day saved
page_improved: +0.10 to +0.12
decision_quality: +0.10 (good) / -0.15 (bad)
problem_prevented: +0.20
```

### Level Requirements

Default requirements in `skill_contribution_tracker.py`:
```python
Beginner → Intermediate:
  - min_impact: 0.5
  - min_contributions: 5
  - min_types: 2

Intermediate → Advanced:
  - min_impact: 1.5
  - min_contributions: 15
  - min_types: 3

Advanced → Expert:
  - min_impact: 3.0
  - min_contributions: 30
  - min_types: 4
```

## 🎯 Integration Checklist

### Pages
- [ ] Auto-link on page creation
- [ ] Auto-link on page edit (if content changed significantly)
- [ ] Show suggested skills in page editor
- [ ] Track page improvements

### Tasks
- [ ] Auto-link on task creation
- [ ] Track task acceleration on completion
- [ ] Show linked skill in task card
- [ ] Update skill confidence on task completion

### Suggestions
- [ ] Track when user accepts suggestion
- [ ] Track when user rejects suggestion
- [ ] Link suggestions to source skill
- [ ] Show acceptance rate in skill card

### Skills Page
- [x] Show real progress (not fake metrics)
- [x] Display contribution count
- [x] Show impact score
- [x] Display evolve button at 100%
- [x] Show progress breakdown
- [ ] Add "View Contributions" detail view

## 📊 Monitoring

### Check Skill Health

```sql
-- View skill contributions
SELECT 
  s.name,
  s.level,
  s.confidence_score,
  COUNT(sc.id) as contribution_count,
  SUM(sc.impact_score) as total_impact
FROM skills s
LEFT JOIN skill_contributions sc ON s.id = sc.skill_id
GROUP BY s.id, s.name, s.level, s.confidence_score
ORDER BY total_impact DESC;
```

### Check Auto-Linking Performance

```sql
-- View auto-linked evidence
SELECT 
  s.name as skill_name,
  p.title as page_title,
  se.confidence_score,
  se.evidence_type,
  se.created_at
FROM skill_evidence se
JOIN skills s ON se.skill_id = s.id
JOIN pages p ON se.page_id = p.id
WHERE se.evidence_type = 'auto_linked'
ORDER BY se.created_at DESC
LIMIT 20;
```

### Check Skill Progress

```sql
-- View skills ready to evolve
SELECT 
  s.name,
  s.level,
  COUNT(sc.id) as contributions,
  SUM(sc.impact_score) as impact,
  COUNT(DISTINCT sc.contribution_type) as types
FROM skills s
LEFT JOIN skill_contributions sc ON s.id = sc.skill_id
WHERE sc.created_at > NOW() - INTERVAL '90 days'
GROUP BY s.id, s.name, s.level
HAVING 
  SUM(sc.impact_score) >= 0.5 AND
  COUNT(sc.id) >= 5 AND
  COUNT(DISTINCT sc.contribution_type) >= 2;
```

## 🐛 Troubleshooting

### Auto-Linking Not Working

1. Check backend logs for errors
2. Verify workspace_id is passed correctly
3. Check confidence threshold (might be too high)
4. Verify skills exist in workspace

### Progress Not Updating

1. Check if contributions are being recorded:
   ```sql
   SELECT * FROM skill_contributions 
   ORDER BY created_at DESC LIMIT 10;
   ```
2. Verify API endpoints are being called
3. Check backend logs for errors

### Evolve Button Not Appearing

1. Check real progress calculation:
   ```bash
   curl http://localhost:8000/api/v1/intelligence/skills/{skill_id}/real-progress
   ```
2. Verify all requirements are met
3. Check if skill is already at Expert level

## 📚 API Reference

### Get Real Progress
```typescript
GET /intelligence/skills/{skill_id}/real-progress

Response:
{
  "progress": 73.5,
  "can_evolve": false,
  "total_impact": 1.2,
  "contribution_count": 12,
  "contribution_types": 3,
  "requirements": {
    "min_impact": 1.5,
    "min_contributions": 15,
    "min_types": 3
  },
  "breakdown": {
    "impact": 80.0,
    "count": 80.0,
    "diversity": 60.0
  }
}
```

### Evolve Skill
```typescript
POST /intelligence/skills/{skill_id}/evolve

Response:
{
  "success": true,
  "previous_level": "Beginner",
  "new_level": "Intermediate",
  "message": "Skill evolved from Beginner to Intermediate!"
}
```

### Auto-Link Page
```typescript
POST /intelligence/skills/auto-link/page
{
  "page_id": "uuid",
  "page_title": "Python Basics",
  "page_content": "Learn Python...",
  "page_tags": ["python", "programming"],
  "workspace_id": "uuid"
}

Response:
{
  "success": true,
  "links_created": 2,
  "links": [
    {
      "skill_id": "uuid",
      "skill_name": "Python Programming",
      "confidence": 0.85,
      "link_id": "uuid"
    }
  ]
}
```

## ✨ Next Enhancements

1. **Contribution Detail View**
   - Show all contributions for a skill
   - Timeline of impact
   - Breakdown by type

2. **Skill Suggestions**
   - Suggest creating new skills based on content
   - Recommend skill connections
   - Identify skill gaps

3. **Batch Auto-Linking**
   - Re-analyze existing pages
   - Find missing connections
   - Improve confidence scores

4. **Learning Dashboard**
   - Show skill growth over time
   - Compare skill performance
   - Identify bottlenecks

## 🎉 Success Criteria

System is working when:
- ✅ Pages auto-link to skills (check logs)
- ✅ Tasks auto-link to skills (check task.linked_skill_id)
- ✅ Progress updates on task completion
- ✅ Evolve button appears at 100%
- ✅ Skills advance to next level
- ✅ Confidence scores increase with contributions

**Skills should feel like they're working FOR you, not just displaying data.**
