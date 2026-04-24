# Pages Enhancement - Quick Start Guide

## 🚀 What's New?

We've significantly enhanced the Pages system with powerful new features:

### ✨ Key Features
1. **Auto-Save** - Never lose your work again
2. **Advanced Search** - Find pages instantly with full-text search
3. **Bulk Operations** - Manage multiple pages at once
4. **Page Analytics** - Track views and engagement
5. **Performance** - Faster loading with pagination and indexes

---

## 📋 Setup Instructions

### Step 1: Apply Database Migrations

Run these SQL scripts in your Supabase SQL Editor:

```bash
# 1. Enhance pages table
backend/migrations/enhance_pages_table.sql

# 2. Add analytics functions
backend/migrations/add_page_analytics_functions.sql
```

**Or via command line:**
```bash
psql -U postgres -d your_database -f backend/migrations/enhance_pages_table.sql
psql -U postgres -d your_database -f backend/migrations/add_page_analytics_functions.sql
```

### Step 2: Restart Backend

```bash
cd backend
pip install -r requirements.txt  # If any new dependencies
python -m uvicorn main:app --reload
```

### Step 3: Restart Frontend

```bash
npm install  # If any new dependencies
npm run dev
```

---

## 🎯 Testing the New Features

### 1. Auto-Save (PageEditor)

**Test Steps:**
1. Navigate to any page editor
2. Make changes to title or content
3. Wait 30 seconds
4. Look for "Saving..." indicator
5. See "Saved [time]" confirmation

**Expected Behavior:**
- Auto-saves every 30 seconds
- Shows saving indicator
- Displays last saved time
- No data loss on refresh

---

### 2. Advanced Search (PagesPage)

**Test Steps:**
1. Go to Pages list
2. Press `Cmd/Ctrl + K` or click search bar
3. Type a search query
4. See results with highlighted matches
5. Click a result to navigate

**Expected Behavior:**
- Debounced search (300ms)
- Highlighted matches in title/content
- Shows snippets
- Recent searches saved
- Keyboard shortcuts work

**Test Cases:**
- Search for page title
- Search for content keywords
- Search for tags
- Try empty search (shows recent)
- Test keyboard shortcuts

---

### 3. Bulk Operations (PagesPage)

**Test Steps:**
1. Go to Pages list
2. Click "Select" button
3. Click checkboxes on pages
4. Try "Select All"
5. Use bulk actions (Delete, Duplicate)

**Expected Behavior:**
- Selection mode activates
- Checkboxes appear
- Selected pages highlighted
- Bulk actions work
- Confirmation dialogs shown

**Test Cases:**
- Select single page
- Select multiple pages
- Select all pages
- Bulk delete
- Bulk duplicate
- Cancel selection

---

### 4. Page Analytics

**Test Steps:**
1. Open any page in viewer
2. Check browser console for view tracking
3. Use API endpoint to get analytics:
   ```bash
   GET /api/v1/pages/{page_id}/analytics
   ```

**Expected Behavior:**
- View count increments
- Last viewed timestamp updates
- Analytics data available via API

---

### 5. Pagination & Filtering

**Test API Endpoints:**

```bash
# Get paginated pages
GET /api/v1/pages?page=1&page_size=20

# Search pages
POST /api/v1/pages/search
Body: { "query": "SQL" }

# Get page analytics
GET /api/v1/pages/{page_id}/analytics

# Duplicate page
POST /api/v1/pages/{page_id}/duplicate

# Bulk delete
POST /api/v1/pages/bulk-delete
Body: { "page_ids": ["id1", "id2"], "permanent": false }
```

---

## 🐛 Troubleshooting

### Auto-Save Not Working

**Check:**
1. Browser console for errors
2. Network tab for failed API calls
3. Backend logs for errors

**Fix:**
```bash
# Restart backend
cd backend
python -m uvicorn main:app --reload
```

---

### Search Not Finding Pages

**Check:**
1. Database migration applied
2. Search vector column exists
3. Trigger is active

**Fix:**
```sql
-- Rebuild search vectors
UPDATE public.pages SET content = content WHERE content IS NOT NULL;

-- Verify trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'pages_search_vector_update';
```

---

### Bulk Operations Failing

**Check:**
1. API endpoints accessible
2. User permissions correct
3. Page IDs valid

**Fix:**
```bash
# Check backend logs
tail -f backend/logs/app.log

# Test API directly
curl -X POST http://localhost:8000/api/v1/pages/bulk-delete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"page_ids": ["id1"], "permanent": false}'
```

---

### Database Migration Errors

**Common Issues:**

1. **Column already exists:**
   ```
   ERROR: column "search_vector" already exists
   ```
   **Fix:** Migration already applied, skip it

2. **Permission denied:**
   ```
   ERROR: permission denied for table pages
   ```
   **Fix:** Run as superuser or grant permissions

3. **Function already exists:**
   ```
   ERROR: function already exists
   ```
   **Fix:** Use `CREATE OR REPLACE FUNCTION`

---

## 📊 Performance Monitoring

### Check Index Usage

```sql
-- Check if indexes are being used
EXPLAIN ANALYZE 
SELECT * FROM pages 
WHERE workspace_id = 'your-workspace-id' 
ORDER BY updated_at DESC 
LIMIT 20;

-- Should show "Index Scan" not "Seq Scan"
```

### Monitor Query Performance

```sql
-- Enable query logging
ALTER DATABASE your_database SET log_min_duration_statement = 100;

-- Check slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
WHERE query LIKE '%pages%' 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

---

## 🎨 UI/UX Features

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Focus search |
| `Escape` | Close search/dialogs |
| `Cmd/Ctrl + S` | Manual save (in editor) |

### Visual Indicators

- 🟢 **Green checkmark** - Auto-saved successfully
- 🔵 **Blue spinner** - Saving in progress
- 🟡 **Yellow text** - Unsaved changes
- 🔴 **Red border** - Validation error

---

## 📈 Analytics Data

### Available Metrics

1. **View Count** - Total page views
2. **Last Viewed** - Timestamp of last view
3. **Word Count** - Auto-calculated
4. **Reading Time** - Estimated minutes
5. **Learning Objects** - Linked quizzes/flashcards

### Access Analytics

**Via API:**
```javascript
const analytics = await api.getPageAnalytics(pageId);
console.log(analytics);
// {
//   page_id: "...",
//   view_count: 42,
//   word_count: 1500,
//   estimated_reading_time: 8,
//   learning_objects: { quizzes: 2, flashcards: 1 }
// }
```

---

## 🔄 Migration Checklist

- [ ] Backup database
- [ ] Run `enhance_pages_table.sql`
- [ ] Run `add_page_analytics_functions.sql`
- [ ] Verify columns exist
- [ ] Test triggers
- [ ] Restart backend
- [ ] Restart frontend
- [ ] Test auto-save
- [ ] Test search
- [ ] Test bulk operations
- [ ] Monitor performance

---

## 🚦 Feature Flags (Optional)

If you want to gradually roll out features:

```typescript
// src/lib/featureFlags.ts
export const FEATURE_FLAGS = {
  AUTO_SAVE: true,
  ADVANCED_SEARCH: true,
  BULK_OPERATIONS: true,
  PAGE_ANALYTICS: true,
};

// Usage in components
if (FEATURE_FLAGS.AUTO_SAVE) {
  // Enable auto-save
}
```

---

## 📝 Next Steps

After testing these features, you can:

1. **Add Page Templates** - Pre-built page structures
2. **Export Functionality** - PDF, Markdown, Word
3. **Collaborative Editing** - Real-time collaboration
4. **Version History** - Track changes over time
5. **Comments System** - Inline annotations

See `PAGES_ENHANCEMENT_IMPLEMENTATION.md` for the full roadmap.

---

## 💡 Tips & Best Practices

### For Users

1. **Use Search** - Faster than scrolling
2. **Pin Important Pages** - Quick access
3. **Use Tags** - Better organization
4. **Bulk Operations** - Save time on repetitive tasks
5. **Trust Auto-Save** - It's got your back

### For Developers

1. **Monitor Performance** - Check slow queries
2. **Index Usage** - Verify indexes are used
3. **Error Handling** - Log all errors
4. **User Feedback** - Show loading states
5. **Progressive Enhancement** - Features degrade gracefully

---

## 🆘 Support

If you encounter issues:

1. Check browser console
2. Check backend logs
3. Verify database migrations
4. Test API endpoints directly
5. Review this guide

**Still stuck?** Check the detailed implementation guide in `PAGES_ENHANCEMENT_IMPLEMENTATION.md`

---

## ✅ Success Criteria

You'll know everything is working when:

- ✅ Auto-save indicator appears and works
- ✅ Search returns results with highlighting
- ✅ Bulk operations complete successfully
- ✅ Page views are tracked
- ✅ No console errors
- ✅ Performance is smooth

---

**Happy coding! 🎉**
