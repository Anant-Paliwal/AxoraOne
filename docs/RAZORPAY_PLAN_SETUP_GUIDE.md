# Razorpay Plan Setup Guide

## Problem
Error: "Razorpay plan ID not configured for PRO monthly"

This happens because you need to create subscription plans in Razorpay Dashboard and add their IDs to your environment variables.

## Solution - Step by Step

### Step 1: Login to Razorpay Dashboard
1. Go to: https://dashboard.razorpay.com/
2. Login with your account
3. Make sure you're in **Test Mode** (toggle at top)

### Step 2: Create Subscription Plans

#### Create Pro Plan (₹499/month)
1. Go to **Subscriptions** → **Plans** in left sidebar
2. Click **Create Plan**
3. Fill in details:
   - **Plan Name**: Axora Pro Monthly
   - **Billing Amount**: 49900 (in paise, ₹499 = 49900 paise)
   - **Billing Interval**: 1 month
   - **Description**: Pro plan with 20 workspaces, 100 AI queries/day
4. Click **Create Plan**
5. **Copy the Plan ID** (looks like: `plan_xxxxxxxxxxxxx`)

#### Create Pro Plus Plan (₹999/month)
1. Click **Create Plan** again
2. Fill in details:
   - **Plan Name**: Axora Pro Plus Monthly
   - **Billing Amount**: 99900 (in paise, ₹999 = 99900 paise)
   - **Billing Interval**: 1 month
   - **Description**: Pro Plus plan with unlimited workspaces, 300 AI queries/day
3. Click **Create Plan**
4. **Copy the Plan ID** (looks like: `plan_xxxxxxxxxxxxx`)

### Step 3: Update Environment Variables

Update `backend/.env`:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_S7ceKn8DQ6NYZ2
RAZORPAY_KEY_SECRET=hLXOoN0BDuxAe5jFmSrosqwK
RAZORPAY_WEBHOOK_SECRET=

# Razorpay Plan IDs (Replace with your actual plan IDs)
RAZORPAY_PRO_MONTHLY_PLAN_ID=plan_xxxxxxxxxxxxx
RAZORPAY_PRO_PLUS_MONTHLY_PLAN_ID=plan_xxxxxxxxxxxxx
```

**Replace `plan_xxxxxxxxxxxxx` with the actual Plan IDs you copied from Razorpay Dashboard.**

### Step 4: Update Database

Run this SQL in Supabase SQL Editor:

```sql
-- Update subscription_plans table with Razorpay Plan IDs
UPDATE subscription_plans
SET razorpay_plan_id_monthly = 'plan_xxxxxxxxxxxxx'  -- Your Pro Plan ID
WHERE code = 'PRO';

UPDATE subscription_plans
SET razorpay_plan_id_monthly = 'plan_xxxxxxxxxxxxx'  -- Your Pro Plus Plan ID
WHERE code = 'PRO_PLUS';
```

**Replace `plan_xxxxxxxxxxxxx` with your actual Plan IDs.**

### Step 5: Restart Backend

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

Or if deployed on Render, trigger a manual deploy.

### Step 6: Test Subscription

1. Go to your app
2. Navigate to Subscription page
3. Click "Upgrade to Pro"
4. Should now work without errors!

## Verification

Check if plans are configured:

```sql
-- Check subscription_plans table
SELECT code, name, razorpay_plan_id_monthly, razorpay_plan_id_yearly
FROM subscription_plans;
```

Should show:
```
code      | name      | razorpay_plan_id_monthly | razorpay_plan_id_yearly
----------|-----------|--------------------------|------------------------
FREE      | Free      | null                     | null
PRO       | Pro       | plan_xxxxxxxxxxxxx       | null
PRO_PLUS  | Pro Plus  | plan_xxxxxxxxxxxxx       | null
```

## Important Notes

### Test Mode vs Live Mode
- **Test Mode**: Use `rzp_test_` keys and test plan IDs
- **Live Mode**: Use `rzp_live_` keys and live plan IDs
- Create plans in BOTH modes separately

### Plan ID Format
- Test: `plan_xxxxxxxxxxxxx` (starts with `plan_`)
- Live: `plan_xxxxxxxxxxxxx` (same format)

### Pricing in Paise
Razorpay uses **paise** (smallest currency unit):
- ₹499 = 49900 paise
- ₹999 = 99900 paise
- ₹1 = 100 paise

### Billing Intervals
- Monthly: 1 month
- Yearly: 12 months (or 1 year)

## Troubleshooting

### Error: "Plan not found"
- Check Plan ID is correct
- Ensure you're using Test Mode plan IDs with Test Mode keys
- Verify plan exists in Razorpay Dashboard

### Error: "Invalid plan_id"
- Plan ID format must be: `plan_xxxxxxxxxxxxx`
- No spaces or extra characters
- Copy directly from Razorpay Dashboard

### Error: "Unauthorized"
- Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are correct
- Ensure keys match the mode (test/live)

## Production Setup

When going live:

1. **Switch to Live Mode** in Razorpay Dashboard
2. **Create plans again** in Live Mode (same details)
3. **Copy Live Plan IDs**
4. **Update production environment variables**:
   ```env
   RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=your_live_secret
   RAZORPAY_PRO_MONTHLY_PLAN_ID=plan_live_xxxxxxxxxxxxx
   RAZORPAY_PRO_PLUS_MONTHLY_PLAN_ID=plan_live_xxxxxxxxxxxxx
   ```
5. **Update database** with live plan IDs
6. **Deploy**

## Quick Reference

### Current Pricing
- **Free**: ₹0/month (no plan ID needed)
- **Pro**: ₹499/month (need plan ID)
- **Pro Plus**: ₹999/month (need plan ID)

### Environment Variables Needed
```env
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_PRO_MONTHLY_PLAN_ID=plan_xxxxx
RAZORPAY_PRO_PLUS_MONTHLY_PLAN_ID=plan_xxxxx
```

### Database Columns
```sql
subscription_plans:
  - razorpay_plan_id_monthly (for monthly billing)
  - razorpay_plan_id_yearly (for yearly billing)
```

## Status

✅ Config updated to support plan IDs
✅ Environment variables added
⏳ Need to create plans in Razorpay Dashboard
⏳ Need to add plan IDs to .env
⏳ Need to update database

Follow steps above to complete setup!
