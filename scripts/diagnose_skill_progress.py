"""
Comprehensive Skill Progress Diagnostic Script
Run this to understand why progress shows 0%
"""

import requests
import json
from datetime import datetime

# Configuration
SUPABASE_URL = "YOUR_SUPABASE_URL"
SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY"
API_BASE = "http://localhost:8000/api/v1"

def check_database_structure():
    """Check if all required tables and columns exist"""
    print("\n" + "="*60)
    print("CHECKING DATABASE STRUCTURE")
    print("="*60)
    
    # This would need to be run in Supabase SQL Editor
    print("\n⚠️  Run CHECK_SKILL_PROGRESS.sql in Supabase SQL Editor")
    print("   This will show:")
    print("   - ✅ or ❌ if user_id column exists in skill_evidence")
    print("   - ✅ or ❌ if contributions are being tracked")
    print("   - Exact progress calculation for each skill")
    print("\n   File: CHECK_SKILL_PROGRESS.sql")

def check_backend_running():
    """Check if backend is running"""
    print("\n" + "="*60)
    print("CHECKING BACKEND STATUS")
    print("="*60)
    
    try:
        response = requests.get(f"{API_BASE}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is running")
            return True
        else:
            print(f"⚠️  Backend returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Backend is NOT running")
        print("\n   To start backend:")
        print("   cd backend")
        print("   python -m uvicorn app.main:app --reload")
        return False
    except Exception as e:
        print(f"❌ Error checking backend: {e}")
        return False

def check_skill_system_logs():
    """Check what the backend logs show"""
    print("\n" + "="*60)
    print("CHECKING BACKEND LOGS")
    print("="*60)
    
    print("\nLook for these messages in your backend terminal:")
    print("\n✅ GOOD SIGNS:")
    print("   - '🧠 Living Intelligence OS activated'")
    print("   - '📊 Skill Metrics Updater activated'")
    print("   - '✅ Contribution tracked: page_linked to skill XXX'")
    print("   - '✅ Auto-linked page to X skills'")
    
    print("\n❌ BAD SIGNS:")
    print("   - 'column skill_evidence.user_id does not exist'")
    print("   - 'Failed to track contribution'")
    print("   - No auto-linking messages when creating pages")
    
    print("\n📝 HOW TO TEST:")
    print("   1. Watch backend logs")
    print("   2. Link a page to a skill in the UI")
    print("   3. You should see: '✅ Contribution tracked: page_linked'")
    print("   4. If you don't see this, the SQL fix hasn't been applied")

def test_contribution_tracking():
    """Test if contributions are being tracked"""
    print("\n" + "="*60)
    print("TESTING CONTRIBUTION TRACKING")
    print("="*60)
    
    print("\n📋 MANUAL TEST STEPS:")
    print("\n1. Open your app in browser")
    print("2. Go to Skills page")
    print("3. Note current progress % for a skill")
    print("4. Go to Pages page")
    print("5. Open a page")
    print("6. Click 'Link to Skill' and select the skill")
    print("7. Check backend logs for: '✅ Contribution tracked'")
    print("8. Refresh Skills page")
    print("9. Progress should increase by ~15%")
    
    print("\n❓ IF PROGRESS DOESN'T INCREASE:")
    print("   → SQL fix not applied (user_id column missing)")
    print("   → Run FIX_ALL_5_SKILL_ISSUES.sql in Supabase")

def check_frontend_code():
    """Check if frontend is using real progress"""
    print("\n" + "="*60)
    print("CHECKING FRONTEND CODE")
    print("="*60)
    
    files_to_check = [
        "src/pages/SkillsPage.tsx",
        "src/components/dashboard/widgets/UnifiedSkillHubWidget.tsx"
    ]
    
    for file_path in files_to_check:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            if 'getSkillRealProgress' in content or 'real-progress' in content:
                print(f"✅ {file_path}")
                print(f"   Uses real progress API")
            else:
                print(f"⚠️  {file_path}")
                print(f"   May not be using real progress")
        except FileNotFoundError:
            print(f"❌ {file_path} not found")

def show_solution_summary():
    """Show the complete solution"""
    print("\n" + "="*60)
    print("SOLUTION SUMMARY")
    print("="*60)
    
    print("\n🎯 THE PROBLEM:")
    print("   Skills page shows 0% progress even after linking pages/tasks")
    
    print("\n🔍 ROOT CAUSE:")
    print("   skill_evidence.user_id column is missing")
    print("   → Evidence linking fails silently")
    print("   → No contributions tracked")
    print("   → Progress stays at 0%")
    
    print("\n✅ THE FIX (3 steps):")
    print("\n   STEP 1: Run SQL Fix")
    print("   ─────────────────────")
    print("   1. Open Supabase Dashboard")
    print("   2. Go to SQL Editor")
    print("   3. Run: FIX_ALL_5_SKILL_ISSUES.sql")
    print("   4. Verify: SELECT column_name FROM information_schema.columns")
    print("      WHERE table_name = 'skill_evidence' AND column_name = 'user_id';")
    print("   5. Should return 1 row")
    
    print("\n   STEP 2: Restart Backend")
    print("   ─────────────────────")
    print("   cd backend")
    print("   python -m uvicorn app.main:app --reload")
    print("   ")
    print("   Look for:")
    print("   ✅ '🧠 Living Intelligence OS activated'")
    print("   ✅ '📊 Skill Metrics Updater activated'")
    
    print("\n   STEP 3: Test It")
    print("   ─────────────────────")
    print("   1. Open app in browser")
    print("   2. Go to Skills page")
    print("   3. Note a skill's current progress")
    print("   4. Link a page to that skill")
    print("   5. Check backend logs for: '✅ Contribution tracked'")
    print("   6. Refresh Skills page")
    print("   7. Progress should increase by ~15%")
    
    print("\n📊 PROGRESS CALCULATION:")
    print("   Each action has an impact score:")
    print("   - Link page: +0.15 (15% progress)")
    print("   - Complete task: +0.05-0.20 (5-20% based on speed)")
    print("   - Auto-link page: +0.15 (15% progress)")
    print("   - Suggestion accepted: +0.15 (15% progress)")
    print("\n   To reach 100% (Beginner → Intermediate):")
    print("   - Need 0.5 total impact")
    print("   - Need 5 contributions")
    print("   - Need 2 different types")
    print("\n   Example: Link 4 pages = 0.60 impact = 100%+ ✅")

def show_quick_test():
    """Show how to do a quick test"""
    print("\n" + "="*60)
    print("QUICK TEST (Manual Contribution)")
    print("="*60)
    
    print("\nWant to test immediately? Run this in Supabase SQL Editor:")
    print("\n" + "-"*60)
    print("""
INSERT INTO skill_contributions (
    id,
    skill_id,
    workspace_id,
    contribution_type,
    target_id,
    target_type,
    impact_score,
    metadata,
    created_at
)
SELECT 
    gen_random_uuid(),
    s.id,
    s.workspace_id,
    'manual_test',
    'test-page-id',
    'page',
    0.20,
    '{"test": true, "note": "Manual test contribution"}'::jsonb,
    NOW()
FROM skills s
WHERE s.workspace_id IS NOT NULL
LIMIT 1
RETURNING 
    '✅ Test contribution created!' as result;
""")
    print("-"*60)
    print("\nThen refresh Skills page - should show 20% progress!")
    print("This proves the progress calculation works.")
    print("If it doesn't work, the frontend isn't calling the API correctly.")

def main():
    """Run all diagnostics"""
    print("\n" + "="*60)
    print("SKILL PROGRESS 0% DIAGNOSTIC TOOL")
    print("="*60)
    print(f"\nRun time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Run checks
    check_database_structure()
    backend_running = check_backend_running()
    check_skill_system_logs()
    test_contribution_tracking()
    check_frontend_code()
    show_solution_summary()
    show_quick_test()
    
    print("\n" + "="*60)
    print("DIAGNOSTIC COMPLETE")
    print("="*60)
    print("\n📖 For detailed documentation, read:")
    print("   - SKILL_PROGRESS_0_PERCENT_FIX.md (complete solution)")
    print("   - CHECK_SKILL_PROGRESS.sql (database diagnostic)")
    print("   - FIX_ALL_5_SKILL_ISSUES.sql (the fix)")
    print("\n")

if __name__ == "__main__":
    main()
