# Subscription System Architecture

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER ACTIONS                               │
│  • View Plans  • Upgrade  • Downgrade  • Cancel  • Check Usage      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (UI ONLY)                           │
│  • SubscriptionPage.tsx - Display plans & pricing                   │
│  • useSubscription.ts - React hook for subscription state           │
│  • UpgradePrompt.tsx - Feature limit warnings                       │
│                                                                       │
│  RESPONSIBILITIES:                                                   │
│  ✓ Display available plans                                          │
│  ✓ Show current plan status                                         │
│  ✓ Display usage metrics & progress bars                            │
│  ✓ Trigger backend API calls                                        │
│  ✓ Show upgrade prompts when limits reached                         │
│                                                                       │
│  ✗ NO business logic                                                │
│  ✗ NO feature gating logic                                          │
│  ✗ NO payment processing                                            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND API ENDPOINTS                             │
│  /api/v1/subscriptions/                                             │
│    • GET  /plans                  - List all available plans        │
│    • GET  /current                - Get user's current subscription │
│    • GET  /usage                  - Get current usage metrics       │
│    • POST /upgrade                - Upgrade to higher plan          │
│    • POST /downgrade              - Downgrade to lower plan         │
│    • POST /cancel                 - Cancel subscription             │
│    • POST /check-feature          - Check if feature is available   │
│    • POST /webhook/stripe         - Handle Stripe webhooks          │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SUBSCRIPTION SERVICE                              │
│  backend/app/services/subscription_service.py                       │
│                                                                       │
│  CORE FUNCTIONS:                                                     │
│  • get_workspace_subscription(workspace_id)                         │
│  • check_feature_access(workspace_id, feature_name)                 │
│  • check_limit(workspace_id, limit_type, current_count)             │
│  • upgrade_subscription(workspace_id, plan_name, billing_cycle)     │
│  • cancel_subscription(workspace_id, immediate=False)               │
│  • track_usage(workspace_id, metric_type, increment=1)              │
│  • get_usage_stats(workspace_id)                                    │
│  • handle_payment_webhook(event_data)                               │
│                                                                       │
│  FEATURE GATING:                                                     │
│  • can_create_page(workspace_id) → bool                             │
│  • can_use_ai_query(workspace_id) → bool                            │
│  • can_add_team_member(workspace_id) → bool                         │
│  • can_use_advanced_features(workspace_id) → bool                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATABASE TABLES                              │
│                                                                       │
│  subscription_plans                                                  │
│  ├─ id (UUID)                                                        │
│  ├─ name (free, pro, enterprise)                                    │
│  ├─ display_name                                                     │
│  ├─ description                                                      │
│  ├─ price_monthly                                                    │
│  ├─ price_yearly                                                     │
│  ├─ features (JSONB)                                                 │
│  │   ├─ max_pages                                                    │
│  │   ├─ max_ai_queries_per_day                                      │
│  │   ├─ max_storage_mb                                              │
│  │   ├─ max_team_members                                            │
│  │   └─ features { advanced_analytics, priority_support, ... }      │
│  └─ sort_order                                                       │
│                                                                       │
│  workspace_subscriptions                                             │
│  ├─ id (UUID)                                                        │
│  ├─ workspace_id → workspaces(id)                                   │
│  ├─ plan_id → subscription_plans(id)                                │
│  ├─ status (active, cancelled, expired, past_due)                   │
│  ├─ billing_cycle (monthly, yearly)                                 │
│  ├─ current_period_start                                            │
│  ├─ current_period_end                                              │
│  ├─ cancel_at_period_end (boolean)                                  │
│  ├─ stripe_subscription_id                                          │
│  ├─ stripe_customer_id                                              │
│  └─ metadata (JSONB)                                                 │
│                                                                       │
│  usage_metrics                                                       │
│  ├─ id (UUID)                                                        │
│  ├─ workspace_id → workspaces(id)                                   │
│  ├─ metric_type (pages_created, ai_queries, storage_used, ...)     │
│  ├─ count (INTEGER)                                                  │
│  ├─ period_start                                                     │
│  ├─ period_end                                                       │
│  └─ created_at                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PAYMENT PROVIDER (STRIPE)                         │
│  • Process payments                                                  │
│  • Handle subscriptions                                              │
│  • Send webhooks for events                                          │
│  • Manage billing cycles                                             │
└─────────────────────────────────────────────────────────────────────┘
```

## Feature Gating Integration Points

### 1. Page Creation
```python
# backend/app/api/endpoints/pages.py
@router.post("/")
async def create_page(page: PageCreate, workspace_id: str):
    # Check subscription limit
    if not subscription_service.can_create_page(workspace_id):
        raise HTTPException(
            status_code=403,
            detail={
                "error": "page_limit_reached",
                "message": "You've reached your page limit. Upgrade to Pro for unlimited pages.",
                "upgrade_url": "/subscription"
            }
        )
    # Create page...
```

### 2. AI Query
```python
# backend/app/api/endpoints/ai_chat.py
@router.post("/query")
async def query(request: QueryRequest, workspace_id: str):
    # Check AI query limit
    if not subscription_service.can_use_ai_query(workspace_id):
        raise HTTPException(
            status_code=403,
            detail={
                "error": "ai_query_limit_reached",
                "message": "Daily AI query limit reached. Upgrade to Pro for unlimited queries.",
                "upgrade_url": "/subscription"
            }
        )
    # Process query...
```

### 3. Team Members
```python
# backend/app/api/endpoints/workspaces.py
@router.post("/{workspace_id}/members")
async def add_member(workspace_id: str, member: MemberCreate):
    # Check team member limit
    if not subscription_service.can_add_team_member(workspace_id):
        raise HTTPException(
            status_code=403,
            detail={
                "error": "team_limit_reached",
                "message": "Team member limit reached. Upgrade to Enterprise for unlimited members.",
                "upgrade_url": "/subscription"
            }
        )
    # Add member...
```

### 4. Advanced Features
```python
# backend/app/api/endpoints/pages.py
@router.get("/{page_id}/analytics")
async def get_analytics(page_id: str, workspace_id: str):
    # Check feature access
    if not subscription_service.check_feature_access(workspace_id, "advanced_analytics"):
        raise HTTPException(
            status_code=403,
            detail={
                "error": "feature_not_available",
                "message": "Advanced analytics is a Pro feature. Upgrade to access.",
                "upgrade_url": "/subscription"
            }
        )
    # Return analytics...
```

## Frontend Error Handling

```typescript
// src/hooks/useSubscription.ts
export function useSubscription() {
  const handleApiError = (error: any) => {
    if (error.response?.status === 403) {
      const detail = error.response.data.detail;
      
      if (detail.error === 'page_limit_reached') {
        // Show upgrade prompt
        showUpgradePrompt({
          title: 'Page Limit Reached',
          message: detail.message,
          feature: 'unlimited_pages',
          upgradeUrl: detail.upgrade_url
        });
      }
      
      if (detail.error === 'ai_query_limit_reached') {
        showUpgradePrompt({
          title: 'AI Query Limit Reached',
          message: detail.message,
          feature: 'unlimited_ai',
          upgradeUrl: detail.upgrade_url
        });
      }
    }
  };
  
  return { handleApiError };
}
```

## Plan Definitions

### Free Plan
- 50 pages
- 100 AI queries/day
- 500MB storage
- 1 team member
- Basic features only

### Pro Plan ($15/month or $150/year)
- Unlimited pages
- Unlimited AI queries
- 10GB storage
- 10 team members
- Advanced analytics
- Priority support
- Custom branding

### Enterprise Plan ($50/month or $500/year)
- Unlimited everything
- Unlimited team members
- 100GB storage
- Dedicated support
- SSO integration
- Custom integrations
- API access

## Implementation Checklist

- [x] Database migrations created
- [x] Subscription service implemented
- [x] Backend API endpoints created
- [x] Frontend subscription page created
- [x] useSubscription hook created
- [x] UpgradePrompt component created
- [ ] Feature gating integrated in all endpoints
- [ ] Stripe integration configured
- [ ] Webhook handlers implemented
- [ ] Usage tracking implemented
- [ ] Testing completed
- [ ] Documentation updated

## Key Principles

1. **Backend Controls Everything**: All subscription logic, feature gating, and limits are enforced server-side
2. **Frontend Displays Only**: UI shows plans, usage, and triggers backend actions
3. **Fail Secure**: If subscription check fails, deny access by default
4. **Clear Messaging**: Always tell users why they can't access a feature and how to upgrade
5. **Track Everything**: Monitor all usage metrics for billing and analytics
6. **Graceful Degradation**: When limits are reached, show upgrade prompts, don't break the app