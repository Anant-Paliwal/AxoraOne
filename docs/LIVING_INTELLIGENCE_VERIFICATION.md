# Living Intelligence OS - Verification Checklist

## Architecture Verification

### ✅ Pages → Context Anchors
Pages are now context containers that:
- Emit signals when created/edited (`PAGE_CREATED`, `PAGE_EDITED`)
- Auto-link to relevant skills based on content
- Detect implied tasks from action phrases
- Update knowledge graph automatically
- Track `inferred_intent`, `inferred_domain`, `time_sensitivity`

**Files:**
- `backend/app/api/endpoints/pages.py` - Signal emission on create
- `backend/app/services/intelligence_engine.py` - `_handle_page_created()`

### ✅ Skills → Autonomous Agents
Each skill is a long-living agent with complete lifecycle:

```
OBSERVE → DETECT PATTERN → ACTIVATE → REASON → PROPOSE ACTION → 
EXECUTE → EVALUATE → LEARN → EVOLVE → REPEAT FOREVER
```

**Files:**
- `backend/app/services/skill_agent.py` - `SkillAgent` class with all lifecycle phases
- `backend/app/services/skill_background_runner.py` - Continuous background processing

**Lifecycle Implementation:**

| Phase | Method | Description |
|-------|--------|-------------|
| OBSERVE | `observe()` | Calculate relevance score for signals |
| DETECT PATTERN | `detect_pattern()` | Find blocked_tasks, stalled_tasks, needs_content, etc. |
| ACTIVATE | `should_activate()` + `activate()` | Decide and transition to active state |
| REASON | `reason()` | Analyze patterns, determine actions |
| PROPOSE ACTION | `propose_actions()` | Store actions for user approval |
| EXECUTE | `execute_action()` | Run approved actions |
| EVALUATE | `evaluate()` | Check action outcomes |
| LEARN | `learn()` | Update memory based on success/failure |
| EVOLVE | `evolve()` | Adjust thresholds, improve behavior |

### ✅ Tasks → Goal-Bound Commitments
Tasks now have:
- Dynamic priority calculation based on urgency, skill bottlenecks, goal alignment
- Signal emission on completion/blocking
- Auto-linking to pages and skills
- `calculated_priority_score`, `goal_alignment_score`

**Files:**
- `backend/app/api/endpoints/tasks.py` - Signal emission on status change
- `backend/app/services/intelligence_engine.py` - `calculate_task_priority()`

### ✅ Home Screen → Decision Intelligence Surface
The home screen answers: "What matters right now, and why?"

**Sections:**
1. Quick Stats (Active Tasks, Completed Today, Overdue)
2. Pattern Alerts (Stalled tasks, Skill bottlenecks, Overload)
3. High Impact Tasks (Ranked by calculated priority with reasoning)
4. Active Contexts (Recently edited pages)
5. AI Insights (Generated insights with suggested actions)
6. Pending Actions (Proposed actions awaiting approval)
7. Skill Intelligence (Active skills, Skills needing attention)

**Files:**
- `src/components/intelligence/IntelligenceDashboard.tsx`
- `src/components/intelligence/RankedTaskList.tsx`
- `src/components/intelligence/PatternAlert.tsx`
- `src/components/intelligence/InsightCard.tsx`
- `src/components/intelligence/ProposedActionCard.tsx`

### ✅ Skills Run Forever in Background
The `SkillBackgroundRunner` ensures skills are always active:

```python
# backend/app/services/skill_background_runner.py

class SkillBackgroundRunner:
    _scan_interval = 60          # Check workspaces every 60 seconds
    _pattern_check_interval = 300  # Run pattern detection every 5 minutes
    _evolution_interval = 3600     # Evolve skills every hour
    
    async def _run_forever(self):
        while self._running:
            await self._discover_workspaces()
            for workspace_id in self._active_workspaces:
                await self._process_workspace(workspace_id)
            await asyncio.sleep(self._scan_interval)
```

**Startup Integration:**
```python
# backend/main.py
@asynccontextmanager
async def lifespan(app: FastAPI):
    await vector_store_service.initialize()
    await start_skill_runner()  # Skills start running FOREVER
    yield
    await stop_skill_runner()
```

## Database Schema

### New Tables
- `insights` - AI-generated insights
- `proposed_actions` - Actions awaiting approval (with `source_skill_id`)
- `skill_memory` - Persistent skill agent memory
- `skill_executions` - Skill activation history
- `entity_signals` - Signal log for pattern detection
- `user_trust_levels` - Trust levels for autonomous actions

### Enhanced Columns
- `pages`: `inferred_intent`, `inferred_domain`, `time_sensitivity`, `drift_score`
- `skills`: `confidence_score`, `last_activated_at`, `activation_count`, `success_rate`, `is_bottleneck`
- `tasks`: `calculated_priority_score`, `goal_alignment_score`, `auto_generated`

## API Endpoints

### Intelligence API (`/api/v1/intelligence/`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/insights` | GET | Get active insights |
| `/insights/{id}/dismiss` | POST | Dismiss insight |
| `/insights/{id}/act` | POST | Act on insight |
| `/actions/proposed` | GET | Get pending actions |
| `/actions/{id}/approve` | POST | Approve action (triggers LEARN) |
| `/actions/{id}/reject` | POST | Reject action (triggers LEARN) |
| `/patterns` | GET | Analyze patterns |
| `/tasks/ranked` | GET | Get priority-ranked tasks |
| `/tasks/{id}/priority` | GET | Get task priority calculation |
| `/home` | GET | Get intelligent home data |
| `/signals` | POST | Emit signal |
| `/skills/{id}/status` | GET | Get skill agent status |
| `/skills/{id}/activate` | POST | Manually trigger lifecycle |
| `/skills/{id}/evolve` | POST | Force evolution |
| `/skills/lifecycle-summary` | GET | All skills' status |

## Frontend Components

### Intelligence Store (`src/stores/intelligenceStore.ts`)
- `fetchHomeIntelligence()` - Load intelligent home data
- `fetchInsights()` - Load insights
- `dismissInsight()` - Dismiss insight
- `actOnInsight()` - Execute insight action
- `approveAction()` - Approve proposed action
- `rejectAction()` - Reject proposed action

### UI Components
- `IntelligenceDashboard` - Main intelligent home screen
- `InsightCard` - Display insights with actions
- `ProposedActionCard` - Display proposed actions
- `RankedTaskList` - Priority-ranked task list
- `PatternAlert` - Pattern detection alerts
- `SkillAgentStatus` - Skill agent monitoring

## Verification Tests

### 1. Background Runner Starts
```bash
# Start backend and check logs
cd backend
python -m uvicorn main:app --reload

# Should see:
# 🧠 Skill Background Runner started - Skills are now autonomous agents
# 🧠 Living Intelligence OS activated - Skills are autonomous agents
```

### 2. Skill Lifecycle Triggers
```bash
# Create a page and check if skills activate
curl -X POST http://localhost:8000/api/v1/pages \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "SQL Tutorial", "content": "Learn SQL basics", "workspace_id": "..."}'

# Check skill status
curl http://localhost:8000/api/v1/intelligence/skills/lifecycle-summary?workspace_id=...
```

### 3. Pattern Detection
```bash
# Get detected patterns
curl http://localhost:8000/api/v1/intelligence/patterns?workspace_id=...
```

### 4. Ranked Tasks
```bash
# Get priority-ranked tasks
curl http://localhost:8000/api/v1/intelligence/tasks/ranked?workspace_id=...
```

### 5. Home Intelligence
```bash
# Get intelligent home data
curl http://localhost:8000/api/v1/intelligence/home?workspace_id=...
```

## Key Behaviors

### When Page is Created:
1. Signal `PAGE_CREATED` emitted
2. All skill agents in workspace receive signal
3. Each skill calculates relevance
4. High-relevance skills activate
5. Patterns detected (needs_content, etc.)
6. Actions proposed (link to skill, extract tasks)
7. User approves/rejects
8. Skill learns from outcome

### When Task is Completed:
1. Signal `TASK_COMPLETED` emitted
2. Linked skill confidence updated
3. Next action suggested
4. Skill chain checked (unlock dependent skills)

### Every 5 Minutes (Background):
1. All workspaces scanned
2. Pattern detection runs for each skill
3. Overdue tasks detected
4. Neglected pages detected
5. Insights created

### Every Hour (Background):
1. Skills with accumulated learning evolve
2. Activation thresholds adjusted
3. User preferences updated

## Summary

The Living Intelligence OS is now fully implemented with:

✅ **Pages as Context Anchors** - Emit signals, auto-link, detect tasks
✅ **Skills as Autonomous Agents** - Full 9-phase lifecycle running forever
✅ **Tasks as Goal-Bound Commitments** - Dynamic priority, auto-linking
✅ **Home as Decision Intelligence Surface** - Shows what matters with reasoning
✅ **Background Runner** - Skills run continuously, not just on events
✅ **Learning & Evolution** - Skills improve based on user feedback
