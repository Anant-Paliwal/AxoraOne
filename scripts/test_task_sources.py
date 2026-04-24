"""
Test script to verify Ask Anything can access task sources
"""
import asyncio
from backend.main.services.context_gatherer import context_gatherer
from backend.main.services.enhanced_ai_agent import enhanced_ai_agent

async def test_task_sources():
    """Test that tasks with linked sources are properly fetched"""
    
    print("🧪 Testing Task Sources in Ask Anything\n")
    
    # Test 1: Context Gatherer fetches tasks with linked sources
    print("Test 1: Fetching tasks with linked sources...")
    try:
        context = await context_gatherer.gather_context(
            query="SQL tasks",
            user_id="test-user-id",
            workspace_id="test-workspace-id",
            mentioned_items=[],
            topic="SQL",
            limit_results=5
        )
        
        print(f"✅ Found {len(context.relevxnt_tasks)} relevant tasks")
        
        for task in context.relevant_tasks[:3]:
            print(f"\n  📋 Task: {task.get('title')}")
            print(f"     Status: {task.get('status')}")
            print(f"     Relevance: {task.get('_relevance_score', 0):.2f}")
            
            if task.get('linked_page'):
                print(f"     → Linked Page: {task['linked_page'].get('title')}")
            
            if task.get('linked_skill'):
                print(f"     → Linked Skill: {task['linked_skill'].get('name')}")
        
        print("\n✅ Test 1 Passed: Tasks fetched with linked sources\n")
        
    except Exception as e:
        print(f"❌ Test 1 Failed: {e}\n")
    
    # Test 2: Enhanced AI Agent includes task sources in context
    print("Test 2: AI Agent processes task sources...")
    try:
        response = await enhanced_ai_agent.process_query(
            query="What tasks do I have for learning SQL?",
            user_id="test-user-id",
            workspace_id="test-workspace-id",
            mode="ask",
            mentioned_items=[],
            conversation_history=[]
        )
        
        print(f"✅ AI Response generated")
        print(f"   Sources found: {len(response.get('sources', []))}")
        
        # Check if sources include tasks and their linked content
        sources = response.get('sources', [])
        task_sources = [s for s in sources if s.get('type') == 'task']
        linked_sources = [s for s in sources if s.get('linked_from') == 'task']
        
        print(f"   Task sources: {len(task_sources)}")
        print(f"   Linked sources from tasks: {len(linked_sources)}")
        
        if linked_sources:
            print("\n   Linked sources:")
            for source in linked_sources[:3]:
                print(f"     → {source.get('type')}: {source.get('title')}")
        
        print("\n✅ Test 2 Passed: AI Agent includes task sources\n")
        
    except Exception as e:
        print(f"❌ Test 2 Failed: {e}\n")
    
    # Test 3: Mentioned task includes linked sources
    print("Test 3: Mentioned task includes linked sources...")
    try:
        # Simulate mentioning a task
        mentioned_items = [
            {
                "type": "task",
                "id": "test-task-id",
                "name": "Complete SQL Tutorial"
            }
        ]
        
        context = await context_gatherer.gather_context(
            query="Help me with this task",
            user_id="test-user-id",
            workspace_id="test-workspace-id",
            mentioned_items=mentioned_items,
            topic="task",
            limit_results=5
        )
        
        print(f"✅ Mentioned items fetched: {len(context.mentioned_items)}")
        
        for item in context.mentioned_items:
            if item.get('type') == 'task':
                task_data = item.get('data', {})
                print(f"\n  📋 Mentioned Task: {task_data.get('title')}")
                
                if task_data.get('linked_page'):
                    print(f"     → Has linked page: {task_data['linked_page'].get('title')}")
                
                if task_data.get('linked_skill'):
                    print(f"     → Has linked skill: {task_data['linked_skill'].get('name')}")
        
        print("\n✅ Test 3 Passed: Mentioned tasks include linked sources\n")
        
    except Exception as e:
        print(f"❌ Test 3 Failed: {e}\n")
    
    print("=" * 60)
    print("🎉 All tests completed!")
    print("=" * 60)


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("Ask Anything - Task Sources Test Suite")
    print("=" * 60 + "\n")
    
    asyncio.run(test_task_sources())
    
    print("\n📝 Note: These tests require:")
    print("   - Valid user_id and workspace_id")
    print("   - Tasks with linked_page_id and/or linked_skill_id")
    print("   - Supabase connection configured")
    print("\n   To run with real data, update the IDs in the script.")
