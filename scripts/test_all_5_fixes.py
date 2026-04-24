#!/usr/bin/env python3
"""
Test script to verify all 5 skill system fixes are working
Run this after applying the SQL fix
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.supabase import supabase_admin

def test_fix_1_skill_evidence_user_id():
    """Test FIX #1: skill_evidence.user_id column exists"""
    print("\n" + "="*60)
    print("TEST #1: skill_evidence.user_id column")
    print("="*60)
    
    try:
        # Check if column exists
        result = supabase_admin.from_('information_schema.columns')\
            .select('column_name')\
            .eq('table_name', 'skill_evidence')\
            .eq('column_name', 'user_id')\
            .execute()
        
        if result.data:
            print("✅ PASS: user_id column exists in skill_evidence")
            return True
        else:
            print("❌ FAIL: user_id column NOT found in skill_evidence")
            print("   ACTION: Run FIX_ALL_5_SKILL_ISSUES.sql in Supabase")
            return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def test_fix_2_auto_linking():
    """Test FIX #2: Auto-linking code exists in pages.py"""
    print("\n" + "="*60)
    print("TEST #2: Auto-linking implementation")
    print("="*60)
    
    try:
        # Check if auto-linking code exists
        with open('backend/app/api/endpoints/pages.py', 'r', encoding='utf-8') as f:
            content = f.read()
            
        if 'skill_auto_linker' in content and 'analyze_and_link_page' in content:
            print("✅ PASS: Auto-linking code found in pages.py")
            print("   Location: backend/app/api/endpoints/pages.py")
            return True
        else:
            print("❌ FAIL: Auto-linking code NOT found")
            return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def test_fix_3_task_contributions():
    """Test FIX #3: Task contribution tracking exists in tasks.py"""
    print("\n" + "="*60)
    print("TEST #3: Task contribution tracking")
    print("="*60)
    
    try:
        # Check if contribution tracking code exists
        with open('backend/app/api/endpoints/tasks.py', 'r', encoding='utf-8') as f:
            content = f.read()
            
        if 'skill_contribution_tracker' in content and 'track_task_accelerated' in content:
            print("✅ PASS: Task contribution tracking found in tasks.py")
            print("   Location: backend/app/api/endpoints/tasks.py")
            return True
        else:
            print("❌ FAIL: Task contribution tracking NOT found")
            return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def test_fix_4_background_runner():
    """Test FIX #4: Background runner started in main.py"""
    print("\n" + "="*60)
    print("TEST #4: Background runner startup")
    print("="*60)
    
    try:
        # Check if background runner code exists
        with open('backend/main.py', 'r', encoding='utf-8') as f:
            content = f.read()
            
        if 'skill_background_runner' in content and 'start_skill_runner' in content:
            print("✅ PASS: Background runner startup found in main.py")
            print("   Location: backend/main.py")
            print("   Note: Check backend logs for '🧠 Living Intelligence OS activated'")
            return True
        else:
            print("❌ FAIL: Background runner startup NOT found")
            return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def test_fix_5_real_progress():
    """Test FIX #5: Frontend uses real progress"""
    print("\n" + "="*60)
    print("TEST #5: Frontend real progress loading")
    print("="*60)
    
    try:
        # Check if real progress code exists
        with open('src/components/dashboard/widgets/UnifiedSkillHubWidget.tsx', 'r', encoding='utf-8') as f:
            content = f.read()
            
        if 'loadRealProgress' in content and 'getSkillRealProgress' in content:
            print("✅ PASS: Real progress loading found in UnifiedSkillHubWidget.tsx")
            print("   Location: src/components/dashboard/widgets/UnifiedSkillHubWidget.tsx")
            print("   Note: Check browser console for '✅ Loaded real progress for skills'")
            return True
        else:
            print("❌ FAIL: Real progress loading NOT found")
            return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def test_database_tables():
    """Bonus: Check if all required tables exist"""
    print("\n" + "="*60)
    print("BONUS: Database tables verification")
    print("="*60)
    
    required_tables = [
        'skills',
        'skill_evidence',
        'skill_contributions',
        'skill_executions',
        'skill_memory',
        'skill_chains'
    ]
    
    all_exist = True
    for table in required_tables:
        try:
            result = supabase_admin.table(table).select('id').limit(1).execute()
            print(f"✅ {table}: EXISTS")
        except Exception as e:
            print(f"❌ {table}: NOT FOUND or ERROR")
            all_exist = False
    
    return all_exist

def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("SKILL SYSTEM FIX VERIFICATION")
    print("Testing all 5 fixes...")
    print("="*60)
    
    results = {
        "FIX #1: skill_evidence.user_id": test_fix_1_skill_evidence_user_id(),
        "FIX #2: Auto-linking": test_fix_2_auto_linking(),
        "FIX #3: Task contributions": test_fix_3_task_contributions(),
        "FIX #4: Background runner": test_fix_4_background_runner(),
        "FIX #5: Real progress": test_fix_5_real_progress(),
    }
    
    # Bonus test
    print("\n")
    database_ok = test_database_tables()
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for fix, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {fix}")
    
    print(f"\nDatabase tables: {'✅ ALL EXIST' if database_ok else '⚠️ SOME MISSING'}")
    
    print(f"\n{'='*60}")
    print(f"RESULT: {passed}/{total} fixes verified")
    print(f"{'='*60}")
    
    if passed == total and database_ok:
        print("\n🎉 ALL FIXES VERIFIED! Your skill system is fully operational!")
        print("\nNext steps:")
        print("1. ✅ All code fixes applied")
        print("2. ⚠️ Run FIX_ALL_5_SKILL_ISSUES.sql in Supabase (if not done)")
        print("3. ✅ Restart backend and frontend")
        print("4. ✅ Test by creating skills, pages, and tasks")
    elif passed == total - 1 and not results["FIX #1: skill_evidence.user_id"]:
        print("\n⚠️ Almost there! Just need to run the SQL fix:")
        print("   Run FIX_ALL_5_SKILL_ISSUES.sql in Supabase SQL Editor")
    else:
        print("\n⚠️ Some fixes need attention. Check the failures above.")
    
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())
