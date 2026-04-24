# 🚀 Quick Start: Subscription System

## ⚡ 3-Step Setup

### Step 1: Run SQL Migration
1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `fix-subscription-setup.sql`
3. Paste and click **Run**
4. Wait for "Subscription system setup complete!" message

### Step 2: Verify Tables Created
Run this to verify:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('workspace_members', 'subscription_plans', 'workspace_subscriptions', 'usage_metrics');
```

You should see 4 tables.

### Step 3: Restart Backend
```bash
cd backend
python main.py
```

## ✅ Test It Works

### 1. View Subscription Page
Navigate to: `http://localhost:5173/subscription`

You should see:
- ✅ Three plan cards (Free, Pro, Enterprise)
- ✅ Your current plan (Free)
- ✅ Usage metrics
- ✅ Upgrade buttons

### 2. Check API
```bash
curl http://localhost:8000/api/v1/subscriptions/plans
```

Should return 3 plans.

### 3. Check Current Subscription
```bash
curl http://localhost:8000/api/v1/subscriptions/current?workspace_id=YOUR_WORKSPACE_ID
```

Should return Free plan details.

## 🎯 What You Get

### Backend (Handles Everything)
- ✅ 3 subscription plans (Free, Pro, Enterprise)
- ✅ Feature gating service
- ✅ Usage tracking
- ✅ API endpoints for upgrades/cancellations
- ✅ Stripe integration ready

### Frontend (Displays Only)
- ✅ Beautiful subscription page
- ✅ Plan comparison cards
- ✅ Usage progress bars
- ✅ Upgrade prompts
- ✅ Current plan status

### Database
- ✅ `workspace_members` - Team membership
- ✅ `subscription_plans` - Available plans
- ✅ `workspace_subscriptions` - Active subscriptions
- ✅ `usage_metrics` - Usage tracking

## 📊 Default Plans

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Pages | 10 | 500 | Unlimited |
| AI Queries/Day | 20 | 500 | Unlimited |
| Storage | 100MB | 10GB | Unlimited |
| Team Members | 1 | 10 | Unlimited |
| Price | $0 | $19.99/mo | $99.99/mo |

## 🔧 Next: Add Feature Gating

### Example: Limit Page Creation
```python
# backend/app/api/endpoints/pages.py
from app.services.subscription_service import subscription_service

@router.post("/")
async def create_page(page: PageCreate, workspace_id: str):
    # Check limit
    if not subscription_service.can_create_page(workspace_id):
        raise HTTPException(
            status_code=403,
            detail={
                "error": "page_limit_reached",
                "message": "You've reached your page limit. Upgrade to Pro.",
                "upgrade_url": "/subscription"
            }
        )
    
    # Create page...
```

Frontend automatically shows upgrade prompt on 403 error!

## 📚 Documentation

- `SUBSCRIPTION_ARCHITECTURE_DIAGRAM.md` - Complete architecture
- `SUBSCRIPTION_SETUP_COMPLETE.md` - Full setup guide
- `FIX_SUBSCRIPTION_ERROR.md` - Troubleshooting

## 🐛 Troubleshooting

**Error: workspace_members does not exist**
→ Run `fix-subscription-setup.sql`

**Plans not showing**
→ Check backend logs, verify migration ran

**Can't upgrade**
→ Ensure backend is running on port 8000

## 🎉 You're Done!

Your subscription system is ready. Backend handles all logic, frontend just displays. Add feature gating to your endpoints and you're good to go!
