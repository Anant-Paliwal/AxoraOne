# Razorpay Integration - Complete Guide

## Overview

Axora now has full Razorpay subscription integration for PRO and PRO_PLUS plans.

**Key Principle**: Webhooks are the SOURCE OF TRUTH for subscription status.

---

## 1. Environment Variables

### Backend (.env)
```bash
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx
```

### Frontend (.env)
```bash
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx
```

---

## 2. Database Schema

### subscription_plans (Updated)
```sql
- razorpay_plan_id_monthly TEXT  -- Razorpay plan ID for monthly billing
- razorpay_plan_id_yearly TEXT   -- Razorpay plan ID for yearly billing
```

### user_subscriptions (Updated)
```sql
- status TEXT (active|pending|cancelled|expired)
- razorpay_subscription_id TEXT UNIQUE
- razorpay_customer_id TEXT
- razorpay_plan_id TEXT
```

---

## 3. Create Razorpay Plans

Before using the system, create plans on Razorpay Dashboard:

### PRO Plan
**Monthly**:
- Amount: ₹499
- Interval: 1 month
- Copy plan_id → Update DB: `subscription_plans.razorpay_plan_id_monthly` for PRO

**Yearly**:
- Amount: ₹4,999
- Interval: 1 year
- Copy plan_id → Update DB: `subscription_plans.razorpay_plan_id_yearly` for PRO

### PRO_PLUS Plan
**Monthly**:
- Amount: ₹999
- Interval: 1 month
- Copy plan_id → Update DB: `subscription_plans.razorpay_plan_id_monthly` for PRO_PLUS

**Yearly**:
- Amount: ₹9,999
- Interval: 1 year
- Copy plan_id → Update DB: `subscription_plans.razorpay_plan_id_yearly` for PRO_PLUS

### Update Database
```sql
-- PRO Plan
UPDATE subscription_plans
SET 
    razorpay_plan_id_monthly = 'plan_xxxxx',
    razorpay_plan_id_yearly = 'plan_yyyyy'
WHERE code = 'PRO';

-- PRO_PLUS Plan
UPDATE subscription_plans
SET 
    razorpay_plan_id_monthly = 'plan_zzzzz',
    razorpay_plan_id_yearly = 'plan_wwwww'
WHERE code = 'PRO_PLUS';
```

---

## 4. API Endpoints

### Create Subscription
```
POST /api/v1/billing/create-subscription
```

**Request**:
```json
{
  "plan_code": "PRO",
  "billing_cycle": "monthly"
}
```

**Response**:
```json
{
  "success": true,
  "razorpay_subscription_id": "sub_xxxxx",
  "plan_code": "PRO",
  "billing_cycle": "monthly",
  "razorpay_key_id": "rzp_test_xxxxx"
}
```

**What it does**:
1. Creates subscription on Razorpay
2. Creates `user_subscriptions` record with status="pending"
3. Returns subscription_id for checkout

### Verify Payment
```
POST /api/v1/billing/verify-subscription-payment
```

**Request**:
```json
{
  "razorpay_payment_id": "pay_xxxxx",
  "razorpay_subscription_id": "sub_xxxxx",
  "razorpay_signature": "xxxxx"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Payment verified. Subscription will be activated via webhook."
}
```

**What it does**:
1. Verifies payment signature using HMAC SHA256
2. Returns success
3. Does NOT activate subscription (webhook does that)

### Webhook (Source of Truth)
```
POST /api/v1/billing/razorpay-webhook
```

**Headers**:
```
x-razorpay-signature: xxxxx
```

**Events Handled**:
- `subscription.activated` → Set status="active"
- `subscription.charged` → Update period_end
- `subscription.cancelled` → Downgrade to FREE
- `subscription.completed` → Downgrade to FREE
- `invoice.paid` → Update period_end
- `payment.failed` → Log warning

**What it does**:
1. Verifies webhook signature
2. Updates `user_subscriptions` based on event
3. This is the SOURCE OF TRUTH for subscription status

### Cancel Subscription
```
POST /api/v1/billing/cancel-subscription
```

**Request**:
```json
{
  "immediate": false
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Subscription will cancel at period end"
}
```

**What it does**:
1. Cancels subscription on Razorpay
2. If immediate=true: Downgrade to FREE now
3. If immediate=false: Cancel at period end

### Get Subscription Status
```
GET /api/v1/billing/subscription-status
```

**Response**:
```json
{
  "subscription": {
    "user_id": "...",
    "plan_code": "PRO",
    "status": "active",
    "billing_cycle": "monthly",
    "current_period_end": "2026-02-25T..."
  },
  "plan": {
    "code": "PRO",
    "name": "Pro",
    "workspaces_limit": 20,
    ...
  },
  "usage": {
    "workspaces": {
      "used": 5,
      "limit": 20,
      "unlimited": false
    },
    "ask_anything": {
      "limit": 100,
      "used": 23,
      "remaining": 77
    }
  }
}
```

---

## 5. Frontend Integration

### Update SubscriptionPage.tsx

The existing SubscriptionPage already has the structure. Update the `handleUpgrade` function:

```typescript
const handleUpgrade = async (planCode: string) => {
  try {
    setLoading(true);
    
    // Call backend to create subscription
    const result = await fetch('/api/v1/billing/create-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        plan_code: planCode,
        billing_cycle: billingCycle
      })
    }).then(r => r.json());
    
    if (!result.success) {
      throw new Error('Failed to create subscription');
    }
    
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    
    script.onload = () => {
      const options = {
        key: result.razorpay_key_id,
        subscription_id: result.razorpay_subscription_id,
        name: 'Axora',
        description: `${planCode} Plan - ${billingCycle}`,
        handler: async (response: any) => {
          try {
            // Verify payment
            await fetch('/api/v1/billing/verify-subscription-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            
            toast.success('Payment successful! Your subscription will be activated shortly.');
            
            // Reload subscription status
            loadData();
          } catch (error: any) {
            toast.error(error.message || 'Payment verification failed');
          }
        },
        theme: {
          color: '#3399cc'
        },
        modal: {
          ondismiss: () => {
            toast.info('Payment cancelled');
            setLoading(false);
          }
        }
      };
      
      // @ts-ignore
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    };
    
    script.onerror = () => {
      toast.error('Failed to load payment gateway');
      setLoading(false);
    };
    
  } catch (error: any) {
    toast.error(error.message || 'Failed to upgrade subscription');
    setLoading(false);
  }
};
```

---

## 6. Webhook Setup

### Configure Webhook on Razorpay Dashboard

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Add webhook URL: `https://your-domain.com/api/v1/billing/razorpay-webhook`
3. Select events:
   - subscription.activated
   - subscription.charged
   - subscription.cancelled
   - subscription.completed
   - invoice.paid
   - payment.failed
4. Copy webhook secret → Add to backend .env as `RAZORPAY_WEBHOOK_SECRET`

---

## 7. Flow Diagram

```
User clicks "Upgrade to Pro"
    ↓
Frontend calls /billing/create-subscription
    ↓
Backend creates Razorpay subscription (status=pending in DB)
    ↓
Backend returns subscription_id
    ↓
Frontend opens Razorpay checkout
    ↓
User completes payment
    ↓
Razorpay calls handler with payment details
    ↓
Frontend calls /billing/verify-subscription-payment
    ↓
Backend verifies signature (payment is valid)
    ↓
Razorpay sends webhook: subscription.activated
    ↓
Backend webhook handler sets status=active (SOURCE OF TRUTH)
    ↓
User now has Pro access
```

---

## 8. Status Flow

### Subscription Statuses

1. **pending**: Subscription created, payment not completed
2. **active**: Payment successful, subscription active
3. **cancelled**: User cancelled, downgraded to FREE
4. **expired**: Subscription period ended

### Plan Access Logic

```python
# In plan_service.py
async def get_user_plan_code(user_id):
    subscription = get_subscription(user_id)
    
    if subscription.status == "active":
        return subscription.plan_code  # PRO or PRO_PLUS
    else:
        return "FREE"  # pending, cancelled, expired
```

**Key Rule**: Only `status="active"` grants paid plan access.

---

## 9. Testing

### Test Mode

1. Use Razorpay test keys: `rzp_test_xxxxx`
2. Create test plans on Razorpay Dashboard
3. Use test card: 4111 1111 1111 1111, any future date, any CVV

### Test Flow

```bash
# 1. Create subscription
curl -X POST http://localhost:8000/api/v1/billing/create-subscription \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan_code": "PRO", "billing_cycle": "monthly"}'

# 2. Complete payment on Razorpay checkout

# 3. Verify webhook received
# Check logs for "subscription.activated"

# 4. Check subscription status
curl http://localhost:8000/api/v1/billing/subscription-status \
  -H "Authorization: Bearer $TOKEN"
```

---

## 10. Production Checklist

- [ ] Replace test keys with live keys
- [ ] Create live plans on Razorpay
- [ ] Update DB with live plan IDs
- [ ] Configure webhook with live URL
- [ ] Test complete flow in production
- [ ] Monitor webhook logs
- [ ] Set up alerts for failed payments

---

## 11. Security

### Payment Verification
- ✅ Always verify payment signature
- ✅ Never trust frontend alone
- ✅ Webhooks are source of truth

### Webhook Security
- ✅ Verify webhook signature
- ✅ Use HTTPS only
- ✅ Keep webhook secret secure

### Database
- ✅ Status checks prevent unauthorized access
- ✅ RLS policies enforce user isolation

---

## 12. Common Issues

### Issue: Subscription stays "pending"
**Solution**: Check webhook is configured and receiving events

### Issue: Payment successful but no access
**Solution**: Check webhook handler activated subscription (status=active)

### Issue: Webhook signature invalid
**Solution**: Verify RAZORPAY_WEBHOOK_SECRET matches Razorpay Dashboard

### Issue: Plan IDs not found
**Solution**: Update subscription_plans table with Razorpay plan IDs

---

## 13. Files Created/Updated

### Backend
- ✅ `backend/app/services/razorpay_service.py` - Razorpay client
- ✅ `backend/app/api/endpoints/billing.py` - Billing endpoints
- ✅ `backend/app/api/routes.py` - Added billing routes
- ✅ `backend/app/core/config.py` - Added Razorpay settings
- ✅ `backend/app/services/plan_service.py` - Updated status handling
- ✅ `backend/migrations/upgrade_to_3_plan_system.sql` - Added Razorpay fields

### Frontend
- ✅ `src/pages/SubscriptionPage.tsx` - Already has Razorpay integration

---

## 14. Next Steps

1. Run migration to add Razorpay fields
2. Create plans on Razorpay Dashboard
3. Update DB with plan IDs
4. Configure webhook
5. Test complete flow
6. Deploy to production

---

**Razorpay Integration Complete!** 🎉

All subscription payments now flow through Razorpay with webhook-based activation.
