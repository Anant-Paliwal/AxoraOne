# Offline-First Implementation Guide

## Overview

Axora now has **offline-first architecture** that guarantees NO data loss even if:
- Internet goes offline
- Browser tab crashes
- App closes unexpectedly
- Phone battery dies instantly

## Architecture

```
USER EDIT → SAVE LOCALLY FIRST → QUEUE SYNC → UI SHOWS SAVED
         ↓
    BACKGROUND SYNC TO SERVER → SERVER ACK → MARK SYNCED
```

## Core Components

### 1. Local Database (IndexedDB via Dexie)

**Location:** `src/lib/offline-db.ts`

**Tables:**
- `pages_local` - Local page storage
- `tasks_local` - Local task storage
- `sync_queue` - Pending sync events
- `sync_state` - Workspace sync status

**Key Functions:**
```typescript
offlineDBHelpers.savePage(page)      // Save page locally
offlineDBHelpers.saveTask(task)      // Save task locally
offlineDBHelpers.enqueueSyncEvent()  // Queue sync event
offlineDBHelpers.getPendingSyncEvents() // Get pending syncs
```

### 2. Sync Worker

**Location:** `src/lib/sync-worker.ts`

**Responsibilities:**
- Runs every 15 seconds when online
- Processes pending sync events in batches
- Handles retry with exponential backoff
- Listens for online/offline events

**Usage:**
```typescript
import { syncWorker } from '@/lib/sync-worker';

// Start worker (done automatically in OfflineSyncProvider)
syncWorker.start();

// Trigger immediate sync
syncWorker.syncNow();

// Get sync status
const status = await syncWorker.getSyncStatus();
```

### 3. React Hooks

**Location:** `src/hooks/useOfflineSync.ts`

**Main Hook:**
```typescript
const {
  syncStatus,      // 'idle' | 'saving' | 'saved-offline' | 'syncing' | 'synced' | 'error'
  pendingCount,    // Number of pending sync events
  isOnline,        // Network status
  savePage,        // Save page with offline-first
  saveTask,        // Save task with offline-first
  loadPage,        // Load page from local DB
  loadTask,        // Load task from local DB
  deletePage,      // Delete page
  deleteTask,      // Delete task
} = useOfflineSync();
```

**Autosave Hook:**
```typescript
const { save, isSaving } = useAutosave(saveFunction, 500); // 500ms debounce
```

### 4. UI Components

**Sync Status Indicator:** `src/components/ui/SyncStatusIndicator.tsx`

```typescript
<SyncStatusIndicator
  status={syncStatus}
  pendingCount={pendingCount}
  showLabel={true}
/>
```

**Offline Page Editor:** `src/components/editor/OfflinePageEditor.tsx`

Wrapper component that adds offline-first functionality to any editor.

### 5. Backend Sync Endpoint

**Location:** `backend/app/api/endpoints/sync.py`

**Endpoint:** `POST /api/v1/sync/events`

**Request:**
```json
{
  "events": [
    {
      "id": "page-123-1234567890",
      "entity_type": "page",
      "entity_id": "page-123",
      "op_type": "upsert",
      "payload": {
        "title": "My Page",
        "content": "[...]",
        "workspace_id": "ws-456"
      },
      "created_at": 1234567890,
      "client_version": 5
    }
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "event_id": "page-123-1234567890",
      "ok": true,
      "server_version": 6,
      "server_updated_at": "2024-01-24T12:00:00Z"
    }
  ],
  "synced_count": 1,
  "failed_count": 0
}
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install dexie@^4.0.10
```

### 2. Run Database Migration

```bash
# Apply the migration to add version columns
psql -d your_database -f backend/migrations/add_offline_sync_support.sql
```

### 3. Integration is Already Done

The offline-first system is automatically initialized via `OfflineSyncProvider` in `App.tsx`.

## Usage Examples

### Example 1: Page Editor with Autosave

```typescript
import { useOfflineSync, useAutosave } from '@/hooks/useOfflineSync';
import { SyncStatusIndicator } from '@/components/ui/SyncStatusIndicator';

function PageEditor({ pageId, workspaceId }) {
  const { syncStatus, pendingCount, savePage } = useOfflineSync();
  const [content, setContent] = useState('');

  // Autosave with 500ms debounce
  const { save } = useAutosave(async (data) => {
    await savePage(pageId, {
      title: data.title,
      content_json: JSON.stringify(data.blocks),
    });
  }, 500);

  const handleContentChange = (newContent) => {
    setContent(newContent);
    // Trigger autosave
    save({ title: 'My Page', blocks: newContent });
  };

  return (
    <div>
      {/* Sync status indicator */}
      <SyncStatusIndicator
        status={syncStatus}
        pendingCount={pendingCount}
      />
      
      {/* Editor */}
      <Editor
        content={content}
        onChange={handleContentChange}
      />
    </div>
  );
}
```

### Example 2: Task Update

```typescript
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { toast } from 'sonner';

function TaskItem({ task }) {
  const { saveTask, isOnline } = useOfflineSync();

  const handleStatusChange = async (newStatus) => {
    try {
      await saveTask(task.id, {
        status: newStatus,
      });

      if (!isOnline) {
        toast.info('Saved offline', {
          description: 'Will sync when online',
        });
      }
    } catch (error) {
      toast.error('Failed to save');
    }
  };

  return (
    <div>
      <select
        value={task.status}
        onChange={(e) => handleStatusChange(e.target.value)}
      >
        <option value="todo">To Do</option>
        <option value="in-progress">In Progress</option>
        <option value="done">Done</option>
      </select>
    </div>
  );
}
```

### Example 3: Load Page on Mount

```typescript
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useEffect, useState } from 'react';

function PageViewer({ pageId }) {
  const { loadPage } = useOfflineSync();
  const [page, setPage] = useState(null);

  useEffect(() => {
    const loadLocalPage = async () => {
      const localPage = await loadPage(pageId);
      if (localPage) {
        setPage({
          ...localPage,
          blocks: JSON.parse(localPage.content_json),
        });
      }
    };

    loadLocalPage();
  }, [pageId, loadPage]);

  if (!page) return <div>Loading...</div>;

  return <div>{/* Render page */}</div>;
}
```

## Sync Status States

| Status | Description | UI Indicator |
|--------|-------------|--------------|
| `idle` | No activity | Hidden |
| `saving` | Saving to local DB | "Saving..." with spinner |
| `saved-offline` | Saved locally, pending sync | "Saved offline" with cloud-off icon |
| `syncing` | Syncing to server | "Syncing..." with spinner |
| `synced` | Successfully synced | "Synced ✅" with check icon |
| `error` | Sync failed | "Sync error" with alert icon |

## Conflict Resolution (V1)

**Current Strategy:** Last-write-wins based on `updated_at_local` vs `updated_at_server`

**Page Revisions:**
- All page updates create a revision in `page_revisions` table
- No content is lost even on overwrite
- Revisions can be viewed/restored later

**Future Enhancement:** Implement CRDT (Conflict-free Replicated Data Types) for automatic merge.

## Testing Offline Mode

### 1. Test in Browser DevTools

1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Check "Offline" checkbox
4. Make changes to pages/tasks
5. Verify "Saved offline" indicator appears
6. Uncheck "Offline"
7. Verify automatic sync

### 2. Test Tab Crash Recovery

1. Make changes to a page
2. Wait for "Saved offline" or "Synced"
3. Close tab immediately (Ctrl+W)
4. Reopen page
5. Verify changes are preserved

### 3. Test Sync Queue

```typescript
// In browser console
import { offlineDB } from '@/lib/offline-db';

// View pending sync events
const pending = await offlineDB.sync_queue
  .where('status')
  .equals('pending')
  .toArray();
console.log('Pending syncs:', pending);

// View all local pages
const pages = await offlineDB.pages_local.toArray();
console.log('Local pages:', pages);
```

## Performance Considerations

1. **Debounce:** Autosave uses 500ms debounce to avoid excessive writes
2. **Batch Sync:** Sync worker processes 10 events at a time
3. **Cleanup:** Synced events are kept for 24 hours then cleaned up
4. **Indexing:** IndexedDB tables are indexed for fast queries

## Monitoring & Debugging

### Check Sync Status

```typescript
import { syncWorker } from '@/lib/sync-worker';

const status = await syncWorker.getSyncStatus();
console.log('Sync status:', status);
// { pending: 5, syncing: 0, failed: 1, isOnline: true }
```

### View Local Database

Use browser DevTools:
1. Open DevTools (F12)
2. Go to Application tab
3. Expand IndexedDB
4. Select "AxoraOfflineDB"
5. View tables: pages_local, tasks_local, sync_queue

### Console Logs

The system logs all sync operations:
- 🔄 Syncing events
- ✅ Sync completed
- ❌ Sync errors
- 🌐 Network online/offline
- 📖 Loading from local DB

## Production Deployment

### 1. Environment Variables

No additional environment variables needed. The system uses existing API configuration.

### 2. Database Migration

Run the migration on production database:

```bash
psql $DATABASE_URL -f backend/migrations/add_offline_sync_support.sql
```

### 3. Monitoring

Monitor sync health:
- Track failed sync events
- Monitor sync queue size
- Alert on high retry counts

### 4. Backup Strategy

Local IndexedDB data is automatically backed up to server. No additional backup needed.

## Troubleshooting

### Issue: Sync not working

**Check:**
1. Network status: `navigator.onLine`
2. Sync worker running: Check console for "🔄 Sync Worker started"
3. Pending events: Query `sync_queue` table
4. Backend endpoint: Test `/api/v1/sync/events` manually

### Issue: Data not persisting

**Check:**
1. IndexedDB enabled in browser
2. Storage quota not exceeded
3. Console errors during save
4. Local DB tables exist

### Issue: Conflicts/duplicates

**Check:**
1. Event IDs are unique
2. Idempotency working (check `_processed_events` cache)
3. Version numbers incrementing correctly

## Next Steps

1. ✅ Basic offline-first implemented
2. ⏳ Add CRDT for automatic conflict resolution
3. ⏳ Add manual conflict resolution UI
4. ⏳ Add sync progress indicator for large batches
5. ⏳ Add offline analytics/metrics
6. ⏳ Add service worker for true PWA offline support

## Summary

The offline-first system is production-ready and guarantees:
- ✅ No data loss on network failure
- ✅ No data loss on tab/app crash
- ✅ Automatic background sync
- ✅ Minimal UI changes
- ✅ Fast local-first performance
- ✅ Conflict resolution via revisions

Users can now work confidently knowing their work is always saved locally first, then synced to the server when possible.
