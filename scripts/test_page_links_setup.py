"""Test script to check if page_links tables exist"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.supabase import supabase_admin

def check_tables():
    """Check if page_links tables exist"""
    try:
        # Try to query page_links table
        result = supabase_admin.table("page_links").select("id").limit(1).execute()
        print("✅ page_links table exists")
        print(f"   Found {len(result.data)} records")
        return True
    except Exception as e:
        error_msg = str(e)
        if "relation" in error_msg.lower() and "does not exist" in error_msg.lower():
            print("❌ page_links table does NOT exist")
            print(f"   Error: {error_msg}")
            print("\n📋 ACTION REQUIRED:")
            print("   Run the migration: run-page-links-migration.sql")
            print("   In Supabase SQL Editor")
            return False
        else:
            print(f"❌ Error checking table: {error_msg}")
            return False

def check_other_tables():
    """Check other related tables"""
    tables = ["page_mentions", "concepts", "ai_suggested_relations"]
    for table in tables:
        try:
            result = supabase_admin.table(table).select("id").limit(1).execute()
            print(f"✅ {table} table exists ({len(result.data)} records)")
        except Exception as e:
            if "does not exist" in str(e).lower():
                print(f"❌ {table} table does NOT exist")

if __name__ == "__main__":
    print("🔍 Checking Page Links Setup...\n")
    
    # Check connection
    try:
        result = supabase_admin.table("pages").select("id").limit(1).execute()
        print(f"✅ Database connection OK (found {len(result.data)} pages)\n")
    except Exception as e:
        print(f"❌ Database connection failed: {e}\n")
        sys.exit(1)
    
    # Check tables
    print("Checking tables:")
    main_exists = check_tables()
    print()
    check_other_tables()
    
    if not main_exists:
        print("\n" + "="*60)
        print("⚠️  MIGRATION REQUIRED")
        print("="*60)
        print("\n1. Open Supabase SQL Editor")
        print("2. Run: run-page-links-migration.sql")
        print("3. Restart backend server")
        sys.exit(1)
    else:
        print("\n✅ All tables exist! Page linking system is ready.")
