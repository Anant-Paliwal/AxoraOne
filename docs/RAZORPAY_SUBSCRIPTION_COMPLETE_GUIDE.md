# Razorpay Subscription System - Complete Implementation Guide

## ✅ ALL CRITICAL ISSUES FIXED

### Issues Resolved:
1. ✅ **AI Query Limits** - Now user-level (can't bypass with multiple workspaces)
2. ✅ **Payment Processing** - Razorpay fully integrated
3. ✅ **Storage Tracking** - Automatic tracking with database triggers
4. ✅ **Team Member Tracking** - Automatic tracking with database triggers
5. ✅ **Billing History** - All payments recorded
6. ✅ **Webhook Handling** - Complete Razorpay webhook support

---

## 🚀 Quick Start (5 Steps)

### Step 1: Install Razorpay Python SDK
```bash
cd backend
pip install razorpay==1.4.2
```

### Step 2: Get Razorpay Credentials
1. Go to https://razorpay.com/
2. Sign up / Log in
3. Go to Settings → API Keys
4. Generate Test/Live keys
5. Copy Key ID and Key Secret

### Step 3: Update Environment Variables

**Backend `.env`:**
```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET

# Frontend URL (for webhooks)
FRONTEND_URL=http://localhost:5173
```

**Frontend `.env`:**
```env
# No Razorpay keys needed in frontend
# Keys are loaded from backend API response
```

### Step 4: Run Database Migration
```bash
# In Supabase SQL Editor, run:
backend/migrations/add_storage_and_team_tracking.sql
```

This adds:
- Razorpay columns to tables
- Storage usage tracking triggers
- Team member tracking triggers
- Initializes current usage for existing users

### Step 5: Restart Backend
```bash
cd backend
python main.py
```

---

## 📋 Complete File Changes

### Files Modified:
1. ✅ `backend/app/api/endpoints/ai_chat.py` - User-level AI query limits
2. ✅ `backend/app/api/endpoints/subscriptions.py` - Razorpay integration
3. ✅ `backend/requirements.txt` - Added razorpay package
4. ✅ `src/lib/api.ts` - Added payment verification methods
5. ✅ `src/pages/SubscriptionPage.tsx` - Razorpay checkout integration

### Files Created:
1. ✅ `backend/app/services/razorpay_service.py` - Complete payment service
2. ✅ `backend/migrations/add_storage_and_team_tracking.sql` - Usage tracking
3. ✅ `src/types/razorpay.d.ts` - TypeScript definitions

---

## 🔄 How It Works

### Payment Flow:
```
1. User clicks "Upgrade to Pro"
   ↓
2. Frontend calls POST /subscriptions/upgrade
   ↓
3. Backend creates Razorpay subscription
   ↓
4. Backend returns subscription_id + razorpay_key
   ↓
5. Frontend loads Razorpay checkout modal
   ↓
6. User enters payment details
   ↓
7. Razorpay processes payment
   ↓
8. Frontend receives payment response
   ↓
9. Frontend calls POST /subscriptions/verify-payment
   ↓
10. Backend verifies signature
   ↓
11. Backend activates subscription
   ↓
12. Backend records billing history
   ↓
13. User gets Pro plan access
```

### Webhook Flow:
```
Razorpay Event (subscription.charged, payment.failed, etc.)
   ↓
POST /api/v1/subscriptions/webhook/razorpay
   ↓
Verify webhook signature
   ↓
Handle event (update subscription, record payment, etc.)
   ↓
Return success
```

---

## 🎯 Testing Guide

### Test Mode (Using Razorpay Test Keys)

#### 1. Test Upgrade Flow
```bash
# Start backend
cd backend
python main.py

# Start frontend
cd ..
npm run dev

# Navigate to http://localhost:5173/subscription
# Click "Upgrade to Pro"
# Use test card: 4111 1111 1111 1111
# CVV: Any 3 digits
# Expiry: Any future date
```

#### 2. Test Payment Verification
```bash
# After successful payment, check:
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/v1/subscriptions/current

# Should show:
# - status: "active"
# - plan: "pro"
# - razorpay_subscription_id: "sub_xxx"
```

#### 3. Test Billing History
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/v1/subscriptions/billing-history

# Should show payment record
```

#### 4. Test Usage Tracking
```bash
# Create 11 skills (should fail on Free plan)
# Create 51 tasks (should fail on Free plan)
# Make 21 AI queries (should fail on Free plan)
# Upload large files (should track storage)
# Add team members (should track count)
```

#### 5. Test Webhooks (Local Testing)
```bash
# Install ngrok
npm install -g ngrok

# Expose backend
ngrok http 8000

# Copy ngrok URL (e.g., https://abc123.ngrok.io)
# Go to Razorpay Dashboard → Webhooks
# Add webhook: https://abc123.ngrok.io/api/v1/subscriptions/webhook/razorpay
# Select events: subscription.*, payment.*
# Copy webhook secret and add to .env

# Test webhook
# Make a payment and check backend logs
```

---

## 🔐 Security Checklist

- [x] Payment signature verification
- [x] Webhook signature verification
- [x] User authentication required
- [x] Server-side limit enforcement
- [x] No sensitive keys in frontend
- [x] HTTPS required for production
- [x] Rate limiting on API endpoints
- [x] SQL injection prevention (parameterized queries)

---

## 💰 Pricing Configuration

### Current Plans (INR):

**Free Plan:**
- Price: ₹0/month
- Pages: Unlimited
- AI Queries: 20/day
- Storage: 100MB
- Team Members: 1
- Workspaces: 1
- Skills: 10
- Tasks: 50

**Pro Plan:**
- Price: ₹1,499/month or ₹14,999/year (Save 17%)
- Pages: Unlimited
- AI Queries: 500/day
- Storage: 10GB
- Team Members: 10
- Workspaces: 5
- Skills: 100
- Tasks: 500

**Enterprise Plan:**
- Price: ₹7,499/month or ₹74,999/year (Save 17%)
- Everything: Unlimited

### To Change Pricing:

**Update Database:**
```sql
UPDATE subscription_plans
SET 
  price_monthly = 1499.00,
  price_yearly = 14999.00
WHERE name = 'pro';

UPDATE subscription_plans
SET 
  price_monthly = 7499.00,
  price_yearly = 74999.00
WHERE name = 'enterprise';
```

**Update Razorpay Plans:**
1. Go to Razorpay Dashboard → Plans
2. Create new plans with updated pricing
3. Copy plan IDs
4. Update database:
```sql
UPDATE subscription_plans
SET razorpay_plan_id = 'plan_NEW_ID'
WHERE name = 'pro';
```

---

## 🌐 Production Deployment

### 1. Switch to Live Keys
```env
# Backend .env
RAZORPAY_KEY_ID=rzp_live_YOUR_LIVE_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_LIVE_KEY_SECRET
FRONTEND_URL=https://yourdomain.com
```

### 2. Configure Webhooks
```
Webhook URL: https://yourdomain.com/api/v1/subscriptions/webhook/razorpay

Events to subscribe:
- subscription.activated
- subscription.charged
- subscription.cancelled
- subscription.completed
- payment.failed
```

### 3. Update CORS Settings
```python
# backend/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 4. Enable HTTPS
- Use SSL certificate (Let's Encrypt)
- Razorpay requires HTTPS for webhooks
- Update all URLs to https://

### 5. Test in Production
- Make test payment with real card
- Verify subscription activated
- Check webhook logs
- Test cancellation flow

---

## 📊 Monitoring & Analytics

### Key Metrics to Track:

1. **Subscription Metrics:**
   - Total active subscriptions
   - Monthly recurring revenue (MRR)
   - Churn rate
   - Upgrade/downgrade rates

2. **Payment Metrics:**
   - Successful payments
   - Failed payments
   - Average transaction value
   - Payment method distribution

3. **Usage Metrics:**
   - Users hitting limits
   - Most used features
   - Storage usage trends
   - AI query patterns

### Database Queries:

```sql
-- Active subscriptions by plan
SELECT 
  sp.name,
  COUNT(*) as count,
  SUM(sp.price_monthly) as mrr
FROM user_subscriptions us
JOIN subscription_plans sp ON sp.id = us.plan_id
WHERE us.status = 'active'
GROUP BY sp.name;

-- Recent payments
SELECT 
  bh.paid_at,
  bh.amount,
  bh.status,
  sp.name as plan
FROM billing_history bh
JOIN user_subscriptions us ON us.user_id = bh.user_id
JOIN subscription_plans sp ON sp.id = us.plan_id
ORDER BY bh.paid_at DESC
LIMIT 10;

-- Users approaching limits
SELECT 
  u.email,
  uum.metric_type,
  uum.count as current,
  (sp.features->>uum.metric_type)::int as limit,
  ROUND(uum.count::numeric / (sp.features->>uum.metric_type)::numeric * 100, 1) as percentage
FROM user_usage_metrics uum
JOIN user_subscriptions us ON us.user_id = uum.user_id
JOIN subscription_plans sp ON sp.id = us.plan_id
JOIN auth.users u ON u.id = uum.user_id
WHERE (sp.features->>uum.metric_type)::int > 0
  AND uum.count::numeric / (sp.features->>uum.metric_type)::numeric > 0.8
ORDER BY percentage DESC;
```

---

## 🐛 Troubleshooting

### Issue: Payment fails with "Invalid signature"
**Solution:** Check that RAZORPAY_KEY_SECRET is correct in .env

### Issue: Webhook not receiving events
**Solution:** 
1. Check webhook URL is accessible
2. Verify webhook secret in .env
3. Check Razorpay dashboard for webhook logs

### Issue: User can't upgrade
**Solution:**
1. Check backend logs for errors
2. Verify Razorpay keys are valid
3. Check user has valid email

### Issue: Usage tracking not working
**Solution:**
1. Run migration: add_storage_and_team_tracking.sql
2. Check triggers are created: `\df track_*` in psql
3. Verify user_usage_metrics table exists

### Issue: Subscription not activated after payment
**Solution:**
1. Check payment verification endpoint logs
2. Verify signature verification is passing
3. Check user_subscriptions table status

---

## 📞 Support

### Razorpay Support:
- Dashboard: https://dashboard.razorpay.com/
- Docs: https://razorpay.com/docs/
- Support: support@razorpay.com

### Testing Resources:
- Test Cards: https://razorpay.com/docs/payments/payments/test-card-details/
- Webhook Testing: https://razorpay.com/docs/webhooks/test/

---

## ✅ Final Checklist

### Before Going Live:
- [ ] Razorpay account verified
- [ ] Live API keys configured
- [ ] Database migration run
- [ ] Backend restarted with new code
- [ ] Frontend deployed with Razorpay integration
- [ ] Webhooks configured in Razorpay dashboard
- [ ] Test payment completed successfully
- [ ] Webhook events received and processed
- [ ] Billing history recording correctly
- [ ] Usage tracking working
- [ ] Limit enforcement tested
- [ ] HTTPS enabled
- [ ] CORS configured
- [ ] Error handling tested
- [ ] Monitoring set up

### Post-Launch:
- [ ] Monitor payment success rate
- [ ] Check webhook logs daily
- [ ] Track subscription metrics
- [ ] Monitor failed payments
- [ ] Review user feedback
- [ ] Optimize pricing if needed

---

## 🎉 Success!

Your subscription system is now fully functional with:
- ✅ Razorpay payment processing
- ✅ User-level subscription limits
- ✅ Automatic usage tracking
- ✅ Complete billing history
- ✅ Webhook automation
- ✅ Production-ready security

**Estimated Revenue Potential:**
- 100 Pro users × ₹1,499/month = ₹1,49,900/month
- 10 Enterprise users × ₹7,499/month = ₹74,990/month
- **Total: ₹2,24,890/month (₹26,98,680/year)**

Start accepting payments and grow your business! 🚀

