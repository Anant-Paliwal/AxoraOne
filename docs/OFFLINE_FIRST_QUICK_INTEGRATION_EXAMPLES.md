# Quick Integration Examples - Offline-First

## ✅ What's Already Done

1. Sync manager initialized in App.tsx (starts on login, stops on logout)
2. SyncStatus indicator added to AppLayout (bottom-right corner)
3. All infrastructure ready (IndexedDB, hooks, sync manager)

## 🚀 How to Integrate Into Existing Components

### Pattern 1: Simple Cache-First Loading (Read-Only Pages)

**Before:**
```tsx
function PageViewer() {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    api.getPage(pageId).then(setPage).finally(() => setLoading(false));
  }, [pageId]);
  
  if (loading) return <div>Loading...</div>;
  return <div>{page.title}</div>;
}
```

**After (Instant Load):**
```tsx
import { useCacheFirstPage } from '@/hooks/useCacheFirst';
import { PageSkeleton } from '@/components/skeletons/PageSkeleton';

function PageViewer() {
  const { page, loading, fromCache } = useCacheFirstPage(
    pageId,
    () => api.getPage(pageId)
  );
  
  if (loading) return <PageSkeleton />;
  return <div>{page.title}</div>;
}
```

### Pattern 2: Optimistic Updates (Editable Content)

**Before:**
```tsx
function PageEditor() {
  const [page, setPage] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const handleTitleChange = async (newTitle) => {
    setSaving(true);
    await api.updatePage(pageId, { title: newTitle });
    setPage({ ...page, title: newTitle });
    setSaving(false);
  };
  
  return (
    <input 
      value={page?.title} 
      onChange={(e) => handleTitleChange(e.target.value)}
      disabled={saving}
    />
  );
}
```

**After (Instant Update):**
```tsx
import { useOptimisticPage } from '@/hooks/useOptimisticUpdate';

function PageEditor() {
  const [initialPage, setInitialPage] = useState(null);
  const { page, updateTitle } = useOptimisticPage(initialPage);
  
  // No loading state needed - updates are instant!
  return (
    <input 
      value={page?.title} 
      onChange={(e) => updateTitle(e.target.value)}
    />
  );
}
```

### Pattern 3: Task Status Updates (Drag & Drop, Checkboxes)

**Before:**
```tsx
function TaskCard({ task }) {
  const [updating, setUpdating] = useState(false);
  
  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    await api.updateTask(task.id, { status: newStatus });
    setUpdating(false);
  };
  
  return (
    <button 
      onClick={() => handleStatusChange('done')}
      disabled={updating}
    >
      {updating ? 'Saving...' : 'Mark Done'}
    </button>
  );
}
```

**After (Instant Update):**
```tsx
import { useOptimisticTask } from '@/hooks/useOptimisticUpdate';

function TaskCard({ initialTask }) {
  const { task, updateStatus } = useOptimisticTask(initialTask);
  
  // No loading state - instant!
  return (
    <button onClick={() => updateStatus('done')}>
      Mark Done
    </button>
  );
}
```

### Pattern 4: List of Tasks with Optimistic Updates

**Before:**
```tsx
function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    api.getTasks(workspaceId).then(setTasks).finally(() => setLoading(false));
  }, [workspaceId]);
  
  const handleStatusChange = async (taskId, newStatus) => {
    await api.updateTask(taskId, { status: newStatus });
    // Reload all tasks
    const updated = await api.getTasks(workspaceId);
    setTasks(updated);
  };
  
  if (loading) return <div>Loading...</div>;
  return tasks.map(task => <TaskCard key={task.id} task={task} />);
}
```

**After (Instant Everything):**
```tsx
import { useCacheFirstTasks } from '@/hooks/useCacheFirst';
import { useOptimisticTasks } from '@/hooks/useOptimisticUpdate';

function TasksPage() {
  // Load from cache instantly
  const { tasks: cachedTasks, loading } = useCacheFirstTasks(
    workspaceId,
    () => api.getTasks(workspaceId)
  );
  
  // Get optimistic update functions
  const { tasks, updateTaskStatus } = useOptimisticTasks(cachedTasks);
  
  if (loading) return <TasksSkeleton />;
  
  return tasks.map(task => (
    <TaskCard 
      key={task.id} 
      task={task}
      onStatusChange={(status) => updateTaskStatus(task.id, status)}
    />
  ));
}
```

## 🎯 Priority Integration Order

### Phase 1: High-Impact Pages (Do First)
1. **TasksPage** - Most frequent updates, biggest UX win
2. **PageEditor** - Users type constantly, needs instant feedback
3. **PageViewer** - Most visited page, cache-first = instant load

### Phase 2: Supporting Components
4. **PagesPage** - List of pages, cache-first loading
5. **HomePage** - Dashboard widgets, cache-first data
6. **SkillsPage** - Skills list, cache-first loading

### Phase 3: Polish
7. Replace all loading spinners with skeletons
8. Add debounced editor sync (500ms after typing stops)
9. Test offline mode thoroughly

## 📝 Step-by-Step: Integrate TasksPage (Example)

### Step 1: Import the hooks
```tsx
import { useCacheFirstTasks } from '@/hooks/useCacheFirst';
import { useOptimisticTasks } from '@/hooks/useOptimisticUpdate';
```

### Step 2: Replace data loading
```tsx
// OLD:
const [tasks, setTasks] = useState([]);
useEffect(() => {
  api.getTasks(workspaceId).then(setTasks);
}, [workspaceId]);

// NEW:
const { tasks: cachedTasks, loading } = useCacheFirstTasks(
  workspaceId,
  () => api.getTasks(workspaceId)
);
```

### Step 3: Add optimistic updates
```tsx
const { tasks, updateTaskStatus, addTask, removeTask } = useOptimisticTasks(cachedTasks);
```

### Step 4: Use optimistic functions
```tsx
// OLD:
const handleStatusChange = async (taskId, status) => {
  await api.updateTask(taskId, { status });
  loadData(); // Reload everything
};

// NEW:
const handleStatusChange = (taskId, status) => {
  updateTaskStatus(taskId, status); // Instant!
};
```

### Step 5: Replace loading spinner
```tsx
// OLD:
if (loading) return <div>Loading...</div>;

// NEW:
if (loading) return <TasksSkeleton />;
```

## 🔧 Debounced Editor Updates

For text editors (TiptapEditor), add debouncing to avoid syncing every keystroke:

```tsx
import { debounce } from 'lodash';
import { useOptimisticPage } from '@/hooks/useOptimisticUpdate';

function PageEditor() {
  const { page, updateContent } = useOptimisticPage(initialPage);
  
  // Debounce: sync 500ms after user stops typing
  const debouncedUpdate = useMemo(
    () => debounce((content) => updateContent(content), 500),
    [updateContent]
  );
  
  return (
    <TiptapEditor 
      content={page?.content_json}
      onChange={debouncedUpdate}
    />
  );
}
```

## 🎨 Skeleton Screens

Replace loading spinners with skeleton screens for better UX:

```tsx
// Already created:
import { PageSkeleton } from '@/components/skeletons/PageSkeleton';

// Use it:
if (loading) return <PageSkeleton />;

// Create more skeletons as needed:
// - TasksSkeleton
// - SkillsSkeleton
// - DashboardSkeleton
```

## ✅ Testing Checklist

### Test Offline Mode
1. Open DevTools → Network → Set to "Offline"
2. Edit a page title → Should update instantly
3. Create a task → Should appear instantly
4. Go back online → Watch sync indicator sync changes

### Test Cache-First
1. Load a page (fetches from server)
2. Refresh page → Should load instantly from cache
3. Server data loads in background

### Test Optimistic Updates
1. Update task status → Should change instantly
2. Edit page title → Should update instantly
3. Watch sync indicator show "syncing" → "synced"

## 🚨 Common Mistakes to Avoid

### ❌ Don't mix old and new patterns
```tsx
// BAD: Using both useState and optimistic hooks
const [tasks, setTasks] = useState([]);
const { tasks: optimisticTasks } = useOptimisticTasks(tasks);
```

### ❌ Don't call API directly for updates
```tsx
// BAD: Bypassing optimistic updates
await api.updateTask(taskId, { status: 'done' });

// GOOD: Use optimistic update
updateTaskStatus(taskId, 'done');
```

### ❌ Don't reload data after optimistic updates
```tsx
// BAD: Reloading defeats the purpose
updateTaskStatus(taskId, 'done');
loadData(); // ❌ Don't do this!

// GOOD: Trust the optimistic update
updateTaskStatus(taskId, 'done'); // ✅ That's it!
```

## 📊 Expected Results

After integration:

- ✅ Pages load instantly (from cache)
- ✅ Updates appear instantly (optimistic)
- ✅ No loading spinners during updates
- ✅ Works offline
- ✅ Sync indicator shows status
- ✅ Feels like a local desktop app

## 🎯 Summary

The offline-first infrastructure is **100% complete and working**. Now just:

1. Import the hooks
2. Replace data loading with cache-first hooks
3. Replace update functions with optimistic hooks
4. Replace loading spinners with skeletons
5. Test offline mode

That's it! The app will feel instant like Notion.
