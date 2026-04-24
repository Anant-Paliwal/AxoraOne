# Subscription System - Complete Checklist

## 🎯 Overview

This checklist verifies that the **user-based subscription system** is fully functional.

---

## ✅ Step 1: Database Setup

### 1.1 Check Required Tables Exist

Run this SQL to verify all tables are created:

```sql
-- Check subscription tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'subscription_plans',
    'user_subscriptions',
    'user_usage_metrics',
    'workspace_subscriptions',
    'usage_metrics'
)
ORDER BY table_name;
```

**Expected Output** (5 tables):
```
subscription_plans
user_subscriptions
user_usage_metrics
workspace_subscriptions (old, still exists)
usage_metrics (old, still exists)
```

✅ **Pass**: All 5 tables exist
❌ **Fail**: Missing tables → Run migrations

---

### 1.2 Check Subscription Plans

```sql
SELECT 
    name,
    display_name,
    (features->>'max_pages')::int as max_pages,
    (features->>'max_workspaces')::int as max_workspaces,
    (features->>'max_team_members_total')::int as max_team_members_total,
    (features->>'max_skills')::int as max_skills,
    (features->>'max_tasks')::int as max_tasks,
    (features->>'max_ai_queries_per_day')::int as max_ai_queries
FROM subscription_plans
ORDER BY sort_order;
```

**Expected Output**:
```
name       | display_name | max_pages | max_workspaces | max_team_members_total | max_skills | max_tasks | max_ai_queries
-----------|--------------|-----------|----------------|------------------------|------------|-----------|----------------
free       | Free         | -1        | 5              | 5                      | 50         | 100       | 20
pro        | Pro          | -1        | 20             | 50                     | 200        | 500       | 500
enterprise | Enterprise   | -1        | -1             | -1                     | -1         | -1        | -1
```

✅ **Pass**: All plans have correct limits
❌ **Fail**: Wrong limits → Run `migrate-to-user-subscriptions.sql`

---

### 1.3 Check User Subscriptions

```sql
SELECT 
    u.email,
    sp.name as plan_name,
    us.status,
    us.billing_cycle,
    us.created_at
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
JOIN auth.users u ON us.user_id = u.id
ORDER BY us.created_at DESC
LIMIT 10;
```

**Expected Output**:
```
email              | plan_name | status | billing_cycle | created_at
-------------------|-----------|--------|---------------|---------------------------
user@example.com   | free      | active | monthly       | 2025-01-23 10:30:00+00
```

✅ **Pass**: Users have subscriptions
❌ **Fail**: No subscriptions → Run migration or create manually

---

### 1.4 Check Functions Exist

```sql
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'increment_usage',
    'check_workspace_limit',
    'get_user_subscription',
    'check_user_limit',
    'increment_user_usage',
    'track_user_workspace_creation'
)
ORDER BY routine_name;
```

**Expected Output** (6 functions):
```
routine_name                    | routine_type
--------------------------------|-------------
check_user_limit                | FUNCTION
check_workspace_limit           | FUNCTION
get_user_subscription           | FUNCTION
increment_usage                 | FUNCTION
increment_user_usage            | FUNCTION
track_user_workspace_creation   | FUNCTION
```

✅ **Pass**: All functions exist
❌ **Fail**: Missing functions → Run `fix-workspace-creation-error.sql` and `migrate-to-user-subscriptions.sql`

---

### 1.5 Check Triggers

```sql
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%track%'
ORDER BY event_object_table, trigger_name;
```

**Expected Output**:
```
trigger_name                        | event_object_table | action_statement
------------------------------------|--------------------|-----------------
trigger_track_skill_creation        | skills             | EXECUTE FUNCTION track_skill_creation()
trigger_track_task_creation         | tasks              | EXECUTE FUNCTION track_task_creation()
trigger_track_member_addition       | workspace_members  | EXECUTE FUNCTION track_member_addition()
trigger_track_member_removal        | workspace_members  | EXECUTE FUNCTION track_member_removal()
trigger_track_user_workspace_creation | workspaces       | EXECUTE FUNCTION track_user_workspace_creation()
```

✅ **Pass**: All triggers installed
❌ **Fail**: Missing triggers → Run migrations

---

## ✅ Step 2: Backend API

### 2.1 Check Service File Exists

```bash
# Check if UserSubscriptionService exists
ls -la backend/app/services/user_subscription_service.py
```

**Expected Output**:
```
-rw-r--r-- 1 user user 8234 Jan 23 10:30 backend/app/services/user_subscription_service.py
```

✅ **Pass**: File exists
❌ **Fail**: File missing → Copy from provided code

---

### 2.2 Check API Endpoints Import

```bash
# Check subscriptions.py imports UserSubscriptionService
grep -n "UserSubscriptionService" backend/app/api/endpoints/subscriptions.py
```

**Expected Output**:
```
6:from app.services.user_subscription_service import UserSubscriptionService
42:    service = UserSubscriptionService(supabase_admin)
...
```

✅ **Pass**: Using UserSubscriptionService
❌ **Fail**: Still using SubscriptionService → Update imports

---

### 2.3 Test API Endpoints

#### Test 1: Get Plans (Public)
```bash
curl -X GET "http://localhost:8000/api/v1/subscriptions/plans"
```

**Expected**: Returns array of 3 plans (free, pro, enterprise)

#### Test 2: Get Current Subscription (Authenticated)
```bash
curl -X GET "http://localhost:8000/api/v1/subscriptions/current" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected**: Returns user subscription with usage data

#### Test 3: Check Limit
```bash
curl -X GET "http://localhost:8000/api/v1/subscriptions/check-limit/max_workspaces?increment=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected**: 
```json
{
  "allowed": true,
  "current": 3,
  "limit": 5,
  "remaining": 2,
  "unlimited": false
}
```

✅ **Pass**: All endpoints return correct data
❌ **Fail**: Errors → Check backend logs

---

## ✅ Step 3: Frontend Integration

### 3.1 Check API Client Updated

```bash
# Check api.ts doesn't use workspace_id for subscriptions
grep -n "getCurrentSubscription" src/lib/api.ts
```

**Expected Output**:
```
1398:  async getCurrentSubscription() {
1399:    const headers = await getAuthHeaders();
1400:    const response = await fetch(`${API_BASE_URL}/subscriptions/current`, { headers });
```

✅ **Pass**: No workspace_id parameter
❌ **Fail**: Still has workspace_id → Update api.ts

---

### 3.2 Check Subscription Hook

```bash
# Check useSubscription.ts doesn't depend on workspace
grep -n "currentWorkspace" src/hooks/useSubscription.ts
```

**Expected**: Should NOT find currentWorkspace in loadSubscription function

✅ **Pass**: No workspace dependency
❌ **Fail**: Still depends on workspace → Update hook

---

### 3.3 Check Subscription Page

```bash
# Check SubscriptionPage.tsx calls API without workspace_id
grep -n "getCurrentSubscription" src/pages/SubscriptionPage.tsx
```

**Expected Output**:
```
const statusRes = await api.getCurrentSubscription();
```

✅ **Pass**: No workspace_id passed
❌ **Fail**: Still passing workspace_id → Update page

---

## ✅ Step 4: Functional Tests

### 4.1 Test Workspace Creation Limit

**Test**: Create 6 workspaces as free user

```bash
# Create workspaces 1-5 (should succeed)
for i in {1..5}; do
  curl -X POST "http://localhost:8000/api/v1/workspaces" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"Test Workspace $i\", \"description\": \"Test\"}"
done

# Create workspace 6 (should fail)
curl -X POST "http://localhost:8000/api/v1/workspaces" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Workspace 6", "description": "Test"}'
```

**Expected**: 
- First 5 succeed (201 Created)
- 6th fails with 403 and error:
```json
{
  "detail": {
    "error": "limit_exceeded",
    "message": "You've reached your plan limit for max_workspaces",
    "current": 5,
    "limit": 5,
    "upgrade_required": true
  }
}
```

✅ **Pass**: Limit enforced correctly
❌ **Fail**: Can create more than 5 → Check enforcement

---

### 4.2 Test Usage Tracking

**Test**: Check usage metrics are updated

```sql
-- After creating 3 workspaces
SELECT 
    u.email,
    uum.metric_type,
    uum.count,
    (sp.features->>uum.metric_type)::int as limit
FROM user_usage_metrics uum
JOIN user_subscriptions us ON uum.user_id = us.user_id
JOIN subscription_plans sp ON us.plan_id = sp.id
JOIN auth.users u ON uum.user_id = u.id
WHERE u.email = 'your@email.com'
AND uum.period_end >= NOW();
```

**Expected Output**:
```
email              | metric_type      | count | limit
-------------------|------------------|-------|-------
your@email.com     | max_workspaces   | 3     | 5
```

✅ **Pass**: Usage tracked correctly
❌ **Fail**: Count wrong → Check triggers

---

### 4.3 Test Subscription Display

**Test**: Open subscription page in browser

1. Navigate to `http://localhost:8080/subscription`
2. Check "Current Plan" section

**Expected Display**:
```
Current Plan
Free (active)
Billed Monthly

Usage This Period:
- Workspaces: 3 / 5 (60%)
- Team Members Total: 2 / 5 (40%)
- Pages: 0 / ∞
- Skills: 10 / 50 (20%)
- Tasks: 25 / 100 (25%)
- Storage MB: 5 / 100 (5%)
- AI Queries per day: 15 / 20 (75%)
```

✅ **Pass**: Shows user-level limits
❌ **Fail**: Shows workspace-level limits → Check frontend code

---

### 4.4 Test Plan Upgrade

**Test**: Upgrade to Pro plan

```bash
curl -X POST "http://localhost:8000/api/v1/subscriptions/upgrade" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan_name": "pro", "billing_cycle": "monthly"}'
```

**Expected**:
```json
{
  "success": true,
  "message": "Successfully upgraded to pro",
  "subscription": { ... }
}
```

Then verify:
```sql
SELECT 
    u.email,
    sp.name as plan_name,
    (sp.features->>'max_workspaces')::int as max_workspaces
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
JOIN auth.users u ON us.user_id = u.id
WHERE u.email = 'your@email.com';
```

**Expected**: plan_name = 'pro', max_workspaces = 20

✅ **Pass**: Upgrade works
❌ **Fail**: Still on free plan → Check upgrade logic

---

### 4.5 Test Cross-Workspace Consistency

**Test**: Check same plan shows in all workspaces

1. Open workspace A → Go to Settings → Check plan
2. Open workspace B → Go to Settings → Check plan
3. Open workspace C → Go to Settings → Check plan

**Expected**: All show same plan (e.g., "Free Plan")

✅ **Pass**: Same plan everywhere
❌ **Fail**: Different plans → Not using user subscription

---

## ✅ Step 5: Permission System

### 5.1 Test Workspace Permissions

**Test**: Check role-based access

```bash
# As viewer - try to create page (should fail)
curl -X POST "http://localhost:8000/api/v1/pages" \
  -H "Authorization: Bearer VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "workspace_id": "WORKSPACE_ID"}'
```

**Expected**: 403 Forbidden

✅ **Pass**: Permissions enforced
❌ **Fail**: Viewer can create → Check permission helpers

---

### 5.2 Test Subscription Management Permissions

**Test**: Only user can manage their own subscription

```bash
# Try to upgrade another user's subscription (should fail)
curl -X POST "http://localhost:8000/api/v1/subscriptions/upgrade" \
  -H "Authorization: Bearer USER_A_TOKEN" \
  -d '{"plan_name": "pro", "billing_cycle": "monthly"}'
```

**Expected**: Only affects USER_A's subscription, not other users

✅ **Pass**: User-scoped correctly
❌ **Fail**: Affects other users → Security issue!

---

## 📊 Final Verification

### Run All Checks

```sql
-- Complete system check
DO $$
DECLARE
    v_tables_count INT;
    v_functions_count INT;
    v_triggers_count INT;
    v_plans_count INT;
    v_users_with_subs INT;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO v_tables_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('subscription_plans', 'user_subscriptions', 'user_usage_metrics');
    
    -- Count functions
    SELECT COUNT(*) INTO v_functions_count
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name IN ('get_user_subscription', 'check_user_limit', 'increment_user_usage');
    
    -- Count triggers
    SELECT COUNT(*) INTO v_triggers_count
    FROM information_schema.triggers
    WHERE trigger_name LIKE '%track%';
    
    -- Count plans
    SELECT COUNT(*) INTO v_plans_count
    FROM subscription_plans
    WHERE is_active = true;
    
    -- Count users with subscriptions
    SELECT COUNT(*) INTO v_users_with_subs
    FROM user_subscriptions;
    
    -- Report
    RAISE NOTICE '=== SUBSCRIPTION SYSTEM STATUS ===';
    RAISE NOTICE 'Tables: % / 3', v_tables_count;
    RAISE NOTICE 'Functions: % / 3', v_functions_count;
    RAISE NOTICE 'Triggers: % / 5', v_triggers_count;
    RAISE NOTICE 'Active Plans: % / 3', v_plans_count;
    RAISE NOTICE 'Users with Subscriptions: %', v_users_with_subs;
    
    IF v_tables_count = 3 AND v_functions_count = 3 AND v_triggers_count = 5 AND v_plans_count = 3 THEN
        RAISE NOTICE '✅ SYSTEM READY!';
    ELSE
        RAISE NOTICE '❌ SYSTEM INCOMPLETE - Run migrations';
    END IF;
END $$;
```

---

## 🚨 Common Issues & Fixes

### Issue 1: "Function increment_user_usage does not exist"
**Fix**: 
```bash
psql -f fix-workspace-creation-error.sql
psql -f migrate-to-user-subscriptions.sql
```

### Issue 2: "user_subscriptions table does not exist"
**Fix**:
```bash
psql -f migrate-to-user-subscriptions.sql
```

### Issue 3: Still showing workspace-level limits
**Fix**:
1. Check backend is using `UserSubscriptionService`
2. Restart backend
3. Clear browser cache (Ctrl+Shift+R)

### Issue 4: Can create unlimited workspaces
**Fix**:
1. Check trigger exists: `trigger_track_user_workspace_creation`
2. Check function exists: `increment_user_usage`
3. Check workspace creation endpoint calls `enforce_user_limit`

### Issue 5: Different plans in different workspaces
**Fix**: System is still using workspace subscriptions, not user subscriptions
1. Verify migration ran
2. Check API endpoints use `UserSubscriptionService`
3. Check frontend calls API without workspace_id

---

## ✅ Success Criteria

Your subscription system is **FULLY WORKING** when:

1. ✅ All database tables exist
2. ✅ All functions and triggers installed
3. ✅ Backend uses `UserSubscriptionService`
4. ✅ Frontend calls API without workspace_id
5. ✅ Free users limited to 5 workspaces
6. ✅ Free users limited to 5 total team members
7. ✅ Usage tracked globally across workspaces
8. ✅ Same plan shows in all workspaces
9. ✅ Upgrade/downgrade works
10. ✅ Permissions enforced correctly

---

## 📝 Quick Test Script

Save this as `test_subscription_system.sh`:

```bash
#!/bin/bash

echo "=== Testing Subscription System ==="

# Test 1: Get plans
echo "Test 1: Get Plans"
curl -s http://localhost:8000/api/v1/subscriptions/plans | jq '.[] | .name'

# Test 2: Get current subscription
echo "Test 2: Get Current Subscription"
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/subscriptions/current | jq '.plan.name'

# Test 3: Check workspace limit
echo "Test 3: Check Workspace Limit"
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/v1/subscriptions/check-limit/max_workspaces?increment=1" | jq

echo "=== Tests Complete ==="
```

Run: `bash test_subscription_system.sh`

---

## 🎉 Summary

If all checks pass, your subscription system is **100% functional** with:
- ✅ User-level subscriptions (not workspace-level)
- ✅ Global limits across all workspaces
- ✅ Proper usage tracking
- ✅ Permission enforcement
- ✅ Upgrade/downgrade functionality

**Next Steps**: Test in production and integrate Stripe for payments!
