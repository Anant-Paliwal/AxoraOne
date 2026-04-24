# Fix "Unknown Widget" Error - Clear Dashboard Cache

## Problem
Dashboard shows "Unknown widget type: unified-skill-hub" because your browser has an old layout saved in localStorage that references the deleted widget.

## Solution - Clear Browser Cache

### Option 1: Quick Fix (Recommended)
1. Open browser console (F12)
2. Go to "Console" tab
3. Paste this command and press Enter:
```javascript
localStorage.removeItem('dashboard-layout');
location.reload();
```

### Option 2: Manual Clear
1. Open browser DevTools (F12)
2. Go to "Application" tab (Chrome) or "Storage" tab (Firefox)
3. Find "Local Storage" in left sidebar
4. Click on your site URL
5. Find key `dashboard-layout`
6. Right-click → Delete
7. Refresh page (F5)

## What This Does
- Removes old dashboard layout from browser storage
- Forces dashboard to use new default layout (without unified-skill-hub)
- New layout includes:
  - ✅ Suggested Action Widget (with skill suggestions)
  - ✅ Workspace Pulse Widget (with skill insights)
  - ✅ My Tasks Widget
  - ✅ Upcoming Widget
  - ✅ Calendar Insight Widget

## After Clearing Cache
The dashboard will load with the new default layout defined in `src/components/dashboard/WidgetTypes.ts` line 95:

```typescript
export const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: 'widget-suggested', type: 'suggested-action', x: 0, y: 0, w: 2, h: 1 },
  { id: 'widget-pulse', type: 'workspace-pulse', x: 2, y: 0, w: 1, h: 2 },
  { id: 'widget-tasks', type: 'my-tasks', x: 0, y: 1, w: 1, h: 2 },
  { id: 'widget-upcoming', type: 'upcoming', x: 1, y: 1, w: 1, h: 2 },
  { id: 'widget-calendar', type: 'calendar-insight', x: 2, y: 2, w: 1, h: 2 },
];
```

## Verify It Works
1. Dashboard should load without "Unknown widget" error
2. You should see 5 widgets in the new layout
3. Workspace Pulse should show skill insights
4. Suggested Action should show skill suggestions

## Still Seeing Issues?
If widgets show "No data" or 0% progress, you need to:
1. Fix workspace_id in database (run `FIX_SKILLS_WORKSPACE_ID.sql`)
2. Restart backend server
3. Link pages to skills or complete tasks to generate data
