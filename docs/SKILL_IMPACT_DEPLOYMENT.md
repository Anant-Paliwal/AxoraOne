# Skill Impact Widget - Deployment Checklist

## ✅ Implementation Complete

All code is written and ready to deploy.

---

## Pre-Deployment Checklist

### 1. Backend Files
- ✅ `backend/app/services/skill_widget_intelligence.py` - Created
- ✅ `backend/app/api/endpoints/intelligence.py` - Updated (added endpoint)

### 2. Frontend Files
- ✅ `src/lib/api.ts` - Updated (added API method)
- ✅ `src/components/dashboard/widgets/SkillImpactWidget.tsx` - Created
- ✅ `src/components/dashboard/DashboardWidget.tsx` - Updated (uses new widget)
- ✅ `src/components/dashboard/WidgetTypes.ts` - Updated (renamed to "Skill Impact")

### 3. Documentation
- ✅ `SKILL_IMPACT_WIDGET_UPGRADE.md` - Complete implementation guide
- ✅ `SKILL_IMPACT_QUICK_START.md` - Quick start guide
- ✅ `SKILL_IMPACT_BEFORE_AFTER.md` - Visual comparison

---

## Deployment Steps

### Step 1: Backend Deployment

```bash
# Navigate to backend
cd backend

# Ensure dependencies are installed
pip install -r requirements.txt

# Restart backend server
# (If using systemd, pm2, or similar)
sudo systemctl restart axora-backend

# OR if running manually
python -m uvicorn app.main:app --reload
```

**Verify**:
```bash
# Test the endpoint
curl -X GET "http://localhost:8000/intelligence/skills/widget-intelligence?workspace_id=YOUR_WORKSPACE_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response:
```json
{
  "skills": [
    {
      "skill_id": "...",
      "skill_name": "...",
      "state": "needs_attention",
      "reason": "...",
      "next_move": "...",
      "cta": {...}
    }
  ]
}
```

---

### Step 2: Frontend Deployment

```bash
# Navigate to frontend
cd ..

# Install dependencies (if needed)
npm install

# Build for production
npm run build

# Deploy build to hosting
# (Netlify, Vercel, or your hosting platform)
```

**Verify**:
1. Open browser to your app
2. Navigate to Home page
3. Check Skill Impact widget appears
4. Verify it shows skills with reasons and CTAs

---

### Step 3: Database Verification

Ensure these tables exist:
- ✅ `skills`
- ✅ `tasks`
- ✅ `skill_contributions`
- ✅ `skill_evidence`

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('skills', 'tasks', 'skill_contributions', 'skill_evidence');
```

---

## Testing Checklist

### Test 1: No Tasks Linked
- [ ] Create a new skill
- [ ] Don't link any tasks
- [ ] Go to Home page
- [ ] Widget shows: "⚠️ Not contributing — No active tasks linked"
- [ ] Button shows: "Link task"
- [ ] Click button → navigates to tasks page

### Test 2: Overdue Tasks
- [ ] Create a task with past due date
- [ ] Link it to a skill
- [ ] Go to Home page
- [ ] Widget shows: "⚠️ Not contributing — X tasks overdue"
- [ ] Button shows: "View tasks"
- [ ] Click button → navigates to filtered tasks

### Test 3: Contributing Skill
- [ ] Complete a task linked to a skill
- [ ] Go to Home page
- [ ] Widget shows: "✓ Contributing — Completed X tasks"
- [ ] Button shows: "Open task"
- [ ] Click button → navigates to tasks

### Test 4: No Recent Progress
- [ ] Have a skill with linked pages
- [ ] No activity in 7 days
- [ ] Go to Home page
- [ ] Widget shows: "⚠️ Not contributing — No recent progress"
- [ ] Button shows: "View tasks"

### Test 5: Multiple Skills
- [ ] Create 5+ skills with different states
- [ ] Widget shows top 4 (2 needs_attention, 2 contributing)
- [ ] Summary shows correct counts
- [ ] All CTAs work correctly

---

## Rollback Plan

If issues occur, rollback is simple:

### Backend Rollback
```bash
# Remove new service file
rm backend/app/services/skill_widget_intelligence.py

# Revert intelligence.py endpoint changes
git checkout backend/app/api/endpoints/intelligence.py

# Restart backend
sudo systemctl restart axora-backend
```

### Frontend Rollback
```bash
# Revert to old SkillProgressWidget
git checkout src/components/dashboard/widgets/SkillProgressWidget.tsx
git checkout src/components/dashboard/DashboardWidget.tsx
git checkout src/lib/api.ts

# Rebuild and redeploy
npm run build
```

---

## Monitoring

### Backend Metrics
Monitor these endpoints:
- `GET /intelligence/skills/widget-intelligence`
- Response time (should be < 500ms)
- Error rate (should be < 1%)

### Frontend Metrics
Monitor:
- Widget load time
- CTA click rate
- Navigation success rate

### User Behavior
Track:
- Which CTAs are clicked most
- Which skills get actioned
- Time from view to action

---

## Known Limitations

1. **Task Link Modal**: The `action=link` query param doesn't have a modal yet. It just navigates to tasks page. Can be implemented later.

2. **Deduplication**: The widget doesn't yet exclude skills shown in Next Best Action. The `excludeSkillIds` prop is ready but not wired up.

3. **Skill Name Humanization**: The old widget had skill name humanization (e.g., "Python" → "Python Development"). The new widget shows raw skill names. Can be added back if needed.

---

## Future Enhancements

### Phase 2 (Optional)
1. **Task Link Modal**: Implement modal for linking tasks to skills
2. **Deduplication**: Wire up excludeSkillIds from Next Best Action
3. **Analytics**: Track which actions users take most
4. **Skill Name Humanization**: Add back friendly names
5. **Custom Actions**: Allow users to define custom CTAs

### Phase 3 (Optional)
1. **AI Suggestions**: Use LLM for more nuanced next moves
2. **Skill Recommendations**: Suggest new skills to learn
3. **Progress Predictions**: Estimate time to skill mastery
4. **Collaborative Skills**: Show team skill coverage

---

## Support

### If Backend Fails
- Check backend logs: `tail -f backend/logs/app.log`
- Verify Supabase connection
- Check table permissions
- Verify workspace_id is valid

### If Frontend Fails
- Check browser console for errors
- Verify API endpoint is accessible
- Check network tab for failed requests
- Verify authentication token

### If Widget Shows No Data
- Verify skills exist in workspace
- Check tasks are linked to skills
- Verify workspace_id matches
- Check excludeSkillIds prop

---

## Success Criteria

Deployment is successful when:
- ✅ Widget loads without errors
- ✅ Shows skills with reasons and next moves
- ✅ CTA buttons navigate correctly
- ✅ Summary counts are accurate
- ✅ No performance degradation
- ✅ Users can take actions

---

## Post-Deployment

### Week 1
- Monitor error rates
- Collect user feedback
- Track CTA click rates
- Fix any critical bugs

### Week 2
- Analyze usage patterns
- Optimize slow queries
- Improve CTA labels if needed
- Consider Phase 2 enhancements

### Month 1
- Review analytics
- Measure impact on skill engagement
- Plan Phase 3 features
- Document learnings

---

## Contact

For issues or questions:
- Backend: Check `backend/app/services/skill_widget_intelligence.py`
- Frontend: Check `src/components/dashboard/widgets/SkillImpactWidget.tsx`
- API: Check `backend/app/api/endpoints/intelligence.py`

---

Ready to deploy! 🚀
