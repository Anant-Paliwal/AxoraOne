"""
Check if skill intelligence tables exist in Supabase
"""
import os
import sys
sys.path.insert(0, 'backend')

from dotenv import load_dotenv
from supabase.client import create_client, Client

# Load environment variables
load_dotenv('backend/.env')

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Missing Supabase credentials in backend/.env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("🔍 Checking Skill Intelligence Tables...\n")

tables_to_check = [
    'skills',
    'skill_memory',
    'skill_contributions',
    'skill_chains',
    'skill_evidence',
    'skill_executions'
]

for table in tables_to_check:
    try:
        # Try to query the table (limit 0 to just check existence)
        result = supabase.table(table).select("*").limit(0).execute()
        print(f"✅ {table:25} - EXISTS")
    except Exception as e:
        error_msg = str(e)
        if 'does not exist' in error_msg or 'relation' in error_msg:
            print(f"❌ {table:25} - MISSING")
        else:
            print(f"⚠️  {table:25} - ERROR: {error_msg[:50]}")

print("\n" + "="*60)
print("Checking data in existing tables...")
print("="*60 + "\n")

# Check if skills table has data
try:
    skills = supabase.table('skills').select("id, name, workspace_id").limit(5).execute()
    print(f"📊 skills table: {len(skills.data)} records (showing first 5)")
    for skill in skills.data:
        print(f"   - {skill.get('name')} (workspace: {skill.get('workspace_id', 'none')})")
except Exception as e:
    print(f"❌ Error reading skills: {e}")

print()

# Check skill_memory
try:
    memory = supabase.table('skill_memory').select("skill_id").limit(5).execute()
    print(f"📊 skill_memory table: {len(memory.data)} records")
except Exception as e:
    print(f"❌ skill_memory: {e}")

# Check skill_contributions
try:
    contributions = supabase.table('skill_contributions').select("id, skill_id, contribution_type").limit(5).execute()
    print(f"📊 skill_contributions table: {len(contributions.data)} records")
    for contrib in contributions.data:
        print(f"   - Type: {contrib.get('contribution_type')}")
except Exception as e:
    print(f"❌ skill_contributions: {e}")

# Check skill_chains
try:
    chains = supabase.table('skill_chains').select("id").limit(5).execute()
    print(f"📊 skill_chains table: {len(chains.data)} records")
except Exception as e:
    print(f"❌ skill_chains: {e}")

print("\n" + "="*60)
print("DIAGNOSIS COMPLETE")
print("="*60)
