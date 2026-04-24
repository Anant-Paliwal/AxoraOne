# Fix Page Links 500 Error

## Problem
Getting 500 error when trying to create page links:
```
POST /api/v1/pages/{page_id}/links HTTP/1.1" 500 Internal Server Error
```

## Root Cause
The `page_links` table doesn't exist in the database yet.

## Solution

### Step 1: Run Migration in Supabase

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the contents of `run-page-links-migration.sql`
3. Click **Run**
4. You should see: `Page linking tables created successfully!`

### Step 2: Verify Tables Created

Run this query in Supabase SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('page_links', 'page_mentions', 'concepts', 'ai_suggested_relations');
```

You should see all 4 tables listed.

### Step 3: Restart Backend Server

If your backend is running, restart it:
```bash
# Stop the backend (Ctrl+C)
# Then restart:
cd backend
python -m uvicorn main:app --reload --port 8000
```

### Step 4: Test the Fix

Try creating a page link again from the UI. The error should be gone.

## What Was Created

The migration creates 4 tables:

1. **page_links** - Explicit links between pages with relation types
2. **page_mentions** - Inline @mentions in content  
3. **concepts** - #Concept tags that don't have pages yet
4. **ai_suggested_relations** - AI-suggested related pages

All tables have:
- RLS policies (users can only see their own data)
- Proper indexes for performance
- Foreign key constraints
- Service role bypass (for backend API)

## Features Now Available

After running the migration, these features work:

✅ **Backlinks** - See which pages link to current page
✅ **Page Links** - Create explicit links with relation types
✅ **AI Suggestions** - Get AI-suggested related pages
✅ **Hover Preview** - Preview pages on hover
✅ **Link Management** - Add, edit, delete page links

## Troubleshooting

If you still get errors after migration:

1. **Check backend .env has correct keys:**
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```

2. **Verify service key has permissions:**
   - Service role key should bypass RLS
   - Check in Supabase Dashboard → Settings → API

3. **Check backend logs for specific error:**
   - Look for the actual error message
   - Common issues: foreign key violations, RLS policy blocks

4. **Test with SQL directly:**
   ```sql
   -- Try inserting a test link
   INSERT INTO page_links (source_page_id, target_page_id, user_id, relation_type)
   VALUES (
     'your-page-id',
     'another-page-id', 
     'your-user-id',
     'references'
   );
   ```

## Quick Test Query

After migration, test that everything works:
```sql
-- Should return 0 rows but no error
SELECT * FROM page_links LIMIT 1;
SELECT * FROM page_mentions LIMIT 1;
SELECT * FROM concepts LIMIT 1;
SELECT * FROM ai_suggested_relations LIMIT 1;
```

All queries should succeed (even if they return no data).
