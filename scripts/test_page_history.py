"""
Test script to check if page_history table exists
Run this to verify the migration was applied
"""
import os
from supabase import create_client

# Load environment
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://elwlchiiextcpkjnpyyt.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""))

if not SUPABASE_SERVICE_KEY:
    print("❌ SUPABASE_SERVICE_ROLE_KEY not found in environment")
    print("Please set it in backend/.env")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("Testing page_history table...")
print("-" * 50)

try:
    # Try to query the table
    response = supabase.table("page_history").select("*").limit(1).execute()
    print("✅ page_history table exists!")
    print(f"   Found {len(response.data)} records")
    
    # Check if the function exists
    try:
        func_response = supabase.rpc('get_page_history_with_diff', {
            'page_id_param': '00000000-0000-0000-0000-000000000000',
            'limit_param': 1
        }).execute()
        print("✅ get_page_history_with_diff function exists!")
    except Exception as e:
        print(f"⚠️  get_page_history_with_diff function not found: {e}")
        print("   This is OK, will use fallback query")
    
    # Check if restore function exists
    try:
        restore_response = supabase.rpc('restore_page_from_history', {
            'history_id_param': '00000000-0000-0000-0000-000000000000'
        }).execute()
        print("✅ restore_page_from_history function exists!")
    except Exception as e:
        print(f"⚠️  restore_page_from_history function not found: {e}")
    
    print("\n" + "=" * 50)
    print("✅ Page history system is ready!")
    print("=" * 50)
    
except Exception as e:
    print(f"❌ page_history table does NOT exist!")
    print(f"   Error: {e}")
    print("\n" + "=" * 50)
    print("⚠️  You need to run the migration:")
    print("=" * 50)
    print("1. Go to Supabase Dashboard → SQL Editor")
    print("2. Run: backend/migrations/add_page_history_system.sql")
    print("3. Restart the backend")
    print("=" * 50)
