# Offline-First Deployment Checklist

## Pre-Deployment

### 1. Dependencies
- [x] Dexie installed (`npm install dexie@^4.0.10`)
- [x] package.json updated
- [x] node_modules up to date

### 2. Code Integration
- [x] OfflineSyncProvider added to App.tsx
- [x] Sync endpoint registered in routes.py
- [x] API client method added (syncEvents)
- [x] All files created and in place

### 3. Database Migration
- [ ] Run migration on development database
- [ ] Test migration rollback (if needed)
- [ ] Prepare migration for production

```bash
# Development
psql $DEV_DATABASE_URL -f backend/migrations/add_offline_sync_support.sql

# Production (when ready)
psql $PROD_DATABASE_URL -f backend/migrations/add_offline_sync_support.sql
```

### 4. Testing

#### Local Testing
- [ ] Test offline mode (DevTools → Network → Offline)
- [ ] Test autosave (make changes, verify "Saving..." appears)
- [ ] Test sync (go offline, make changes, go online, verify sync)
- [ ] Test crash recovery (make changes, close tab, reopen)
- [ ] Test conflict resolution (edit same page in two tabs)

#### Browser Testing
- [ ] Chrome/Edge (IndexedDB support)
- [ ] Firefox (IndexedDB support)
- [ ] Safari (IndexedDB support)
- [ ] Mobile browsers

#### Scenarios to Test
- [ ] Create new page offline
- [ ] Edit existing page offline
- [ ] Delete page offline
- [ ] Create task offline
- [ ] Update task status offline
- [ ] Multiple pending syncs
- [ ] Sync failure and retry
- [ ] Network reconnection

### 5. Code Review
- [ ] Review offline-db.ts
- [ ] Review sync-worker.ts
- [ ] Review useOfflineSync.ts
- [ ] Review sync.py endpoint
- [ ] Review migration SQL
- [ ] Check error handling
- [ ] Check logging

## Deployment Steps

### Step 1: Backend Deployment

```bash
# 1. Deploy backend code
git add backend/app/api/endpoints/sync.py
git add backend/app/api/routes.py
git add backend/migrations/add_offline_sync_support.sql
git commit -m "Add offline-first sync endpoint"
git push

# 2. Run migration on production
psql $PROD_DATABASE_URL -f backend/migrations/add_offline_sync_support.sql

# 3. Verify endpoint is live
curl -X POST https://your-api.com/api/v1/sync/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"events":[]}'
# Should return: {"results":[],"synced_count":0,"failed_count":0}
```

### Step 2: Frontend Deployment

```bash
# 1. Build frontend
npm run build

# 2. Deploy to hosting (Netlify/Vercel/etc)
# Follow your normal deployment process

# 3. Verify in production
# - Open app
# - Check console for "🚀 Initializing offline-first system..."
# - Check console for "🔄 Sync Worker started"
```

### Step 3: Verification

- [ ] App loads without errors
- [ ] Sync worker starts automatically
- [ ] IndexedDB database created (check DevTools)
- [ ] Can create/edit pages
- [ ] Sync status indicator appears
- [ ] Offline mode works
- [ ] Online sync works

## Post-Deployment

### Monitoring

#### Check Sync Health
```typescript
// In browser console
import { syncWorker } from '@/lib/sync-worker';
const status = await syncWorker.getSyncStatus();
console.log(status);
```

#### Check Local Database
1. Open DevTools (F12)
2. Application tab
3. IndexedDB → AxoraOfflineDB
4. Check tables: pages_local, tasks_local, sync_queue

#### Backend Monitoring
- Monitor `/api/v1/sync/events` endpoint
- Track response times
- Track error rates
- Monitor sync queue size

### Metrics to Track

1. **Sync Success Rate**
   - % of events synced successfully
   - Target: >99%

2. **Sync Latency**
   - Time from event creation to sync completion
   - Target: <30 seconds

3. **Failed Syncs**
   - Number of events exceeding max retries
   - Target: <1%

4. **Offline Usage**
   - % of users working offline
   - Average offline duration

### Alerts to Set Up

- [ ] High failed sync rate (>5%)
- [ ] Sync endpoint errors (>1%)
- [ ] Large sync queue (>100 pending events)
- [ ] Sync latency spike (>60 seconds)

## Rollback Plan

If issues occur:

### Quick Rollback (Frontend Only)
```bash
# 1. Revert frontend deployment
# 2. Users will use old version (no offline-first)
# 3. No data loss - server still works normally
```

### Full Rollback (Backend + Frontend)
```bash
# 1. Revert backend deployment
# 2. Remove sync endpoint from routes
# 3. Revert frontend deployment
# 4. Optionally rollback migration (if needed)

# Rollback migration (if necessary)
psql $PROD_DATABASE_URL <<EOF
DROP TABLE IF EXISTS page_revisions;
ALTER TABLE pages DROP COLUMN IF EXISTS version;
ALTER TABLE tasks DROP COLUMN IF EXISTS version;
EOF
```

## Troubleshooting

### Issue: Sync not working

**Symptoms:**
- Pending count keeps growing
- "Saved offline" never changes to "Synced"

**Debug:**
```typescript
// Check sync status
const status = await syncWorker.getSyncStatus();
console.log(status);

// Check pending events
const pending = await offlineDB.sync_queue
  .where('status')
  .equals('pending')
  .toArray();
console.log(pending);

// Check for errors
const failed = await offlineDB.sync_queue
  .where('status')
  .equals('failed')
  .toArray();
console.log(failed);
```

**Solutions:**
1. Check network connectivity
2. Verify backend endpoint is accessible
3. Check authentication token
4. Review backend logs for errors

### Issue: IndexedDB not working

**Symptoms:**
- Console error: "Failed to open database"
- No local storage

**Solutions:**
1. Check browser supports IndexedDB
2. Check storage quota not exceeded
3. Clear browser data and retry
4. Check for browser extensions blocking storage

### Issue: Conflicts/duplicates

**Symptoms:**
- Same page appears multiple times
- Edits overwriting each other

**Solutions:**
1. Check event IDs are unique
2. Verify idempotency cache working
3. Check version numbers incrementing
4. Review page_revisions table

## Success Criteria

Before marking deployment complete:

- [ ] All tests passing
- [ ] No console errors
- [ ] Sync worker running
- [ ] Offline mode works
- [ ] Online sync works
- [ ] Crash recovery works
- [ ] Monitoring in place
- [ ] Team trained on new system
- [ ] Documentation updated
- [ ] Rollback plan tested

## Communication

### User Announcement

```
🎉 New Feature: Offline Mode

Axora now works offline! Your changes are saved instantly 
to your device and automatically synced when you're back online.

What this means:
✅ No more lost work due to network issues
✅ Faster saves (instant local storage)
✅ Work anywhere, anytime

Look for the sync status indicator in the top-right corner.
```

### Team Training

Topics to cover:
1. How offline-first works
2. Using useOfflineSync hook
3. Adding autosave to components
4. Monitoring sync health
5. Troubleshooting common issues

## Documentation Links

- Full Implementation Guide: `OFFLINE_FIRST_IMPLEMENTATION.md`
- Quick Start Guide: `OFFLINE_FIRST_QUICK_START.md`
- Summary: `OFFLINE_FIRST_COMPLETE.md`
- This Checklist: `OFFLINE_FIRST_DEPLOYMENT_CHECKLIST.md`

## Sign-Off

- [ ] Developer: Code complete and tested
- [ ] QA: All test scenarios passed
- [ ] DevOps: Deployment plan reviewed
- [ ] Product: Feature approved for release
- [ ] Support: Trained on new feature

---

**Deployment Date:** _____________

**Deployed By:** _____________

**Production URL:** _____________

**Status:** ⬜ Pending | ⬜ In Progress | ⬜ Complete | ⬜ Rolled Back
