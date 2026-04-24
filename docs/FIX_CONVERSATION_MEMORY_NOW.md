# Fix Conversation Memory Error - APPLY NOW

## Problem
```
Failed to get conversation history: {'message': 'column conversation_memory.role does not exist', 'code': '42703'}
Failed to save conversation: {'message': 'column conversation_memory.role does not exist', 'code': '42703'}
```

## Root Cause
The `conversation_memory` table is missing the `role` column that the backend code expects.

## Solution

### Step 1: Apply the SQL Fix

Run this SQL file in your Supabase SQL Editor:
```bash
fix-conversation-memory-role-column.sql
```

**OR** run this SQL directly:

```sql
-- Add role column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'conversation_memory' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE conversation_memory 
        ADD COLUMN role TEXT NOT NULL DEFAULT 'user' 
        CHECK (role IN ('user', 'assistant'));
        
        RAISE NOTICE 'Added role column to conversation_memory';
    END IF;
END $$;
```

### Step 2: Restart Backend

```bash
# Stop backend (Ctrl+C in terminal)
# Then restart:
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

### Step 3: Test Ask Anything

1. Open your app
2. Go to any page
3. Click "Ask Anything"
4. Type a question
5. Should work without errors now!

## What This Fixes

✅ Conversation history loading  
✅ Conversation saving  
✅ Ask Anything memory system  
✅ Chat context persistence  

## Verification

After applying the fix, you should see:
- No more "column does not exist" errors
- Conversation history working
- Ask Anything responding normally

## If Still Not Working

Check if the table exists:
```sql
SELECT * FROM information_schema.tables 
WHERE table_name = 'conversation_memory';
```

If table doesn't exist, run the full migration:
```bash
backend/migrations/add_ask_anything_memory.sql
```
