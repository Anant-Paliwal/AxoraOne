# 🚀 Skill Authority System - Deployment Checklist

## Pre-Deployment Checklist

### ✅ Code Review
- [ ] Review `backend/app/services/skill_authority.py`
- [ ] Review `backend/app/api/endpoints/skill_suggestions.py`
- [ ] Review `backend/migrations/add_skill_authority_system.sql`
- [ ] Review `backend/app/api/routes.py` changes
- [ ] Verify all imports are correct
- [ ] Check for any TODO comments

### ✅ Database Preparation
- [ ] Backup current database
- [ ] Test migration on staging database
- [ ] Verify no conflicts with existing tables
- [ ] Check RLS policies don't conflict
- [ ] Verify indexes are created

### ✅ Testing
- [ ] Test permission checks
- [ ] Test suggestion creation
- [ ] Test approval workflow
- [ ] Test rejection workflow
- [ ] Test ignore workflow
- [ ] Test suppression logic
- [ ] Test confidence updates
- [ ] Test API endpoints
- [ ] Test with different authority levels
- [ ] Test with different confidence levels

---

## Deployment Steps

### Step 1: Backup Database ✅
```bash
# Create backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_*.sql
```

### Step 2: Run Migration ✅
```bash
# Run migration
psql $DATABASE_URL -f backend/migrations/add_skill_authority_system.sql

# Verify tables created
psql $DATABASE_URL -c "\dt skill_*"

# Expected output:
# - skill_suggestions
# - skill_feedback
# - skills (with new column)
```

### Step 3: Verify Migration ✅
```bash
# Check skill_suggestions table
psql $DATABASE_URL -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'skill_suggestions';"

# Check skill_feedback table
psql $DATABASE_URL -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'skill_feedback';"

# Check skills.authority_level column
psql $DATABASE_URL -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'authority_level';"
```

### Step 4: Update Existing Skills ✅
```bash
# Set default authority level for existing skills
psql $DATABASE_URL -c "UPDATE skills SET authority_level = 'suggest' WHERE authority_level IS NULL;"

# Verify update
psql $DATABASE_URL -c "SELECT id, name, authority_level, confidence FROM skills LIMIT 5;"
```

### Step 5: Deploy Backend Code ✅
```bash
# Pull latest code
git pull origin main

# Install dependencies (if any new)
cd backend
pip install -r requirements.txt

# Restart backend
# For development:
python main.py

# For production (example with systemd):
sudo systemctl restart axora-backend

# For production (example with PM2):
pm2 restart axora-backend
```

### Step 6: Verify Backend ✅
```bash
# Check backend is running
curl http://localhost:8000/health

# Check new endpoints are available
curl http://localhost:8000/api/v1/skill-suggestions/pending?workspace_id=test

# Check logs for errors
tail -f backend/logs/app.log  # or wherever your logs are
```

### Step 7: Test API Endpoints ✅
```bash
# Get pending suggestions
curl -X GET "http://localhost:8000/api/v1/skill-suggestions/pending?workspace_id=YOUR_WORKSPACE_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get stats
curl -X GET "http://localhost:8000/api/v1/skill-suggestions/stats?workspace_id=YOUR_WORKSPACE_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: Empty arrays or existing suggestions
```

---

## Post-Deployment Verification

### ✅ Functional Tests

#### Test 1: Permission Check
```python
# Run in Python shell or test script
from app.services.skill_authority import skill_authority, ChangeType

# Should block content rewriting
allowed, reason = await skill_authority.can_skill_act(
    skill_id="test_skill",
    change_type=ChangeType.REWRITE_CONTENT,
    target_type="page",
    target_id="page_123",
    workspace_id="workspace_456"
)

assert not allowed
print(f"✅ Test 1 passed: {reason}")
```

#### Test 2: Suggestion Creation
```python
# Should create suggestion
suggestion = await skill_authority.create_suggestion(
    skill_id="test_skill",
    change_type=ChangeType.ADD_SECTION,
    target_type="page",
    target_id="page_123",
    description="Test suggestion",
    why="Test reason",
    payload={"test": "data"},
    workspace_id="workspace_456",
    user_id="user_789"
)

assert suggestion is not None
print("✅ Test 2 passed: Suggestion created")
```

#### Test 3: Approval Workflow
```bash
# Create a test suggestion via API
SUGGESTION_ID=$(curl -X POST "http://localhost:8000/api/v1/test/create-suggestion" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"skill_id":"test","change_type":"add_section","target_type":"page","target_id":"page_123"}' \
  | jq -r '.id')

# Approve it
curl -X POST "http://localhost:8000/api/v1/skill-suggestions/$SUGGESTION_ID/approve" \
  -H "Authorization: Bearer TOKEN"

# Verify it was approved
curl -X GET "http://localhost:8000/api/v1/skill-suggestions/history?workspace_id=YOUR_WORKSPACE_ID" \
  -H "Authorization: Bearer TOKEN" \
  | jq '.[] | select(.id=="'$SUGGESTION_ID'") | .approved'

# Expected: true
echo "✅ Test 3 passed: Approval workflow working"
```

### ✅ Database Integrity

```bash
# Check for orphaned records
psql $DATABASE_URL -c "
SELECT COUNT(*) as orphaned_suggestions
FROM skill_suggestions ss
LEFT JOIN skills s ON ss.skill_id = s.id
WHERE s.id IS NULL;
"
# Expected: 0

# Check RLS policies
psql $DATABASE_URL -c "
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('skill_suggestions', 'skill_feedback');
"
# Expected: Multiple policies listed

echo "✅ Database integrity verified"
```

### ✅ Performance Check

```bash
# Check query performance
psql $DATABASE_URL -c "EXPLAIN ANALYZE
SELECT * FROM skill_suggestions
WHERE workspace_id = 'test_workspace'
AND approved = false
AND rejected = false
AND ignored = false
ORDER BY created_at DESC
LIMIT 20;
"

# Expected: Should use indexes, execution time < 10ms

echo "✅ Performance check passed"
```

---

## Monitoring Setup

### ✅ Set Up Alerts

```bash
# Example: Set up monitoring for suggestion rate
# (Adjust based on your monitoring system)

# Alert if no suggestions created in 24 hours
# Alert if acceptance rate drops below 30%
# Alert if suppression rate exceeds 20%
```

### ✅ Dashboard Metrics

Track these metrics:
- [ ] Total suggestions created (daily)
- [ ] Acceptance rate (%)
- [ ] Rejection rate (%)
- [ ] Ignore rate (%)
- [ ] Average confidence per skill
- [ ] Number of suppressed skills
- [ ] API response times
- [ ] Database query performance

---

## Rollback Plan

### If Issues Occur:

#### Step 1: Stop Backend
```bash
# Stop the backend service
sudo systemctl stop axora-backend
# or
pm2 stop axora-backend
```

#### Step 2: Restore Database
```bash
# Restore from backup
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
```

#### Step 3: Revert Code
```bash
# Revert to previous commit
git revert HEAD
git push origin main
```

#### Step 4: Restart Backend
```bash
# Restart with old code
sudo systemctl start axora-backend
# or
pm2 start axora-backend
```

---

## Post-Deployment Tasks

### ✅ Documentation
- [ ] Update API documentation
- [ ] Update developer guide
- [ ] Update user guide (when frontend ready)
- [ ] Update changelog

### ✅ Communication
- [ ] Notify team of deployment
- [ ] Share documentation links
- [ ] Schedule training session (if needed)
- [ ] Update status page

### ✅ Monitoring
- [ ] Monitor error logs for 24 hours
- [ ] Check suggestion creation rate
- [ ] Monitor API response times
- [ ] Check database performance

---

## Success Criteria

### ✅ All Must Pass:

- [ ] Migration completed without errors
- [ ] All tables created successfully
- [ ] RLS policies active
- [ ] Backend starts without errors
- [ ] All API endpoints respond
- [ ] Permission checks working
- [ ] Suggestion creation working
- [ ] Approval workflow working
- [ ] Rejection workflow working
- [ ] Ignore workflow working
- [ ] Confidence updates working
- [ ] Suppression logic working
- [ ] No performance degradation
- [ ] No database errors
- [ ] All tests passing

---

## Timeline

### Estimated Deployment Time: 30-45 minutes

- **Backup Database:** 5 minutes
- **Run Migration:** 2 minutes
- **Verify Migration:** 3 minutes
- **Deploy Code:** 5 minutes
- **Restart Backend:** 2 minutes
- **Verify Backend:** 3 minutes
- **Run Tests:** 10 minutes
- **Monitor:** 15 minutes

---

## Emergency Contacts

- **Backend Lead:** [Name/Contact]
- **Database Admin:** [Name/Contact]
- **DevOps:** [Name/Contact]
- **On-Call:** [Name/Contact]

---

## Deployment Log

### Deployment Date: _______________
### Deployed By: _______________
### Environment: [ ] Development [ ] Staging [ ] Production

### Checklist Completion:
- [ ] Pre-deployment checks complete
- [ ] Backup created
- [ ] Migration successful
- [ ] Code deployed
- [ ] Backend restarted
- [ ] Verification tests passed
- [ ] Monitoring active
- [ ] Documentation updated
- [ ] Team notified

### Issues Encountered:
```
[List any issues and how they were resolved]
```

### Notes:
```
[Any additional notes or observations]
```

---

## Sign-Off

### Technical Lead: _______________  Date: _______________
### Database Admin: _______________  Date: _______________
### DevOps: _______________  Date: _______________

---

**Deployment Status: [ ] Ready [ ] In Progress [ ] Complete [ ] Rolled Back**

**System Status: [ ] Healthy [ ] Degraded [ ] Down**
