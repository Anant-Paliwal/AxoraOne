# 🔍 Subscription System Flow Verification

## Current Implementation Status

### ✅ What's Implemented

#### 1. Payment Failure Handling
**Location:** `backend/app/services/razorpay_service.py` (line 436)

```python
async def _handle_payment_failed(self, payload: Dict[str, Any]) -> None:
    """Handle payment failure"""
    # Records failed payment in billing_history
    # Status: "failed"
    # User stays on current plan until retry succeeds
```

**Behavior:**
- ✅ Failed payment recorded in `billing_history` table
- ✅ User notified via Razorpay
- ⚠️ **ISSUE:** User NOT automatically downgraded to Free plan
- ⚠️ **ISSUE:** No retry mechanism implemented

#### 2. Subscription Cancellation
**Location:** `backend/app/services/razorpay_service.py` (line 411)

```python
async def _handle_subscription_cancelled(self, payload: Dict[str, Any]) -> None:
    """Handle subscription cancellation"""
    # Downgrades user to Free plan
    # Updates user_subscriptions table
```

**Behavior:**
- ✅ User automatically downgraded to Free plan
- ✅ Limits enforced immediately
- ✅ Billing stopped

#### 3. Subscription Expiry
**Location:** `backend/app/services/razorpay_service.py` (line 423)

```python
async def _handle_subscription_completed(self, payload: Dict[str, Any]) -> None:
    """Handle subscription completion"""
    # Marks subscription as "completed"
    # Status updated in database
```

**Behavior:**
- ✅ Subscription marked as completed
- ⚠️ **ISSUE:** User NOT automatically downgraded to Free plan
- ⚠️ **ISSUE:** Limits may not be enforced

---

## 🔴 Critical Issues Found

### Issue 1: Payment Failure Doesn't Downgrade
**Problem:** When payment fails, user keeps Pro/Enterprise access

**Current Code:**
```python
async def _handle_payment_failed(self, payload: Dict[str, Any]) -> None:
    # Only records failure, doesn't downgrade
    supabase_admin.table("billing_history").insert({
        "status": "failed"
    }).execute()
```

**Should Be:**
```python
async def _handle_payment_failed(self, payload: Dict[str, Any]) -> None:
    # Record failure
    # After 3 failed attempts, downgrade to Free
    # Send notification to user
```

### Issue 2: Subscription Expiry Doesn't Downgrade
**Problem:** When subscription period ends, user keeps access

**Current Code:**
```python
async def _handle_subscription_completed(self, payload: Dict[str, Any]) -> None:
    # Only updates status
    supabase_admin.table("user_subscriptions")\
        .update({"status": "completed"})\
        .execute()
```

**Should Be:**
```python
async def _handle_subscription_completed(self, payload: Dict[str, Any]) -> None:
    # Update status
    # Downgrade to Free plan
    # Clear usage metrics for new period
```

### Issue 3: No Automatic Expiry Check
**Problem:** System doesn't check for expired subscriptions automatically

**Missing:** Background job to check `current_period_end` and downgrade expired subscriptions

---

## 🛠️ Required Fixes

### Fix 1: Handle Payment Failures Properly

**File:** `backend/app/services/razorpay_service.py`

**Add after line 436:**
```python
async def _handle_payment_failed(self, payload: Dict[str, Any]) -> None:
    """Handle payment failure"""
    payment = payload["payload"]["payment"]["entity"]
    subscription_id = payment.get("subscription_id")
    
    if subscription_id:
        # Get user from subscription
        result = supabase_admin.table("user_subscriptions")\
            .select("user_id, razorpay_subscription_id")\
            .eq("razorpay_subscription_id", subscription_id)\
            .single()\
            .execute()
        
        if result.data:
            user_id = result.data["user_id"]
            
            # Record failed payment
            supabase_admin.table("billing_history").insert({
                "user_id": user_id,
                "amount": payment["amount"] / 100,
                "currency": payment["currency"],
                "status": "failed",
                "description": "Payment failed",
                "razorpay_payment_id": payment["id"]
            }).execute()
            
            # Check failed payment count
            failed_count = supabase_admin.table("billing_history")\
                .select("id", count="exact")\
                .eq("user_id", user_id)\
                .eq("status", "failed")\
                .gte("created_at", datetime.utcnow() - timedelta(days=30))\
                .execute()
            
            # After 3 failed payments in 30 days, downgrade to free
            if failed_count.count >= 3:
                user_sub_service = UserSubscriptionService(supabase_admin)
                await user_sub_service.upgrade_subscription(
                    user_id=user_id,
                    new_plan_name="free",
                    billing_cycle="monthly"
                )
```

### Fix 2: Handle Subscription Expiry Properly

**File:** `backend/app/services/razorpay_service.py`

**Replace line 423:**
```python
async def _handle_subscription_completed(self, payload: Dict[str, Any]) -> None:
    """Handle subscription completion"""
    subscription = payload["payload"]["subscription"]["entity"]
    user_id = subscription["notes"].get("user_id")
    
    if user_id:
        # Mark as completed
        supabase_admin.table("user_subscriptions")\
            .update({"status": "completed"})\
            .eq("user_id", user_id)\
            .execute()
        
        # Downgrade to free plan
        user_sub_service = UserSubscriptionService(supabase_admin)
        await user_sub_service.upgrade_subscription(
            user_id=user_id,
            new_plan_name="free",
            billing_cycle="monthly"
        )
```

### Fix 3: Add Automatic Expiry Check

**Create new file:** `backend/app/services/subscription_checker.py`

```python
"""
Subscription Expiry Checker
Runs periodically to check for expired subscriptions
"""
from datetime import datetime
from app.core.supabase import supabase_admin
from app.services.user_subscription_service import UserSubscriptionService

async def check_expired_subscriptions():
    """Check and downgrade expired subscriptions"""
    
    # Find expired subscriptions
    result = supabase_admin.table("user_subscriptions")\
        .select("user_id, plan_id")\
        .eq("status", "active")\
        .lt("current_period_end", datetime.utcnow().isoformat())\
        .execute()
    
    user_sub_service = UserSubscriptionService(supabase_admin)
    
    for subscription in result.data:
        user_id = subscription["user_id"]
        
        # Skip if already on free plan
        plan = supabase_admin.table("subscription_plans")\
            .select("name")\
            .eq("id", subscription["plan_id"])\
            .single()\
            .execute()
        
        if plan.data["name"] != "free":
            # Downgrade to free
            await user_sub_service.upgrade_subscription(
                user_id=user_id,
                new_plan_name="free",
                billing_cycle="monthly"
            )
            
            print(f"Downgraded user {user_id} to free plan (expired)")
```

**Add to:** `backend/main.py`

```python
from fastapi import FastAPI, BackgroundTasks
from app.services.subscription_checker import check_expired_subscriptions
import asyncio

@app.on_event("startup")
async def startup_event():
    # Run expiry check every hour
    asyncio.create_task(run_expiry_checker())

async def run_expiry_checker():
    while True:
        try:
            await check_expired_subscriptions()
        except Exception as e:
            print(f"Expiry checker error: {e}")
        
        # Wait 1 hour
        await asyncio.sleep(3600)
```

---

## 🧪 Testing Scenarios

### Test 1: Payment Failure
```
1. User on Pro plan
2. Payment fails (simulate via Razorpay dashboard)
3. Webhook received: payment.failed
4. Check: User still on Pro (grace period)
5. Fail 2 more times
6. Check: User downgraded to Free
```

### Test 2: Subscription Cancellation
```
1. User on Pro plan
2. User clicks "Cancel Subscription"
3. Webhook received: subscription.cancelled
4. Check: User immediately on Free plan
5. Check: Limits enforced (can't create 11 skills)
```

### Test 3: Subscription Expiry
```
1. User on Pro plan (monthly)
2. Wait 30 days (or manually set current_period_end to past)
3. Background job runs
4. Check: User downgraded to Free
5. Check: Limits enforced
```

### Test 4: Successful Renewal
```
1. User on Pro plan
2. Payment succeeds (auto-renewal)
3. Webhook received: subscription.charged
4. Check: User still on Pro
5. Check: Billing history updated
6. Check: New period dates set
```

---

## 📊 Current Status Summary

| Feature | Status | Works? | Needs Fix? |
|---------|--------|--------|------------|
| Payment Success | ✅ Implemented | ✅ Yes | ❌ No |
| Payment Failure | ⚠️ Partial | ⚠️ Partial | ✅ Yes |
| Subscription Cancel | ✅ Implemented | ✅ Yes | ❌ No |
| Subscription Expiry | ⚠️ Partial | ❌ No | ✅ Yes |
| Auto Expiry Check | ❌ Missing | ❌ No | ✅ Yes |
| Downgrade to Free | ⚠️ Partial | ⚠️ Sometimes | ✅ Yes |
| Limit Enforcement | ✅ Implemented | ✅ Yes | ❌ No |

---

## 🎯 Recommended Actions

### Priority 1 (Critical):
1. ✅ Fix subscription expiry to auto-downgrade
2. ✅ Add background job for expiry checking
3. ✅ Fix payment failure to downgrade after 3 attempts

### Priority 2 (Important):
4. Add email notifications for:
   - Payment failure
   - Subscription expiry warning (7 days before)
   - Downgrade notification
5. Add retry mechanism for failed payments
6. Add grace period (3-7 days) before downgrade

### Priority 3 (Nice to have):
7. Add admin dashboard to view subscription status
8. Add manual override for subscription management
9. Add refund handling

---

## 🚀 Quick Fix Implementation

I can implement the critical fixes (Priority 1) right now. Would you like me to:

1. ✅ Update `_handle_payment_failed()` to downgrade after 3 failures
2. ✅ Update `_handle_subscription_completed()` to auto-downgrade
3. ✅ Create background job for expiry checking
4. ✅ Test the complete flow

**Estimated time:** 30 minutes

**Impact:** 
- ✅ Users automatically downgraded when subscription expires
- ✅ Failed payments handled properly
- ✅ No manual intervention needed
- ✅ System fully automated

Should I proceed with implementing these fixes?

