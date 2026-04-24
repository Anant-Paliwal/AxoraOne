# ✅ Tab Divider Removed

## Problem
There was a horizontal line/border below the tabs that looked cluttered.

## Solution
Removed the `border-b border-border` from the header container.

### Before:
```tsx
<div className="sticky top-0 z-10 bg-card/80 backdrop-blur-sm border-b border-border">
```

### After:
```tsx
<div className="sticky top-0 z-10 bg-card/80 backdrop-blur-sm">
```

## Result
✅ No horizontal line below tabs  
✅ Cleaner, modern look  
✅ Better visual hierarchy  

## Deploy

```bash
git add src/pages/PageViewer.tsx
git commit -m "Remove tab divider border"
git push
```

---

**The tab divider is now completely removed! 🎉**
