# Fix: Razorpay Plan ID Does Not Exist ❌ → ✅

## Problem

Error when upgrading subscription:
```
razorpay.errors.BadRequestError: The id provided does not exist
```

## Root Cause

You're using **Test Mode API keys** but your database has **Live Mode Plan IDs**. Razorpay Test Mode and Live Mode have completely separate data - plans created in Live Mode don't exist in Test Mode.

## Solution: Create Plans in Test Mode

### Step 1: Switch to Test Mode

1. Go to https://dashboard.razorpay.com
2. Look at top-left corner
3. Click the toggle to switch to **TEST MODE** (should show blue "Test Mode" badge)

### Step 2: Create PRO Plans (Monthly + Yearly)

#### PRO Monthly Plan
1. Go to **Subscriptions** → **Plans** in left sidebar
2. Click **Create Plan** button
3. Fill in details:
   - **Plan Name**: `Axora Pro Monthly`
   - **Billing Amount**: `499` (₹499)
   - **Currency**: `INR`
   - **Billing Frequency**: `Monthly`
   - **Total Count**: `120` (this means 120 months = 10 years, effectively unlimited)
   - **Description**: `Professional plan with advanced features - Monthly billing`
4. Click **Create Plan**
5. **COPY THE PLAN ID** (starts with `plan_` - example: `plan_NXYz123456789`)

#### PRO Yearly Plan (17% Discount)
1. Click **Create Plan** again
2. Fill in details:
   - **Plan Name**: `Axora Pro Yearly`
   - **Billing Amount**: `4990` (₹4,990 - save 17% vs monthly)
   - **Currency**: `INR`
   - **Billing Frequency**: `Yearly`
   - **Total Count**: `10` (10 years)
   - **Description**: `Professional plan with advanced features - Yearly billing (Save 17%)`
3. Click **Create Plan**
4. **COPY THE PLAN ID**

### Step 3: Create PRO_PLUS Plans (Monthly + Yearly)

#### PRO_PLUS Monthly Plan
1. Click **Create Plan** again
2. Fill in details:
   - **Plan Name**: `Axora Pro Plus Monthly`
   - **Billing Amount**: `999` (₹999)
   - **Currency**: `INR`
   - **Billing Frequency**: `Monthly`
   - **Total Count**: `120` (10 years)
   - **Description**: `Premium plan for teams and power users - Monthly billing`
3. Click **Create Plan**
4. **COPY THE PLAN ID**

#### PRO_PLUS Yearly Plan (17% Discount)
1. Click **Create Plan** again
2. Fill in details:
   - **Plan Name**: `Axora Pro Plus Yearly`
   - **Billing Amount**: `9990` (₹9,990 - save 17% vs monthly)
   - **Currency**: `INR`
   - **Billing Frequency**: `Yearly`
   - **Total Count**: `10` (10 years)
   - **Description**: `Premium plan for teams and power users - Yearly billing (Save 17%)`
3. Click **Create Plan**
4. **COPY THE PLAN ID**

### Step 4: Update Database

Open `update-razorpay-plan-ids.sql` and replace the placeholder Plan IDs with your actual Test Mode Plan IDs (you should have 4 Plan IDs total):

```sql
-- PRO Monthly
UPDATE subscription_plans
SET razorpay_plan_id_monthly = 'plan_YOUR_ACTUAL_PRO_MONTHLY_ID'
WHERE code = 'PRO';

-- PRO Yearly
UPDATE subscription_plans
SET razorpay_plan_id_yearly = 'plan_YOUR_ACTUAL_PRO_YEARLY_ID'
WHERE code = 'PRO';

-- PRO_PLUS Monthly
UPDATE subscription_plans
SET razorpay_plan_id_monthly = 'plan_YOUR_ACTUAL_PRO_PLUS_MONTHLY_ID'
WHERE code = 'PRO_PLUS';

-- PRO_PLUS Yearly
UPDATE subscription_plans
SET razorpay_plan_id_yearly = 'plan_YOUR_ACTUAL_PRO_PLUS_YEARLY_ID'
WHERE code = 'PRO_PLUS';
```

Then run this SQL in your Supabase SQL Editor.

### Step 5: Verify

Run this query to check:
```sql
SELECT 
  code, 
  name, 
  price_monthly_inr,
  price_yearly_inr,
  razorpay_plan_id_monthly,
  razorpay_plan_id_yearly
FROM subscription_plans 
WHERE code IN ('PRO', 'PRO_PLUS');
```

You should see:
- PRO: Both monthly and yearly Plan IDs filled
- PRO_PLUS: Both monthly and yearly Plan IDs filled

### Step 6: Restart Backend

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

## Important Notes

### Test Mode vs Live Mode

- **Test Mode**: For development and testing
  - Uses test API keys (starts with `rzp_test_`)
  - Fake payments (no real money)
  - Separate plans, customers, subscriptions
  
- **Live Mode**: For production
  - Uses live API keys (starts with `rzp_live_`)
  - Real payments (real money)
  - Separate plans, customers, subscriptions

### Your Current Setup

You're using Test Mode API keys:
```
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

So you MUST use Test Mode Plan IDs in your database.

### When to Switch to Live Mode

When you're ready for production:
1. Create plans in **Live Mode** on Razorpay Dashboard
2. Update your `.env` with **Live Mode API keys**
3. Update database with **Live Mode Plan IDs**
4. Deploy to production

## Testing After Fix

1. Go to your app: http://localhost:5173
2. Navigate to Subscription page
3. Click "Upgrade to Pro"
4. Should open Razorpay checkout (Test Mode)
5. Use test card: `4111 1111 1111 1111`
6. Any future date for expiry
7. Any CVV (e.g., 123)
8. Payment should succeed!

## Quick Reference

### Test Card Numbers (Razorpay Test Mode)
- Success: `4111 1111 1111 1111`
- Failure: `4000 0000 0000 0002`
- Any expiry date in future
- Any CVV

### Plan Configuration
- **Monthly Plans**: Total Count = 120 months (10 years)
- **Yearly Plans**: Total Count = 10 years
- **Billing Frequency**: Monthly or Yearly
- **Currency**: INR (Indian Rupees)
- **Yearly Discount**: 17% off (₹4,990 vs ₹5,988 for PRO, ₹9,990 vs ₹11,988 for PRO_PLUS)

## Files to Check

- `backend/.env` - Should have Test Mode API keys
- `update-razorpay-plan-ids.sql` - SQL to update Plan IDs
- Database table: `subscription_plans`

## Summary

1. ✅ Switch to Test Mode in Razorpay Dashboard
2. ✅ Create 4 plans:
   - PRO Monthly (₹499/month)
   - PRO Yearly (₹4,990/year - save 17%)
   - PRO_PLUS Monthly (₹999/month)
   - PRO_PLUS Yearly (₹9,990/year - save 17%)
3. ✅ Copy all 4 Plan IDs
4. ✅ Update database with SQL script
5. ✅ Restart backend
6. ✅ Test subscription upgrade (monthly and yearly options will appear)

Once you complete these steps, subscriptions will work with both monthly and yearly billing! 🚀
