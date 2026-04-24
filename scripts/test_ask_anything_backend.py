"""
Test script to verify Ask Anything backend is returning responses
"""
import asyncio
import sys
sys.path.insert(0, 'backend')

from app.services.ai_agent import ai_agent_service

async def test_simple_query():
    """Test a simple query"""
    print("Testing simple query...")
    
    try:
        result = await ai_agent_service.process_query(
            query="what is this",
            user_id="test-user-123",
            mode="ask",
            scope="all",
            workspace_id="18ffd74d-38ab-48db-a381-cf61b4c0e7b4",
            model="meta-llama/llama-3.2-3b-instruct:free",
            mentioned_items=[],
            session_context=None,
            conversation_history=None,
            enabled_sources=['web', 'pages', 'skills', 'graph', 'kb']
        )
        
        print(f"\n✅ Result received:")
        print(f"  - Response: {result.get('response', 'NONE')[:200]}")
        print(f"  - Response length: {len(result.get('response', ''))}")
        print(f"  - Sources: {len(result.get('sources', []))}")
        print(f"  - Suggested actions: {len(result.get('suggested_actions', []))}")
        
        if not result.get('response'):
            print("\n❌ ERROR: Response is empty!")
            return False
        
        print("\n✅ Test passed!")
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_simple_query())
    sys.exit(0 if success else 1)
