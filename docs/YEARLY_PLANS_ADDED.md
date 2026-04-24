# Yearly Plans Configuration Added ✅

## What Was Added

### 1. Environment Variables (backend/.env)
```env
# PRO Plan IDs
RAZORPAY_PRO_MONTHLY_PLAN_ID=plan_S8Oq8hdFtErvCw
RAZORPAY_PRO_YEARLY_PLAN_ID=plan_YOUR_PRO_YEARLY_PLAN_ID_HERE

# PRO_PLUS Plan IDs
RAZORPAY_PRO_PLUS_MONTHLY_PLAN_ID=plan_S8Orzn1Snpz5Yh
RAZORPAY_PRO_PLUS_YEARLY_PLAN_ID=plan_YOUR_PRO_PLUS_YEARLY_PLAN_ID_HERE
```

### 2. Config Variables (backend/app/core/config.py)
```python
RAZORPAY_PRO_YEARLY_PLAN_ID: str = ""
RAZORPAY_PRO_PLUS_YEARLY_PLAN_ID: str = ""
```

## Next Steps

### Step 1: Create Yearly Plans in Razorpay Dashboard

1. Go to https://dashboard.razorpay.com
2. Switch to **TEST MODE** (if testing) or **LIVE MODE** (if production)
3. Go to **Subscriptions** → **Plans**
4. Create 2 yearly plans:

#### PRO Yearly Plan
- Plan Name: `Axora Pro Yearly`
- Billing Amount: `4990` (₹4,990)
- Currency: `INR`
- Billing Frequency: `Yearly`
- Total Count: `10` (10 years)
- Description: `Professional plan - Yearly billing (Save 17%)`

#### PRO_PLUS Yearly Plan
- Plan Name: `Axora Pro Plus Yearly`
- Billing Amount: `9990` (₹9,990)
- Currency: `INR`
- Billing Frequency: `Yearly`
- Total Count: `10` (10 years)
- Description: `Premium plan - Yearly billing (Save 17%)`

### Step 2: Update .env File

Replace the placeholders with your actual Plan IDs:

```env
RAZORPAY_PRO_YEARLY_PLAN_ID=plan_YOUR_ACTUAL_PRO_YEARLY_ID
RAZORPAY_PRO_PLUS_YEARLY_PLAN_ID=plan_YOUR_ACTUAL_PRO_PLUS_YEARLY_ID
```

### Step 3: Update Database

Run the SQL script `update-razorpay-plan-ids.sql` to update the database with all 4 Plan IDs (2 monthly + 2 yearly).

### Step 4: Update Render Environment Variables (Production)

If deploying to Render, add these new environment variables:
- `RAZORPAY_PRO_YEARLY_PLAN_ID`
- `RAZORPAY_PRO_PLUS_YEARLY_PLAN_ID`

### Step 5: Restart Backend

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

## Pricing Structure

### Monthly Plans
- PRO: ₹499/month
- PRO_PLUS: ₹999/month

### Yearly Plans (17% Discount)
- PRO: ₹4,990/year (save ₹998 vs monthly)
- PRO_PLUS: ₹9,990/year (save ₹1,998 vs monthly)

## User Experience

When users visit the subscription page:
1. They see a toggle: **Monthly** / **Yearly**
2. Yearly option shows "Save 17%" badge
3. Clicking yearly shows discounted annual pricing
4. Payment goes through Razorpay with correct plan

## Files Modified

1. `backend/.env` - Added yearly plan ID variables
2. `backend/app/core/config.py` - Added yearly plan ID config
3. `update-razorpay-plan-ids.sql` - Updated to include yearly plans
4. `FIX_RAZORPAY_PLAN_ID_MISMATCH.md` - Updated guide with yearly plans

## Testing

After setup, test both billing cycles:
1. Select PRO plan
2. Toggle between Monthly and Yearly
3. Verify correct amount shows (₹499 vs ₹4,990)
4. Complete test payment
5. Verify subscription activates correctly

All set for yearly subscriptions! 🚀
