# Skill System - Quick Reference Guide

## 🚀 Quick Start

### 1. Create a Skill
```typescript
await api.createSkill({
  name: "Python Programming",
  level: "Beginner",
  description: "Learn Python from scratch",
  skill_type: "learning",
  goals: ["Complete 10 projects"],
  workspace_id: workspaceId
});
```

### 2. Link Content
```typescript
// Link a page
await api.addSkillEvidence(skillId, {
  page_id: pageId,
  evidence_type: "page",
  notes: "Tutorial page"
});

// Auto-link (happens automatically on page creation)
await api.autoLinkPageToSkills(
  pageId, title, content, tags, workspaceId
);
```

### 3. Track Progress
```typescript
// Get real progress
const progress = await api.getSkillRealProgress(skillId);
console.log(`Progress: ${progress.progress}%`);
console.log(`Can evolve: ${progress.can_evolve}`);
```

### 4. Evolve Skill
```typescript
if (progress.can_evolve) {
  const result = await api.evolveSkill(skillId);
  console.log(`Evolved to ${result.new_level}!`);
}
```

---

## 📚 API Endpoints

### Skills CRUD
- `GET /skills?workspace_id={id}` - List skills
- `POST /skills` - Create skill
- `PATCH /skills/{id}` - Update skill
- `DELETE /skills/{id}` - Delete skill

### Evidence Linking
- `POST /skills/{id}/evidence` - Add evidence
- `DELETE /skills/{id}/evidence/{evidence_id}` - Remove evidence

### Skill Chaining
- `GET /skills/{id}/suggested-next` - Get suggestions
- `POST /skills/{id}/execute` - Execute skill
- `POST /skills/{source_id}/link/{target_id}` - Link skills
- `DELETE /skills/{source_id}/link/{target_id}` - Unlink skills

### Intelligence
- `GET /intelligence/skills/{id}/real-progress` - Get progress
- `POST /intelligence/skills/{id}/evolve` - Evolve skill
- `POST /intelligence/skills/auto-link/page` - Auto-link page
- `POST /intelligence/skills/auto-link/task` - Auto-link task
- `GET /intelligence/skills/suggest-links/page/{id}` - Get suggestions

---

## 🎯 Common Use Cases

### Use Case 1: Learning Path
```typescript
// 1. Create beginner skill
const python = await api.createSkill({
  name: "Python Basics",
  level: "Beginner",
  skill_type: "learning"
});

// 2. Create advanced skill with prerequisite
const advanced = await api.createSkill({
  name: "Python Advanced",
  level: "Intermediate",
  prerequisite_skills: [python.id]
});

// 3. Link them for chaining
await api.linkSkills(python.id, advanced.id);

// 4. Execute and get suggestions
const result = await api.executeSkill(python.id, {
  trigger_source: "manual"
});
console.log(result.suggested_next); // Shows advanced skill
```

### Use Case 2: Auto-Linking Content
```typescript
// Create a page (auto-linking happens automatically)
const page = await api.createPage({
  title: "Python Tutorial: Lists and Dictionaries",
  content: "Learn about Python data structures...",
  tags: ["python", "tutorial"],
  workspace_id: workspaceId
});

// Check what was auto-linked
const skills = await api.getSkills(workspaceId);
const pythonSkill = skills.find(s => s.name.includes("Python"));
console.log(pythonSkill.linked_evidence); // Page should be here
```

### Use Case 3: Track Real Progress
```typescript
// Complete tasks linked to skill
await api.updateTask(taskId, { status: "completed" });

// Track contribution
await api.trackSuggestionAccepted(
  skillId, suggestionId, workspaceId
);

// Check progress
const progress = await api.getSkillRealProgress(skillId);
console.log(`
  Progress: ${progress.progress}%
  Impact: ${progress.total_impact}
  Contributions: ${progress.contribution_count}
  Can Evolve: ${progress.can_evolve}
`);
```

### Use Case 4: Skill Agent Lifecycle
```python
# Backend code
from app.services.skill_agent import get_skill_manager

# Process a signal (page created, task completed, etc.)
manager = get_skill_manager(workspace_id)
results = await manager.process_signal({
    "signal_type": "page_created",
    "page_id": page_id,
    "title": "Python Tutorial",
    "content": "...",
    "linked_skill_id": skill_id
})

# Check what happened
for result in results:
    if result["activated"]:
        print(f"Skill {result['skill_id']} activated!")
        print(f"Patterns: {result['patterns']}")
        print(f"Actions: {result['actions_proposed']}")
```

---

## 🔧 Configuration

### Auto-Linking Thresholds
```python
# backend/app/services/skill_auto_linker.py
class SkillAutoLinker:
    def __init__(self):
        self.confidence_threshold = 0.6  # Auto-link at 60%
```

### Agent Activation Threshold
```python
# backend/app/services/skill_agent.py
class SkillAgent:
    def __init__(self, skill_id: str, workspace_id: str):
        self._activation_threshold = 0.6  # Activate at 60% relevance
```

### Evolution Requirements
```python
# backend/app/services/skill_contribution_tracker.py
level_requirements = {
    "Beginner": {
        "min_impact": 0.5,
        "min_contributions": 5,
        "min_types": 2
    },
    "Intermediate": {
        "min_impact": 1.5,
        "min_contributions": 15,
        "min_types": 3
    },
    "Advanced": {
        "min_impact": 3.0,
        "min_contributions": 30,
        "min_types": 4
    }
}
```

---

## 🐛 Troubleshooting

### Problem: Skills not loading
```typescript
// Check workspace context
console.log(currentWorkspace);

// Try fetching directly
const skills = await api.getSkills(workspaceId);
console.log(skills);

// Check backend logs
// Look for errors in skill fetching
```

### Problem: Auto-linking not working
```typescript
// Check if auto-linker is being called
// Add logging in backend:
// backend/app/services/skill_auto_linker.py

// Test manually
const result = await api.autoLinkPageToSkills(
  pageId, title, content, tags, workspaceId
);
console.log(result.links_created);
```

### Problem: Progress stuck at 0%
```typescript
// Check contributions
const progress = await api.getSkillRealProgress(skillId);
console.log(progress);

// Track a contribution manually
await api.trackSuggestionAccepted(
  skillId, "test-suggestion", workspaceId
);

// Check again
const newProgress = await api.getSkillRealProgress(skillId);
console.log(newProgress);
```

### Problem: Cannot evolve skill
```typescript
// Check requirements
const progress = await api.getSkillRealProgress(skillId);
console.log(`
  Progress: ${progress.progress}%
  Can Evolve: ${progress.can_evolve}
  Requirements: ${JSON.stringify(progress.requirements)}
  Current:
    - Impact: ${progress.total_impact}
    - Contributions: ${progress.contribution_count}
    - Types: ${progress.contribution_types}
`);

// If requirements not met, complete more tasks
// or track more contributions
```

---

## 📊 Monitoring

### Check Skill Health
```typescript
const skills = await api.getSkills(workspaceId);

for (const skill of skills) {
  const progress = await api.getSkillRealProgress(skill.id);
  
  console.log(`
    Skill: ${skill.name}
    Level: ${skill.level}
    Confidence: ${skill.confidence_score}
    Progress: ${progress.progress}%
    Activations: ${skill.activation_count}
    Last Active: ${skill.last_activated_at}
  `);
}
```

### Check Auto-Linking Performance
```typescript
const start = Date.now();
const result = await api.autoLinkPageToSkills(
  pageId, title, content, tags, workspaceId
);
const duration = Date.now() - start;

console.log(`
  Auto-linking took: ${duration}ms
  Links created: ${result.links_created.length}
  Average confidence: ${
    result.links_created.reduce((sum, l) => sum + l.confidence, 0) / 
    result.links_created.length
  }
`);
```

### Check Agent Activity
```python
# Backend monitoring
from app.services.skill_agent import get_skill_manager

manager = get_skill_manager(workspace_id)
print(f"Active agents: {len(manager.agents)}")

for skill_id, agent in manager.agents.items():
    print(f"
        Skill: {skill_id}
        State: {agent.state}
        Activations: {len(agent.memory.activation_history)}
        Success Rate: {
            len(agent.memory.successful_patterns) / 
            max(1, len(agent.memory.successful_patterns) + len(agent.memory.failed_patterns))
        }
    ")
```

---

## 🎓 Best Practices

### 1. Skill Naming
- ✅ "Python Programming"
- ✅ "Data Analysis with SQL"
- ❌ "Skill 1"
- ❌ "Learn stuff"

### 2. Skill Levels
- **Beginner**: Just starting, learning basics
- **Intermediate**: Comfortable with fundamentals
- **Advanced**: Deep expertise, complex projects
- **Expert**: Mastery, teaching others

### 3. Evidence Linking
- Link pages with learning content
- Link tasks for practice
- Link completed projects
- Don't over-link unrelated content

### 4. Skill Chaining
- Link related skills (Python → Django)
- Set prerequisites (Basics → Advanced)
- Create learning paths
- Don't create circular dependencies

### 5. Progress Tracking
- Complete tasks regularly
- Accept good suggestions
- Reject bad suggestions (helps learning)
- Review progress weekly

---

## 🔐 Permissions

### Viewer
- ✅ View skills
- ❌ Create/edit/delete

### Member
- ✅ View skills
- ✅ Create skills
- ✅ Edit own skills
- ❌ Delete skills

### Admin
- ✅ View skills
- ✅ Create skills
- ✅ Edit all skills
- ✅ Delete skills

### Owner
- ✅ Full access

---

## 📈 Performance Tips

### 1. Batch Operations
```typescript
// Bad: Multiple individual calls
for (const skill of skills) {
  await api.getSkillRealProgress(skill.id);
}

// Good: Fetch all at once (if endpoint exists)
const allProgress = await api.getBatchSkillProgress(skillIds);
```

### 2. Cache Results
```typescript
// Cache skill list
const skillsCache = new Map();

async function getSkillsCached(workspaceId) {
  if (!skillsCache.has(workspaceId)) {
    const skills = await api.getSkills(workspaceId);
    skillsCache.set(workspaceId, skills);
  }
  return skillsCache.get(workspaceId);
}
```

### 3. Debounce Auto-Linking
```typescript
// Don't auto-link on every keystroke
const debouncedAutoLink = debounce(async (page) => {
  await api.autoLinkPageToSkills(
    page.id, page.title, page.content, page.tags, workspaceId
  );
}, 2000); // Wait 2 seconds after last edit
```

---

## 🧪 Testing

### Unit Test Example
```python
# test_skill_auto_linker.py
import pytest
from app.services.skill_auto_linker import SkillAutoLinker

@pytest.mark.asyncio
async def test_calculate_relevance():
    linker = SkillAutoLinker()
    
    skill = {
        "name": "Python Programming",
        "description": "Learn Python",
        "evidence": ["python", "programming", "code"]
    }
    
    # High relevance
    score = await linker._calculate_relevance(
        skill=skill,
        title="Python Programming Tutorial",
        content="Learn Python programming basics",
        tags=["python"]
    )
    assert score >= 0.6
    
    # Low relevance
    score = await linker._calculate_relevance(
        skill=skill,
        title="JavaScript Tutorial",
        content="Learn JavaScript",
        tags=["javascript"]
    )
    assert score < 0.4
```

### Integration Test Example
```python
# test_skill_system_integration.py
import pytest
from app.services.skill_agent import SkillAgent

@pytest.mark.asyncio
async def test_skill_lifecycle():
    agent = SkillAgent(skill_id, workspace_id)
    await agent.initialize()
    
    # Test observe phase
    relevance = await agent.observe({
        "signal_type": "page_created",
        "linked_skill_id": skill_id
    })
    assert relevance > 0.5
    
    # Test detect phase
    patterns = await agent.detect_pattern()
    assert len(patterns) >= 0
    
    # Test activation
    should_activate = await agent.should_activate(relevance, patterns)
    if should_activate:
        await agent.activate()
        assert agent.state == SkillState.ACTIVATED
```

---

## 📚 Resources

### Documentation
- [Architecture Overview](./SKILL_SYSTEM_COMPREHENSIVE_ANALYSIS.md)
- [API Reference](./backend/app/api/endpoints/skills.py)
- [Agent Lifecycle](./backend/app/services/skill_agent.py)

### Examples
- [Test Suite](./test_skill_system_comprehensive.py)
- [Frontend Integration](./src/pages/SkillsPage.tsx)
- [Dashboard Widget](./src/components/dashboard/widgets/UnifiedSkillHubWidget.tsx)

---

**Last Updated:** January 18, 2026
