"""
Subscription Service
Handles all subscription logic, feature gating, and usage tracking
"""
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from supabase import Client
from fastapi import HTTPException
from app.core.supabase import supabase_admin

class SubscriptionService:
    def __init__(self, supabase: Client):
        self.supabase = supabase
        self.admin_client = supabase_admin  # Use service key for admin operations
    
    # ============================================
    # PLAN MANAGEMENT
    # ============================================
    
    async def get_all_plans(self) -> List[Dict[str, Any]]:
        """Get all available subscription plans"""
        result = self.supabase.table("subscription_plans")\
            .select("*")\
            .eq("is_active", True)\
            .order("sort_order")\
            .execute()
        
        return result.data
    
    async def get_plan_by_name(self, plan_name: str) -> Dict[str, Any]:
        """Get specific plan by name"""
        result = self.supabase.table("subscription_plans")\
            .select("*")\
            .eq("name", plan_name)\
            .execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        return result.data[0]
    
    # ============================================
    # WORKSPACE SUBSCRIPTION
    # ============================================
    
    async def get_workspace_subscription(self, workspace_id: str) -> Dict[str, Any]:
        """Get current subscription for workspace"""
        # Use admin client to bypass RLS for reading
        result = self.admin_client.table("workspace_subscriptions")\
            .select("*, plan:subscription_plans(*)")\
            .eq("workspace_id", workspace_id)\
            .execute()
        
        if not result.data or len(result.data) == 0:
            # Auto-assign free plan if no subscription exists
            return await self.assign_free_plan(workspace_id)
        
        return result.data[0]
    
    async def assign_free_plan(self, workspace_id: str) -> Dict[str, Any]:
        """Assign free plan to workspace - uses admin client to bypass RLS"""
        free_plan = await self.get_plan_by_name("free")
        
        subscription_data = {
            "workspace_id": workspace_id,
            "plan_id": free_plan["id"],
            "status": "active",
            "billing_cycle": "monthly",
            "current_period_start": datetime.utcnow().isoformat(),
            "current_period_end": (datetime.utcnow() + timedelta(days=36500)).isoformat(),  # 100 years
        }
        
        try:
            # Use admin client to bypass RLS
            result = self.admin_client.table("workspace_subscriptions")\
                .insert(subscription_data)\
                .execute()
            
            return result.data[0]
        except Exception as e:
            # If duplicate, fetch existing subscription
            if "duplicate key" in str(e).lower():
                result = self.admin_client.table("workspace_subscriptions")\
                    .select("*, plan:subscription_plans(*)")\
                    .eq("workspace_id", workspace_id)\
                    .execute()
                return result.data[0]
            raise
    
    # ============================================
    # SUBSCRIPTION UPGRADES/DOWNGRADES
    # ============================================
    
    async def upgrade_subscription(
        self,
        workspace_id: str,
        new_plan_name: str,
        billing_cycle: str = "monthly"
    ) -> Dict[str, Any]:
        """Upgrade workspace to new plan"""
        new_plan = await self.get_plan_by_name(new_plan_name)
        current_sub = await self.get_workspace_subscription(workspace_id)
        
        # Calculate new period
        period_start = datetime.utcnow()
        if billing_cycle == "yearly":
            period_end = period_start + timedelta(days=365)
        else:
            period_end = period_start + timedelta(days=30)
        
        # Update subscription
        update_data = {
            "plan_id": new_plan["id"],
            "billing_cycle": billing_cycle,
            "current_period_start": period_start.isoformat(),
            "current_period_end": period_end.isoformat(),
            "status": "active",
            "cancel_at_period_end": False,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = self.supabase.table("workspace_subscriptions")\
            .update(update_data)\
            .eq("workspace_id", workspace_id)\
            .execute()
        
        # Reset usage metrics for new period
        await self.reset_usage_metrics(workspace_id, period_start, period_end)
        
        return result.data[0]
    
    async def cancel_subscription(
        self,
        workspace_id: str,
        immediate: bool = False
    ) -> Dict[str, Any]:
        """Cancel workspace subscription"""
        if immediate:
            # Downgrade to free immediately
            return await self.upgrade_subscription(workspace_id, "free")
        else:
            # Cancel at period end
            result = self.supabase.table("workspace_subscriptions")\
                .update({
                    "cancel_at_period_end": True,
                    "cancelled_at": datetime.utcnow().isoformat()
                })\
                .eq("workspace_id", workspace_id)\
                .execute()
            
            return result.data[0]
    
    # ============================================
    # FEATURE GATING
    # ============================================
    
    async def check_feature_access(
        self,
        workspace_id: str,
        feature_name: str
    ) -> bool:
        """Check if workspace has access to specific feature"""
        subscription = await self.get_workspace_subscription(workspace_id)
        
        if subscription["status"] != "active":
            return False
        
        plan = subscription.get("plan", {})
        features = plan.get("features", {}).get("features", {})
        
        return features.get(feature_name, False)
    
    async def check_limit(
        self,
        workspace_id: str,
        metric_type: str,
        increment: int = 1
    ) -> Dict[str, Any]:
        """
        Check if workspace can perform action within limits
        Returns: {
            "allowed": bool,
            "current": int,
            "limit": int,
            "remaining": int
        }
        """
        subscription = await self.get_workspace_subscription(workspace_id)
        plan = subscription.get("plan", {})
        features = plan.get("features", {})
        
        # Get limit from plan
        limit = features.get(metric_type, 0)
        
        # -1 means unlimited
        if limit == -1:
            return {
                "allowed": True,
                "current": 0,
                "limit": -1,
                "remaining": -1,
                "unlimited": True
            }
        
        # Get current usage
        current_usage = await self.get_current_usage(workspace_id, metric_type)
        
        allowed = (current_usage + increment) <= limit
        remaining = max(0, limit - current_usage)
        
        return {
            "allowed": allowed,
            "current": current_usage,
            "limit": limit,
            "remaining": remaining,
            "unlimited": False
        }
    
    async def enforce_limit(
        self,
        workspace_id: str,
        metric_type: str,
        increment: int = 1
    ) -> None:
        """
        Enforce limit - raises exception if limit exceeded
        Use this before allowing actions
        """
        check = await self.check_limit(workspace_id, metric_type, increment)
        
        if not check["allowed"]:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "limit_exceeded",
                    "message": f"You've reached your plan limit for {metric_type}",
                    "current": check["current"],
                    "limit": check["limit"],
                    "upgrade_required": True
                }
            )
    
    # ============================================
    # USAGE TRACKING
    # ============================================
    
    async def get_current_usage(
        self,
        workspace_id: str,
        metric_type: str
    ) -> int:
        """Get current usage for metric in current period"""
        subscription = await self.get_workspace_subscription(workspace_id)
        
        result = self.admin_client.table("usage_metrics")\
            .select("count")\
            .eq("workspace_id", workspace_id)\
            .eq("metric_type", metric_type)\
            .gte("period_end", datetime.utcnow().isoformat())\
            .execute()
        
        if result.data:
            return result.data[0]["count"]
        return 0
    
    async def increment_usage(
        self,
        workspace_id: str,
        metric_type: str,
        increment: int = 1
    ) -> None:
        """Increment usage counter using upsert to avoid race conditions"""
        subscription = await self.get_workspace_subscription(workspace_id)
        
        period_start = subscription["current_period_start"]
        period_end = subscription["current_period_end"]
        
        try:
            # Try to update existing metric first
            existing = self.admin_client.table("usage_metrics")\
                .select("*")\
                .eq("workspace_id", workspace_id)\
                .eq("metric_type", metric_type)\
                .eq("period_start", period_start)\
                .execute()
            
            if existing.data:
                # Update existing - use admin client to bypass RLS
                self.admin_client.table("usage_metrics")\
                    .update({"count": existing.data[0]["count"] + increment})\
                    .eq("id", existing.data[0]["id"])\
                    .execute()
            else:
                # Create new - use admin client to bypass RLS
                # Use upsert with on_conflict to handle race conditions
                self.admin_client.table("usage_metrics")\
                    .upsert({
                        "workspace_id": workspace_id,
                        "metric_type": metric_type,
                        "count": increment,
                        "period_start": period_start,
                        "period_end": period_end
                    }, on_conflict="workspace_id,metric_type,period_start")\
                    .execute()
        except Exception as e:
            # If we get a duplicate key error, try to update instead
            error_str = str(e)
            if "23505" in error_str or "duplicate key" in error_str.lower():
                # Race condition - record was created between check and insert
                # Fetch and update
                existing = self.admin_client.table("usage_metrics")\
                    .select("*")\
                    .eq("workspace_id", workspace_id)\
                    .eq("metric_type", metric_type)\
                    .eq("period_start", period_start)\
                    .execute()
                
                if existing.data:
                    self.admin_client.table("usage_metrics")\
                        .update({"count": existing.data[0]["count"] + increment})\
                        .eq("id", existing.data[0]["id"])\
                        .execute()
            else:
                # Re-raise other errors
                raise
    
    async def get_all_usage(self, workspace_id: str) -> Dict[str, int]:
        """Get all usage metrics for workspace"""
        subscription = await self.get_workspace_subscription(workspace_id)
        
        result = self.admin_client.table("usage_metrics")\
            .select("metric_type, count")\
            .eq("workspace_id", workspace_id)\
            .gte("period_end", datetime.utcnow().isoformat())\
            .execute()
        
        usage = {}
        for metric in result.data:
            usage[metric["metric_type"]] = metric["count"]
        
        return usage
    
    async def reset_usage_metrics(
        self,
        workspace_id: str,
        period_start: datetime,
        period_end: datetime
    ) -> None:
        """Reset usage metrics for new billing period"""
        # Delete old metrics - use admin client to bypass RLS
        self.admin_client.table("usage_metrics")\
            .delete()\
            .eq("workspace_id", workspace_id)\
            .execute()
    
    # ============================================
    # BILLING HISTORY
    # ============================================
    
    async def add_billing_record(
        self,
        workspace_id: str,
        amount: float,
        status: str,
        description: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Add billing history record"""
        subscription = await self.get_workspace_subscription(workspace_id)
        
        record = {
            "workspace_id": workspace_id,
            "subscription_id": subscription["id"],
            "amount": amount,
            "status": status,
            "description": description,
            **kwargs
        }
        
        result = self.supabase.table("billing_history")\
            .insert(record)\
            .execute()
        
        return result.data[0]
    
    async def get_billing_history(
        self,
        workspace_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get billing history for workspace"""
        result = self.supabase.table("billing_history")\
            .select("*")\
            .eq("workspace_id", workspace_id)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        
        return result.data
    
    # ============================================
    # SUBSCRIPTION STATUS
    # ============================================
    
    async def get_subscription_status(self, workspace_id: str) -> Dict[str, Any]:
        """Get complete subscription status with usage"""
        subscription = await self.get_workspace_subscription(workspace_id)
        plan = subscription.get("plan", {})
        usage = await self.get_all_usage(workspace_id)
        
        # Calculate usage percentages
        features = plan.get("features", {})
        usage_details = {}
        
        for metric, limit in features.items():
            if metric.startswith("max_") and isinstance(limit, int):
                current = usage.get(metric, 0)
                if limit == -1:
                    usage_details[metric] = {
                        "current": current,
                        "limit": "unlimited",
                        "percentage": 0
                    }
                else:
                    percentage = (current / limit * 100) if limit > 0 else 0
                    usage_details[metric] = {
                        "current": current,
                        "limit": limit,
                        "percentage": round(percentage, 1)
                    }
        
        return {
            "subscription": subscription,
            "plan": plan,
            "usage": usage_details,
            "status": subscription["status"],
            "billing_cycle": subscription["billing_cycle"],
            "current_period_end": subscription["current_period_end"],
            "cancel_at_period_end": subscription.get("cancel_at_period_end", False)
        }
