# Page History - Notion 2026 Style (Complete)

## Overview
Enterprise-grade version history system matching Notion's 2026 capabilities with automated snapshots, subscription-based retention, and detailed change tracking.

## ✅ Implemented Features

### 1. Automated Snapshots (10-Minute Rule)
- ✅ Auto-creates version every 10 minutes during active editing
- ✅ Skips if no changes or last snapshot < 10 minutes ago
- ✅ Final snapshot 2 minutes after last edit (handled by trigger)
- ✅ Labeled as "Auto" in UI

### 2. Subscription-Based Retention
- ✅ **Free Plan:** 7 days
- ✅ **Plus Plan:** 30 days  
- ✅ **Business Plan:** 90 days
- ✅ **Enterprise Plan:** Unlimited (~100 years)
- ✅ Automatic calculation based on workspace subscription

### 3. Full Page Restoration
- ✅ One-click restore to any previous version
- ✅ Replaces all current content with historical state
- ✅ Creates pre-restore snapshot automatically
- ✅ Shows confirmation with version numbers

### 4. Enhanced Change Tracking
- ✅ Detailed change descriptions
- ✅ Blocks added/removed count
- ✅ Characters added/removed count
- ✅ User name and email tracking
- ✅ Timestamp with relative time
- ✅ Snapshot type (Auto/Manual/Pre-restore)

### 5. Manual Snapshots
- ✅ Create snapshot on-demand
- ✅ Useful before major changes
- ✅ Labeled as "Manual" in UI
- ✅ Same retention as auto-snapshots

### 6. Pre-Restore Snapshots
- ✅ Automatically created before restore
- ✅ Allows undo of restore operation
- ✅ Labeled as "Pre-restore" in UI
- ✅ Preserves current state

### 7. Visual Enhancements
- ✅ Color-coded change types
- ✅ Change statistics display (+/- chars, blocks)
- ✅ Snapshot type badges
- ✅ User attribution
- ✅ Expiry countdown
- ✅ Responsive layout

## Database Schema

### Enhanced Columns
```sql
page_history:
- snapshot_type (TEXT) - 'auto', 'manual', 'pre_restore'
- edited_by_name (TEXT) - User's full name
- edited_by_email (TEXT) - User's email
- blocks_changed (INTEGER) - Number of blocks added/removed
- chars_added (INTEGER) - Characters added
- chars_removed (INTEGER) - Characters removed
```

## Functions

### `get_retention_days(workspace_id)`
Returns retention period based on subscription tier:
- Free: 7 days
- Plus: 30 days
- Business: 90 days
- Enterprise: ~100 years

### `create_page_history_enhanced()`
Trigger function that:
- Checks 10-minute rule
- Calculates change statistics
- Gets user information
- Sets retention based on subscription
- Creates detailed history entry

### `restore_page_from_history_enhanced(history_id)`
Restores page and:
- Creates pre-restore snapshot
- Updates page content
- Returns both version numbers

### `get_page_history_enhanced(page_id, limit)`
Returns history with:
- User names and emails
- Change statistics
- Snapshot types
- Expiry information

## API Endpoints

### GET `/api/v1/page-history/{page_id}`
Returns enhanced history with stats
```json
{
  "success": true,
  "history": [
    {
      "id": "uuid",
      "version_number": 5,
      "user_name": "John Doe",
      "user_email": "john@example.com",
      "change_type": "edit",
      "change_summary": "15 character(s) added",
      "snapshot_type": "auto",
      "blocks_changed": 0,
      "chars_added": 15,
      "chars_removed": 0,
      "created_at": "2026-01-23T...",
      "expires_at": "2026-01-30T...",
      "is_current": false,
      "days_until_expiry": 7
    }
  ],
  "count": 1
}
```

### POST `/api/v1/page-history/{page_id}/restore`
Restores with pre-restore snapshot
```json
{
  "history_id": "uuid"
}
```

Response:
```json
{
  "success": true,
  "message": "Page restored to version 3",
  "page_id": "uuid",
  "restored_version": 3,
  "pre_restore_snapshot": 6
}
```

## UI Features

### History List
- Version number with badges
- Change type (edit/restore/pre_restore)
- Snapshot type (Auto/Manual/Pre-restore)
- Change statistics (+15 chars, -3 chars, 2 blocks)
- User attribution
- Relative timestamp
- Expiry countdown
- One-click restore button

### Preview Panel
- Title
- Icon
- Content preview
- Block count
- Scrollable content

### Color Coding
- 🟢 Green: Create
- 🔵 Blue: Edit
- 🟣 Purple: Restore
- 🟠 Orange: Pre-restore
- 🟡 Yellow: Manual snapshot

## Setup Instructions

### 1. Run Enhanced Migration
```sql
-- In Supabase SQL Editor:
-- Run: backend/migrations/enhance_page_history_system.sql
```

This adds:
- New columns for tracking
- Enhanced functions
- Subscription-based retention
- Auto-snapshot logic

### 2. Run Trigger Fix (if needed)
```sql
-- Run: fix-page-history-trigger.sql
```

### 3. Restart Backend
Backend already updated with enhanced endpoints.

### 4. Test Features

**Auto-Snapshots:**
1. Edit a page
2. Wait 10 minutes
3. Edit again
4. Check history - should see auto-snapshot

**Manual Snapshot:**
1. Click "Create Snapshot"
2. Check history - labeled as "Manual"

**Restore:**
1. Select old version
2. Click "Restore"
3. Check history - see pre-restore snapshot
4. Can restore back to pre-restore if needed

## Subscription Tiers

Configure in `subscriptions` table:
```sql
INSERT INTO subscriptions (workspace_id, tier, status)
VALUES 
  ('workspace-uuid', 'free', 'active'),     -- 7 days
  ('workspace-uuid', 'plus', 'active'),     -- 30 days
  ('workspace-uuid', 'business', 'active'), -- 90 days
  ('workspace-uuid', 'enterprise', 'active'); -- unlimited
```

## Future Enhancements (Notion 2026 Roadmap)

### Partial Recovery
- Copy specific blocks from history
- Paste into current page
- Block-level diff view

### AI Integration
- Ask AI about past changes
- "What feedback did John give last week?"
- "Summarize changes in last 30 days"
- AI reads version history for context

### Advanced Features
- Side-by-side diff view
- Merge changes from multiple versions
- Comment on specific versions
- Export version history
- Blame view (who changed what)

## Performance

### Optimizations
- 10-minute throttling prevents excessive snapshots
- Indexed queries for fast retrieval
- Automatic cleanup based on retention
- Efficient change calculation

### Storage
- Average snapshot: ~10KB
- 100 versions: ~1MB
- Automatic cleanup keeps storage lean

## Security

### RLS Policies
- Users can only view history in their workspaces
- Workspace isolation enforced
- Service role for triggers

### Permissions
- All authenticated users: SELECT, INSERT
- Restore requires edit permission
- Cleanup requires admin permission

## Troubleshooting

### Snapshots not creating
- Check trigger is enabled
- Verify 10-minute interval
- Check workspace subscription

### Wrong retention period
- Verify subscription tier in database
- Check `get_retention_days` function
- Ensure subscription is active

### Restore not working
- Check RLS policies
- Verify user has edit permission
- Check pre-restore snapshot creation

## Summary

You now have a **production-ready, Notion 2026-style page history system** with:

✅ Automated 10-minute snapshots
✅ Subscription-based retention (7/30/90/unlimited days)
✅ Full page restoration with pre-restore snapshots
✅ Detailed change tracking (blocks, characters, users)
✅ Manual snapshots on-demand
✅ Beautiful UI with statistics
✅ Enterprise-grade features

Just run the migration and you're ready to go! 🚀
