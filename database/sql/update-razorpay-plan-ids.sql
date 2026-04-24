-- Update Razorpay Plan IDs with Test Mode Plan IDs
-- Run this AFTER creating plans in Razorpay Test Mode Dashboard

-- STEP 1: Go to Razorpay Dashboard (https://dashboard.razorpay.com)
-- STEP 2: Switch to TEST MODE (toggle in top left)
-- STEP 3: Go to Subscriptions > Plans
-- STEP 4: Create these 4 plans:

-- Plan 1: PRO Monthly
-- - Plan Name: Axora Pro Monthly
-- - Billing Amount: ₹499
-- - Billing Frequency: Monthly
-- - Total Count: 120 (10 years)
-- - Copy the Plan ID (starts with plan_)

-- Plan 2: PRO Yearly (17% discount)
-- - Plan Name: Axora Pro Yearly
-- - Billing Amount: ₹4990 (₹499 × 12 × 0.83 = save 17%)
-- - Billing Frequency: Yearly
-- - Total Count: 10 (10 years)
-- - Copy the Plan ID (starts with plan_)

-- Plan 3: PRO_PLUS Monthly  
-- - Plan Name: Axora Pro Plus Monthly
-- - Billing Amount: ₹999
-- - Billing Frequency: Monthly
-- - Total Count: 120 (10 years)
-- - Copy the Plan ID (starts with plan_)

-- Plan 4: PRO_PLUS Yearly (17% discount)
-- - Plan Name: Axora Pro Plus Yearly
-- - Billing Amount: ₹9990 (₹999 × 12 × 0.83 = save 17%)
-- - Billing Frequency: Yearly
-- - Total Count: 10 (10 years)
-- - Copy the Plan ID (starts with plan_)

-- STEP 5: Replace the Plan IDs below with YOUR Test Mode Plan IDs

-- Update PRO plan Monthly
UPDATE subscription_plans
SET razorpay_plan_id_monthly = 'plan_YOUR_TEST_MODE_PRO_MONTHLY_ID_HERE'
WHERE code = 'PRO';

-- Update PRO plan Yearly
UPDATE subscription_plans
SET razorpay_plan_id_yearly = 'plan_YOUR_TEST_MODE_PRO_YEARLY_ID_HERE'
WHERE code = 'PRO';

-- Update PRO_PLUS plan Monthly
UPDATE subscription_plans
SET razorpay_plan_id_monthly = 'plan_YOUR_TEST_MODE_PRO_PLUS_MONTHLY_ID_HERE'
WHERE code = 'PRO_PLUS';

-- Update PRO_PLUS plan Yearly
UPDATE subscription_plans
SET razorpay_plan_id_yearly = 'plan_YOUR_TEST_MODE_PRO_PLUS_YEARLY_ID_HERE'
WHERE code = 'PRO_PLUS';

-- Verify the update
SELECT 
  code, 
  name, 
  price_monthly_inr,
  price_yearly_inr,
  razorpay_plan_id_monthly,
  razorpay_plan_id_yearly
FROM subscription_plans 
WHERE code IN ('PRO', 'PRO_PLUS');
