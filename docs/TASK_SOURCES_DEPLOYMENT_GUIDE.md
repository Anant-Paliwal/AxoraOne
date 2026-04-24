# Task Sources - Deployment Guide

## 🚀 Pre-Deployment Checklist

### Code Review
- [ ] All code changes reviewed
- [ ] No TypeScript errors
- [ ] No Python linting errors
- [ ] No console warnings
- [ ] Code follows existing patterns

### Testing
- [ ] Backend tests passing
- [ ] Frontend builds successfully
- [ ] Manual testing completed
- [ ] Integration tests verified
- [ ] Performance acceptable

### Documentation
- [ ] All documentation files created
- [ ] README updated
- [ ] Code comments added
- [ ] API documentation current

## 📦 Files to Deploy

### Frontend Files (2)
```
src/components/FloatingAskAnything.tsx
src/pages/AskAnything.tsx
```

### Backend Files (2)
```
backend/app/services/context_gatherer.py
backend/app/services/enhanced_ai_agent.py
```

### Documentation Files (9)
```
ASK_ANYTHING_TASK_SOURCES_IMPLEMENTATION.md
ASK_ANYTHING_TASK_SOURCES_QUICK_GUIDE.md
TASK_SOURCES_TECHNICAL_DETAILS.md
TASK_SOURCES_COMPLETE_SUMMARY.md
TASK_SOURCES_QUICK_REFERENCE.md
TASK_SOURCES_IMPLEMENTATION_CHECKLIST.md
TASK_SOURCES_VISUAL_GUIDE.md
test_task_sources.py
README_TASK_SOURCES.md
TASK_SOURCES_DEPLOYMENT_GUIDE.md (this file)
```

## 🗄️ Database Requirements

### Required Tables
- [x] `tasks` table exists
- [x] `pages` table exists
- [x] `skills` table exists

### Required Columns
- [x] `tasks.linked_page_id` (UUID, nullable)
- [x] `tasks.linked_skill_id` (UUID, nullable)

### Required Constraints
- [x] Foreign key: `tasks.linked_page_id` → `pages.id`
- [x] Foreign key: `tasks.linked_skill_id` → `skills.id`
- [x] ON DELETE SET NULL for both foreign keys

### Recommended Indexes
```sql
-- Check if indexes exist
CREATE INDEX IF NOT EXISTS idx_tasks_linked_page_id ON tasks(linked_page_id);
CREATE INDEX IF NOT EXISTS idx_tasks_linked_skill_id ON tasks(linked_skill_id);
```

## 🔧 Environment Setup

### Backend Requirements
- Python 3.8+
- Supabase client configured
- Environment variables set:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`
  - `OPENROUTER_API_KEY` or `OPENAI_API_KEY`
  - `GEMINI_API_KEY` (optional)

### Frontend Requirements
- Node.js 16+
- React 18+
- TypeScript 4.9+
- Dependencies installed: `npm install`

## 📋 Deployment Steps

### Step 1: Backup
```bash
# Backup current code
git checkout -b backup-before-task-sources

# Backup database (if needed)
# Run your database backup procedure
```

### Step 2: Deploy Backend
```bash
# Navigate to backend
cd backend

# Pull latest changes
git pull origin main

# Install dependencies (if any new ones)
pip install -r requirements.txt

# Run tests
python test_task_sources.py

# Restart backend service
# (Your deployment command here)
```

### Step 3: Deploy Frontend
```bash
# Navigate to frontend
cd ..

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Build
npm run build

# Deploy build
# (Your deployment command here)
```

### Step 4: Verify Database
```sql
-- Verify tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('tasks', 'pages', 'skills');

-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
  AND column_name IN ('linked_page_id', 'linked_skill_id');

-- Verify foreign keys
SELECT constraint_name, table_name, column_name
FROM information_schema.key_column_usage
WHERE table_name = 'tasks'
  AND column_name IN ('linked_page_id', 'linked_skill_id');
```

### Step 5: Smoke Tests
```bash
# Test backend health
curl https://your-api.com/health

# Test frontend loads
curl https://your-app.com

# Test Ask Anything endpoint
curl -X POST https://your-api.com/api/ai/query \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "mode": "ask"}'
```

## ✅ Post-Deployment Verification

### Backend Verification
- [ ] Backend service running
- [ ] No errors in logs
- [ ] API endpoints responding
- [ ] Database connections working
- [ ] Supabase queries executing

### Frontend Verification
- [ ] Frontend loads without errors
- [ ] Ask Anything opens
- [ ] Sources dropdown shows "Tasks"
- [ ] No console errors
- [ ] Navigation works

### Integration Verification
- [ ] Ask about tasks works
- [ ] @mention tasks works
- [ ] Sources display correctly
- [ ] Visual indicators show
- [ ] Navigation from sources works

### User Testing
- [ ] Create a task with linked page
- [ ] Ask about that task
- [ ] Verify AI has access to page content
- [ ] Click sources to navigate
- [ ] Verify smooth user experience

## 🐛 Troubleshooting

### Issue: "Tasks" not showing in sources
**Solution:**
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Check frontend build includes latest code

### Issue: No linked sources in response
**Solution:**
1. Verify tasks have `linked_page_id` or `linked_skill_id` set
2. Check database foreign keys exist
3. Verify Supabase query syntax correct
4. Check backend logs for errors

### Issue: Sources not clickable
**Solution:**
1. Check `handleSourceClick` function exists
2. Verify navigation routes correct
3. Check console for JavaScript errors

### Issue: Performance slow
**Solution:**
1. Check database indexes exist
2. Verify query limits (50 tasks max)
3. Monitor backend response times
4. Check network tab for slow requests

## 📊 Monitoring

### Metrics to Watch
- API response times for `/api/ai/query`
- Database query performance
- Frontend load times
- Error rates in logs
- User engagement with sources

### Log Monitoring
```bash
# Backend logs
tail -f /var/log/backend/app.log | grep "task"

# Look for:
# - "Getting relevant tasks"
# - "Found X relevant tasks"
# - "Error getting relevant tasks"
```

### Database Monitoring
```sql
-- Check task query performance
EXPLAIN ANALYZE
SELECT tasks.*,
       linked_page:pages(id, title, content),
       linked_skill:skills(id, name, description)
FROM tasks
WHERE workspace_id = 'test-id'
  AND user_id = 'test-user';

-- Should use indexes, not full table scan
```

## 🔄 Rollback Plan

### If Issues Occur

**Step 1: Immediate Rollback**
```bash
# Revert to previous version
git checkout backup-before-task-sources

# Redeploy previous version
npm run build
# (Your deployment command)
```

**Step 2: Investigate**
- Check error logs
- Review failed tests
- Identify root cause

**Step 3: Fix and Redeploy**
- Fix identified issues
- Test thoroughly
- Redeploy with fixes

## 📈 Success Criteria

### Technical Success
- [ ] All tests passing
- [ ] No errors in logs
- [ ] Performance acceptable (<2s response time)
- [ ] Database queries optimized

### User Success
- [ ] Users can access task sources
- [ ] Visual indicators clear
- [ ] Navigation smooth
- [ ] AI responses helpful

### Business Success
- [ ] Feature adoption rate >50%
- [ ] User satisfaction maintained
- [ ] No increase in support tickets
- [ ] Positive user feedback

## 📞 Support Contacts

### Technical Issues
- Backend: [Backend Team]
- Frontend: [Frontend Team]
- Database: [Database Team]
- DevOps: [DevOps Team]

### Documentation
- All docs in: `/docs/task-sources/`
- Main index: `README_TASK_SOURCES.md`
- Quick ref: `TASK_SOURCES_QUICK_REFERENCE.md`

## 🎉 Deployment Complete

Once all verification steps pass:

1. ✅ Mark deployment as complete
2. ✅ Notify team
3. ✅ Update documentation
4. ✅ Monitor for 24 hours
5. ✅ Gather user feedback

## 📝 Deployment Log Template

```
Deployment Date: _______________
Deployed By: _______________
Version: _______________

Pre-Deployment:
[ ] Code reviewed
[ ] Tests passing
[ ] Documentation complete

Deployment:
[ ] Backend deployed at: _______________
[ ] Frontend deployed at: _______________
[ ] Database verified at: _______________

Post-Deployment:
[ ] Smoke tests passed
[ ] Integration verified
[ ] User testing completed

Issues Encountered:
_________________________________
_________________________________

Resolution:
_________________________________
_________________________________

Sign-off:
Developer: _______________
QA: _______________
DevOps: _______________
```

---

**Ready to deploy? Follow this guide step by step for a smooth deployment! 🚀**
