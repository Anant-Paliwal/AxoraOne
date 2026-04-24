"""
Subscription API Endpoints
User-level subscriptions with Razorpay payment integration
DB-DRIVEN: All limits and features read from database
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Dict, Any, List
from pydantic import BaseModel
from datetime import datetime

from app.api.dependencies import get_current_user
from app.core.supabase import supabase_admin
from app.services.plan_service import plan_service
from app.services.razorpay_service import razorpay_service

router = APIRouter()

# ============================================
# REQUEST MODELS
# ============================================

class UpgradeRequest(BaseModel):
    plan_name: str
    billing_cycle: str = "monthly"  # 'monthly' or 'yearly'

class CancelRequest(BaseModel):
    immediate: bool = False

class PaymentVerificationRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_subscription_id: str
    razorpay_signature: str

# ============================================
# ENDPOINTS
# ============================================

@router.get("/plans")
async def get_plans() -> List[Dict[str, Any]]:
    """
    Get all available subscription plans (FREE, PRO, PRO_PLUS)
    Public endpoint - no auth required
    Returns DB-driven plan definitions with all limits and feature flags
    """
    plans = await plan_service.get_all_plans()
    return plans


@router.get("/current")
async def get_current_subscription(
    current_user: str = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get current subscription for USER (not workspace)
    Returns full subscription details with usage
    """
    status = await plan_service.get_subscription_status(current_user)
    return status


@router.post("/upgrade")
async def upgrade_subscription(
    request: UpgradeRequest,
    current_user: str = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Upgrade USER to new plan (applies to all workspaces)
    Creates Razorpay subscription for payment
    Consolidated single handler with unified response schema
    """
    try:
        # Get user email from auth
        user_result = supabase_admin.auth.admin.get_user_by_id(current_user)
        user_email = user_result.user.email if user_result.user else current_user
        
        # Create Razorpay subscription
        result = await razorpay_service.create_subscription(
            user_id=current_user,
            plan_code=request.plan_name.upper(),  # Convert to uppercase (PRO, PRO_PLUS)
            billing_cycle=request.billing_cycle,
            user_email=user_email
        )
        
        # Return unified response matching frontend expectations
        return {
            "success": True,
            "message": f"Subscription created for {request.plan_name}",
            "subscription_id": result.get("razorpay_subscription_id") or result.get("subscription_id"),
            "amount": result.get("amount"),
            "currency": result.get("currency"),
            "razorpay_key": result.get("razorpay_key_id") or razorpay_service.key_id,
            **result
        }
        
    except Exception as e:
        print(f"Upgrade subscription error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify-payment")
async def verify_payment(
    request: PaymentVerificationRequest,
    current_user: str = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Verify Razorpay payment and activate subscription
    Called from frontend after successful payment
    """
    try:
        # Verify signature
        is_valid = razorpay_service.verify_payment_signature(
            request.razorpay_payment_id,
            request.razorpay_subscription_id,
            request.razorpay_signature
        )
        
        if not is_valid:
            raise HTTPException(status_code=400, detail="Invalid payment signature")
        
        # Activate subscription
        result = await razorpay_service.activate_subscription(
            user_id=current_user,
            razorpay_subscription_id=request.razorpay_subscription_id,
            razorpay_payment_id=request.razorpay_payment_id
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cancel")
async def cancel_subscription(
    request: CancelRequest,
    current_user: str = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Cancel USER subscription (affects all workspaces)
    Can be immediate or at period end
    """
    try:
        result = await razorpay_service.cancel_subscription(
            user_id=current_user,
            immediate=request.immediate
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/usage")
async def get_usage(
    current_user: str = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get current usage metrics for USER (global across all workspaces)
    """
    plan = await plan_service.get_user_plan(current_user)
    workspace_count = await plan_service.get_workspace_count(current_user)
    ask_anything_usage = await plan_service.get_ask_anything_usage(current_user)
    
    return {
        "user_id": current_user,
        "plan": plan.get("code"),
        "usage": {
            "workspaces": {
                "used": workspace_count,
                "limit": plan.get("workspaces_limit"),
                "unlimited": plan.get("workspaces_limit") is None
            },
            "ask_anything": ask_anything_usage
        }
    }


@router.get("/check-limit/{limit_type}")
async def check_limit(
    limit_type: str,
    workspace_id: str = None,
    current_user: str = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Check if USER can perform action within limits
    limit_type: workspace, collaborator, ask_anything
    """
    if limit_type == "workspace":
        can_create = await plan_service.check_workspace_limit(current_user)
        return {"allowed": can_create, "limit_type": "workspace"}
    
    elif limit_type == "collaborator":
        if not workspace_id:
            raise HTTPException(status_code=400, detail="workspace_id required for collaborator check")
        can_add = await plan_service.check_collaborator_limit(workspace_id)
        return {"allowed": can_add, "limit_type": "collaborator"}
    
    elif limit_type == "ask_anything":
        can_use = await plan_service.check_ask_anything_limit(current_user)
        return {"allowed": can_use, "limit_type": "ask_anything"}
    
    else:
        raise HTTPException(status_code=400, detail=f"Unknown limit_type: {limit_type}")


@router.get("/billing-history")
async def get_billing_history(
    current_user: str = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Get billing history for user
    """
    try:
        result = supabase_admin.table("billing_history")\
            .select("*")\
            .eq("user_id", current_user)\
            .order("created_at", desc=True)\
            .execute()
        
        return result.data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook/razorpay")
async def razorpay_webhook(request: Request) -> Dict[str, str]:
    """
    Handle Razorpay webhooks
    Events: subscription.activated, subscription.charged, payment.failed, etc.
    """
    try:
        # Get webhook body and signature
        body = await request.body()
        signature = request.headers.get("x-razorpay-signature", "")
        
        # Verify webhook signature
        is_valid = razorpay_service.verify_webhook_signature(
            body.decode(),
            signature
        )
        
        if not is_valid:
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
        
        # Parse payload
        import json
        payload = json.loads(body)
        event_type = payload.get("event")
        
        # Handle event
        result = await razorpay_service.handle_webhook_event(event_type, payload)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}
