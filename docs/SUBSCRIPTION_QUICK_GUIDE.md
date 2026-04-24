# Subscription System - Quick Reference

## For Developers: How to Add Subscription Checks

### Backend - Enforce Limits

```python
from app.services.subscription_service import SubscriptionService
from app.api.dependencies import get_supabase_client

# In your endpoint
async def my_endpoint(
    workspace_id: str,
    supabase = Depends(get_supabase_client)
):
    # Check and enforce limit
    subscription_service = SubscriptionService(supabase)
    await subscription_service.enforce_limit(
        workspace_id, 
        "max_pages",  # or max_ai_queries_per_day, max_storage_mb, etc.
        1  # increment amount
    )
    
    # If limit exceeded, raises HTTPException(403) automatically
    # Otherwise, continues
    
    # After successful action, increment usage
    await subscription_service.increment_usage(workspace_id, "max_pages", 1)
```

### Backend - Check Feature Access

```python
# Check if workspace has access to feature
has_access = await subscription_service.check_feature_access(
    workspace_id,
    "knowledge_graph"  # or any feature from plan.features.features
)

if not has_access:
    raise HTTPException(
        status_code=403,
        detail="Upgrade to Pro to access Knowledge Graph"
    )
```

### Frontend - Check Limits Before Action

```typescript
import { useSubscription } from '@/hooks/useSubscription';

function CreatePageButton() {
  const { enforceLimit } = useSubscription();
  
  const handleCreate = async () => {
    // Check limit before creating
    const allowed = await enforceLimit('max_pages', 1, 'creating pages');
    if (!allowed) return; // Shows upgrade prompt automatically
    
    // Proceed with creation
    await createPage();
  };
  
  return <Button onClick={handleCreate}>Create Page</Button>;
}
```

### Frontend - Check Feature Access

```typescript
import { useSubscription } from '@/hooks/useSubscription';

function KnowledgeGraphButton() {
  const { hasFeature } = useSubscription();
  const [canAccess, setCanAccess] = useState(false);
  
  useEffect(() => {
    hasFeature('knowledge_graph').then(setCanAccess);
  }, []);
  
  if (!canAccess) {
    return (
      <Button disabled>
        Knowledge Graph (Pro Feature)
      </Button>
    );
  }
  
  return <Button>Open Knowledge Graph</Button>;
}
```

### Frontend - Show Upgrade Prompt

```typescript
import { UpgradeDialog } from '@/components/subscription/UpgradePrompt';

function MyComponent() {
  const [showUpgrade, setShowUpgrade] = useState(false);
  
  return (
    <>
      <Button onClick={() => setShowUpgrade(true)}>
        Locked Feature
      </Button>
      
      <UpgradeDialog
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature="Advanced Analytics"
        description="Upgrade to Pro to access detailed analytics and insights"
      />
    </>
  );
}
```

## Available Metrics

- `max_pages` - Total pages
- `max_ai_queries_per_day` - AI queries per billing period
- `max_storage_mb` - Storage in MB
- `max_team_members` - Team members
- `max_workspaces` - Workspaces per user

## Available Features

- `basic_editor`
- `ai_assistant`
- `knowledge_graph`
- `advanced_analytics`
- `custom_branding`
- `priority_support`
- `api_access`
- `export_data`
- `collaboration`
- `version_history`
- `sso` (Enterprise only)
- `custom_integrations` (Enterprise only)

## Plans

- **Free**: Limited features, 10 pages, 20 AI queries/day
- **Pro**: $19.99/month, 500 pages, 500 AI queries/day, all features
- **Enterprise**: $99.99/month, unlimited everything

## Common Patterns

### Pattern 1: Enforce Before Create

```python
# Backend
await subscription_service.enforce_limit(workspace_id, "max_pages", 1)
# Create page
await subscription_service.increment_usage(workspace_id, "max_pages", 1)
```

### Pattern 2: Check Feature, Then Show UI

```typescript
// Frontend
const canUse = await hasFeature('advanced_analytics');
if (canUse) {
  return <AdvancedAnalytics />;
} else {
  return <UpgradePrompt feature="Advanced Analytics" />;
}
```

### Pattern 3: Soft Limit Warning

```typescript
// Frontend - Show warning at 80% usage
const { getUsage } = useSubscription();
const usage = getUsage('max_pages');

if (usage && usage.percentage > 80) {
  return <Alert>You're approaching your page limit. Consider upgrading.</Alert>;
}
```

## Testing

```bash
# 1. Run migration
psql -f backend/migrations/add_subscription_system.sql

# 2. Test creating 11 pages (should fail on 11th)
# 3. Test making 21 AI queries (should fail on 21st)
# 4. Upgrade to Pro via UI
# 5. Verify limits increased
```

## Quick Commands

```sql
-- Check workspace subscription
SELECT * FROM workspace_subscriptions WHERE workspace_id = 'xxx';

-- Check usage
SELECT * FROM usage_metrics WHERE workspace_id = 'xxx';

-- Manually upgrade
UPDATE workspace_subscriptions 
SET plan_id = (SELECT id FROM subscription_plans WHERE name = 'pro')
WHERE workspace_id = 'xxx';
```
