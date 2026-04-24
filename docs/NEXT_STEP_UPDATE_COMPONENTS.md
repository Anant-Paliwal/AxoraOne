# Next Step: Update Components to Use Instant Loading

## Current Status

✅ **Infrastructure Complete** - Sync manager, hooks, IndexedDB all working
❌ **Components Not Updated** - Still using old loading pattern

## Why You See No Change

The components (HomePage, PageViewer, TasksPage, etc.) are still using the old code:

```tsx
// OLD CODE (currently in components)
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  api.getData().then(result => {
    setData(result);
    setLoading(false); // ❌ Shows spinner until API responds
  });
}, []);

if (loading) return <Loader2 />; // ❌ User sees spinner
```

## What Needs to Happen

Update components to use the new hooks:

```tsx
// NEW CODE (needs to be added to components)
import { useCacheFirstData } from '@/hooks/useCacheFirst';

const { data, loading } = useCacheFirstData(
  id,
  () => api.getData(id)
);

// ✅ Data loads INSTANTLY from cache
// ✅ No spinner (or very brief)
// ✅ Server refresh happens in background
```

## Which Components to Update

### High Priority (Most Impact)
1. **TasksPage** - Users interact with tasks frequently
2. **PageViewer** - Most visited page
3. **HomePage** - First thing users see

### Medium Priority
4. **PagesPage** - List of pages
5. **SkillsPage** - Skills list

## Let Me Update One Component Now

I'll update **TasksPage** as a demonstration so you can see the instant loading in action.

After that, you'll see:
- Tasks load instantly (no spinner)
- Task status updates instantly (no "Saving...")
- Works offline
- Sync status indicator shows when syncing

**Should I proceed with updating TasksPage?**
