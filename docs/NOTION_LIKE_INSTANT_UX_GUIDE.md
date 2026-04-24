# Making Axora Feel Instant Like Notion

## 🎯 Goal
Make Axora feel like a **local desktop app** that's blazing fast, even though it syncs to the cloud.

**User Experience**:
- ✅ Pages load instantly from cache
- ✅ Edits appear immediately (optimistic updates)
- ✅ No loading spinners (use skeletons instead)
- ✅ Background sync (silent, non-blocking)
- ✅ Works offline, syncs when online

---

## 🏗️ Architecture Pattern

```
User Action
    ↓
1. Update Local Cache (IndexedDB) ← INSTANT
    ↓
2. Update UI Optimistically ← INSTANT
    ↓
3. Queue Sync Event
    ↓
4. Background Sync to Server (silent)
    ↓
5. Handle Conflicts (if any)
```

**Key Principle**: UI updates BEFORE server confirms.

---

## 📦 What You Already Have

✅ **Dexie (IndexedDB)** - Local database (`src/lib/offline-db.ts`)
✅ **Sync Queue** - Queue for background sync
✅ **Local Storage** - Pages and tasks cached locally

---

## 🚀 Implementation Steps

### 1. Cache-First Data Loading

**Pattern**: Always read from cache first, then fetch from server in background.

```typescript
// ❌ BAD: Wait for server
const loadPage = async (pageId: string) => {
  setLoading(true);
  const page = await api.getPage(pageId); // Blocks UI
  setPage(page);
  setLoading(false);
};

// ✅ GOOD: Cache-first
const loadPage = async (pageId: string) => {
  // 1. Load from cache INSTANTLY
  const cachedPage = await offlineDBHelpers.getPage(pageId);
  if (cachedPage) {
    setPage(cachedPage); // UI updates immediately
  }
  
  // 2. Fetch from server in background
  try {
    const serverPage = await api.getPage(pageId);
    setPage(serverPage); // Update with fresh data
    await offlineDBHelpers.savePage(serverPage); // Update cache
  } catch (error) {
    // If offline, cached data is still shown
    console.log('Using cached data (offline)');
  }
};
```

### 2. Optimistic Updates

**Pattern**: Update UI immediately, sync to server in background.

```typescript
// ✅ Optimistic page title update
const updatePageTitle = async (pageId: string, newTitle: string) => {
  // 1. Update UI immediately
  setPage(prev => ({ ...prev, title: newTitle }));
  
  // 2. Update local cache
  await offlineDBHelpers.savePage({ id: pageId, title: newTitle });
  
  // 3. Queue sync event
  await offlineDBHelpers.enqueueSyncEvent('page', pageId, 'patch', {
    title: newTitle
  });
  
  // 4. Trigger background sync (non-blocking)
  syncManager.triggerSync();
};

// ✅ Optimistic task status update
const updateTaskStatus = async (taskId: string, newStatus: string) => {
  // 1. Update UI immediately
  setTasks(prev => prev.map(t => 
    t.id === taskId ? { ...t, status: newStatus } : t
  ));
  
  // 2. Update local cache
  await offlineDBHelpers.saveTask({ id: taskId, status: newStatus });
  
  // 3. Queue sync
  await offlineDBHelpers.enqueueSyncEvent('task', taskId, 'patch', {
    status: newStatus
  });
  
  // 4. Background sync
  syncManager.triggerSync();
};
```

### 3. Background Sync Manager

Create a sync manager that runs in the background:

```typescript
// src/lib/sync-manager.ts
class SyncManager {
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;
  
  start() {
    // Sync every 5 seconds
    this.syncInterval = setInterval(() => {
      this.sync();
    }, 5000);
    
    // Also sync on visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.sync();
      }
    });
  }
  
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
  
  async sync() {
    if (this.isSyncing) return;
    
    this.isSyncing = true;
    
    try {
      // Get pending events
      const events = await offlineDBHelpers.getPendingSyncEvents(10);
      
      for (const event of events) {
        try {
          // Mark as syncing
          await offlineDBHelpers.updateSyncEventStatus(event.id, 'syncing');
          
          // Sync to server
          const payload = JSON.parse(event.payload_json);
          
          if (event.entity_type === 'page') {
            if (event.op_type === 'upsert') {
              await api.upsertPage(event.entity_id, payload);
            } else if (event.op_type === 'patch') {
              await api.patchPage(event.entity_id, payload);
            } else if (event.op_type === 'delete') {
              await api.deletePage(event.entity_id);
            }
          } else if (event.entity_type === 'task') {
            // Similar for tasks
          }
          
          // Mark as synced
          await offlineDBHelpers.updateSyncEventStatus(event.id, 'synced');
          
        } catch (error) {
          // Mark as failed
          await offlineDBHelpers.updateSyncEventStatus(
            event.id, 
            'failed', 
            error.message
          );
        }
      }
      
      // Cleanup old synced events
      await offlineDBHelpers.clearSyncedEvents();
      
    } finally {
      this.isSyncing = false;
    }
  }
  
  triggerSync() {
    // Trigger immediate sync
    this.sync();
  }
}

export const syncManager = new SyncManager();
```

### 4. Skeleton Screens (Not Loading Spinners)

**Pattern**: Show content structure while loading.

```typescript
// ❌ BAD: Loading spinner
{loading && <div className="spinner">Loading...</div>}

// ✅ GOOD: Skeleton
{!page && (
  <div className="space-y-4">
    <Skeleton className="h-8 w-3/4" /> {/* Title */}
    <Skeleton className="h-4 w-full" />  {/* Line 1 */}
    <Skeleton className="h-4 w-full" />  {/* Line 2 */}
    <Skeleton className="h-4 w-2/3" />  {/* Line 3 */}
  </div>
)}
```

### 5. Debounced Sync for Typing

**Pattern**: Don't sync every keystroke, batch updates.

```typescript
import { useDebouncedCallback } from 'use-debounce';

const PageEditor = ({ pageId }) => {
  const [content, setContent] = useState('');
  
  // Debounce sync for 500ms
  const debouncedSync = useDebouncedCallback(
    async (newContent) => {
      // Update cache
      await offlineDBHelpers.savePage({ 
        id: pageId, 
        content_json: newContent 
      });
      
      // Queue sync
      await offlineDBHelpers.enqueueSyncEvent('page', pageId, 'patch', {
        content_json: newContent
      });
      
      // Trigger sync
      syncManager.triggerSync();
    },
    500 // Wait 500ms after user stops typing
  );
  
  const handleContentChange = (newContent: string) => {
    // Update UI immediately
    setContent(newContent);
    
    // Sync after debounce
    debouncedSync(newContent);
  };
  
  return <Editor value={content} onChange={handleContentChange} />;
};
```

### 6. Offline Indicator

**Pattern**: Show subtle indicator when offline.

```typescript
const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      syncManager.triggerSync(); // Sync when back online
    };
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  if (!isOffline) return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4" />
        <span>Offline - Changes will sync when online</span>
      </div>
    </div>
  );
};
```

### 7. Sync Status Indicator (Subtle)

**Pattern**: Show sync status without blocking UI.

```typescript
const SyncStatus = () => {
  const [status, setStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  
  return (
    <div className="fixed top-4 right-4 text-xs text-muted-foreground">
      {status === 'syncing' && (
        <div className="flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Syncing...</span>
        </div>
      )}
      {status === 'synced' && (
        <div className="flex items-center gap-1">
          <Check className="w-3 h-3 text-green-500" />
          <span>All changes saved</span>
        </div>
      )}
      {status === 'offline' && (
        <div className="flex items-center gap-1">
          <WifiOff className="w-3 h-3 text-yellow-500" />
          <span>Offline</span>
        </div>
      )}
    </div>
  );
};
```

---

## 🎨 UI Patterns

### Page Loading
```typescript
const PageView = ({ pageId }) => {
  const [page, setPage] = useState(null);
  
  useEffect(() => {
    loadPage();
  }, [pageId]);
  
  const loadPage = async () => {
    // 1. Load from cache (instant)
    const cached = await offlineDBHelpers.getPage(pageId);
    if (cached) {
      setPage(cached);
    }
    
    // 2. Fetch from server (background)
    try {
      const fresh = await api.getPage(pageId);
      setPage(fresh);
      await offlineDBHelpers.savePage(fresh);
    } catch (error) {
      // Offline or error - cached data still shown
    }
  };
  
  if (!page) {
    return <PageSkeleton />;
  }
  
  return <PageContent page={page} />;
};
```

### Task List Loading
```typescript
const TaskList = ({ workspaceId }) => {
  const [tasks, setTasks] = useState([]);
  
  useEffect(() => {
    loadTasks();
  }, [workspaceId]);
  
  const loadTasks = async () => {
    // 1. Load from cache
    const cached = await offlineDBHelpers.getTasksByWorkspace(workspaceId);
    if (cached.length > 0) {
      setTasks(cached);
    }
    
    // 2. Fetch from server
    try {
      const fresh = await api.getTasks(workspaceId);
      setTasks(fresh);
      
      // Update cache
      for (const task of fresh) {
        await offlineDBHelpers.saveTask(task);
      }
    } catch (error) {
      // Offline - cached data shown
    }
  };
  
  return (
    <div>
      {tasks.length === 0 ? (
        <TaskListSkeleton />
      ) : (
        tasks.map(task => <TaskCard key={task.id} task={task} />)
      )}
    </div>
  );
};
```

---

## 🔄 Conflict Resolution

**Pattern**: Last-write-wins with version numbers.

```typescript
const syncWithConflictResolution = async (event: SyncQueueEvent) => {
  const payload = JSON.parse(event.payload_json);
  
  try {
    // Try to sync
    const response = await api.patchPage(event.entity_id, payload);
    
    // Update local cache with server version
    await offlineDBHelpers.savePage(response);
    
    return 'synced';
    
  } catch (error) {
    if (error.status === 409) {
      // Conflict: server has newer version
      const serverVersion = await api.getPage(event.entity_id);
      
      // Update local cache with server version
      await offlineDBHelpers.savePage(serverVersion);
      
      // Notify user (optional)
      toast.info('Page was updated by another device');
      
      return 'synced';
    }
    
    throw error;
  }
};
```

---

## 📊 Performance Metrics

### Target Performance
- **Initial page load**: < 100ms (from cache)
- **Typing latency**: 0ms (instant)
- **Task status change**: 0ms (instant)
- **Background sync**: < 1s (non-blocking)

### Monitoring
```typescript
// Track performance
const trackPerformance = (action: string, duration: number) => {
  if (duration > 100) {
    console.warn(`Slow ${action}: ${duration}ms`);
  }
};

// Example
const start = performance.now();
await offlineDBHelpers.getPage(pageId);
const duration = performance.now() - start;
trackPerformance('cache-read', duration);
```

---

## 🎯 Implementation Checklist

### Phase 1: Cache-First Loading
- [ ] Load pages from cache first
- [ ] Load tasks from cache first
- [ ] Fetch from server in background
- [ ] Update cache with fresh data

### Phase 2: Optimistic Updates
- [ ] Page title updates (instant)
- [ ] Page content updates (debounced)
- [ ] Task status updates (instant)
- [ ] Task creation (instant)

### Phase 3: Background Sync
- [ ] Sync manager running
- [ ] Queue processing
- [ ] Retry failed syncs
- [ ] Cleanup old events

### Phase 4: UI Polish
- [ ] Replace spinners with skeletons
- [ ] Add offline indicator
- [ ] Add sync status (subtle)
- [ ] Smooth transitions

### Phase 5: Conflict Resolution
- [ ] Handle 409 conflicts
- [ ] Merge strategies
- [ ] User notifications

---

## 🚀 Quick Start

1. **Start sync manager on app load**:
```typescript
// In App.tsx
useEffect(() => {
  syncManager.start();
  return () => syncManager.stop();
}, []);
```

2. **Use cache-first pattern everywhere**:
```typescript
// Always: cache first, server second
const data = await offlineDBHelpers.get...();
if (data) setData(data);
const fresh = await api.get...();
setData(fresh);
await offlineDBHelpers.save...(fresh);
```

3. **Use optimistic updates for mutations**:
```typescript
// Always: UI first, sync second
setData(newData);
await offlineDBHelpers.save...(newData);
await offlineDBHelpers.enqueueSyncEvent(...);
syncManager.triggerSync();
```

---

## 🎉 Result

After implementation, Axora will feel like:
- ✅ **Notion** - Instant, smooth, local-first
- ✅ **Figma** - Real-time, collaborative
- ✅ **VS Code** - Fast, responsive, reliable

Users won't notice they're using a cloud app!
