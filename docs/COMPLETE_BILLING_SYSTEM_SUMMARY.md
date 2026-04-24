# Complete Billing System - Implementation Summary

## 🎯 What Has Been Built

A complete **DB-driven 3-plan billing system** with **Razorpay subscription integration** for Axora.

---

## 📋 Plans

### FREE Plan
- **Price**: ₹0/month
- **Workspaces**: 5
- **Collaborators**: 3
- **Ask Anything**: 10/day
- **Page History**: 7 days
- **Features**: Basic sharing, read-only pages, basic knowledge graph

### PRO Plan (Most Popular)
- **Price**: ₹499/month or ₹4,999/year
- **Workspaces**: 20
- **Collaborators**: 10
- **Ask Anything**: 100/day
- **Page History**: 30 days
- **Features**: Edit page sharing, task assignment, skill insights (30 days), advanced graph

### PRO PLUS Plan
- **Price**: ₹999/month or ₹9,999/year
- **Workspaces**: Unlimited
- **Collaborators**: Unlimited
- **Ask Anything**: 300/day
- **Page History**: 90 days
- **Features**: All PRO + team pulse insights, skill insights (90 days)

---

## 🗄️ Database Schema

### subscription_plans
```sql
- code TEXT (FREE, PRO, PRO_PLUS)
- name, description, pricing
- razorpay_plan_id_monthly TEXT
- razorpay_plan_id_yearly TEXT
- workspaces_limit INT (NULL = unlimited)
- collaborators_limit INT (NULL = unlimited)
- ask_anything_daily_limit INT
- page_history_days INT
- Feature flags (can_share_page_edit, can_assign_tasks, etc.)
```

### user_subscriptions
```sql
- user_id UUID UNIQUE
- plan_code TEXT (FREE, PRO, PRO_PLUS)
- status TEXT (active, pending, cancelled, expired)
- billing_cycle TEXT (monthly, yearly)
- razorpay_subscription_id TEXT
- razorpay_customer_id TEXT
- current_period_end TIMESTAMP
```

### ask_anything_usage_daily
```sql
- user_id UUID
- usage_date DATE
- used_count INT
- UNIQUE(user_id, usage_date)
```

---

## 🔧 Backend Services

### 1. PlanService (`backend/app/services/plan_service.py`)
**Purpose**: DB-driven plan management

**Key Methods**:
- `get_user_plan(user_id)` - Returns plan with all limits/flags
- `check_workspace_limit(user_id)` - Returns true if can create workspace
- `check_collaborator_limit(workspace_id)` - Returns true if can add member
- `check_ask_anything_limit(user_id)` - Returns true if has credits
- `increment_ask_anything_usage(user_id)` - Increments daily usage
- Feature flag checks: `can_share_page_edit()`, `can_assign_tasks()`, etc.

**Key Principle**: All limits read from database, NO hardcoding.

### 2. RazorpayService (`backend/app/services/razorpay_service.py`)
**Purpose**: Razorpay subscription management

**Key Methods**:
- `create_subscription()` - Creates Razorpay subscription
- `verify_payment_signature()` - Verifies payment HMAC
- `verify_webhook_signature()` - Verifies webhook HMAC
- `handle_webhook_event()` - Processes webhook events (SOURCE OF TRUTH)
- `cancel_subscription()` - Cancels subscription

**Key Principle**: Webhooks are the source of truth for subscription status.

---

## 🌐 API Endpoints

### Subscription Endpoints (`/api/v1/subscriptions`)
- `GET /plans` - Get all plans
- `GET /current` - Get user subscription + usage
- `GET /usage` - Get usage stats
- `GET /check-limit/{type}` - Check specific limit

### Billing Endpoints (`/api/v1/billing`)
- `POST /create-subscription` - Create Razorpay subscription
- `POST /verify-subscription-payment` - Verify payment signature
- `POST /cancel-subscription` - Cancel subscription
- `POST /razorpay-webhook` - Webhook handler (SOURCE OF TRUTH)
- `GET /subscription-status` - Get complete status
- `GET /billing-history` - Get billing history

---

## 🛡️ Plan Guards

### Guard Functions (`backend/app/api/guards/plan_guards.py`)

Reusable guards for enforcing limits:
- `check_workspace_limit_guard(user_id)`
- `check_collaborator_limit_guard(workspace_id)`
- `check_ask_anything_limit_guard(user_id)`
- `check_page_share_edit_guard(user_id)`
- `check_task_assignment_guard(user_id)`
- `check_team_pulse_guard(user_id)`

**Usage Example**:
```python
@router.post("/workspaces")
async def create_workspace(data, current_user):
    await check_workspace_limit_guard(current_user)
    # Create workspace...
```

---

## 💳 Payment Flow

### 1. User Clicks "Upgrade to Pro"
Frontend calls `/billing/create-subscription`

### 2. Backend Creates Subscription
- Creates Razorpay subscription
- Saves to DB with `status="pending"`
- Returns `subscription_id`

### 3. Frontend Opens Razorpay Checkout
- Loads Razorpay script
- Opens checkout with `subscription_id`
- User completes payment

### 4. Payment Handler Called
- Frontend receives payment details
- Calls `/billing/verify-subscription-payment`
- Backend verifies signature

### 5. Webhook Activates Subscription (SOURCE OF TRUTH)
- Razorpay sends `subscription.activated` webhook
- Backend sets `status="active"`
- User now has Pro access

**Key Rule**: Only `status="active"` grants paid plan access.

---

## 🔐 Security

### Payment Verification
```python
# Verify payment signature
message = f"{payment_id}|{subscription_id}"
expected = HMAC_SHA256(secret, message)
assert expected == signature
```

### Webhook Verification
```python
# Verify webhook signature
expected = HMAC_SHA256(webhook_secret, payload)
assert expected == x_razorpay_signature
```

### Status Checks
```python
# Only active subscriptions get paid features
if subscription.status == "active":
    return subscription.plan_code
else:
    return "FREE"
```

---

## 📱 Frontend Integration

### SubscriptionPage.tsx
Already implemented with:
- 3-plan display
- Monthly/Yearly toggle
- Razorpay checkout integration
- Current plan status
- Usage display

**Key Update**: Uses `/billing/create-subscription` endpoint.

---

## 🚀 Deployment Steps

### 1. Run Migration
```bash
psql $DATABASE_URL -f backend/migrations/upgrade_to_3_plan_system.sql
```

### 2. Create Razorpay Plans
- Go to Razorpay Dashboard
- Create plans for PRO (monthly/yearly)
- Create plans for PRO_PLUS (monthly/yearly)
- Copy plan IDs

### 3. Update Database
```sql
UPDATE subscription_plans
SET 
    razorpay_plan_id_monthly = 'plan_xxxxx',
    razorpay_plan_id_yearly = 'plan_yyyyy'
WHERE code = 'PRO';

UPDATE subscription_plans
SET 
    razorpay_plan_id_monthly = 'plan_zzzzz',
    razorpay_plan_id_yearly = 'plan_wwwww'
WHERE code = 'PRO_PLUS';
```

### 4. Configure Environment Variables

**Backend (.env)**:
```bash
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx
```

**Frontend (.env)**:
```bash
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx
```

### 5. Configure Webhook
- Razorpay Dashboard → Settings → Webhooks
- URL: `https://your-domain.com/api/v1/billing/razorpay-webhook`
- Events: subscription.activated, subscription.charged, subscription.cancelled, etc.
- Copy webhook secret to backend .env

### 6. Deploy Backend
```bash
cd backend
pip install razorpay
# Restart backend service
```

### 7. Deploy Frontend
```bash
npm run build
# Deploy to hosting
```

### 8. Test Complete Flow
- Create subscription
- Complete payment
- Verify webhook received
- Check subscription status
- Test limit enforcement

---

## 📊 Monitoring

### Check Subscription Status
```sql
SELECT 
    us.user_id,
    us.plan_code,
    us.status,
    us.billing_cycle,
    us.current_period_end,
    sp.name
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_code = sp.code
WHERE us.status = 'active';
```

### Check Usage
```sql
SELECT 
    u.user_id,
    u.used_count,
    sp.ask_anything_daily_limit,
    (sp.ask_anything_daily_limit - u.used_count) as remaining
FROM ask_anything_usage_daily u
JOIN user_subscriptions us ON u.user_id = us.user_id
JOIN subscription_plans sp ON us.plan_code = sp.code
WHERE u.usage_date = CURRENT_DATE;
```

### Check Webhook Logs
Monitor backend logs for:
- `subscription.activated`
- `subscription.charged`
- `subscription.cancelled`
- `payment.failed`

---

## 📚 Documentation Files

1. **3_PLAN_SYSTEM_IMPLEMENTATION_GUIDE.md** - Complete implementation guide
2. **3_PLAN_SYSTEM_COMPLETE_SUMMARY.md** - System overview
3. **GUARD_IMPLEMENTATION_EXAMPLES.md** - Code examples for guards
4. **RAZORPAY_INTEGRATION_COMPLETE.md** - Razorpay integration guide
5. **COLUMN_NAME_FIX.md** - Database schema fixes
6. **backend/migrations/3_plan_system_quick_operations.sql** - SQL operations reference

---

## ✅ Testing Checklist

### Database
- [ ] Migration runs successfully
- [ ] 3 plans exist with correct limits
- [ ] Razorpay plan IDs configured
- [ ] Helper functions work

### Backend
- [ ] `/billing/create-subscription` creates subscription
- [ ] `/billing/verify-subscription-payment` verifies signature
- [ ] `/billing/razorpay-webhook` processes events
- [ ] Workspace creation enforces limit
- [ ] Ask Anything enforces daily limit
- [ ] Page sharing enforces edit permission
- [ ] Task assignment enforces feature flag

### Frontend
- [ ] Subscription page displays 3 plans
- [ ] Pricing shows INR currency
- [ ] Razorpay checkout opens
- [ ] Payment completes successfully
- [ ] Subscription activates via webhook
- [ ] Current plan displays correctly
- [ ] Usage stats display

### Payment Flow
- [ ] Create subscription → status="pending"
- [ ] Complete payment → signature verified
- [ ] Webhook received → status="active"
- [ ] User has Pro access
- [ ] Cancel subscription → downgrade to FREE

---

## 🎉 Success Criteria

Your billing system is working when:

✅ Users can subscribe to PRO/PRO_PLUS via Razorpay
✅ Webhooks activate subscriptions (source of truth)
✅ Limits are enforced from database
✅ Feature flags control access
✅ Cancellation downgrades to FREE
✅ No hardcoded plan rules in code
✅ All limits read from subscription_plans table
✅ Status checks prevent unauthorized access

---

## 🔗 Key Files

### Backend
- `backend/migrations/upgrade_to_3_plan_system.sql` - Database migration
- `backend/app/services/plan_service.py` - Plan management
- `backend/app/services/razorpay_service.py` - Razorpay integration
- `backend/app/api/endpoints/billing.py` - Billing endpoints
- `backend/app/api/guards/plan_guards.py` - Limit guards
- `backend/app/core/config.py` - Configuration

### Frontend
- `src/pages/SubscriptionPage.tsx` - Subscription UI

### Documentation
- All `.md` files in root directory

---

## 🚨 Important Notes

1. **Webhooks are the source of truth** - Never trust frontend alone
2. **Always verify signatures** - Payment and webhook signatures
3. **Status checks are critical** - Only `status="active"` grants access
4. **NULL means unlimited** - Handle NULL limits correctly
5. **Test with test keys first** - Use Razorpay test mode
6. **Monitor webhook logs** - Ensure events are received
7. **Keep secrets secure** - Never commit keys to git

---

## 📞 Support

If you encounter issues:
1. Check migration logs
2. Verify Razorpay plan IDs in database
3. Test webhook signature verification
4. Check backend logs for errors
5. Verify environment variables are set
6. Test with Razorpay test mode first

---

**Complete Billing System Ready!** 🎉

You now have a production-ready, DB-driven billing system with Razorpay integration.
