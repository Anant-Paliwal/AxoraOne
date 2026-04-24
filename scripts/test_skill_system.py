"""
Test script to verify skill system is working correctly
"""
import asyncio
import sys
sys.path.append('backend')

from app.services.skill_contribution_tracker import contribution_tracker
from app.services.skill_auto_linker import auto_linker
from app.core.supabase import supabase_admin

async def test_skill_system():
    print("🧪 Testing Skill System Integration\n")
    
    # Test 1: Check if tables exist
    print("1️⃣ Checking database tables...")
    tables_to_check = [
        "skills",
        "skill_contributions", 
        "skill_evidence",
        "skill_memory",
        "skill_executions",
        "skill_chains"
    ]
    
    for table in tables_to_check:
        try:
            result = supabase_admin.table(table).select("id").limit(1).execute()
            print(f"   ✅ {table} - exists")
        except Exception as e:
            print(f"   ❌ {table} - error: {e}")
    
    print()
    
    # Test 2: Get a sample skill
    print("2️⃣ Testing skill progress calculation...")
    try:
        skills = supabase_admin.table("skills").select("id, name").limit(1).execute()
        if skills.data:
            skill = skills.data[0]
            print(f"   Testing with skill: {skill['name']}")
            
            # Calculate real progress
            progress = await contribution_tracker.calculate_real_progress(skill['id'])
            print(f"   ✅ Progress: {progress.get('progress', 0)}%")
            print(f"   ✅ Can evolve: {progress.get('can_evolve', False)}")
            print(f"   ✅ Total impact: {progress.get('total_impact', 0)}")
            print(f"   ✅ Contributions: {progress.get('contribution_count', 0)}")
        else:
            print("   ⚠️  No skills found in database")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print()
    
    # Test 3: Test auto-linker
    print("3️⃣ Testing auto-linker...")
    try:
        # Get workspace
        workspaces = supabase_admin.table("workspaces").select("id").limit(1).execute()
        if workspaces.data:
            workspace_id = workspaces.data[0]['id']
            
            # Test page analysis
            suggestions = await auto_linker.suggest_links(
                page_id="test",
                page_title="SQL Database Tutorial",
                page_content="Learn about SQL queries and database design",
                page_tags=["database", "sql"],
                workspace_id=workspace_id
            )
            
            print(f"   ✅ Found {len(suggestions)} skill suggestions")
            for sug in suggestions[:3]:
                print(f"      - {sug['skill_name']} ({sug['confidence']:.0%} confidence)")
        else:
            print("   ⚠️  No workspaces found")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print()
    
    # Test 4: Check contributions
    print("4️⃣ Checking existing contributions...")
    try:
        contributions = supabase_admin.table("skill_contributions")\
            .select("*")\
            .limit(5)\
            .execute()
        
        print(f"   ✅ Found {len(contributions.data)} contributions")
        for contrib in contributions.data:
            print(f"      - {contrib.get('contribution_type')}: {contrib.get('impact_score')} impact")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print()
    
    # Test 5: Check evidence links
    print("5️⃣ Checking skill evidence links...")
    try:
        evidence = supabase_admin.table("skill_evidence")\
            .select("*")\
            .limit(5)\
            .execute()
        
        print(f"   ✅ Found {len(evidence.data)} evidence links")
        for ev in evidence.data:
            print(f"      - Type: {ev.get('evidence_type')}, Confidence: {ev.get('confidence_score', 0):.0%}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print()
    print("✅ Skill system test complete!")

if __name__ == "__main__":
    asyncio.run(test_skill_system())
