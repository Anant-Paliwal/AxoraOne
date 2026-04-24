"""
Skill Background Runner - Continuous autonomous skill processing

This module ensures skills run FOREVER in the background, continuously:
- Observing workspace state
- Detecting patterns
- Proposing actions
- Learning and evolving

The runner starts when the backend starts and runs until shutdown.
"""

import asyncio
from typing import Dict, Set
from datetime import datetime, timedelta
from app.core.supabase import supabase_admin
from app.services.skill_agent import SkillAgent, SkillAgentManager, get_skill_manager

class SkillBackgroundRunner:
    """
    Background runner that keeps all skill agents alive and processing.
    
    This ensures the lifecycle runs FOREVER:
    Observe → Detect Pattern → Activate → Reason → Propose Action → 
    Execute → Evaluate → Learn → Evolve → REPEAT
    """
    
    def __init__(self):
        self._running = False
        self._task: asyncio.Task = None
        self._workspace_managers: Dict[str, SkillAgentManager] = {}
        self._active_workspaces: Set[str] = set()
        
        # Configuration
        self._scan_interval = 60  # Seconds between full workspace scans
        self._pattern_check_interval = 300  # Seconds between pattern detection runs
        self._evolution_interval = 3600  # Seconds between evolution cycles
        
        self._last_pattern_check: Dict[str, datetime] = {}
        self._last_evolution: Dict[str, datetime] = {}
    
    async def start(self):
        """Start the background runner"""
        if self._running:
            return
        
        self._running = True
        self._task = asyncio.create_task(self._run_forever())
        print("🧠 Skill Background Runner started - Skills are now autonomous agents")
    
    async def stop(self):
        """Stop the background runner"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        print("🧠 Skill Background Runner stopped")
    
    async def _run_forever(self):
        """Main loop that runs forever"""
        while self._running:
            try:
                # 1. Discover active workspaces
                await self._discover_workspaces()
                
                # 2. For each workspace, run skill lifecycle
                for workspace_id in self._active_workspaces:
                    await self._process_workspace(workspace_id)
                
                # 3. Sleep before next cycle
                await asyncio.sleep(self._scan_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error in skill background runner: {e}")
                await asyncio.sleep(10)  # Brief pause on error
    
    async def _discover_workspaces(self):
        """Discover all active workspaces with skills"""
        try:
            # Get workspaces that have skills
            response = supabase_admin.table("skills")\
                .select("workspace_id")\
                .not_.is_("workspace_id", "null")\
                .execute()
            
            if response.data:
                workspace_ids = set(s["workspace_id"] for s in response.data if s.get("workspace_id"))
                self._active_workspaces = workspace_ids
        except Exception as e:
            print(f"Error discovering workspaces: {e}")
    
    async def _process_workspace(self, workspace_id: str):
        """Process all skills in a workspace"""
        try:
            now = datetime.utcnow()
            
            # Get or create manager for this workspace
            if workspace_id not in self._workspace_managers:
                self._workspace_managers[workspace_id] = SkillAgentManager(workspace_id)
            
            manager = self._workspace_managers[workspace_id]
            
            # Check if it's time for pattern detection
            last_pattern = self._last_pattern_check.get(workspace_id, datetime.min)
            if (now - last_pattern).total_seconds() >= self._pattern_check_interval:
                await self._run_pattern_detection(workspace_id, manager)
                self._last_pattern_check[workspace_id] = now
            
            # Check if it's time for evolution
            last_evolution = self._last_evolution.get(workspace_id, datetime.min)
            if (now - last_evolution).total_seconds() >= self._evolution_interval:
                await self._run_evolution_cycle(workspace_id, manager)
                self._last_evolution[workspace_id] = now
            
            # Check for overdue tasks and emit signals
            await self._check_overdue_tasks(workspace_id)
            
            # Check for neglected pages
            await self._check_neglected_pages(workspace_id)
            
        except Exception as e:
            print(f"Error processing workspace {workspace_id}: {e}")
    
    async def _run_pattern_detection(self, workspace_id: str, manager: SkillAgentManager):
        """Run pattern detection for all skills in workspace"""
        try:
            # Get all skills
            skills = supabase_admin.table("skills")\
                .select("id")\
                .eq("workspace_id", workspace_id)\
                .execute()
            
            if not skills.data:
                return
            
            # Create a synthetic "heartbeat" signal for pattern detection
            heartbeat_signal = {
                "signal_type": "heartbeat",
                "source_id": workspace_id,
                "source_type": "workspace",
                "workspace_id": workspace_id,
                "user_id": "",  # System-generated
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Process through all skills
            for skill in skills.data:
                agent = await manager.get_or_create_agent(skill["id"])
                
                # Run pattern detection phase
                patterns = await agent.detect_pattern()
                
                if patterns:
                    # If patterns found, run full lifecycle
                    result = await agent.run_lifecycle(heartbeat_signal)
                    
                    if result.get("activated"):
                        print(f"  🎯 Skill {skill['id']} activated with {len(result.get('patterns', []))} patterns")
                        
        except Exception as e:
            print(f"Error in pattern detection for {workspace_id}: {e}")
    
    async def _run_evolution_cycle(self, workspace_id: str, manager: SkillAgentManager):
        """Run evolution for all skills that have accumulated learning"""
        try:
            # Check if skill_memory table exists first
            try:
                skills_with_memory = supabase_admin.table("skill_memory")\
                    .select("skill_id")\
                    .limit(1)\
                    .execute()
            except Exception as table_error:
                # Table doesn't exist yet - skip evolution
                if "skill_memory" in str(table_error):
                    return
                raise table_error
            
            if not skills_with_memory.data:
                return
            
            # Get all skill_ids with memory
            all_memory = supabase_admin.table("skill_memory")\
                .select("skill_id")\
                .execute()
            
            if not all_memory.data:
                return
                
            skill_ids = [s["skill_id"] for s in all_memory.data]
            
            # Get skills in this workspace
            workspace_skills = supabase_admin.table("skills")\
                .select("id")\
                .eq("workspace_id", workspace_id)\
                .in_("id", skill_ids)\
                .execute()
            
            for skill in workspace_skills.data or []:
                agent = await manager.get_or_create_agent(skill["id"])
                
                # Check if skill has enough data to evolve
                if agent.memory and len(agent.memory.confidence_adjustments) >= 5:
                    await agent.evolve()
                    print(f"  🧬 Skill {skill['id']} evolved")
                    
        except Exception as e:
            print(f"Error in evolution cycle for {workspace_id}: {e}")
    
    async def _check_overdue_tasks(self, workspace_id: str):
        """Check for overdue tasks and emit signals"""
        try:
            today = datetime.utcnow().date().isoformat()
            
            # Find overdue tasks
            overdue = supabase_admin.table("tasks")\
                .select("id, title, linked_skill_id, user_id")\
                .eq("workspace_id", workspace_id)\
                .in_("status", ["todo", "in-progress"])\
                .lt("due_date", today)\
                .execute()
            
            if overdue.data:
                # Emit signals for overdue tasks
                from app.services.intelligence_engine import intelligence_engine, Signal, SignalType
                
                for task in overdue.data:
                    await intelligence_engine.emit_signal(Signal(
                        type=SignalType.TASK_OVERDUE,
                        source_id=task["id"],
                        source_type="task",
                        workspace_id=workspace_id,
                        user_id=task.get("user_id", ""),
                        data=task,
                        priority=7
                    ))
                    
        except Exception as e:
            print(f"Error checking overdue tasks: {e}")
    
    async def _check_neglected_pages(self, workspace_id: str):
        """Check for neglected pages and emit signals"""
        try:
            # Pages not updated in 30 days
            threshold = (datetime.utcnow() - timedelta(days=30)).isoformat()
            
            neglected = supabase_admin.table("pages")\
                .select("id, title, user_id")\
                .eq("workspace_id", workspace_id)\
                .eq("is_archived", False)\
                .lt("updated_at", threshold)\
                .limit(10)\
                .execute()
            
            if neglected.data and len(neglected.data) >= 3:
                # Emit signal for neglected pages pattern
                from app.services.intelligence_engine import intelligence_engine, Signal, SignalType
                
                await intelligence_engine.emit_signal(Signal(
                    type=SignalType.PAGE_NEGLECTED,
                    source_id=workspace_id,
                    source_type="workspace",
                    workspace_id=workspace_id,
                    user_id=neglected.data[0].get("user_id", ""),
                    data={"pages": neglected.data, "count": len(neglected.data)},
                    priority=4
                ))
                
        except Exception as e:
            print(f"Error checking neglected pages: {e}")
    
    def register_workspace(self, workspace_id: str):
        """Register a workspace for skill processing"""
        self._active_workspaces.add(workspace_id)
    
    def unregister_workspace(self, workspace_id: str):
        """Unregister a workspace"""
        self._active_workspaces.discard(workspace_id)
        if workspace_id in self._workspace_managers:
            del self._workspace_managers[workspace_id]


# Global instance
skill_runner = SkillBackgroundRunner()


async def start_skill_runner():
    """Start the global skill runner"""
    await skill_runner.start()


async def stop_skill_runner():
    """Stop the global skill runner"""
    await skill_runner.stop()
