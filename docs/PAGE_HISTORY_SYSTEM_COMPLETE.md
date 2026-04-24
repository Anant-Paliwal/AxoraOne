# Page History System - Complete Implementation

## Overview
Notion-style version history with automatic 7-day cleanup and restore functionality.

## Features

### ✅ Automatic Version Tracking
- Every page edit creates a history entry
- Tracks title, content, blocks, icon, and cover changes
- Version numbers increment automatically
- Change summaries generated automatically

### ✅ 7-Day Auto-Cleanup
- History entries expire after 7 days
- Automatic cleanup via database function
- Manual cleanup endpoint available
- Countdown shows days until expiry

### ✅ Version Restore
- One-click restore to any previous version
- Creates new history entry when restoring
- Preserves full page state (title, content, blocks, etc.)
- Shows restore action in history

### ✅ Manual Snapshots
- Create snapshots on-demand
- Useful before major changes
- Custom summary support
- Same 7-day retention

### ✅ History UI
- Side-by-side history list and preview
- Color-coded change types (create, edit, restore, snapshot)
- Shows who made changes and when
- Expiry countdown for each version
- Current version indicator

## Database Schema

### Table: `page_history`
```sql
- id (UUID)
- page_id (UUID) → pages.id
- workspace_id (UUID) → workspaces.id
- user_id (UUID) → auth.users.id
- title (TEXT)
- content (JSONB)
- blocks (JSONB)
- icon (TEXT)
- cover_image (TEXT)
- change_type (TEXT) - 'edit', 'create', 'restore', 'snapshot'
- change_summary (TEXT)
- version_number (INTEGER)
- created_at (TIMESTAMPTZ)
- expires_at (TIMESTAMPTZ) - NOW() + 7 days
```

## API Endpoints

### GET `/api/v1/page-history/{page_id}`
Get all version history for a page
- Returns: Array of history entries with user info
- Sorted by version number (newest first)
- Shows days until expiry

### GET `/api/v1/page-history/{page_id}/version/{version_number}`
Get specific version content
- Returns: Full page state at that version
- Used for preview

### POST `/api/v1/page-history/{page_id}/restore`
Restore page to previous version
```json
{
  "history_id": "uuid"
}
```

### POST `/api/v1/page-history/{page_id}/snapshot`
Create manual snapshot
- Optional: `summary` parameter
- Returns: Created snapshot

### GET `/api/v1/page-history/{page_id}/stats`
Get history statistics
- Total versions
- Oldest/newest versions
- Change type breakdown

### POST `/api/v1/page-history/cleanup`
Manually trigger expired history cleanup
- Admin only
- Returns: Count of deleted entries

## Database Functions

### `create_page_history()`
Trigger function that runs on page updates
- Automatically creates history entries
- Detects what changed
- Generates change summaries
- Sets 7-day expiry

### `restore_page_from_history(history_id)`
Restores page to previous version
- Updates page content
- Creates restore history entry
- Returns success status

### `cleanup_expired_page_history()`
Removes expired history entries
- Deletes entries where `expires_at < NOW()`
- Returns count of deleted entries
- Should run daily via cron

### `get_page_history_with_diff(page_id, limit)`
Gets history with computed fields
- Adds user email
- Calculates days until expiry
- Marks current version
- Optimized query

## Frontend Component

### `<PageHistory pageId={string} onRestore={() => void} />`

**Features:**
- Dialog-based UI
- Two-panel layout (list + preview)
- Version selection
- One-click restore
- Manual snapshot creation
- Auto-refresh
- Loading states
- Error handling

**Usage:**
```tsx
import { PageHistory } from "@/components/pages/PageHistory";

<PageHistory 
  pageId={pageId} 
  onRestore={() => {
    // Refresh page content
    fetchPage();
  }} 
/>
```

## Integration Points

### 1. Page Editor
Add history button to page toolbar:
```tsx
import { PageHistory } from "@/components/pages/PageHistory";

// In PageEditor.tsx toolbar
<PageHistory pageId={pageId} onRestore={fetchPage} />
```

### 2. Page Viewer
Add to page actions menu:
```tsx
<PageHistory pageId={pageId} onRestore={fetchPage} />
```

### 3. Backend Routes
Already integrated in `backend/app/api/routes.py`:
```python
api_router.include_router(
  page_history.router, 
  prefix="/page-history", 
  tags=["page-history"]
)
```

## Setup Instructions

### 1. Run Migration
```bash
# Connect to Supabase and run:
psql -h your-db-host -U postgres -d postgres -f backend/migrations/add_page_history_system.sql
```

Or via Supabase Dashboard:
- Go to SQL Editor
- Paste contents of `add_page_history_system.sql`
- Run

### 2. Setup Cron Job (Optional)
For automatic daily cleanup:

**Option A: Supabase pg_cron**
```sql
SELECT cron.schedule(
  'cleanup-page-history',
  '0 2 * * *', -- 2 AM daily
  'SELECT cleanup_expired_page_history()'
);
```

**Option B: External Cron**
```bash
# Add to crontab
0 2 * * * curl -X POST https://your-api.com/api/v1/page-history/cleanup \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 3. Restart Backend
```bash
cd backend
# Kill existing process
# Restart
python main.py
```

### 4. Test
```bash
# Create a page
# Edit it multiple times
# Open version history
# Restore a version
# Wait 7 days (or manually set expires_at) and run cleanup
```

## Change Types

| Type | Color | Description |
|------|-------|-------------|
| `create` | Green | Page was created |
| `edit` | Blue | Page was edited |
| `restore` | Purple | Restored from history |
| `snapshot` | Yellow | Manual snapshot |

## Security

### RLS Policies
- ✅ Users can only view history in their workspaces
- ✅ Users can only create history for pages they can edit
- ✅ Workspace isolation enforced
- ✅ Service role used for triggers

### Permissions
- All authenticated users: SELECT, INSERT on `page_history`
- All authenticated users: EXECUTE on restore/get functions
- Service role only: EXECUTE on cleanup function

## Performance

### Indexes
- `page_id` - Fast lookup by page
- `workspace_id` - Workspace filtering
- `created_at DESC` - Chronological sorting
- `expires_at` - Cleanup queries

### Optimization
- History limited to 50 entries by default
- Automatic cleanup prevents table bloat
- Efficient RLS policies
- Computed fields cached in function

## Limitations

- History kept for 7 days only
- No diff visualization (shows full content)
- No merge conflict resolution
- No branching/forking

## Future Enhancements

1. **Diff Visualization**
   - Show what changed between versions
   - Highlight added/removed content
   - Line-by-line comparison

2. **Extended Retention**
   - Premium users: 30-day history
   - Important snapshots: Never expire
   - Configurable retention per workspace

3. **Collaborative Features**
   - See who's viewing history
   - Comment on versions
   - Compare any two versions

4. **Advanced Restore**
   - Selective restore (only title, only content)
   - Merge changes from multiple versions
   - Conflict resolution UI

## Testing Checklist

- [ ] Create page and verify initial history entry
- [ ] Edit page multiple times, check version numbers increment
- [ ] Restore to previous version
- [ ] Create manual snapshot
- [ ] Verify 7-day expiry dates
- [ ] Test cleanup function
- [ ] Check RLS policies (can't see other workspace history)
- [ ] Test preview panel
- [ ] Verify change type colors
- [ ] Test with deleted pages (should cascade delete history)

## Troubleshooting

### History not being created
- Check trigger is enabled: `\d pages` in psql
- Verify function exists: `\df create_page_history`
- Check logs for errors

### Restore not working
- Verify RLS policies
- Check user has edit permission on page
- Ensure history_id is valid

### Cleanup not running
- Check cron job is scheduled
- Verify function permissions
- Run manually to test

## Files Created

1. `backend/migrations/add_page_history_system.sql` - Database schema
2. `backend/app/api/endpoints/page_history.py` - API endpoints
3. `src/components/pages/PageHistory.tsx` - UI component
4. `backend/app/api/routes.py` - Updated with history routes

## Summary

You now have a complete Notion-style page history system with:
- ✅ Automatic version tracking on every edit
- ✅ 7-day retention with auto-cleanup
- ✅ One-click restore functionality
- ✅ Manual snapshot creation
- ✅ Beautiful UI with preview
- ✅ Workspace isolation
- ✅ Performance optimized

Just run the migration, restart the backend, and add the `<PageHistory>` component to your page editor!
