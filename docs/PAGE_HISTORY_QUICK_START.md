# Page History - Quick Start Guide

## ✅ What's Done

### Backend
- ✅ Database migration created: `backend/migrations/add_page_history_system.sql`
- ✅ API endpoints created: `backend/app/api/endpoints/page_history.py`
- ✅ Routes registered in: `backend/app/api/routes.py`

### Frontend
- ✅ PageHistory component created: `src/components/pages/PageHistory.tsx`
- ✅ Integrated into PageEditor: `src/pages/PageEditor.tsx`
- ✅ Integrated into PageViewer: `src/pages/PageViewer.tsx`

## 🚀 Setup Steps

### 1. Run Database Migration

**Option A: Run the fix (if you already ran the main migration):**
Go to Supabase Dashboard → SQL Editor and run:
```sql
-- Copy and paste the contents of:
fix-page-history-function.sql
```

**Option B: Run full migration (if you haven't run it yet):**
```sql
-- Copy and paste the entire contents of:
backend/migrations/add_page_history_system.sql
```

This creates:
- `page_history` table
- Automatic triggers for version tracking
- Restore and cleanup functions
- RLS policies for security

### 2. Restart Backend

```bash
cd backend
# Stop current process (Ctrl+C)
python main.py
```

The routes are already registered, so it will work immediately.

### 3. Test It Out

1. **Open any page** in edit or view mode
2. **Look for the "Version History" button** in the toolbar (clock icon)
3. **Make some edits** to the page and save
4. **Click "Version History"** to see your changes
5. **Click "Restore"** on any version to undo changes

## 🎯 Features Available

### Automatic Version Tracking
- Every save creates a new version
- Tracks what changed (title, content, blocks)
- Shows who made the change
- 7-day retention

### Version History UI
- Side-by-side list and preview
- Color-coded change types:
  - 🟢 Green = Page created
  - 🔵 Blue = Page edited
  - 🟣 Purple = Restored from history
  - 🟡 Yellow = Manual snapshot
- Shows days until expiry
- One-click restore

### Manual Snapshots
- Click "Create Snapshot" before major changes
- Useful for creating checkpoints
- Same 7-day retention

### Auto-Cleanup
- History older than 7 days is automatically deleted
- Keeps database lean
- Can be triggered manually via API

## 📍 Where to Find It

### In Page Editor
Top toolbar → "Version History" button (between Outline and Save)

### In Page Viewer
Top toolbar → "Version History" button (after TOC toggle)

## 🔧 Optional: Setup Auto-Cleanup Cron

For automatic daily cleanup, run this in Supabase SQL Editor:

```sql
-- Requires pg_cron extension
SELECT cron.schedule(
  'cleanup-page-history',
  '0 2 * * *', -- 2 AM daily
  'SELECT cleanup_expired_page_history()'
);
```

Or use an external cron job:
```bash
# Add to crontab
0 2 * * * curl -X POST https://your-api.com/api/v1/page-history/cleanup \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## 🧪 Testing Checklist

- [ ] Run migration in Supabase
- [ ] Restart backend
- [ ] Open a page in editor
- [ ] See "Version History" button
- [ ] Make edits and save
- [ ] Open version history
- [ ] See version list
- [ ] Click a version to preview
- [ ] Restore a previous version
- [ ] Create manual snapshot
- [ ] Check expiry countdown

## 🎨 UI Preview

```
┌─────────────────────────────────────────────────────────┐
│  Version History                                    ✕   │
├─────────────────────────────────────────────────────────┤
│  [Create Snapshot] [Refresh]                            │
├──────────────────────────┬──────────────────────────────┤
│ Version List             │ Preview                      │
│                          │                              │
│ ┌──────────────────────┐ │ Title: My Page              │
│ │ Version 5    [edit]  │ │                              │
│ │ Content updated      │ │ Icon: 📄                     │
│ │ 2 hours ago          │ │                              │
│ │ Expires in 7 days    │ │ Content:                     │
│ │ by user@email.com    │ │ Lorem ipsum...               │
│ │ [Restore]            │ │                              │
│ └──────────────────────┘ │                              │
│                          │                              │
│ ┌──────────────────────┐ │                              │
│ │ Version 4  [restore] │ │                              │
│ │ Restored to v2       │ │                              │
│ │ 1 day ago            │ │                              │
│ └──────────────────────┘ │                              │
└──────────────────────────┴──────────────────────────────┘
```

## 🔐 Security

- ✅ Workspace isolation enforced
- ✅ Users can only see history in their workspaces
- ✅ RLS policies protect data
- ✅ Service role used for triggers

## 📊 API Endpoints

All available at `/api/v1/page-history/`:

- `GET /{page_id}` - Get version history
- `GET /{page_id}/version/{version_number}` - Get specific version
- `POST /{page_id}/restore` - Restore version
- `POST /{page_id}/snapshot` - Create manual snapshot
- `GET /{page_id}/stats` - Get history statistics
- `POST /cleanup` - Trigger cleanup (admin)

## 🎉 You're Done!

Your page history system is now live. Users can:
- ✅ See all changes made to pages
- ✅ Restore previous versions with one click
- ✅ Create manual snapshots before big changes
- ✅ Track who made what changes
- ✅ Automatic 7-day cleanup keeps things tidy

Just like Notion! 🚀
