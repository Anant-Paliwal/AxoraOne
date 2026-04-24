"""
Billing API Endpoints - Razorpay Integration
Webhooks are the source of truth for subscription status
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from typing import Dict, Any, Optional
from pydantic import BaseModel

from app.api.dependencies import get_current_user
from app.services.razorpay_service import razorpay_service
from app.services.plan_service import plan_service

router = APIRouter()

# ============================================
# REQUEST MODELS
# ============================================

class CreateSubscriptionRequest(BaseModel):
    plan_code: str  # PRO or PRO_PLUS
    billing_cycle: str  # monthly or yearly

class VerifyPaymentRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_subscription_id: str
    razorpay_signature: str

class CancelSubscriptionRequest(BaseModel):
    immediate: bool = False

# ============================================
# ENDPOINTS
# ============================================

@router.post("/create-subscription")
async def create_subscription(
    request: CreateSubscriptionRequest,
    current_user: str = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Create Razorpay subscription
    Returns subscription_id for checkout
    Status is 'pending' until webhook confirms
    """
    try:
        # Validate plan code
        if request.plan_code not in ["PRO", "PRO_PLUS"]:
            raise HTTPException(status_code=400, detail="Invalid plan code")
        
        # Validate billing cycle
        if request.billing_cycle not in ["monthly", "yearly"]:
            raise HTTPException(status_code=400, detail="Invalid billing cycle")
        
        # Get user email
        from app.core.supabase import supabase_admin
        user_result = supabase_admin.auth.admin.get_user_by_id(current_user)
        user_email = user_result.user.email if user_result.user else current_user
        
        # Create subscription
        result = await razorpay_service.create_subscription(
            user_id=current_user,
            plan_code=request.plan_code,
            billing_cycle=request.billing_cycle,
            user_email=user_email
        )
        
        return {
            "success": True,
            **result
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Create subscription error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create subscription")


@router.post("/verify-subscription-payment")
async def verify_subscription_payment(
    request: VerifyPaymentRequest,
    current_user: str = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Verify payment signature from Razorpay
    IMPORTANT: This only verifies payment, not subscription status
    Webhook will activate the subscription (source of truth)
    """
    try:
        # Verify signature
        is_valid = razorpay_service.verify_payment_signature(
            payment_id=request.razorpay_payment_id,
            subscription_id=request.razorpay_subscription_id,
            signature=request.razorpay_signature
        )
        
        if not is_valid:
            raise HTTPException(status_code=400, detail="Invalid payment signature")
        
        return {
            "success": True,
            "message": "Payment verified. Subscription will be activated via webhook."
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Verify payment error: {e}")
        raise HTTPException(status_code=500, detail="Payment verification failed")


@router.post("/cancel-subscription")
async def cancel_subscription(
    request: CancelSubscriptionRequest,
    current_user: str = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Cancel user subscription
    immediate=True: Cancel now and downgrade to FREE
    immediate=False: Cancel at period end
    """
    try:
        result = await razorpay_service.cancel_subscription(
            user_id=current_user,
            immediate=request.immediate
        )
        
        return result
    
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"Cancel subscription error: {e}")
        raise HTTPException(status_code=500, detail="Failed to cancel subscription")


@router.post("/razorpay-webhook")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None)
) -> Dict[str, str]:
    """
    Razorpay webhook handler
    SOURCE OF TRUTH for subscription status
    
    Events handled:
    - subscription.activated: Activate subscription
    - subscription.charged: Update period end
    - subscription.cancelled: Downgrade to FREE
    - subscription.completed: Downgrade to FREE
    - invoice.paid: Update period end
    - payment.failed: Log warning
    """
    try:
        # Get raw body
        body = await request.body()
        body_str = body.decode()
        
        # Verify signature
        if not x_razorpay_signature:
            raise HTTPException(status_code=400, detail="Missing signature")
        
        is_valid = razorpay_service.verify_webhook_signature(
            payload=body_str,
            signature=x_razorpay_signature
        )
        
        if not is_valid:
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
        
        # Parse payload
        import json
        payload = json.loads(body_str)
        event_type = payload.get("event")
        
        # Handle event
        result = await razorpay_service.handle_webhook_event(event_type, payload)
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}


@router.get("/subscription-status")
async def get_subscription_status(
    current_user: str = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get current subscription status
    Includes plan, usage, and billing info
    """
    try:
        status = await plan_service.get_subscription_status(current_user)
        return status
    
    except Exception as e:
        print(f"Get subscription status error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get subscription status")


@router.get("/billing-history")
async def get_billing_history(
    current_user: str = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get billing history (placeholder)
    Can be extended to fetch from Razorpay
    """
    try:
        # Get user subscription
        from app.core.supabase import supabase_admin
        result = supabase_admin.table("user_subscriptions")\
            .select("*")\
            .eq("user_id", current_user)\
            .single()\
            .execute()
        
        if not result.data:
            return {"history": []}
        
        subscription = result.data
        
        # Fetch from Razorpay if subscription exists
        razorpay_sub_id = subscription.get("razorpay_subscription_id")
        if razorpay_sub_id:
            # Can fetch invoices from Razorpay here
            pass
        
        return {
            "history": [],
            "subscription": subscription
        }
    
    except Exception as e:
        print(f"Get billing history error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get billing history")
