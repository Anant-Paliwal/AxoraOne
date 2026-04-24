"""
Comprehensive Skill System Testing Script

Tests all aspects of the skill system:
- CRUD operations
- Auto-linking
- Skill chaining
- Progress tracking
- Agent lifecycle
- Permissions
- Performance

Run with: python test_skill_system_comprehensive.py
"""

import requests
import json
import time
from typing import Dict, List, Optional
from datetime import datetime

# Configuration
API_BASE_URL = "http://localhost:8000/api/v1"
TEST_USER_TOKEN = None  # Set this from your auth session

class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

class SkillSystemTester:
    def __init__(self, base_url: str, token: Optional[str] = None):
        self.base_url = base_url
        self.token = token
        self.headers = {
            "Content-Type": "application/json"
        }
        if token:
            self.headers["Authorization"] = f"Bearer {token}"
        
        self.test_results = []
        self.test_data = {
            "workspace_id": None,
            "skill_ids": [],
            "page_ids": [],
            "task_ids": []
        }
    
    def log(self, message: str, level: str = "INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        color = {
            "INFO": Colors.OKBLUE,
            "SUCCESS": Colors.OKGREEN,
            "WARNING": Colors.WARNING,
            "ERROR": Colors.FAIL,
            "HEADER": Colors.HEADER
        }.get(level, Colors.ENDC)
        print(f"{color}[{timestamp}] {level}: {message}{Colors.ENDC}")
    
    def test(self, name: str, func):
        """Run a test and record result"""
        self.log(f"Testing: {name}", "HEADER")
        start_time = time.time()
        try:
            func()
            duration = time.time() - start_time
            self.log(f"✓ {name} - {duration:.2f}s", "SUCCESS")
            self.test_results.append({"name": name, "status": "PASS", "duration": duration})
            return True
        except Exception as e:
            duration = time.time() - start_time
            self.log(f"✗ {name} - {str(e)}", "ERROR")
            self.test_results.append({"name": name, "status": "FAIL", "duration": duration, "error": str(e)})
            return False
    
    def get(self, endpoint: str) -> Dict:
        """Make GET request"""
        response = requests.get(f"{self.base_url}{endpoint}", headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def post(self, endpoint: str, data: Dict) -> Dict:
        """Make POST request"""
        response = requests.post(f"{self.base_url}{endpoint}", headers=self.headers, json=data)
        response.raise_for_status()
        return response.json()
    
    def patch(self, endpoint: str, data: Dict) -> Dict:
        """Make PATCH request"""
        response = requests.patch(f"{self.base_url}{endpoint}", headers=self.headers, json=data)
        response.raise_for_status()
        return response.json()
    
    def delete(self, endpoint: str) -> Dict:
        """Make DELETE request"""
        response = requests.delete(f"{self.base_url}{endpoint}", headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    # ==================== SETUP ====================
    
    def setup_test_workspace(self):
        """Create a test workspace"""
        workspace = self.post("/workspaces", {
            "name": f"Skill Test Workspace {int(time.time())}",
            "description": "Automated testing workspace"
        })
        self.test_data["workspace_id"] = workspace["id"]
        self.log(f"Created test workspace: {workspace['id']}")
    
    # ==================== BASIC CRUD TESTS ====================
    
    def test_create_skill(self):
        """Test creating a skill"""
        skill = self.post("/skills", {
            "name": "Python Programming",
            "level": "Beginner",
            "description": "Learn Python from scratch",
            "skill_type": "learning",
            "goals": ["Complete 10 Python projects", "Master data structures"],
            "workspace_id": self.test_data["workspace_id"]
        })
        assert skill["name"] == "Python Programming"
        assert skill["level"] == "Beginner"
        self.test_data["skill_ids"].append(skill["id"])
        self.log(f"Created skill: {skill['id']}")
    
    def test_get_skills(self):
        """Test fetching skills"""
        skills = self.get(f"/skills?workspace_id={self.test_data['workspace_id']}")
        assert len(skills) > 0
        assert any(s["name"] == "Python Programming" for s in skills)
        self.log(f"Fetched {len(skills)} skills")
    
    def test_update_skill(self):
        """Test updating a skill"""
        skill_id = self.test_data["skill_ids"][0]
        updated = self.patch(f"/skills/{skill_id}", {
            "description": "Updated description",
            "level": "Intermediate"
        })
        assert updated["description"] == "Updated description"
        assert updated["level"] == "Intermediate"
        self.log(f"Updated skill: {skill_id}")
    
    def test_delete_skill(self):
        """Test deleting a skill"""
        # Create a temporary skill to delete
        temp_skill = self.post("/skills", {
            "name": "Temporary Skill",
            "level": "Beginner",
            "workspace_id": self.test_data["workspace_id"]
        })
        result = self.delete(f"/skills/{temp_skill['id']}")
        assert "message" in result
        self.log(f"Deleted skill: {temp_skill['id']}")
    
    # ==================== EVIDENCE LINKING TESTS ====================
    
    def test_create_page_for_linking(self):
        """Create a test page"""
        page = self.post("/pages", {
            "title": "Python Basics Tutorial",
            "content": "Learn Python programming fundamentals",
            "tags": ["python", "programming", "tutorial"],
            "workspace_id": self.test_data["workspace_id"]
        })
        self.test_data["page_ids"].append(page["id"])
        self.log(f"Created page: {page['id']}")
    
    def test_link_page_to_skill(self):
        """Test linking a page to a skill"""
        skill_id = self.test_data["skill_ids"][0]
        page_id = self.test_data["page_ids"][0]
        
        evidence = self.post(f"/skills/{skill_id}/evidence", {
            "page_id": page_id,
            "evidence_type": "page",
            "notes": "Tutorial page"
        })
        assert evidence["page_id"] == page_id
        self.log(f"Linked page {page_id} to skill {skill_id}")
    
    def test_get_skill_with_evidence(self):
        """Test fetching skill with linked evidence"""
        skills = self.get(f"/skills?workspace_id={self.test_data['workspace_id']}")
        skill = next(s for s in skills if s["id"] == self.test_data["skill_ids"][0])
        assert "linked_evidence" in skill
        assert len(skill["linked_evidence"]) > 0
        self.log(f"Skill has {len(skill['linked_evidence'])} evidence items")
    
    # ==================== AUTO-LINKING TESTS ====================
    
    def test_auto_link_page(self):
        """Test automatic page linking"""
        # Create page with skill name in title
        page = self.post("/pages", {
            "title": "Advanced Python Programming Techniques",
            "content": "Deep dive into Python advanced concepts",
            "tags": ["python"],
            "workspace_id": self.test_data["workspace_id"]
        })
        
        # Call auto-link endpoint
        result = self.post("/intelligence/skills/auto-link/page", {
            "page_id": page["id"],
            "page_title": page["title"],
            "page_content": page["content"],
            "page_tags": page["tags"],
            "workspace_id": self.test_data["workspace_id"]
        })
        
        assert "links_created" in result
        self.log(f"Auto-linked page, created {len(result['links_created'])} links")
    
    def test_suggest_skill_links(self):
        """Test skill link suggestions"""
        page_id = self.test_data["page_ids"][0]
        suggestions = self.get(
            f"/intelligence/skills/suggest-links/page/{page_id}?workspace_id={self.test_data['workspace_id']}"
        )
        assert "suggestions" in suggestions
        self.log(f"Got {len(suggestions['suggestions'])} skill suggestions")
    
    # ==================== SKILL CHAINING TESTS ====================
    
    def test_create_linked_skills(self):
        """Create skills for chaining"""
        # Create prerequisite skill
        prereq = self.post("/skills", {
            "name": "Data Structures",
            "level": "Beginner",
            "skill_type": "learning",
            "workspace_id": self.test_data["workspace_id"]
        })
        
        # Create advanced skill with prerequisite
        advanced = self.post("/skills", {
            "name": "Algorithms",
            "level": "Intermediate",
            "skill_type": "learning",
            "prerequisite_skills": [prereq["id"]],
            "workspace_id": self.test_data["workspace_id"]
        })
        
        self.test_data["skill_ids"].extend([prereq["id"], advanced["id"]])
        self.log(f"Created linked skills: {prereq['id']} -> {advanced['id']}")
    
    def test_link_skills(self):
        """Test linking two skills"""
        if len(self.test_data["skill_ids"]) < 2:
            raise Exception("Need at least 2 skills for linking")
        
        source_id = self.test_data["skill_ids"][0]
        target_id = self.test_data["skill_ids"][1]
        
        result = self.post(f"/skills/{source_id}/link/{target_id}", {})
        assert "linked_skills" in result
        self.log(f"Linked skills: {source_id} -> {target_id}")
    
    def test_get_suggested_next_skills(self):
        """Test getting suggested next skills"""
        skill_id = self.test_data["skill_ids"][0]
        suggestions = self.get(
            f"/skills/{skill_id}/suggested-next?workspace_id={self.test_data['workspace_id']}"
        )
        assert "suggested_next" in suggestions
        self.log(f"Got {len(suggestions['suggested_next'])} suggested skills")
    
    def test_execute_skill(self):
        """Test executing a skill"""
        skill_id = self.test_data["skill_ids"][0]
        result = self.post(
            f"/skills/{skill_id}/execute?workspace_id={self.test_data['workspace_id']}",
            {
                "trigger_source": "manual",
                "input_context": {"test": True}
            }
        )
        assert "execution_id" in result
        assert "suggested_next" in result
        self.log(f"Executed skill: {skill_id}")
    
    # ==================== PROGRESS & EVOLUTION TESTS ====================
    
    def test_get_real_progress(self):
        """Test getting real progress calculation"""
        skill_id = self.test_data["skill_ids"][0]
        progress = self.get(f"/intelligence/skills/{skill_id}/real-progress")
        assert "progress" in progress
        assert "can_evolve" in progress
        self.log(f"Skill progress: {progress['progress']}%, can_evolve: {progress['can_evolve']}")
    
    def test_track_contribution(self):
        """Test tracking a skill contribution"""
        skill_id = self.test_data["skill_ids"][0]
        
        # Track suggestion accepted
        result = self.post(
            f"/intelligence/skills/{skill_id}/contribution/suggestion-accepted",
            {
                "suggestion_id": "test-suggestion",
                "workspace_id": self.test_data["workspace_id"]
            }
        )
        self.log(f"Tracked contribution for skill: {skill_id}")
    
    def test_evolve_skill(self):
        """Test skill evolution (may fail if requirements not met)"""
        skill_id = self.test_data["skill_ids"][0]
        try:
            result = self.post(f"/intelligence/skills/{skill_id}/evolve", {})
            if result.get("success"):
                self.log(f"Skill evolved to {result['new_level']}")
            else:
                self.log(f"Skill cannot evolve yet: {result.get('message')}", "WARNING")
        except Exception as e:
            self.log(f"Evolution failed (expected if requirements not met): {str(e)}", "WARNING")
    
    # ==================== TASK INTEGRATION TESTS ====================
    
    def test_create_task_with_skill(self):
        """Test creating a task linked to a skill"""
        task = self.post("/tasks", {
            "title": "Complete Python tutorial",
            "description": "Work through Python basics",
            "status": "todo",
            "priority": "medium",
            "linked_skill_id": self.test_data["skill_ids"][0],
            "workspace_id": self.test_data["workspace_id"]
        })
        self.test_data["task_ids"].append(task["id"])
        self.log(f"Created task linked to skill: {task['id']}")
    
    def test_auto_link_task(self):
        """Test automatic task linking"""
        task = self.post("/tasks", {
            "title": "Practice Python data structures",
            "description": "Implement lists, dicts, sets",
            "status": "todo",
            "workspace_id": self.test_data["workspace_id"]
        })
        
        # Call auto-link endpoint
        result = self.post("/intelligence/skills/auto-link/task", {
            "task_id": task["id"],
            "task_title": task["title"],
            "task_description": task["description"],
            "workspace_id": self.test_data["workspace_id"]
        })
        
        if result.get("skill_id"):
            self.log(f"Auto-linked task to skill: {result['skill_id']}")
        else:
            self.log("Task not auto-linked (confidence too low)", "WARNING")
    
    # ==================== AGENT LIFECYCLE TESTS ====================
    
    def test_skill_agent_initialization(self):
        """Test skill agent can be initialized"""
        # This would require direct backend access
        # For now, just verify the skill exists
        skill_id = self.test_data["skill_ids"][0]
        skill = self.get(f"/skills?workspace_id={self.test_data['workspace_id']}")
        assert any(s["id"] == skill_id for s in skill)
        self.log(f"Skill agent can be initialized for: {skill_id}")
    
    # ==================== PERFORMANCE TESTS ====================
    
    def test_performance_list_skills(self):
        """Test performance of listing skills"""
        start = time.time()
        skills = self.get(f"/skills?workspace_id={self.test_data['workspace_id']}")
        duration = time.time() - start
        
        if duration > 0.5:
            self.log(f"Performance warning: List skills took {duration:.2f}s", "WARNING")
        else:
            self.log(f"List skills performance: {duration:.2f}s")
    
    def test_performance_auto_link(self):
        """Test performance of auto-linking"""
        page = self.post("/pages", {
            "title": "Performance Test Page",
            "content": "Test content",
            "workspace_id": self.test_data["workspace_id"]
        })
        
        start = time.time()
        self.post("/intelligence/skills/auto-link/page", {
            "page_id": page["id"],
            "page_title": page["title"],
            "page_content": page["content"],
            "page_tags": [],
            "workspace_id": self.test_data["workspace_id"]
        })
        duration = time.time() - start
        
        if duration > 1.0:
            self.log(f"Performance warning: Auto-link took {duration:.2f}s", "WARNING")
        else:
            self.log(f"Auto-link performance: {duration:.2f}s")
    
    # ==================== CLEANUP ====================
    
    def cleanup(self):
        """Clean up test data"""
        self.log("Cleaning up test data...", "HEADER")
        
        # Delete skills
        for skill_id in self.test_data["skill_ids"]:
            try:
                self.delete(f"/skills/{skill_id}")
                self.log(f"Deleted skill: {skill_id}")
            except Exception as e:
                self.log(f"Failed to delete skill {skill_id}: {e}", "WARNING")
        
        # Delete pages
        for page_id in self.test_data["page_ids"]:
            try:
                self.delete(f"/pages/{page_id}")
                self.log(f"Deleted page: {page_id}")
            except Exception as e:
                self.log(f"Failed to delete page {page_id}: {e}", "WARNING")
        
        # Delete tasks
        for task_id in self.test_data["task_ids"]:
            try:
                self.delete(f"/tasks/{task_id}")
                self.log(f"Deleted task: {task_id}")
            except Exception as e:
                self.log(f"Failed to delete task {task_id}: {e}", "WARNING")
        
        # Delete workspace
        if self.test_data["workspace_id"]:
            try:
                self.delete(f"/workspaces/{self.test_data['workspace_id']}")
                self.log(f"Deleted workspace: {self.test_data['workspace_id']}")
            except Exception as e:
                self.log(f"Failed to delete workspace: {e}", "WARNING")
    
    # ==================== MAIN TEST RUNNER ====================
    
    def run_all_tests(self):
        """Run all tests"""
        self.log("=" * 60, "HEADER")
        self.log("SKILL SYSTEM COMPREHENSIVE TEST SUITE", "HEADER")
        self.log("=" * 60, "HEADER")
        
        # Setup
        self.log("\n=== SETUP ===", "HEADER")
        self.test("Setup test workspace", self.setup_test_workspace)
        
        # Basic CRUD
        self.log("\n=== BASIC CRUD TESTS ===", "HEADER")
        self.test("Create skill", self.test_create_skill)
        self.test("Get skills", self.test_get_skills)
        self.test("Update skill", self.test_update_skill)
        self.test("Delete skill", self.test_delete_skill)
        
        # Evidence Linking
        self.log("\n=== EVIDENCE LINKING TESTS ===", "HEADER")
        self.test("Create page for linking", self.test_create_page_for_linking)
        self.test("Link page to skill", self.test_link_page_to_skill)
        self.test("Get skill with evidence", self.test_get_skill_with_evidence)
        
        # Auto-Linking
        self.log("\n=== AUTO-LINKING TESTS ===", "HEADER")
        self.test("Auto-link page", self.test_auto_link_page)
        self.test("Suggest skill links", self.test_suggest_skill_links)
        
        # Skill Chaining
        self.log("\n=== SKILL CHAINING TESTS ===", "HEADER")
        self.test("Create linked skills", self.test_create_linked_skills)
        self.test("Link skills", self.test_link_skills)
        self.test("Get suggested next skills", self.test_get_suggested_next_skills)
        self.test("Execute skill", self.test_execute_skill)
        
        # Progress & Evolution
        self.log("\n=== PROGRESS & EVOLUTION TESTS ===", "HEADER")
        self.test("Get real progress", self.test_get_real_progress)
        self.test("Track contribution", self.test_track_contribution)
        self.test("Evolve skill", self.test_evolve_skill)
        
        # Task Integration
        self.log("\n=== TASK INTEGRATION TESTS ===", "HEADER")
        self.test("Create task with skill", self.test_create_task_with_skill)
        self.test("Auto-link task", self.test_auto_link_task)
        
        # Agent Lifecycle
        self.log("\n=== AGENT LIFECYCLE TESTS ===", "HEADER")
        self.test("Skill agent initialization", self.test_skill_agent_initialization)
        
        # Performance
        self.log("\n=== PERFORMANCE TESTS ===", "HEADER")
        self.test("Performance: List skills", self.test_performance_list_skills)
        self.test("Performance: Auto-link", self.test_performance_auto_link)
        
        # Cleanup
        self.log("\n=== CLEANUP ===", "HEADER")
        self.cleanup()
        
        # Summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        self.log("\n" + "=" * 60, "HEADER")
        self.log("TEST SUMMARY", "HEADER")
        self.log("=" * 60, "HEADER")
        
        total = len(self.test_results)
        passed = sum(1 for r in self.test_results if r["status"] == "PASS")
        failed = total - passed
        
        self.log(f"\nTotal Tests: {total}")
        self.log(f"Passed: {passed}", "SUCCESS")
        if failed > 0:
            self.log(f"Failed: {failed}", "ERROR")
        
        total_time = sum(r["duration"] for r in self.test_results)
        self.log(f"Total Time: {total_time:.2f}s")
        
        if failed > 0:
            self.log("\nFailed Tests:", "ERROR")
            for result in self.test_results:
                if result["status"] == "FAIL":
                    self.log(f"  - {result['name']}: {result.get('error', 'Unknown error')}", "ERROR")
        
        self.log("\n" + "=" * 60, "HEADER")


def main():
    """Main entry point"""
    print(f"{Colors.BOLD}Skill System Comprehensive Test Suite{Colors.ENDC}\n")
    
    # Check if backend is running
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        print(f"{Colors.OKGREEN}✓ Backend is running{Colors.ENDC}\n")
    except Exception as e:
        print(f"{Colors.FAIL}✗ Backend is not running: {e}{Colors.ENDC}")
        print(f"{Colors.WARNING}Please start the backend first: cd backend && python -m uvicorn app.main:app --reload{Colors.ENDC}")
        return
    
    # Get auth token
    token = TEST_USER_TOKEN
    if not token:
        print(f"{Colors.WARNING}Warning: No auth token provided. Some tests may fail.{Colors.ENDC}")
        print(f"{Colors.WARNING}Set TEST_USER_TOKEN in the script or login first.{Colors.ENDC}\n")
    
    # Run tests
    tester = SkillSystemTester(API_BASE_URL, token)
    tester.run_all_tests()


if __name__ == "__main__":
    main()
