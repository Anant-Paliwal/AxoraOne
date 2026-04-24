# 🎯 Skill Insights & Suggestions - Action Plan

## ✅ What You Want

1. **Delete** UnifiedSkillHubWidget (not needed)
2. **Enhance** WorkspacePulseWidget to show skill insights
3. **Enhance** SuggestedActionWidget to show skill suggestions
4. **Connect** both widgets to skill intelligence system

---

## 📋 STEP-BY-STEP PLAN

### STEP 1: Fix workspace_id (CRITICAL - Do This First!)

**Why**: Without workspace_id, skills can't track contributions, so no insights/suggestions will work.

**Run in Supabase SQL Editor**:

```sql
-- Get your workspace ID
SELECT id, name FROM workspaces;

-- Copy the workspace ID, then run:
UPDATE skills 
SET workspace_id = 'YOUR_WORKSPACE_ID_HERE'
WHERE workspace_id IS NULL;

-- Verify
SELECT COUNT(*) FROM skills WHERE workspace_id IS NULL;
-- Should return 0
```

---

### STEP 2: Delete UnifiedSkillHubWidget

**File to delete**: `src/components/dashboard/widgets/UnifiedSkillHubWidget.tsx`

**Also remove from**:
- HomePage.tsx (if it's imported there)
- Any dashboard configuration files

---

### STEP 3: Enhance WorkspacePulseWidget (Skill Insights)

**File**: `src/components/dashboard/widgets/WorkspacePulseWidget.tsx`

**Add these skill insights**:

1. **Skill Progress Insights**
   - "Data Analytics at 85% - Ready to evolve soon!"
   - "Python skill stalled at 20% for 7 days"
   - "3 skills need attention"

2. **Skill Contribution Insights**
   - "No contributions to Web Development in 14 days"
   - "Data Analytics: 5 contributions this week (+0.75 impact)"
   - "Machine Learning: Only 1 contribution type (need diversity)"

3. **Skill Blocker Insights**
   - "Data Analytics blocked by 3 overdue tasks"
   - "Python skill has no linked pages"
   - "SQL skill needs 2 more contributions to evolve"

4. **Skill Health Insights**
   - "2 skills are healthy and growing"
   - "1 skill is stalled (no activity)"
   - "1 skill is blocked (overdue tasks)"

**What to add**:
```typescript
// Add skill progress data
const [skillProgress, setSkillProgress] = useState<Record<string, any>>({});

// Load real progress for all skills
const loadSkillProgress = async () => {
  const progressData: Record<string, any> = {};
  for (const skill of skills) {
    try {
      const progress = await api.getSkillRealProgress(skill.id);
      progressData[skill.id] = progress;
    } catch (error) {
      console.error(`Failed to load progress for ${skill.id}:`, error);
    }
  }
  setSkillProgress(progressData);
};

// Add skill-specific insights
const skillInsights = useMemo(() => {
  const insights = [];
  
  // Check for skills ready to evolve
  for (const skill of skills) {
    const progress = skillProgress[skill.id];
    if (progress?.progress >= 80 && progress?.progress < 100) {
      insights.push({
        type: 'skill_ready_to_evolve',
        message: `${skill.name} at ${progress.progress}% - Almost ready to evolve!`,
        severity: 'info',
        skillId: skill.id,
        skillName: skill.name
      });
    }
  }
  
  // Check for stalled skills
  for (const skill of skills) {
    const progress = skillProgress[skill.id];
    if (progress?.contribution_count === 0) {
      insights.push({
        type: 'skill_stalled',
        message: `${skill.name} has no contributions yet`,
        severity: 'warning',
        skillId: skill.id,
        skillName: skill.name
      });
    }
  }
  
  // Check for skills blocked by tasks
  const skillTaskCounts: Record<string, number> = {};
  const skillOverdueCounts: Record<string, number> = {};
  
  tasks.forEach(task => {
    if (task.linked_skill_id) {
      skillTaskCounts[task.linked_skill_id] = (skillTaskCounts[task.linked_skill_id] || 0) + 1;
      if (task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done') {
        skillOverdueCounts[task.linked_skill_id] = (skillOverdueCounts[task.linked_skill_id] || 0) + 1;
      }
    }
  });
  
  for (const [skillId, overdueCount] of Object.entries(skillOverdueCounts)) {
    if (overdueCount >= 2) {
      const skill = skills.find(s => s.id === skillId);
      insights.push({
        type: 'skill_blocked',
        message: `${skill?.name} blocked by ${overdueCount} overdue tasks`,
        severity: 'critical',
        skillId: skillId,
        skillName: skill?.name
      });
    }
  }
  
  return insights;
}, [skills, skillProgress, tasks]);
```

---

### STEP 4: Enhance SuggestedActionWidget (Skill Suggestions)

**File**: `src/components/dashboard/widgets/SuggestedActionWidget.tsx`

**Add these skill suggestions**:

1. **Progress-Based Suggestions**
   - "Link 2 more pages to Data Analytics to reach 100%"
   - "Complete 1 more task to evolve Python skill"
   - "Add contribution diversity to SQL skill"

2. **Activity-Based Suggestions**
   - "Data Analytics hasn't been used in 7 days - Link a page"
   - "Python skill needs tasks - Create a task"
   - "Web Development has no evidence - Link pages"

3. **Evolution Suggestions**
   - "Data Analytics ready to evolve - Click to level up!"
   - "Python at 95% - One more contribution to evolve"
   - "SQL needs 0.2 more impact to reach Intermediate"

4. **Smart Next Steps**
   - "You learned SQL basics - Try advanced queries next"
   - "Python skill suggests: Learn about decorators"
   - "Data Analytics chains to: Machine Learning"

**What to add**:
```typescript
// Add skill progress data
const [skillProgress, setSkillProgress] = useState<Record<string, any>>({});

// Load skill progress
const loadSkillProgress = async () => {
  const progressData: Record<string, any> = {};
  for (const skill of skills) {
    try {
      const progress = await api.getSkillRealProgress(skill.id);
      progressData[skill.id] = progress;
    } catch (error) {
      console.error(`Failed to load progress for ${skill.id}:`, error);
    }
  }
  setSkillProgress(progressData);
};

// Add skill-based suggestions
const skillSuggestions = useMemo(() => {
  const suggestions = [];
  
  // Suggest evolution for skills at 100%
  for (const skill of skills) {
    const progress = skillProgress[skill.id];
    if (progress?.can_evolve) {
      return {
        type: 'evolve_skill',
        message: `${skill.name} is ready to evolve to ${getNextLevel(skill.level)}!`,
        actionLabel: 'Evolve Skill',
        actionRoute: `/skills?evolve=${skill.id}`,
        icon: 'sparkles',
        priority: 10 // Highest priority
      };
    }
  }
  
  // Suggest contributions for skills close to evolution
  for (const skill of skills) {
    const progress = skillProgress[skill.id];
    if (progress?.progress >= 80 && progress?.progress < 100) {
      const needed = 100 - progress.progress;
      return {
        type: 'boost_skill',
        message: `${skill.name} at ${progress.progress}% - ${Math.ceil(needed / 15)} more contributions to evolve`,
        actionLabel: 'Link Page',
        actionRoute: `/pages?link_to=${skill.id}`,
        icon: 'target',
        priority: 9
      };
    }
  }
  
  // Suggest reactivating stalled skills
  for (const skill of skills) {
    const progress = skillProgress[skill.id];
    if (progress?.contribution_count === 0) {
      return {
        type: 'activate_skill',
        message: `${skill.name} has no activity - Start building progress`,
        actionLabel: 'Link Page',
        actionRoute: `/pages?link_to=${skill.id}`,
        icon: 'brain',
        priority: 7
      };
    }
  }
  
  // Suggest adding diversity
  for (const skill of skills) {
    const progress = skillProgress[skill.id];
    if (progress?.contribution_types === 1 && progress?.contribution_count >= 3) {
      return {
        type: 'diversify_skill',
        message: `${skill.name} needs contribution diversity - Try completing a task`,
        actionLabel: 'View Tasks',
        actionRoute: `/tasks?skill=${skill.id}`,
        icon: 'target',
        priority: 6
      };
    }
  }
  
  return null;
}, [skills, skillProgress]);

function getNextLevel(currentLevel: string): string {
  const levels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
  const currentIndex = levels.indexOf(currentLevel);
  return levels[currentIndex + 1] || 'Master';
}
```

---

### STEP 5: Connect to Backend Intelligence

**Backend already has these endpoints**:

1. **Get Real Progress**
   ```
   GET /api/v1/intelligence/skills/{skill_id}/real-progress
   ```
   Returns: progress, can_evolve, total_impact, contribution_count, etc.

2. **Get Suggested Next Skills**
   ```
   GET /api/v1/skills/{skill_id}/suggested-next
   ```
   Returns: Chained skills, prerequisites, suggestions

3. **Execute Skill**
   ```
   POST /api/v1/skills/{skill_id}/execute
   ```
   Returns: Execution result, suggestions

**Widgets should call these APIs** to get real-time data.

---

### STEP 6: Test the System

**After implementing changes**:

1. **Fix workspace_id** (Step 1)
2. **Restart backend**
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload
   ```

3. **Link a page to a skill**
   - Go to Pages
   - Open a page
   - Click "Link to Skill"
   - Select a skill

4. **Check backend logs**
   ```
   ✅ Contribution tracked: page_linked to skill XXX
   ```

5. **Check WorkspacePulseWidget**
   - Should show: "Data Analytics: 1 contribution (+0.15 impact)"
   - Or: "Python skill has no contributions yet"

6. **Check SuggestedActionWidget**
   - Should show: "Link 2 more pages to Data Analytics to reach 100%"
   - Or: "Python skill needs activity - Link a page"

---

## 📊 WHAT EACH WIDGET WILL SHOW

### WorkspacePulseWidget (Insights)

**Shows workspace health + skill insights**:

```
🧠 WORKSPACE PULSE

⚠️ CRITICAL
Data Analytics blocked by 3 overdue tasks
[View Skill →]

💡 INSIGHTS
• Python at 85% - Almost ready to evolve
• Web Development stalled for 14 days
• SQL needs contribution diversity

📊 HEALTH
2 skills healthy | 1 stalled | 1 blocked
```

---

### SuggestedActionWidget (Suggestions)

**Shows ONE best action based on skills**:

```
✨ SUGGESTED ACTION

🎯 Link 2 more pages to Data Analytics

Why: You're at 70% progress. Two more 
contributions will get you to 100% and 
ready to evolve to Intermediate level.

Impact: High
Time: 5 minutes

[Link Page →]
```

---

## 🎯 SUMMARY

**What to do**:

1. ✅ Run SQL to fix workspace_id
2. ✅ Delete UnifiedSkillHubWidget.tsx
3. ✅ Enhance WorkspacePulseWidget with skill insights
4. ✅ Enhance SuggestedActionWidget with skill suggestions
5. ✅ Test by linking pages and completing tasks

**Result**:
- WorkspacePulseWidget shows skill health and blockers
- SuggestedActionWidget shows smart next actions
- Both widgets use real skill contribution data
- Intelligence system guides user to improve skills

**Time to implement**: 2-3 hours
**Impact**: High - Makes skill system intelligent and actionable
