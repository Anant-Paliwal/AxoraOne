# Pages System - Quick Reference Card

## 🚀 Quick Start

### Apply Migrations
```bash
# 1. Database migrations
psql -U postgres -d your_db -f backend/migrations/enhance_pages_table.sql
psql -U postgres -d your_db -f backend/migrations/add_page_analytics_functions.sql

# 2. Restart backend
cd backend && python -m uvicorn main:app --reload

# 3. Restart frontend
npm run dev
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Focus search |
| `Escape` | Close search/dialogs |
| `Cmd/Ctrl + S` | Manual save (editor) |

---

## 🎯 Key Features

### PagesPage (List View)
- ✅ Advanced search with highlighting
- ✅ Bulk operations (select, delete, duplicate)
- ✅ Pin/unpin pages
- ✅ Filter & sort
- ✅ Recent searches

### PageViewer (Read View)
- ✅ Reading mode (distraction-free)
- ✅ Table of Contents (auto-generated)
- ✅ Reading progress bar
- ✅ Page analytics
- ✅ Export (PDF, Markdown)
- ✅ Print optimization
- ✅ Share link
- ✅ Sub-pages & related pages

### PageEditor (Edit View)
- ✅ Auto-save (every 30s)
- ✅ Visual save indicator
- ✅ Sub-pages management
- ✅ Browser-style tabs
- ✅ Rich text editing

---

## 📊 API Endpoints

### Pages
```
GET    /api/v1/pages                    # List with pagination
POST   /api/v1/pages                    # Create
GET    /api/v1/pages/{id}               # Get one
PATCH  /api/v1/pages/{id}               # Update
DELETE /api/v1/pages/{id}               # Delete
GET    /api/v1/pages/{id}/subpages      # Get sub-pages
GET    /api/v1/pages/{id}/analytics     # Get analytics
POST   /api/v1/pages/{id}/view          # Track view
POST   /api/v1/pages/{id}/duplicate     # Duplicate
POST   /api/v1/pages/search             # Full-text search
POST   /api/v1/pages/bulk-update        # Bulk update
POST   /api/v1/pages/bulk-delete        # Bulk delete
GET    /api/v1/pages/templates          # Get templates
POST   /api/v1/pages/{id}/make-template # Make template
```

---

## 🔧 Common Tasks

### Create a Page
```typescript
const page = await api.createPage({
  title: "My Page",
  content: "Content here",
  icon: "📄",
  tags: ["tag1", "tag2"],
  workspace_id: workspaceId
});
```

### Search Pages
```typescript
const results = await api.searchPages("query", workspaceId, 10);
```

### Bulk Delete
```typescript
await api.bulkDeletePages([id1, id2], false); // false = archive
```

### Track View
```typescript
await api.trackPageView(pageId);
```

### Get Analytics
```typescript
const analytics = await api.getPageAnalytics(pageId);
// Returns: { view_count, word_count, estimated_reading_time, ... }
```

---

## 🎨 UI Components

### SearchBar
```tsx
<SearchBar
  workspaceId={workspaceId}
  placeholder="Search pages..."
  onResultClick={(pageId) => navigate(`/pages/${pageId}`)}
/>
```

### Custom Hooks
```tsx
// Table of Contents
const { toc, activeId } = useTableOfContents(contentRef);

// Reading Progress
const progress = useReadingProgress(contentRef);

// Auto-save
const { trigger, isSaving, lastSaved } = useAutoSave(callback, 30000);
```

---

## 🐛 Troubleshooting

### Auto-save not working
```bash
# Check browser console
# Verify API endpoint
# Check network tab
```

### Search not finding pages
```sql
-- Rebuild search vectors
UPDATE public.pages SET content = content;

-- Verify trigger
SELECT * FROM pg_trigger WHERE tgname = 'pages_search_vector_update';
```

### Slow performance
```sql
-- Check index usage
EXPLAIN ANALYZE SELECT * FROM pages WHERE workspace_id = 'xxx';

-- Should show "Index Scan" not "Seq Scan"
```

---

## 📈 Analytics

### Available Metrics
- View count
- Word count
- Reading time (minutes)
- Last viewed timestamp
- Learning objects count

### Access Analytics
```typescript
const analytics = await api.getPageAnalytics(pageId);
console.log(analytics.view_count); // Total views
console.log(analytics.word_count); // Word count
console.log(analytics.estimated_reading_time); // Minutes
```

---

## 🎯 Best Practices

### For Users
1. Use search instead of scrolling
2. Pin important pages
3. Use tags for organization
4. Trust auto-save
5. Use reading mode for focus

### For Developers
1. Monitor performance
2. Check index usage
3. Log errors properly
4. Show loading states
5. Handle errors gracefully

---

## 📚 Documentation

- **Full Guide**: `PAGES_ENHANCEMENT_IMPLEMENTATION.md`
- **Quick Start**: `PAGES_ENHANCEMENT_QUICK_START.md`
- **Architecture**: `PAGES_ARCHITECTURE_DIAGRAM.md`
- **Summary**: `PAGES_SYSTEM_FINAL_SUMMARY.md`

---

## ✅ Feature Checklist

- [x] Auto-save
- [x] Advanced search
- [x] Bulk operations
- [x] Page analytics
- [x] Reading mode
- [x] Table of Contents
- [x] Progress bar
- [x] Export options
- [x] Print optimization
- [x] Share functionality
- [x] Sub-pages
- [x] Related pages

---

## 🚀 Status

**Version**: 2.1.0
**Status**: Production Ready
**Phases**: 7/12 Complete (58%)
**Last Updated**: December 23, 2024

---

**Need help?** Check the full documentation or create an issue.
