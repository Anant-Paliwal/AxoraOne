# Workspace Cache Fix - Prevent Reload on Tab Switch

## Problem

When users switch tabs (go to another app) and come back, the workspace reloads everything:
- ❌ Unnecessary API calls
- ❌ Slow performance  
- ❌ Data flickering
- ❌ Poor user experience

## Solution

Implemented **smart caching** with visibility detection:

### 1. Cache Duration
- Workspace data is cached for **5 minutes**
- Fresh data is reused instead of making new API calls

### 2. Visibility Change Detection
- Listens to `visibilitychange` event
- When user returns to tab:
  - **If cache is fresh** (< 5 minutes) → Use cached data ✅
  - **If cache is stale** (> 5 minutes) → Reload data 🔄

### 3. Force Reload Option
- `loadWorkspaces(forceReload = false)` parameter
- Force reload when:
  - User role changes
  - Workspace is created/updated/deleted
  - Manual refresh is needed

## How It Works

```typescript
// Track last load time
const [lastLoadTime, setLastLoadTime] = useState<number>(0);
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// On visibility change
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    const cacheAge = Date.now() - lastLoadTime;
    
    if (cacheAge > CACHE_DURATION) {
      loadWorkspaces(); // Reload if stale
    } else {
      // Use cached data ✅
    }
  }
});
```

## User Experience

### Before:
1. User on Axora app
2. Switch to Chrome/Email
3. Come back to Axora
4. **Everything reloads** 😞
5. Loading spinners everywhere
6. Data flickers

### After:
1. User on Axora app
2. Switch to Chrome/Email  
3. Come back to Axora
4. **Instant display** 😊
5. No loading
6. Smooth experience

## Cache Invalidation

Cache is automatically invalidated when:
- ✅ User role is updated
- ✅ Workspace is created
- ✅ Workspace is updated
- ✅ Workspace is deleted
- ✅ More than 5 minutes have passed

## Benefits

✅ **Faster**: No unnecessary API calls  
✅ **Smoother**: No flickering or reloading  
✅ **Better UX**: Instant display when switching back  
✅ **Smart**: Still refreshes when needed  
✅ **Efficient**: Reduces server load  

## Files Modified

- `src/contexts/WorkspaceContext.tsx` - Added caching and visibility detection

## Testing

1. Open Axora app
2. Switch to another tab/app
3. Wait 2 minutes (cache still fresh)
4. Switch back to Axora
5. **Result**: No reload, instant display ✅

6. Wait 6 minutes (cache stale)
7. Switch back to Axora
8. **Result**: Reloads data 🔄
