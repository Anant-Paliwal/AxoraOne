-- Check if Page Viewer enhancements are set up correctly

-- 1. Check if new columns exist in pages table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'pages' 
AND column_name IN (
    'estimated_reading_time',
    'word_count',
    'view_count',
    'last_viewed_at',
    'parent_page_id',
    'search_vector',
    'is_archived',
    'cover_image'
)
ORDER BY column_name;

-- 2. Check if indexes exist
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'pages'
AND indexname LIKE 'idx_pages%';

-- 3. Check if triggers exist
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'pages';

-- 4. Check if analytics function exists
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name = 'increment_page_view';

-- 5. Sample query to test if data is correct
SELECT 
    id,
    title,
    word_count,
    estimated_reading_time,
    view_count,
    parent_page_id,
    created_at
FROM pages 
LIMIT 5;

-- If any of the above queries return empty or error, run the migrations:
-- \i backend/migrations/enhance_pages_table.sql
-- \i backend/migrations/add_page_analytics_functions.sql
