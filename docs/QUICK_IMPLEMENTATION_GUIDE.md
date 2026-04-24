# Quick Implementation Guide - Skill-Connected Workspace

## 🚀 Priority Order (What to Build First)

### ✅ PHASE 1: Critical Connections (Week 1)

#### 1. Auto-Link Pages to Skills (HIGHEST PRIORITY)
**Why:** Makes skills automatically connect to content
**Impact:** Huge - reduces manual work by 80%

**Files to Modify:**
- `backend/app/api/endpoints/pages.py` - Emit signal on page creation
- `backend/app/services/intelligence_engine.py` - Already has `_auto_link_page_to_skills()`
- `src/pages/PageViewer.tsx` - Show suggestion banner

**Implementation:**
```python
# backend/app/api/endpoints/pages.py
@router.post("")
async def create_page(...):
    # After creating page
    page = response.data[0]
    
    # Emit signal for Intelligence Engine
    from app.services.intelligence_engine import intelligence_engine, Signal, SignalType
    await intelligence_engine.emit_signal(Signal(
        type=SignalType.PAGE_CREATED,
        source_id=page['id'],
        source_type="page",
        workspace_id=workspace_id,
        user_id=user_id,
        data=page,
        priority=8
    ))
```

```tsx
// src/pages/PageViewer.tsx - Add at top of page
const [skillSuggestions, setSkillSuggestions] = useState([]);

useEffect(() => {
  // Check for proposed actions
  api.getProposedActions(workspaceId, pageId).then(actions => {
    const linkActions = actions.filter(a => a.action_type === 'link_page_to_skill');
    setSkillSuggestions(linkActions);
  });
}, [pageId]);

// Render suggestion banner
{skillSuggestions.length > 0 && (
  <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
    <div className="flex items-center gap-2">
      <Lightbulb className="w-4 h-4 text-primary" />
      <span className="text-sm">
        This page relates to "{skillSuggestions[0].payload.skill_name}"
      </span>
      <Button size="sm" onClick={() => handleLinkSkill(skillSuggestions[0])}>
        Link Skill
      </Button>
      <Button size="sm" variant="ghost" onClick={() => handleDismiss(skillSuggestions[0])}>
        Dismiss
      </Button>
    </div>
  </div>
)}
```

---

#### 2. Show Skill Badges on Pages
**Why:** Visual connection between pages and skills
**Impact:** Medium - helps users see relationships

**Files to Modify:**
- `src/pages/PageViewer.tsx` - Add skill badges section

**Implementation:**
```tsx
// src/pages/PageViewer.tsx
const [linkedSkills, setLinkedSkills] = useState([]);

useEffect(() => {
  // Fetch skills linked to this page
  api.getPageSkills(pageId).then(setLinkedSkills);
}, [pageId]);

// Render below title
<div className="flex items-center gap-2 mb-4">
  <Brain className="w-4 h-4 text-primary" />
  <span className="text-sm text-muted-foreground">Improves:</span>
  {linkedSkills.map(skill => (
    <Link key={skill.id} to={`/skills?highlight=${skill.id}`}>
      <div className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs hover:bg-primary/20 transition-colors">
        {skill.name} {Math.round((skill.confidence_score || 0) * 100)}%
      </div>
    </Link>
  ))}
  {linkedSkills.length === 0 && (
    <span className="text-xs text-muted-foreground italic">No skills linked yet</span>
  )}
</div>
```

---

#### 3. Skills Need You Widget
**Why:** Shows urgent skills on home page
**Impact:** High - guides user attention

**Files to Create:**
- `src/components/dashboard/widgets/SkillsNeedYouWidget.tsx`

**Implementation:**
```tsx
// src/components/dashboard/widgets/SkillsNeedYouWidget.tsx
export function SkillsNeedYouWidget({ settings }: { settings?: Record<string, any> }) {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [urgentSkills, setUrgentSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentWorkspace) {
      loadUrgentSkills();
    }
  }, [currentWorkspace]);

  const loadUrgentSkills = async () => {
    try {
      setLoading(true);
      const [skills, tasks] = await Promise.all([
        api.getSkills(currentWorkspace.id),
        api.getTasks(currentWorkspace.id)
      ]);

      // Analyze which skills need attention
      const analyzed = skills.map(skill => {
        const linkedTasks = tasks.filter(t => t.linked_skill_id === skill.id);
        const overdueTasks = linkedTasks.filter(t => 
          t.status !== 'completed' && t.due_date && new Date(t.due_date) < new Date()
        );
        
        let urgency = 0;
        let reason = '';
        let action = '';
        
        if (overdueTasks.length > 0) {
          urgency = 3; // Critical
          reason = `${overdueTasks.length} tasks overdue`;
          action = 'Complete Tasks';
        } else if (skill.last_activated_at) {
          const daysSince = Math.floor(
            (Date.now() - new Date(skill.last_activated_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSince > 7) {
            urgency = 2; // Warning
            reason = `No activity in ${daysSince} days`;
            action = 'Practice Now';
          }
        }
        
        return { ...skill, urgency, reason, action };
      });

      // Sort by urgency and take top 3
      const top3 = analyzed
        .filter(s => s.urgency > 0)
        .sort((a, b) => b.urgency - a.urgency)
        .slice(0, 3);
      
      setUrgentSkills(top3);
    } catch (error) {
      console.error('Failed to load urgent skills:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  }

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 text-primary font-medium text-sm mb-4">
        <Brain className="w-4 h-4" />
        SKILLS NEED YOU
      </div>

      {urgentSkills.length > 0 ? (
        <div className="space-y-3">
          {urgentSkills.map(skill => (
            <div key={skill.id} className={cn(
              "p-3 rounded-lg border",
              skill.urgency === 3 ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800" :
              skill.urgency === 2 ? "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800" :
              "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800"
            )}>
              <div className="flex items-start gap-2">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                  skill.urgency === 3 ? "bg-red-500 text-white" :
                  skill.urgency === 2 ? "bg-orange-500 text-white" :
                  "bg-blue-500 text-white"
                )}>
                  {skill.urgency === 3 ? '!' : skill.urgency === 2 ? '⚠' : 'i'}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-foreground">{skill.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{skill.reason}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2 h-7 px-3 text-xs"
                    onClick={() => navigate(`/skills?highlight=${skill.id}`)}
                  >
                    {skill.action}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <Zap className="w-8 h-8 text-green-500 mb-2" />
          <p className="text-sm font-medium text-green-600 dark:text-green-400">All skills on track!</p>
          <p className="text-xs text-muted-foreground mt-1">Keep up the great work</p>
        </div>
      )}
    </div>
  );
}
```

---

#### 4. Group Tasks by Skill
**Why:** Better task organization
**Impact:** Medium - improves task management

**Files to Modify:**
- `src/pages/TasksPage.tsx` - Add "Group by Skill" view

**Implementation:**
```tsx
// src/pages/TasksPage.tsx
const [viewMode, setViewMode] = useState<'all' | 'skill' | 'date'>('all');

// Group tasks by skill
const tasksBySkill = useMemo(() => {
  const grouped: Record<string, Task[]> = {};
  const unlinked: Task[] = [];
  
  tasks.forEach(task => {
    if (task.linked_skill_id) {
      if (!grouped[task.linked_skill_id]) {
        grouped[task.linked_skill_id] = [];
      }
      grouped[task.linked_skill_id].push(task);
    } else {
      unlinked.push(task);
    }
  });
  
  return { grouped, unlinked };
}, [tasks]);

// Render grouped view
{viewMode === 'skill' && (
  <div className="space-y-6">
    {Object.entries(tasksBySkill.grouped).map(([skillId, skillTasks]) => {
      const skill = skills.find(s => s.id === skillId);
      return (
        <div key={skillId} className="border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              <h3 className="font-medium">{skill?.name || 'Unknown Skill'}</h3>
              <span className="text-xs text-muted-foreground">
                ({skillTasks.length} tasks • {Math.round((skill?.confidence_score || 0) * 100)}% progress)
              </span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => navigate(`/skills?highlight=${skillId}`)}>
              View Skill
            </Button>
          </div>
          <div className="space-y-2">
            {skillTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      );
    })}
    
    {tasksBySkill.unlinked.length > 0 && (
      <div className="border border-dashed border-border rounded-xl p-4">
        <h3 className="font-medium mb-3 text-muted-foreground">Unlinked Tasks ({tasksBySkill.unlinked.length})</h3>
        <div className="space-y-2">
          {tasksBySkill.unlinked.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </div>
    )}
  </div>
)}
```

---

### ✅ PHASE 2: Enhanced Widgets (Week 2)

#### 5. Learning Path Widget
**Files to Create:**
- `src/components/dashboard/widgets/LearningPathWidget.tsx`

#### 6. Skill Growth Timeline Widget
**Files to Create:**
- `src/components/dashboard/widgets/SkillGrowthWidget.tsx`

#### 7. Smart Task Suggestions
**Files to Modify:**
- `backend/app/services/skill_metrics_updater.py` - Add task suggestion logic

---

### ✅ PHASE 3: Advanced Features (Week 3)

#### 8. Skill-Filtered Knowledge Graph
**Files to Modify:**
- `src/pages/GraphPage.tsx` - Add skill filter

#### 9. Auto-Generate Practice Tasks
**Files to Modify:**
- `backend/app/services/skill_agent.py` - Add task generation

#### 10. Skill Assessments
**Files to Create:**
- `src/pages/SkillAssessmentPage.tsx`

---

## 📁 File Structure

```
backend/
├── app/
│   ├── api/
│   │   └── endpoints/
│   │       ├── pages.py ✏️ (modify - emit signals)
│   │       └── tasks.py ✅ (done - auto-update skills)
│   └── services/
│       ├── intelligence_engine.py ✅ (done - has auto-link)
│       └── skill_metrics_updater.py ✅ (done - periodic updates)

src/
├── components/
│   └── dashboard/
│       └── widgets/
│           ├── SkillsNeedYouWidget.tsx ➕ (create new)
│           ├── LearningPathWidget.tsx ➕ (create new)
│           └── SkillGrowthWidget.tsx ➕ (create new)
├── pages/
│   ├── PageViewer.tsx ✏️ (modify - add skill badges)
│   ├── SkillsPage.tsx ✅ (done - real progress)
│   └── TasksPage.tsx ✏️ (modify - group by skill)
```

---

## 🎯 Testing Checklist

### Phase 1 Testing:
- [ ] Create page → See skill suggestion banner
- [ ] Click "Link Skill" → Page linked to skill
- [ ] Page shows skill badges
- [ ] Skills Need You widget shows urgent skills
- [ ] Tasks page has "Group by Skill" view
- [ ] Grouped tasks show skill progress

### Phase 2 Testing:
- [ ] Learning Path widget shows current skill
- [ ] Shows next recommended skill
- [ ] Skill Growth widget shows weekly progress
- [ ] Timeline shows historical data

### Phase 3 Testing:
- [ ] Knowledge graph filters by skill
- [ ] AI suggests practice tasks
- [ ] Skill assessments work
- [ ] All data stored in Supabase

---

## 💡 Quick Wins (Can Do in 1 Hour Each)

1. **Show skill badges on pages** - Just fetch and display
2. **Skills Need You widget** - Analyze existing data
3. **Group tasks by skill** - Just reorganize UI
4. **Smart placeholder** - Already done in HomePage!

---

## 🚀 Expected Impact

### After Phase 1:
- ✅ 80% less manual linking
- ✅ Clear skill-content connections
- ✅ Better task organization
- ✅ Guided user attention

### After Phase 2:
- ✅ Clear learning progression
- ✅ Motivational progress tracking
- ✅ Smart task suggestions

### After Phase 3:
- ✅ Fully automated workspace
- ✅ AI-driven learning paths
- ✅ Skill assessments
- ✅ Complete skill ecosystem

**Result:** Skills become the intelligent hub connecting everything! 🎉
