-- =====================================================
-- FIX: Add missing columns to conversation_memory
-- =====================================================
-- This fixes the errors:
-- - column conversation_memory.role does not exist
-- - Could not find the 'intent' column
-- - null value in column "summary" violates not-null constraint

-- Check if the columns exist, if not add them
DO $$ 
BEGIN
    -- Add role column if it doesn't exist
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
    ELSE
        RAISE NOTICE 'role column already exists in conversation_memory';
    END IF;
    
    -- Ensure content column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'conversation_memory' 
        AND column_name = 'content'
    ) THEN
        ALTER TABLE conversation_memory 
        ADD COLUMN content TEXT NOT NULL DEFAULT '';
        
        RAISE NOTICE 'Added content column to conversation_memory';
    ELSE
        RAISE NOTICE 'content column already exists in conversation_memory';
    END IF;
    
    -- Ensure message_index column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'conversation_memory' 
        AND column_name = 'message_index'
    ) THEN
        ALTER TABLE conversation_memory 
        ADD COLUMN message_index INTEGER NOT NULL DEFAULT 0;
        
        RAISE NOTICE 'Added message_index column to conversation_memory';
    ELSE
        RAISE NOTICE 'message_index column already exists in conversation_memory';
    END IF;
    
    -- Add intent column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'conversation_memory' 
        AND column_name = 'intent'
    ) THEN
        ALTER TABLE conversation_memory 
        ADD COLUMN intent TEXT;
        
        RAISE NOTICE 'Added intent column to conversation_memory';
    ELSE
        RAISE NOTICE 'intent column already exists in conversation_memory';
    END IF;
    
    -- Add page_context column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'conversation_memory' 
        AND column_name = 'page_context'
    ) THEN
        ALTER TABLE conversation_memory 
        ADD COLUMN page_context UUID REFERENCES pages(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Added page_context column to conversation_memory';
    ELSE
        RAISE NOTICE 'page_context column already exists in conversation_memory';
    END IF;
    
    -- Add skill_context column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'conversation_memory' 
        AND column_name = 'skill_context'
    ) THEN
        ALTER TABLE conversation_memory 
        ADD COLUMN skill_context UUID REFERENCES skills(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Added skill_context column to conversation_memory';
    ELSE
        RAISE NOTICE 'skill_context column already exists in conversation_memory';
    END IF;
    
    -- Add token_count column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'conversation_memory' 
        AND column_name = 'token_count'
    ) THEN
        ALTER TABLE conversation_memory 
        ADD COLUMN token_count INTEGER;
        
        RAISE NOTICE 'Added token_count column to conversation_memory';
    ELSE
        RAISE NOTICE 'token_count column already exists in conversation_memory';
    END IF;
    
    -- Make summary column nullable if it exists and is NOT NULL
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'conversation_memory' 
        AND column_name = 'summary'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE conversation_memory 
        ALTER COLUMN summary DROP NOT NULL;
        
        RAISE NOTICE 'Made summary column nullable in conversation_memory';
    ELSE
        RAISE NOTICE 'summary column is already nullable or does not exist';
    END IF;
    
END $$;

-- Verify the fix
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'conversation_memory'
ORDER BY ordinal_position;

-- Show success message
DO $$ 
BEGIN
    RAISE NOTICE '✅ conversation_memory table structure fixed!';
    RAISE NOTICE 'You can now use Ask Anything without errors.';
END $$;
