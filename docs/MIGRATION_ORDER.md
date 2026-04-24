# 🔄 Database Migration Order

## ⚠️ IMPORTANT: Run migrations in this exact order!

---

## Step 1: Create Subscription Tables

**File:** `backend/migrations/create_subscription_tables_complete.sql`

**What it does:**
- Creates `subscription_plans` table
- Creates `user_subscriptions` table
- Creates `user_usage_metrics` table
- Creates `billing_history` table
- Inserts 3 default plans (Free, Pro, Enterprise)
- Assigns all existing users to Free plan
- Creates indexes and RLS policies
- Creates helper functions

**Run this in Supabase SQL Editor:**
```sql
-- Copy and paste the entire content of:
backend/migrations/create_subscription_tables_complete.sql
```

**Expected output:**
```
✅ subscription_plans table created
✅ user_subscriptions table created
✅ user_usage_metrics table created
✅ billing_history table created
✅ 3 subscription plans created
✅ X users assigned to subscription plans
✅ Subscription system tables created successfully!
```

---

## Step 2: Add Storage and Team Tracking

**File:** `backend/migrations/add_storage_and_team_tracking.sql`

**What it does:**
- Adds Razorpay columns to existing tables
- Creates storage usage tracking triggers
- Creates team member tracking triggers
- Initializes current usage for existing users

**Run this in Supabase SQL Editor:**
```sql
-- Copy and paste the entire content of:
backend/migrations/add_storage_and_team_tracking.sql
```

**Expected output:**
```
✅ Razorpay columns added
✅ Storage tracking triggers created
✅ Team member tracking triggers created
✅ Initial usage calculated
```

---

## Verification

After running both migrations, verify everything is set up:

### Check Tables Exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'subscription_plans',
    'user_subscriptions',
    'user_usage_metrics',
    'billing_history'
);
```

**Expected:** 4 rows

### Check Plans:
```sql
SELECT name, display_name, price_monthly, price_yearly 
FROM subscription_plans 
ORDER BY sort_order;
```

**Expected:**
```
free       | Free       | 0      | 0
pro        | Pro        | 1499   | 14999
enterprise | Enterprise | 7499   | 74999
```

### Check User Subscriptions:
```sql
SELECT 
    COUNT(*) as total_users,
    sp.name as plan_name
FROM user_subscriptions us
JOIN subscription_plans sp ON sp.id = us.plan_id
GROUP BY sp.name;
```

**Expected:** All users on 'free' plan

### Check Triggers:
```sql
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE 'trigger_track%'
ORDER BY trigger_name;
```

**Expected:** 5 triggers
- trigger_track_page_storage_insert
- trigger_track_page_storage_update
- trigger_track_page_storage_delete
- trigger_track_team_member_add
- trigger_track_team_member_remove

### Check Razorpay Columns:
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions' 
AND column_name LIKE 'razorpay%';
```

**Expected:** 3 columns
- razorpay_subscription_id
- razorpay_payment_id
- razorpay_customer_id

---

## Troubleshooting

### Error: "relation already exists"
**Solution:** Tables already created, skip to Step 2

### Error: "relation does not exist"
**Solution:** Run Step 1 first

### Error: "column already exists"
**Solution:** Columns already added, migration partially complete

### Error: "duplicate key value"
**Solution:** Plans already inserted, safe to ignore

---

## Rollback (If Needed)

If something goes wrong, you can rollback:

```sql
-- Drop tables (WARNING: This deletes all data!)
DROP TABLE IF EXISTS billing_history CASCADE;
DROP TABLE IF EXISTS user_usage_metrics CASCADE;
DROP TABLE IF EXISTS user_subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_track_page_storage_insert ON pages;
DROP TRIGGER IF EXISTS trigger_track_page_storage_update ON pages;
DROP TRIGGER IF EXISTS trigger_track_page_storage_delete ON pages;
DROP TRIGGER IF EXISTS trigger_track_team_member_add ON workspace_members;
DROP TRIGGER IF EXISTS trigger_track_team_member_remove ON workspace_members;

-- Drop functions
DROP FUNCTION IF EXISTS track_page_storage();
DROP FUNCTION IF EXISTS track_team_member_change();
DROP FUNCTION IF EXISTS get_user_plan(UUID);
DROP FUNCTION IF EXISTS can_user_perform_action(UUID, TEXT, INTEGER);
```

Then start over from Step 1.

---

## After Migration

Once both migrations are complete:

1. ✅ Restart backend server
2. ✅ Test subscription page loads
3. ✅ Test payment flow
4. ✅ Verify usage tracking
5. ✅ Check billing history

---

## Quick Commands

### Run Both Migrations (Copy-Paste Ready)

**In Supabase SQL Editor:**

1. Copy entire content of `create_subscription_tables_complete.sql`
2. Paste and run
3. Wait for success message
4. Copy entire content of `add_storage_and_team_tracking.sql`
5. Paste and run
6. Wait for success message
7. ✅ Done!

---

## Status Check

After migration, check status:

```sql
-- Quick status check
SELECT 
    'subscription_plans' as table_name,
    COUNT(*) as count
FROM subscription_plans
UNION ALL
SELECT 
    'user_subscriptions',
    COUNT(*)
FROM user_subscriptions
UNION ALL
SELECT 
    'user_usage_metrics',
    COUNT(*)
FROM user_usage_metrics
UNION ALL
SELECT 
    'billing_history',
    COUNT(*)
FROM billing_history;
```

**Expected:**
- subscription_plans: 3
- user_subscriptions: (number of users)
- user_usage_metrics: 0 (will populate as users use the system)
- billing_history: 0 (will populate after payments)

---

## ✅ Success!

If all checks pass, your subscription system is ready!

Next steps:
1. Configure Razorpay credentials in `.env`
2. Restart backend
3. Test payment flow
4. Go live!

