# Fix Subscription System Error

## Problem
Error: `relation "workspace_members" does not exist`

The subscription migration references a `workspace_members` table that hasn't been created yet.

## Solution

Run this SQL file in your Supabase SQL Editor:

```bash
fix-subscription-setup.sql
```

This will:
1. ✅ Create `workspace_members` table
2. ✅ Add existing workspace owners as members
3. ✅ Create subscription tables (plans, subscriptions, usage_metrics)
4. ✅ Insert default plans (Free, Pro, Enterprise)
5. ✅ Assign Free plan to all existing workspaces
6. ✅ Set up RLS policies

## Steps

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy the entire contents of `fix-subscription-setup.sql`
5. Paste and click "Run"

### Option 2: Command Line
```bash
# If you have psql installed
psql "your-supabase-connection-string" < fix-subscription-setup.sql
```

## Verify Setup

After running, check that these tables exist:
- `workspace_members`
- `subscription_plans`
- `workspace_subscriptions`
- `usage_metrics`

You can verify with:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('workspace_members', 'subscription_plans', 'workspace_subscriptions', 'usage_metrics');
```

## What's Created

### Workspace Members Table
Tracks which users belong to which workspaces with roles (owner, admin, member, viewer).

### Subscription Plans
Three default plans:
- **Free**: 10 pages, 20 AI queries/day, 100MB storage
- **Pro**: 500 pages, 500 AI queries/day, 10GB storage ($19.99/month)
- **Enterprise**: Unlimited everything ($99.99/month)

### Workspace Subscriptions
All existing workspaces are automatically assigned the Free plan.

## Next Steps

After running the migration:
1. Restart your backend server
2. Navigate to `/subscription` page in your app
3. You should see the subscription plans displayed
4. Backend endpoints will now enforce feature limits

## Backend Integration

The subscription service will now check limits before:
- Creating pages
- Making AI queries
- Adding team members
- Using advanced features

Example error response when limit reached:
```json
{
  "error": "page_limit_reached",
  "message": "You've reached your page limit. Upgrade to Pro for unlimited pages.",
  "upgrade_url": "/subscription"
}
```
