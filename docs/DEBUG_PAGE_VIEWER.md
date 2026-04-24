# Debug Page Viewer - Not Showing New Features

## Issue
The enhanced PageViewer features are not showing in the preview.

## Checklist

### 1. Check Database Migrations ✅
The new features require database columns that may not exist yet.

**Run these migrations:**
```bash
# In Supabase SQL Editor or via psql
psql -U postgres -d your_database -f backend/migrations/enhance_pages_table.sql
```

**Verify columns exist:**
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'pages' 
AND column_name IN ('estimated_reading_time', 'word_count', 'view_count', 'parent_page_id');
```

### 2. Check Backend API ✅
New endpoints need to be available.

**Test analytics endpoint:**
```bash
curl http://localhost:8000/api/v1/pages/{page_id}/analytics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected response:**
```json
{
  "page_id": "...",
  "view_count": 0,
  "word_count": 150,
  "estimated_reading_time": 1,
  "learning_objects": {
    "quizzes": 0,
    "flashcards": 0
  }
}
```

### 3. Check Frontend Build ✅

**Clear cache and rebuild:**
```bash
# Stop dev server
# Clear node_modules/.vite cache
rm -rf node_modules/.vite

# Restart
npm run dev
```

### 4. Check Browser Console 🔍

Open browser DevTools (F12) and check for:
- **Errors** in Console tab
- **Failed requests** in Network tab
- **React errors** in the console

Common errors:
```
- "Cannot read property 'estimated_reading_time' of undefined"
  → Database migration not applied
  
- "404 Not Found: /api/v1/pages/{id}/analytics"
  → Backend not updated or not running
  
- "useTableOfContents is not defined"
  → Hook file not created or import failed
```

### 5. Check Page Data 🔍

**In browser console:**
```javascript
// Check if page has new fields
console.log(page);
// Should show: estimated_reading_time, word_count, view_count, etc.
```

### 6. Force Refresh 🔄

**Hard refresh the page:**
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

Or clear browser cache:
- Chrome: Settings → Privacy → Clear browsing data
- Firefox: Settings → Privacy → Clear Data

---

## Quick Fix Steps

### Step 1: Apply Database Migration
```bash
cd backend
psql -U postgres -d your_database -f migrations/enhance_pages_table.sql
```

### Step 2: Restart Backend
```bash
cd backend
python -m uvicorn main:app --reload
```

### Step 3: Clear Frontend Cache
```bash
# Stop dev server (Ctrl+C)
rm -rf node_modules/.vite
npm run dev
```

### Step 4: Hard Refresh Browser
Press `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac)

---

## Verify Features Are Working

### ✅ Reading Progress Bar
- Should see thin bar at top of page
- Should fill as you scroll down

### ✅ Reading Mode Toggle
- Click eye icon in header
- Sidebar should hide
- Content should center

### ✅ Table of Contents
- Should appear in right sidebar
- Should list all headings (H1-H6)
- Active heading should be highlighted

### ✅ Page Analytics
- Should show in right sidebar
- View count, word count, reading time
- Learning objects count

### ✅ Export Options
- Click "..." menu in header
- Should see Export as PDF, Markdown options

---

## Still Not Working?

### Check These Files Exist:
```
✅ src/hooks/useTableOfContents.ts
✅ src/hooks/useReadingProgress.ts
✅ src/pages/PageViewer.tsx (updated)
✅ backend/migrations/enhance_pages_table.sql
✅ backend/app/api/endpoints/pages.py (updated)
```

### Check API Methods Exist:
```typescript
// In src/lib/api.ts
api.getPageAnalytics(pageId)
api.getSubPages(pageId)
api.trackPageView(pageId)
```

### Check Backend Endpoints:
```python
# In backend/app/api/endpoints/pages.py
@router.get("/{page_id}/analytics")
@router.get("/{page_id}/subpages")
@router.post("/{page_id}/view")
```

---

## Common Issues & Solutions

### Issue 1: "Page is blank"
**Solution:** Check if page has content. The viewer only shows content if it exists.

### Issue 2: "Sidebar not showing"
**Solution:** 
- Check if `isReadingMode` is false
- Verify right sidebar code is present
- Check browser width (sidebar hidden on small screens)

### Issue 3: "TOC not generating"
**Solution:**
- Page content must have headings (H1-H6)
- Headings must be in the content
- Check `useTableOfContents` hook is working

### Issue 4: "Analytics showing 0 or undefined"
**Solution:**
- Database migration not applied
- Backend endpoint not working
- Check API response in Network tab

### Issue 5: "Progress bar not moving"
**Solution:**
- Page must be scrollable (content longer than viewport)
- Check `useReadingProgress` hook
- Verify scroll event listener is attached

---

## Test with Sample Data

Create a test page with:
```markdown
# Main Heading

Some content here...

## Sub Heading 1

More content...

## Sub Heading 2

Even more content to make it scrollable...

### Sub Sub Heading

Keep adding content until the page is scrollable.
```

This will help test:
- ✅ TOC generation (from headings)
- ✅ Progress bar (from scroll)
- ✅ Word count (from content)
- ✅ Reading time (from word count)

---

## Success Criteria

When everything is working, you should see:

1. **Top of page**: Thin progress bar that fills on scroll
2. **Header**: Eye icon (reading mode), List icon (TOC toggle)
3. **Content area**: Page with proper formatting
4. **Right sidebar**: 
   - Table of Contents (if headings exist)
   - Analytics section
   - Related Pages
   - Learning Tools
5. **Dropdown menu**: Export and print options

---

## Need More Help?

1. Check browser console for errors
2. Check Network tab for failed API calls
3. Verify database has new columns
4. Ensure backend is running
5. Try with a fresh page/workspace

---

**Last Updated:** December 23, 2024
