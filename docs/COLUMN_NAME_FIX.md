# Column Name Fixes - Database Schema Compatibility

## Issues Fixed

### 1. workspaces.owner_user_id → workspaces.user_id
**Error**: `ERROR: 42703: column "owner_user_id" does not exist`

The existing `workspaces` table uses `user_id` not `owner_user_id`.

### 2. pages.is_deleted column
**Error**: `ERROR: 42703: column "is_deleted" does not exist`

The existing `pages` table doesn't have `is_deleted` or `deleted_at` columns.

## Fix Applied

### Changed Table Creation Strategy

Instead of using `CREATE TABLE IF NOT EXISTS` which can fail on indexes, now using:

```sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'table_name') THEN
        CREATE TABLE table_name (...);
        CREATE INDEX ...;
    END IF;
END $$;
```

This approach:
- ✅ Checks if table exists before creating
- ✅ Only creates indexes if table was just created
- ✅ Avoids conflicts with existing schema
- ✅ Safe to run multiple times

### Files Updated

#### 1. Migration File
**File**: `backend/migrations/upgrade_to_3_plan_system.sql`

- ✅ Workspaces table: Uses `user_id` column
- ✅ Pages table: Removed `is_deleted` and `deleted_at` columns
- ✅ All tables: Use conditional creation with DO blocks
- ✅ `check_workspace_limit()`: Uses `user_id`
- ✅ `check_collaborator_limit()`: Uses `user_id`

#### 2. Plan Service
**File**: `backend/app/services/plan_service.py`

- ✅ `get_workspace_count()`: Uses `user_id`
- ✅ `get_collaborator_count()`: Uses `user_id`

#### 3. Plan Guards
**File**: `backend/app/api/guards/plan_guards.py`

- ✅ `check_collaborator_limit_guard()`: Uses `user_id`

#### 4. SQL Operations
**File**: `backend/migrations/3_plan_system_quick_operations.sql`

- ✅ All queries: Use `user_id` instead of `owner_user_id`

## Tables Modified

### workspaces
```sql
- user_id UUID (owner of workspace)
- name TEXT
- description TEXT
- is_default BOOLEAN
```

### pages
```sql
- id UUID
- workspace_id UUID
- parent_page_id UUID
- title TEXT
- content_json JSONB
- icon TEXT
- cover_image TEXT
- created_by UUID
```

Note: No `is_deleted` or `deleted_at` columns in base schema.

## Verification

After applying the fix, run:

```bash
psql $DATABASE_URL -f backend/migrations/upgrade_to_3_plan_system.sql
```

Expected output:
- ✅ No column errors
- ✅ Tables created or skipped if exist
- ✅ 3 plans seeded
- ✅ Helper functions created
- ✅ Migration completes successfully

## Testing

```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('subscription_plans', 'user_subscriptions', 'ask_anything_usage_daily');

-- Verify plans seeded
SELECT code, name FROM subscription_plans ORDER BY sort_order;

-- Test helper functions
SELECT * FROM get_user_plan('<user-id>');
SELECT check_workspace_limit('<user-id>');
```

All should work without errors.

## Safe Migration Strategy

The migration now:
1. ✅ Checks existing schema before creating tables
2. ✅ Only adds what's missing
3. ✅ Doesn't conflict with existing columns
4. ✅ Can be run multiple times safely
5. ✅ Works with your existing database structure
