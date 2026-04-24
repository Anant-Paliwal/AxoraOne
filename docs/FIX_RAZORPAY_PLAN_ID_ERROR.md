# Fix: "The id provided does not exist" - Razorpay Error

## Problem
```
razorpay.errors.BadRequestError: The id provided does not exist
```

This means the Plan ID in your `.env` file doesn't match any plan in your Razorpay account.

## Solution - Step by Step

### Step 1: Get Your Actual Plan IDs from Razorpay

1. **Login to Razorpay Dashboard**
   - Go to: https://dashboard.razorpay.com/
   - Make sure you're in **Test Mode** (toggle at top)

2. **Go to Subscriptions → Plans**
   - Click on "Subscriptions" in left sidebar
   - Click on "Plans"

3. **Find Your Plans**
   - Look for "Axora Pro Monthly" (₹499)
   - Look for "Axora Pro Plus Monthly" (₹999)

4. **Copy the Plan IDs**
   - Click on each plan
   - Copy the **Plan ID** (format: `plan_xxxxxxxxxxxxx`)
   - Example: `plan_NXbGQVKVXbGQVK`

### Step 2: Update Environment Variables

**On Render (Production):**

1. Go to your Render dashboard
2. Click on your backend service
3. Go to **Environment** tab
4. Add/Update these variables:

```
RAZORPAY_PRO_MONTHLY_PLAN_ID=plan_YOUR_ACTUAL_PRO_PLAN_ID
RAZORPAY_PRO_PLUS_MONTHLY_PLAN_ID=plan_YOUR_ACTUAL_PRO_PLUS_PLAN_ID
```

5. Click **Save Changes**
6. Service will auto-redeploy

**Locally (backend/.env):**

```env
RAZORPAY_PRO_MONTHLY_PLAN_ID=plan_YOUR_ACTUAL_PRO_PLAN_ID
RAZORPAY_PRO_PLUS_MONTHLY_PLAN_ID=plan_YOUR_ACTUAL_PRO_PLUS_PLAN_ID
```

### Step 3: Update Database

Run this in Supabase SQL Editor:

```sql
-- Update Pro plan
UPDATE subscription_plans
SET razorpay_plan_id_monthly = 'plan_YOUR_ACTUAL_PRO_PLAN_ID'
WHERE code = 'PRO';

-- Update Pro Plus plan
UPDATE subscription_plans
SET razorpay_plan_id_monthly = 'plan_YOUR_ACTUAL_PRO_PLUS_PLAN_ID'
WHERE code = 'PRO_PLUS';

-- Verify
SELECT code, name, razorpay_plan_id_monthly
FROM subscription_plans;
```

### Step 4: Test

1. Go to your app
2. Try to upgrade to Pro
3. Should work now!

## If You Haven't Created Plans Yet

### Create Plans in Razorpay:

**Pro Plan (₹499/month):**
1. Go to: https://dashboard.razorpay.com/app/subscriptions/plans
2. Click **Create Plan**
3. Fill in:
   - **Plan Name**: Axora Pro Monthly
   - **Billing Amount**: 49900 (paise)
   - **Billing Interval**: Every 1 month
   - **Total Count**: 120
4. Click **Create**
5. **Copy the Plan ID**

**Pro Plus Plan (₹999/month):**
1. Click **Create Plan** again
2. Fill in:
   - **Plan Name**: Axora Pro Plus Monthly
   - **Billing Amount**: 99900 (paise)
   - **Billing Interval**: Every 1 month
   - **Total Count**: 120
3. Click **Create**
4. **Copy the Plan ID**

Then follow Steps 2-4 above.

## Verification

Check if Plan IDs are correct:

```bash
# In Razorpay Dashboard
1. Go to Subscriptions → Plans
2. Click on your plan
3. URL will show: /app/subscriptions/plans/plan_xxxxxxxxxxxxx
4. That's your Plan ID!
```

## Common Mistakes

❌ **Wrong:** Using placeholder `plan_xxxxxxxxxxxxx`
✅ **Correct:** Using actual ID like `plan_NXbGQVKVXbGQVK`

❌ **Wrong:** Using Test Mode Plan ID with Live Mode keys
✅ **Correct:** Test Plan ID with Test keys, Live Plan ID with Live keys

❌ **Wrong:** Typo in Plan ID
✅ **Correct:** Copy-paste directly from Razorpay

## Quick Check

Run this to see what Plan IDs are configured:

```sql
SELECT 
  code,
  name,
  razorpay_plan_id_monthly,
  CASE 
    WHEN razorpay_plan_id_monthly IS NULL THEN '❌ Not configured'
    WHEN razorpay_plan_id_monthly LIKE 'plan_%' THEN '✅ Looks good'
    ELSE '⚠️ Invalid format'
  END as status
FROM subscription_plans;
```

## Status

⏳ Waiting for you to:
1. Get actual Plan IDs from Razorpay Dashboard
2. Update environment variables on Render
3. Update database with SQL above
4. Test subscription upgrade

Once done, the error will be gone! 🚀
