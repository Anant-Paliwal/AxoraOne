# Offline-First Quick Start

## What Changed?

Axora is now **offline-first**. All page and task edits are saved locally FIRST, then synced to the server in the background.

## Installation

```bash
# 1. Install dependencies
npm install

# 2. Run database migration
psql $DATABASE_URL -f backend/migrations/add_offline_sync_support.sql

# 3. Start the app
npm run dev
```

## How It Works

```
User Edit → Save to IndexedDB (instant) → Queue for sync → Background sync to server
```

**Key Benefits:**
- ✅ Works offline
- ✅ No data loss on crash
- ✅ Instant saves
- ✅ Automatic sync when online

## Using in Your Components

### Page Editor with Autosave

```typescript
import { useOfflineSync, useAutosave } from '@/hooks/useOfflineSync';
import { SyncStatusIndicator } from '@/components/ui/SyncStatusIndicator';

function MyPageEditor({ pageId }) {
  const { syncStatus, pendingCount, savePage } = useOfflineSync();
  
  // Autosave with 500ms debounce
  const { save } = useAutosave(async (data) => {
    await savePage(pageId, {
      title: data.title,
      content_json: JSON.stringify(data.blocks),
    });
  }, 500);

  const handleChange = (newBlocks) => {
    save({ title: 'My Page', blocks: newBlocks });
  };

  return (
    <div>
      <SyncStatusIndicator status={syncStatus} pendingCount={pendingCount} />
      <Editor onChange={handleChange} />
    </div>
  );
}
```

### Task Update

```typescript
import { useOfflineSync } from '@/hooks/useOfflineSync';

function TaskItem({ task }) {
  const { saveTask } = useOfflineSync();

  const updateStatus = async (newStatus) => {
    await saveTask(task.id, { status: newStatus });
  };

  return (
    <select onChange={(e) => updateStatus(e.target.value)}>
      <option value="todo">To Do</option>
      <option value="done">Done</option>
    </select>
  );
}
```

## Sync Status Indicator

Shows current sync state:

| Status | Meaning |
|--------|---------|
| "Saving..." | Writing to local DB |
| "Saved offline" | Saved locally, will sync when online |
| "Syncing..." | Uploading to server |
| "Synced ✅" | Successfully synced |
| "Sync error" | Failed to sync (will retry) |

## Testing Offline Mode

1. Open DevTools (F12)
2. Go to Network tab
3. Check "Offline"
4. Make changes
5. See "Saved offline" indicator
6. Uncheck "Offline"
7. Watch automatic sync

## Files Created

**Frontend:**
- `src/lib/offline-db.ts` - IndexedDB layer
- `src/lib/sync-worker.ts` - Background sync
- `src/hooks/useOfflineSync.ts` - React hooks
- `src/components/ui/SyncStatusIndicator.tsx` - UI indicator
- `src/contexts/OfflineSyncContext.tsx` - Context provider

**Backend:**
- `backend/app/api/endpoints/sync.py` - Sync endpoint
- `backend/migrations/add_offline_sync_support.sql` - DB migration

## API Changes

**New endpoint:** `POST /api/v1/sync/events`

Accepts batch of sync events and returns results.

## Database Changes

**New columns:**
- `pages.version` - Version number for conflict resolution
- `tasks.version` - Version number for conflict resolution

**New table:**
- `page_revisions` - Historical versions for recovery

## No Breaking Changes

Existing code continues to work. Offline-first is opt-in via hooks.

## Next Steps

1. Integrate `useOfflineSync` into PageEditor
2. Integrate into TasksPage
3. Add sync status to app header
4. Test offline scenarios

## Support

Check `OFFLINE_FIRST_IMPLEMENTATION.md` for detailed documentation.
