# 🚀 Razorpay Subscription System - Deployment Checklist

## Pre-Deployment (Development)

### 1. Code Changes ✅
- [x] AI query limits changed to user-level
- [x] Razorpay service created
- [x] Subscription endpoints updated
- [x] Frontend payment integration added
- [x] Storage tracking implemented
- [x] Team member tracking implemented
- [x] TypeScript definitions added

### 2. Dependencies ✅
- [x] razorpay==1.4.2 added to requirements.txt
- [x] Python package installed
- [x] No frontend dependencies needed (CDN)

### 3. Database Migration ✅
- [ ] Run: `backend/migrations/add_storage_and_team_tracking.sql`
- [ ] Verify tables updated:
  - [ ] user_subscriptions has razorpay columns
  - [ ] billing_history has razorpay columns
  - [ ] subscription_plans has razorpay_plan_id
- [ ] Verify triggers created:
  - [ ] track_page_storage
  - [ ] track_team_member_change
- [ ] Verify initial usage calculated

### 4. Environment Configuration
- [ ] Backend .env updated:
  ```env
  RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
  RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET
  FRONTEND_URL=http://localhost:5173
  ```
- [ ] Keys obtained from Razorpay dashboard
- [ ] Test mode keys working

### 5. Local Testing
- [ ] Backend starts without errors
- [ ] Frontend loads subscription page
- [ ] Can view all plans
- [ ] Can click upgrade button
- [ ] Razorpay modal opens
- [ ] Test payment succeeds (4111 1111 1111 1111)
- [ ] Subscription activated
- [ ] Billing history recorded
- [ ] Usage tracking working
- [ ] Limits enforced correctly

---

## Razorpay Setup

### 1. Account Setup
- [ ] Razorpay account created
- [ ] Business details submitted
- [ ] KYC documents uploaded
- [ ] Account activated

### 2. API Keys
- [ ] Test keys obtained
- [ ] Test keys added to .env
- [ ] Test payments working
- [ ] Live keys obtained (for production)

### 3. Webhook Configuration
- [ ] Webhook URL configured (for production)
- [ ] Webhook secret obtained
- [ ] Events subscribed:
  - [ ] subscription.activated
  - [ ] subscription.charged
  - [ ] subscription.cancelled
  - [ ] subscription.completed
  - [ ] payment.failed
- [ ] Webhook tested with ngrok (local)

### 4. Plans Configuration
- [ ] Pro plan created in Razorpay
- [ ] Enterprise plan created in Razorpay
- [ ] Plan IDs copied
- [ ] Plan IDs added to database (optional, auto-created)

---

## Production Deployment

### 1. Environment Setup
- [ ] Production server ready
- [ ] HTTPS enabled (required for Razorpay)
- [ ] SSL certificate installed
- [ ] Domain configured

### 2. Backend Deployment
- [ ] Code deployed to production
- [ ] Dependencies installed
- [ ] Environment variables set:
  ```env
  RAZORPAY_KEY_ID=rzp_live_YOUR_LIVE_KEY_ID
  RAZORPAY_KEY_SECRET=YOUR_LIVE_KEY_SECRET
  FRONTEND_URL=https://yourdomain.com
  ```
- [ ] Database migration run
- [ ] Backend service started
- [ ] Health check passing

### 3. Frontend Deployment
- [ ] Code deployed to production
- [ ] Build successful
- [ ] Environment variables set (if any)
- [ ] Static files served
- [ ] HTTPS working

### 4. Razorpay Production Setup
- [ ] Switch to live API keys
- [ ] Update webhook URL to production
- [ ] Verify webhook secret in .env
- [ ] Test webhook delivery

### 5. CORS Configuration
- [ ] Backend CORS allows production domain
- [ ] No localhost URLs in production
- [ ] Credentials enabled

### 6. Security Checklist
- [ ] API keys not exposed in frontend
- [ ] HTTPS enforced
- [ ] Webhook signature verification enabled
- [ ] Payment signature verification enabled
- [ ] Rate limiting configured
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention
- [ ] CSRF protection

---

## Post-Deployment Testing

### 1. Smoke Tests
- [ ] Can access subscription page
- [ ] Plans display correctly
- [ ] Prices show correctly
- [ ] Current subscription loads

### 2. Payment Flow Test
- [ ] Click upgrade button
- [ ] Razorpay modal opens
- [ ] Enter real card details
- [ ] Payment processes
- [ ] Subscription activates
- [ ] Billing history records
- [ ] Email confirmation sent (if configured)

### 3. Webhook Test
- [ ] Make a payment
- [ ] Check webhook logs in Razorpay
- [ ] Verify webhook received by backend
- [ ] Check subscription updated
- [ ] Check billing history recorded

### 4. Limit Enforcement Test
- [ ] Create resources up to limit
- [ ] Verify limit error shown
- [ ] Upgrade to Pro
- [ ] Verify higher limits work
- [ ] Downgrade to Free
- [ ] Verify limits enforced again

### 5. Usage Tracking Test
- [ ] Create pages (check storage)
- [ ] Add team members (check count)
- [ ] Make AI queries (check count)
- [ ] Create skills (check count)
- [ ] Create tasks (check count)
- [ ] Verify usage displayed correctly

### 6. Cancellation Test
- [ ] Cancel subscription
- [ ] Verify downgrade to Free
- [ ] Verify limits enforced
- [ ] Verify billing stopped

---

## Monitoring Setup

### 1. Application Monitoring
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Log aggregation set up
- [ ] Performance monitoring enabled
- [ ] Uptime monitoring configured

### 2. Payment Monitoring
- [ ] Razorpay dashboard bookmarked
- [ ] Email alerts configured
- [ ] Payment success rate tracked
- [ ] Failed payment alerts set up

### 3. Database Monitoring
- [ ] Query performance monitored
- [ ] Storage usage tracked
- [ ] Backup configured
- [ ] Replication set up (if needed)

### 4. Metrics Dashboard
- [ ] Active subscriptions count
- [ ] Monthly recurring revenue (MRR)
- [ ] Churn rate
- [ ] Payment success rate
- [ ] Average transaction value
- [ ] Users approaching limits

---

## Documentation

### 1. User Documentation
- [ ] Subscription page help text
- [ ] Pricing page created
- [ ] FAQ updated
- [ ] Terms of service updated
- [ ] Privacy policy updated

### 2. Internal Documentation
- [ ] Architecture documented
- [ ] API endpoints documented
- [ ] Database schema documented
- [ ] Webhook handling documented
- [ ] Troubleshooting guide created

### 3. Support Documentation
- [ ] Common issues documented
- [ ] Support email configured
- [ ] Refund policy defined
- [ ] Cancellation policy defined

---

## Launch Preparation

### 1. Marketing
- [ ] Pricing page live
- [ ] Blog post written
- [ ] Email campaign prepared
- [ ] Social media posts scheduled

### 2. Support
- [ ] Support team trained
- [ ] Support email monitored
- [ ] FAQ page updated
- [ ] Live chat configured (optional)

### 3. Legal
- [ ] Terms of service reviewed
- [ ] Privacy policy reviewed
- [ ] Refund policy defined
- [ ] Tax compliance checked

### 4. Communication
- [ ] Existing users notified
- [ ] Migration plan for existing users
- [ ] Grace period defined (if needed)

---

## Go-Live Checklist

### Final Checks (Do these right before launch)
- [ ] All tests passing
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] Security audit passed
- [ ] Backup verified
- [ ] Rollback plan ready
- [ ] Team on standby
- [ ] Monitoring active

### Launch
- [ ] Switch to live API keys
- [ ] Deploy to production
- [ ] Verify health checks
- [ ] Test one real payment
- [ ] Monitor for 1 hour
- [ ] Announce launch

### Post-Launch (First 24 Hours)
- [ ] Monitor error rates
- [ ] Check payment success rate
- [ ] Review webhook logs
- [ ] Check user feedback
- [ ] Fix any critical issues
- [ ] Celebrate! 🎉

---

## Rollback Plan

### If Something Goes Wrong:
1. [ ] Revert to previous deployment
2. [ ] Switch back to test keys (if needed)
3. [ ] Disable new subscriptions temporarily
4. [ ] Notify affected users
5. [ ] Fix issues in development
6. [ ] Re-test thoroughly
7. [ ] Re-deploy when ready

---

## Success Metrics

### Week 1:
- [ ] 0 critical bugs
- [ ] >95% payment success rate
- [ ] >0 paid subscriptions
- [ ] <1% churn rate

### Month 1:
- [ ] 10+ paid subscriptions
- [ ] ₹15,000+ MRR
- [ ] >98% payment success rate
- [ ] <5% churn rate

### Month 3:
- [ ] 50+ paid subscriptions
- [ ] ₹75,000+ MRR
- [ ] >99% payment success rate
- [ ] <3% churn rate

---

## Support Contacts

### Razorpay:
- Dashboard: https://dashboard.razorpay.com/
- Support: support@razorpay.com
- Docs: https://razorpay.com/docs/

### Internal:
- Backend Lead: [Name/Email]
- Frontend Lead: [Name/Email]
- DevOps: [Name/Email]
- Support: [Email]

---

## Notes

### Important Dates:
- Development Complete: [Date]
- Testing Complete: [Date]
- Production Deploy: [Date]
- Launch Date: [Date]

### Known Issues:
- [List any known issues and workarounds]

### Future Improvements:
- [ ] Add annual discount
- [ ] Add referral program
- [ ] Add usage analytics dashboard
- [ ] Add invoice PDF generation
- [ ] Add dunning for failed payments
- [ ] Add proration for mid-cycle changes

---

**Status: Ready for Production** ✅

Last Updated: [Date]
Updated By: [Name]

