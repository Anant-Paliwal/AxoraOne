# Subscription System - Integration Points

## Where Subscription Checks Are Already Added

### ✅ Pages Creation
**File**: `backend/app/api/endpoints/pages.py`
**Line**: ~145
**Check**: Enforces `max_pages` limit before creating page
**Auto-tracking**: Database trigger increments usage automatically

### ✅ AI Queries
**File**: `backend/app/api/endpoints/ai_chat.py`
**Line**: ~175
**Check**: Enforces `max_ai_queries_per_day` limit before processing query
**Manual tracking**: Increments usage after successful query

---

## Where to Add More Checks

### 1. Team Members
**When**: Adding members to workspace
**File**: `backend/app/api/endpoints/workspaces.py`
**Metric**: `max_team_members`

```python
# Before adding member
await subscription_service.enforce_limit(workspace_id, "max_team_members", 1)
# Add member
await subscription_service.increment_usage(workspace_id, "max_team_members", 1)
```

### 2. File Uploads
**When**: Uploading files
**File**: `backend/app/api/endpoints/file_upload.py`
**Metric**: `max_storage_mb`

```python
# Get file size in MB
file_size_mb = len(file_content) / (1024 * 1024)

# Check storage limit
await subscription_service.enforce_limit(workspace_id, "max_storage_mb", file_size_mb)
# Upload file
await subscription_service.increment_usage(workspace_id, "max_storage_mb", file_size_mb)
```

### 3. Workspace Creation
**When**: Creating new workspace
**File**: `backend/app/api/endpoints/workspaces.py`
**Metric**: `max_workspaces`

```python
# Before creating workspace
await subscription_service.enforce_limit(user_id, "max_workspaces", 1)
# Create workspace
await subscription_service.increment_usage(user_id, "max_workspaces", 1)
```

### 4. Knowledge Graph Access
**When**: Accessing graph page
**File**: `src/pages/EnhancedGraphPage.tsx`
**Feature**: `knowledge_graph`

```typescript
const { hasFeature } = useSubscription();
const [canAccess, setCanAccess] = useState(false);

useEffect(() => {
  hasFeature('knowledge_graph').then(access => {
    if (!access) {
      navigate('/subscription');
      toast.error('Upgrade to Pro to access Knowledge Graph');
    }
    setCanAccess(access);
  });
}, []);
```

### 5. Advanced Analytics
**When**: Viewing analytics dashboard
**File**: `src/pages/AnalyticsPage.tsx` (if exists)
**Feature**: `advanced_analytics`

```typescript
const { hasFeature } = useSubscription();

if (!await hasFeature('advanced_analytics')) {
  return <UpgradePrompt feature="Advanced Analytics" />;
}
```

### 6. API Access
**When**: Using REST API
**File**: `backend/app/api/dependencies.py`
**Feature**: `api_access`

```python
async def check_api_access(workspace_id: str, supabase):
    subscription_service = SubscriptionService(supabase)
    has_access = await subscription_service.check_feature_access(workspace_id, "api_access")
    if not has_access:
        raise HTTPException(status_code=403, detail="API access requires Pro plan")
```

### 7. Export Data
**When**: Exporting workspace data
**File**: `backend/app/api/endpoints/export.py` (create if needed)
**Feature**: `export_data`

```python
# Check feature access
has_access = await subscription_service.check_feature_access(workspace_id, "export_data")
if not has_access:
    raise HTTPException(status_code=403, detail="Data export requires Pro plan")
```

### 8. Collaboration Features
**When**: Enabling real-time collaboration
**File**: `src/components/editor/CollaborativeEditor.tsx`
**Feature**: `collaboration`

```typescript
const { hasFeature } = useSubscription();

if (!await hasFeature('collaboration')) {
  return (
    <div>
      <p>Real-time collaboration is a Pro feature</p>
      <Button onClick={() => navigate('/subscription')}>Upgrade</Button>
    </div>
  );
}
```

### 9. Version History
**When**: Viewing page history
**File**: `src/components/pages/VersionHistory.tsx`
**Feature**: `version_history`

```typescript
const { hasFeature } = useSubscription();

if (!await hasFeature('version_history')) {
  return <UpgradePrompt feature="Version History" />;
}
```

### 10. Custom Branding
**When**: Customizing workspace appearance
**File**: `src/pages/SettingsPage.tsx`
**Feature**: `custom_branding`

```typescript
const { hasFeature } = useSubscription();
const canCustomize = await hasFeature('custom_branding');

return (
  <div>
    <h3>Branding</h3>
    {canCustomize ? (
      <BrandingSettings />
    ) : (
      <UpgradePrompt feature="Custom Branding" />
    )}
  </div>
);
```

---

## UI Integration Points

### 1. Sidebar Badge
Show plan badge in sidebar:

```typescript
// In AppSidebar.tsx
const { status } = useSubscription();

<div className="px-3 py-2">
  <Badge variant={status?.plan.name === 'free' ? 'secondary' : 'default'}>
    {status?.plan.display_name}
  </Badge>
</div>
```

### 2. Usage Indicators
Show usage in relevant pages:

```typescript
// In PagesPage.tsx
const { getUsage } = useSubscription();
const pageUsage = getUsage('max_pages');

<div className="text-sm text-muted-foreground">
  {pageUsage?.current} / {pageUsage?.limit} pages used
</div>
```

### 3. Feature Locks
Show lock icons on premium features:

```typescript
// In navigation
const { hasFeature } = useSubscription();
const canAccessGraph = await hasFeature('knowledge_graph');

<NavItem 
  icon={canAccessGraph ? GitBranch : Lock}
  label="Knowledge Graph"
  locked={!canAccessGraph}
/>
```

### 4. Upgrade CTAs
Strategic upgrade prompts:

```typescript
// In HomePage.tsx
const { isPlan } = useSubscription();

{isPlan('free') && (
  <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
    <CardHeader>
      <CardTitle>Unlock More Features</CardTitle>
      <CardDescription className="text-white/80">
        Upgrade to Pro for unlimited pages and AI queries
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Button variant="secondary" onClick={() => navigate('/subscription')}>
        View Plans
      </Button>
    </CardContent>
  </Card>
)}
```

---

## Error Handling

### Backend Error Response

When limit is exceeded:

```json
{
  "detail": {
    "error": "limit_exceeded",
    "message": "You've reached your plan limit for max_pages",
    "current": 10,
    "limit": 10,
    "upgrade_required": true
  }
}
```

### Frontend Error Handling

```typescript
try {
  await createPage();
} catch (error: any) {
  if (error.response?.data?.detail?.error === 'limit_exceeded') {
    const detail = error.response.data.detail;
    toast.error(detail.message, {
      action: {
        label: 'Upgrade',
        onClick: () => navigate('/subscription')
      }
    });
  }
}
```

---

## Monitoring & Analytics

### Track Upgrade Conversions

```typescript
// When user upgrades
analytics.track('subscription_upgraded', {
  from_plan: oldPlan,
  to_plan: newPlan,
  billing_cycle: billingCycle
});
```

### Track Limit Hits

```typescript
// When user hits limit
analytics.track('limit_reached', {
  metric: metricType,
  plan: currentPlan,
  converted: false // Update if they upgrade
});
```

### Track Feature Access Attempts

```typescript
// When user tries locked feature
analytics.track('feature_locked', {
  feature: featureName,
  plan: currentPlan,
  converted: false
});
```

---

## Testing Checklist

- [ ] Free user can create 10 pages
- [ ] Free user blocked at 11th page
- [ ] Free user can make 20 AI queries
- [ ] Free user blocked at 21st query
- [ ] Free user cannot access Knowledge Graph
- [ ] Pro user has unlimited pages
- [ ] Pro user has unlimited AI queries
- [ ] Pro user can access Knowledge Graph
- [ ] Upgrade flow works
- [ ] Usage metrics display correctly
- [ ] Billing history shows records
- [ ] Cancel subscription works
- [ ] Downgrade to free works

---

## Priority Integration Order

1. ✅ **Pages** - Already done
2. ✅ **AI Queries** - Already done
3. **Knowledge Graph** - High value feature lock
4. **File Storage** - Prevent abuse
5. **Team Members** - Important for collaboration
6. **Workspaces** - Prevent unlimited workspace creation
7. **Advanced Analytics** - Premium feature
8. **API Access** - Premium feature
9. **Export Data** - Premium feature
10. **Collaboration** - Premium feature

---

## Summary

The subscription system is **backend-driven** and **ready to use**. 

- ✅ Database schema created
- ✅ Backend service implemented
- ✅ API endpoints ready
- ✅ Frontend UI complete
- ✅ Page limits enforced
- ✅ AI query limits enforced
- ✅ Easy integration hooks provided

**Next**: Add checks to remaining features as needed using the patterns above.
