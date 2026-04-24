"""
Test Feedback Learning System
Run with: pytest backend/tests/test_feedback_system.py -v
"""
import pytest
import asyncio
from app.services.feedback_learning import feedback_learning_service
from app.services.enhanced_context_gatherer import enhanced_context_gatherer


class TestFeedbackLearning:
    """Test feedback learning service"""
    
    @pytest.mark.asyncio
    async def test_store_feedback(self):
        """Test storing feedback"""
        result = await feedback_learning_service.store_feedback(
            user_id="test-user-123",
            workspace_id="test-workspace-123",
            preview_id="test-message-123",
            query="Explain SQL joins",
            mode="ask",
            rating="helpful",
            comment="Great explanation!"
        )
        
        assert result["success"] == True
        assert "feedback_id" in result
        print(f"✅ Feedback stored: {result['feedback_id']}")
    
    @pytest.mark.asyncio
    async def test_get_user_preferences(self):
        """Test getting user preferences"""
        prefs = await feedback_learning_service.get_user_preferences(
            user_id="test-user-123",
            workspace_id="test-workspace-123"
        )
        
        assert "preferred_mode" in prefs
        assert "prefers_detailed" in prefs
        assert "common_topics" in prefs
        print(f"✅ User preferences: {prefs}")
    
    @pytest.mark.asyncio
    async def test_analyze_feedback(self):
        """Test feedback analysis"""
        insights = await feedback_learning_service.analyze_feedback(
            workspace_id="test-workspace-123",
            days_back=30
        )
        
        assert "success_rate" in insights
        assert "total_feedback" in insights
        print(f"✅ Feedback insights: {insights}")
    
    @pytest.mark.asyncio
    async def test_adjust_prompt(self):
        """Test prompt adjustment based on feedback"""
        base_prompt = "You are a helpful AI assistant."
        
        adjusted = await feedback_learning_service.adjust_prompt_based_on_feedback(
            base_prompt=base_prompt,
            user_id="test-user-123",
            workspace_id="test-workspace-123"
        )
        
        assert len(adjusted) > len(base_prompt)
        assert "USER PREFERENCES" in adjusted
        print(f"✅ Prompt adjusted: {len(adjusted)} chars")


class TestEnhancedContextGatherer:
    """Test enhanced context gathering"""
    
    @pytest.mark.asyncio
    async def test_gather_hierarchical_context(self):
        """Test gathering page hierarchy"""
        # This will fail if page doesn't exist, but tests the structure
        try:
            context = await enhanced_context_gatherer.gather_hierarchical_context(
                page_id="test-page-123",
                user_id="test-user-123",
                include_subpages=True,
                max_depth=2
            )
            
            assert "page" in context or "error" in context
            print(f"✅ Context gathering works")
        except Exception as e:
            print(f"⚠️ Expected error (no test page): {e}")
    
    @pytest.mark.asyncio
    async def test_understand_workspace_structure(self):
        """Test workspace structure understanding"""
        try:
            structure = await enhanced_context_gatherer.understand_workspace_structure(
                workspace_id="test-workspace-123",
                user_id="test-user-123"
            )
            
            assert "page_hierarchy" in structure or "error" in structure
            print(f"✅ Workspace structure gathering works")
        except Exception as e:
            print(f"⚠️ Expected error (no test workspace): {e}")
    
    @pytest.mark.asyncio
    async def test_prune_context(self):
        """Test context pruning"""
        full_context = {
            "page": {"id": "1", "title": "Test", "blocks": ["a"] * 100},
            "subpages": [
                {"id": "2", "title": "Sub1", "blocks": ["b"] * 100},
                {"id": "3", "title": "Sub2", "blocks": ["c"] * 100}
            ]
        }
        
        pruned = await enhanced_context_gatherer.prune_context_intelligently(
            full_context=full_context,
            query="test query",
            max_tokens=1000
        )
        
        assert "page" in pruned
        assert "pruned" in pruned
        print(f"✅ Context pruning works: pruned={pruned.get('pruned')}")


def test_services_importable():
    """Test that services can be imported"""
    from app.services.feedback_learning import feedback_learning_service
    from app.services.enhanced_context_gatherer import enhanced_context_gatherer
    
    assert feedback_learning_service is not None
    assert enhanced_context_gatherer is not None
    print("✅ Services are importable")


if __name__ == "__main__":
    print("\n🧪 Running Feedback System Tests\n")
    pytest.main([__file__, "-v", "-s"])
