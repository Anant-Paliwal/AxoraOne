# Pages API - Deleted Filter Fix

## Problem

When users deleted a page, it was moved to trash (soft delete with `deleted_at` timestamp), but the page still appeared in the Pages screen because the API queries didn't filter out deleted pages.

## Root Cause

The pages API endpoints were querying all pages without checking the `deleted_at` column:

```python
# ❌ BEFORE - Shows deleted pages
response = supabase_admin.table("pages").select("*").eq("workspace_id", workspace_id).execute()
```

## Solution

Added `.is_("deleted_at", "null")` filter to all GET endpoints in `backend/app/api/endpoints/pages.py`:

```python
# ✅ AFTER - Excludes deleted pages
response = supabase_admin.table("pages")\
    .select("*")\
    .eq("workspace_id", workspace_id)\
    .is_("deleted_at", "null")\
    .execute()
```

## Fixed Endpoints

### 1. **GET /pages** (Main pages list)
```python
query = supabase_admin.table("pages").select("*", count="exact")
query = query.eq("user_id", user_id)
query = query.is_("deleted_at", "null")  # ✅ ADDED
```

### 2. **GET /pages/by-workspace/{workspace_id}**
```python
response = supabase_admin.table("pages")\
    .select("*")\
    .eq("workspace_id", workspace_id)\
    .eq("is_archived", False)\
    .is_("deleted_at", "null")\  # ✅ ADDED
    .order("page_order")\
    .execute()
```

### 3. **GET /pages/{page_id}** (Single page)
```python
response = supabase_admin.table("pages")\
    .select("*")\
    .eq("id", page_id)\
    .is_("deleted_at", "null")\  # ✅ ADDED
    .execute()
```

### 4. **PATCH /pages/{page_id}** (Update page)
```python
page_check = supabase_admin.table("pages")\
    .select("id, user_id, workspace_id, blocks")\
    .eq("id", page_id)\
    .is_("deleted_at", "null")\  # ✅ ADDED
    .execute()
```

### 5. **GET /pages/{page_id}/subpages**
```python
response = supabase_admin.table("pages")\
    .select("*")\
    .eq("parent_page_id", page_id)\
    .eq("user_id", user_id)\
    .is_("deleted_at", "null")\  # ✅ ADDED
    .order("page_order")\
    .execute()
```

### 6. **POST /pages/search** (Search pages)
```python
search_query = supabase_admin.table("pages")\
    .select("id, title, content, icon, tags, workspace_id, updated_at, word_count, estimated_reading_time")
search_query = search_query.eq("user_id", user_id)\
    .eq("is_archived", False)\
    .is_("deleted_at", "null")  # ✅ ADDED
```

## How It Works Now

### Normal Page Queries
```sql
SELECT * FROM pages 
WHERE user_id = 'user-123' 
  AND deleted_at IS NULL  -- ✅ Excludes deleted pages
```

### Trash Queries
```sql
SELECT * FROM pages 
WHERE workspace_id = 'ws-456' 
  AND deleted_at IS NOT NULL  -- ✅ Only deleted pages
```

## User Flow

### Before Fix
```
1. User deletes page
   ↓
2. Page gets deleted_at timestamp
   ↓
3. Page STILL shows in Pages list ❌
   ↓
4. User confused - page appears twice
```

### After Fix
```
1. User deletes page
   ↓
2. Page gets deleted_at timestamp
   ↓
3. Page DISAPPEARS from Pages list ✅
   ↓
4. Page APPEARS in Trash ✅
   ↓
5. User can restore or permanently delete
```

## Testing

### Test 1: Delete Page
```bash
1. Go to Pages screen
2. Delete a page via agent: "delete this page"
3. ✅ Page should disappear from Pages list
4. ✅ Page should appear in Trash
```

### Test 2: Restore Page
```bash
1. Go to Trash
2. Click "Restore" on a page
3. ✅ Page should disappear from Trash
4. ✅ Page should reappear in Pages list
```

### Test 3: Search
```bash
1. Delete a page
2. Search for that page
3. ✅ Should NOT appear in search results
4. ✅ Only appears in Trash
```

### Test 4: Subpages
```bash
1. Delete a parent page
2. Check subpages list
3. ✅ Deleted subpages should NOT appear
4. ✅ Only active subpages shown
```

## Database Query Examples

### Get Active Pages
```python
# Returns only non-deleted pages
pages = supabase_admin.table("pages")\
    .select("*")\
    .eq("workspace_id", workspace_id)\
    .is_("deleted_at", "null")\
    .execute()
```

### Get Trash Items
```python
# Returns only deleted pages
trash = supabase_admin.table("pages")\
    .select("*")\
    .eq("workspace_id", workspace_id)\
    .not_.is_("deleted_at", "null")\
    .execute()
```

## Benefits

✅ **Clean Separation** - Active pages vs trash items
✅ **No Confusion** - Deleted pages don't appear in normal views
✅ **Consistent UX** - Matches user expectations
✅ **Workspace Isolation** - Trash is workspace-scoped
✅ **RLS Compatible** - Works with Row Level Security

## Additional Notes

### Why `.is_("deleted_at", "null")`?

In Supabase/PostgREST, to check for NULL values:
- ✅ Use: `.is_("deleted_at", "null")`
- ❌ Don't use: `.eq("deleted_at", None)`

### Performance

The `deleted_at` column has an index:
```sql
CREATE INDEX idx_pages_deleted_at 
ON pages(deleted_at) 
WHERE deleted_at IS NOT NULL;
```

This makes trash queries fast while keeping normal queries efficient.

## Summary

The fix ensures that:
1. **Normal queries** exclude deleted pages (`.is_("deleted_at", "null")`)
2. **Trash queries** only show deleted pages (`.not_.is_("deleted_at", "null")`)
3. **User experience** is clean and intuitive
4. **Soft delete** system works as expected

Deleted pages now properly disappear from the Pages screen and only appear in the Trash!
