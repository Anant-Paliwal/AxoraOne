"""
Diagnose why skill contributions are not being created
"""
import os
import sys
sys.path.insert(0, 'backend')

from dotenv import load_dotenv
load_dotenv('backend/.env')

from supabase.client import create_client

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Missing Supabase credentials")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("🔍 Diagnosing Skill Contributions System\n")
print("="*60)

# 1. Check if tables exist
print("\n1. Checking Tables...")
tables = ['skills', 'skill_evidence', 'skill_contributions', 'skill_memory']
for table in tables:
    try:
        result = supabase.table(table).select("*").limit(0).execute()
        print(f"   ✅ {table:25} EXISTS")
    except Exception as e:
        print(f"   ❌ {table:25} MISSING - {str(e)[:50]}")

# 2. Check if skills exist
print("\n2. Checking Skills...")
try:
    skills = supabase.table('skills').select("id, name, workspace_id").limit(5).execute()
    print(f"   ✅ Found {len(skills.data)} skills")
    for skill in skills.data:
        print(f"      - {skill.get('name')} (ID: {skill.get('id')[:8]}...)")
except Exception as e:
    print(f"   ❌ Error: {e}")

# 3. Check if skill_evidence exists
print("\n3. Checking Skill Evidence (page links)...")
try:
    evidence = supabase.table('skill_evidence').select("*").limit(5).execute()
    print(f"   ✅ Found {len(evidence.data)} evidence records")
    for ev in evidence.data:
        print(f"      - Skill: {ev.get('skill_id')[:8]}... → Page: {ev.get('page_id')[:8]}...")
except Exception as e:
    print(f"   ❌ Error: {e}")

# 4. Check if contributions exist
print("\n4. Checking Skill Contributions...")
try:
    contributions = supabase.table('skill_contributions').select("*").limit(10).execute()
    print(f"   {'✅' if len(contributions.data) > 0 else '⚠️'} Found {len(contributions.data)} contributions")
    if len(contributions.data) > 0:
        for contrib in contributions.data:
            print(f"      - Type: {contrib.get('contribution_type'):20} Impact: {contrib.get('impact_score')}")
    else:
        print("      ⚠️  NO CONTRIBUTIONS FOUND - This is the problem!")
except Exception as e:
    print(f"   ❌ Error: {e}")

# 5. Check RLS policies
print("\n5. Checking RLS Policies...")
try:
    # Check if RLS is enabled
    result = supabase.rpc('pg_tables', {}).execute()
    print("   ✅ Can query database")
except Exception as e:
    print(f"   ⚠️  RLS might be blocking: {str(e)[:50]}")

# 6. Test creating a contribution manually
print("\n6. Testing Manual Contribution Creation...")
try:
    # Get first skill
    skills = supabase.table('skills').select("id, workspace_id").limit(1).execute()
    if skills.data:
        skill = skills.data[0]
        skill_id = skill['id']
        workspace_id = skill.get('workspace_id')
        
        if workspace_id:
            import uuid
            test_contrib = {
                "id": str(uuid.uuid4()),
                "skill_id": skill_id,
                "workspace_id": workspace_id,
                "contribution_type": "test_diagnostic",
                "target_id": "test_123",
                "target_type": "test",
                "impact_score": 0.01,
                "metadata": {"source": "diagnostic_script"}
            }
            
            result = supabase.table('skill_contributions').insert(test_contrib).execute()
            print(f"   ✅ Successfully created test contribution!")
            print(f"      Skill ID: {skill_id[:8]}...")
            print(f"      Workspace ID: {workspace_id[:8]}...")
            
            # Clean up
            supabase.table('skill_contributions').delete().eq('id', test_contrib['id']).execute()
            print(f"   ✅ Cleaned up test contribution")
        else:
            print(f"   ⚠️  Skill has no workspace_id - contributions require workspace!")
    else:
        print("   ⚠️  No skills found to test with")
except Exception as e:
    print(f"   ❌ Failed to create contribution: {e}")
    print(f"      This means the backend will also fail!")

# 7. Check backend is configured
print("\n7. Checking Backend Configuration...")
print(f"   SUPABASE_URL: {SUPABASE_URL[:30]}...")
print(f"   SERVICE_KEY: {'✅ Set' if SUPABASE_SERVICE_KEY else '❌ Missing'}")

# 8. Summary
print("\n" + "="*60)
print("DIAGNOSIS SUMMARY")
print("="*60)

try:
    skills_count = len(supabase.table('skills').select("id").execute().data)
    evidence_count = len(supabase.table('skill_evidence').select("id").execute().data)
    contrib_count = len(supabase.table('skill_contributions').select("id").execute().data)
    
    print(f"\n📊 Current State:")
    print(f"   Skills: {skills_count}")
    print(f"   Evidence (page links): {evidence_count}")
    print(f"   Contributions: {contrib_count}")
    
    if evidence_count > 0 and contrib_count == 0:
        print(f"\n❌ PROBLEM FOUND:")
        print(f"   You have {evidence_count} page links but 0 contributions!")
        print(f"   This means the backend is NOT creating contributions.")
        print(f"\n🔧 SOLUTION:")
        print(f"   1. Make sure backend is running: cd backend && python main.py")
        print(f"   2. Check backend logs for errors")
        print(f"   3. The code I added should create contributions automatically")
        print(f"   4. Try linking a NEW page after restarting backend")
    elif contrib_count > 0:
        print(f"\n✅ System is working! Contributions are being created.")
    else:
        print(f"\n⚠️  No evidence or contributions yet.")
        print(f"   Link a page to a skill to test the system.")
        
except Exception as e:
    print(f"\n❌ Error getting summary: {e}")

print("\n" + "="*60)
