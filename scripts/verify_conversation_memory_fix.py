"""
Verify Conversation Memory Fix
Checks if the conversation_memory table has the required columns
"""
import os
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv("backend/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in backend/.env")
    exit(1)

# Create Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("=" * 60)
print("Conversation Memory Table Verification")
print("=" * 60)
print()

# Check if table exists
print("1. Checking if conversation_memory table exists...")
try:
    result = supabase.table("conversation_memory").select("*").limit(1).execute()
    print("   ✅ Table exists")
except Exception as e:
    print(f"   ❌ Table does not exist or error: {e}")
    print()
    print("SOLUTION: Run the migration file:")
    print("   backend/migrations/add_ask_anything_memory.sql")
    exit(1)

print()

# Check required columns using a test query
print("2. Checking required columns...")
required_columns = {
    "id": "UUID",
    "session_id": "UUID",
    "workspace_id": "UUID",
    "user_id": "UUID",
    "message_index": "INTEGER",
    "role": "TEXT",
    "content": "TEXT",
    "created_at": "TIMESTAMPTZ"
}

missing_columns = []

for column, col_type in required_columns.items():
    try:
        # Try to select the column
        result = supabase.rpc(
            "exec_sql",
            {
                "sql": f"SELECT {column} FROM conversation_memory LIMIT 0"
            }
        ).execute()
        print(f"   ✅ {column} ({col_type})")
    except Exception as e:
        error_msg = str(e)
        if "does not exist" in error_msg or "column" in error_msg.lower():
            print(f"   ❌ {column} ({col_type}) - MISSING")
            missing_columns.append(column)
        else:
            print(f"   ⚠️  {column} ({col_type}) - Cannot verify: {e}")

print()

if missing_columns:
    print("=" * 60)
    print("❌ MISSING COLUMNS DETECTED")
    print("=" * 60)
    print()
    print(f"Missing columns: {', '.join(missing_columns)}")
    print()
    print("SOLUTION:")
    print("1. Run this SQL file in Supabase SQL Editor:")
    print("   fix-conversation-memory-role-column.sql")
    print()
    print("2. Or run this SQL directly:")
    print()
    print("   ALTER TABLE conversation_memory")
    for col in missing_columns:
        if col == "role":
            print(f"   ADD COLUMN {col} TEXT NOT NULL DEFAULT 'user' CHECK ({col} IN ('user', 'assistant'));")
        elif col == "content":
            print(f"   ADD COLUMN {col} TEXT NOT NULL DEFAULT '';")
        elif col == "message_index":
            print(f"   ADD COLUMN {col} INTEGER NOT NULL DEFAULT 0;")
        else:
            print(f"   ADD COLUMN {col} {required_columns[col]};")
    print()
else:
    print("=" * 60)
    print("✅ ALL COLUMNS PRESENT")
    print("=" * 60)
    print()
    print("The conversation_memory table is correctly configured!")
    print()
    print("If you're still seeing errors:")
    print("1. Restart your backend server")
    print("2. Clear browser cache")
    print("3. Test Ask Anything again")
    print()

print("=" * 60)
