import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, ArrowRight, Loader2, Brain, FileText, 
  CheckSquare, Calendar, Zap, Target
} from 'lucide-react';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { differenceInDays, isPast, isToday } from 'date-fns';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date?: string;
  linked_skill_id?: string;
  linked_page_id?: string;
}

interface Skill {
  id: string;
  name: string;
  level: string;
}

interface Page {
  id: string;
  title: string;
}

interface SkillProgress {
  progress: number;
  can_evolve: boolean;
  total_impact: number;
  contribution_count: number;
  contribution_types: number;
}

interface SuggestedAction {
  type: 'evolve_skill' | 'boost_skill' | 'activate_skill' | 'diversify_skill' | 'break_down' | 'start_task' | 'review_overdue' | 'add_task_to_skill' | 'complete_task' | 'plan_week';
  message: string;
  actionLabel: string;
  actionRoute?: string;
  askQuery?: string;
  icon: 'sparkles' | 'target' | 'calendar' | 'brain' | 'check' | 'zap';
  priority?: number;
  skillName?: string;
  progress?: number;
}

export function SuggestedActionWidget({ settings }: { settings?: Record<string, any> }) {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [skillProgress, setSkillProgress] = useState<Record<string, SkillProgress>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentWorkspace) {
      loadData();
    }
  }, [currentWorkspace]);

  const loadData = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      const [tasksData, skillsData, pagesData] = await Promise.all([
        api.getTasks(currentWorkspace.id),
        api.getSkills(currentWorkspace.id),
        api.getPagesByWorkspace(currentWorkspace.id)
      ]);
      setTasks(tasksData || []);
      setSkills(skillsData || []);
      setPages(pagesData || []);
      
      // Load skill progress for intelligent suggestions
      if (skillsData && skillsData.length > 0) {
        loadSkillProgress(skillsData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSkillProgress = async (skillsData: Skill[]) => {
    const progressData: Record<string, SkillProgress> = {};
    for (const skill of skillsData) {
      try {
        const progress = await api.getSkillRealProgress(skill.id);
        progressData[skill.id] = progress;
      } catch (error) {
        console.error(`Failed to load progress for ${skill.id}:`, error);
      }
    }
    setSkillProgress(progressData);
  };

  // INTELLIGENCE: Determine the ONE best next action with SKILL PRIORITY
  // SKIP suggestions already shown in "What's Slowing You Down"
  const suggestedAction = useMemo((): SuggestedAction | null => {
    const activeTasks = tasks.filter(t => t.status !== 'done');
    const now = new Date();

    // Build list of skills already flagged in other widgets
    const skillsAlreadyFlagged = new Set<string>();
    
    // Skills with 0 contributions are shown in "What's Slowing You Down"
    skills.forEach(skill => {
      const progress = skillProgress[skill.id];
      if (progress && progress.contribution_count === 0) {
        skillsAlreadyFlagged.add(skill.id);
      }
    });

    // PRIORITY 1: Skills ready to evolve (HIGHEST - 10)
    for (const skill of skills) {
      const progress = skillProgress[skill.id];
      if (progress?.can_evolve) {
        return {
          type: 'evolve_skill',
          message: `${skill.name} ready to evolve to ${getNextLevel(skill.level)}!`,
          actionLabel: 'Evolve Now',
          actionRoute: `/skills`,
          icon: 'sparkles',
          priority: 10,
          skillName: skill.name,
          progress: 100
        };
      }
    }

    // PRIORITY 2: Skills close to evolution 80%+ (9)
    for (const skill of skills) {
      if (skillsAlreadyFlagged.has(skill.id)) continue; // SKIP if already shown
      
      const progress = skillProgress[skill.id];
      if (progress && progress.progress >= 80 && progress.progress < 100) {
        const needed = Math.ceil((100 - progress.progress) / 15);
        return {
          type: 'boost_skill',
          message: `${skill.name} at ${Math.round(progress.progress)}% - ${needed} more contributions to evolve`,
          actionLabel: 'Link Evidence',
          actionRoute: `/pages`,
          icon: 'target',
          priority: 9,
          skillName: skill.name,
          progress: progress.progress
        };
      }
    }

    // Calculate skill health for task prioritization
    const skillHealth: Record<string, { overdue: number; total: number; name: string }> = {};
    skills.forEach(s => {
      skillHealth[s.id] = { overdue: 0, total: 0, name: s.name };
    });
    activeTasks.forEach(t => {
      if (t.linked_skill_id && skillHealth[t.linked_skill_id]) {
        skillHealth[t.linked_skill_id].total++;
        if (t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))) {
          skillHealth[t.linked_skill_id].overdue++;
        }
      }
    });

    // PRIORITY 3: Skill blocked by overdue tasks (8)
    const strugglingSkill = Object.entries(skillHealth)
      .filter(([skillId, data]) => !skillsAlreadyFlagged.has(skillId) && data.overdue >= 2)
      .sort((a, b) => b[1].overdue - a[1].overdue)[0];

    if (strugglingSkill) {
      const [skillId, data] = strugglingSkill;
      return {
        type: 'review_overdue',
        message: `${data.name} blocked by ${data.overdue} overdue tasks - Clear them to progress`,
        actionLabel: 'Fix Now',
        actionRoute: `/tasks`,
        icon: 'brain',
        priority: 8,
        skillName: data.name
      };
    }

    // PRIORITY 4: Skills need diversity (6) - SKIP if already flagged
    for (const skill of skills) {
      if (skillsAlreadyFlagged.has(skill.id)) continue;
      
      const progress = skillProgress[skill.id];
      if (progress && progress.contribution_types === 1 && progress.contribution_count >= 3) {
        return {
          type: 'diversify_skill',
          message: `${skill.name} needs variety - Try completing a task or linking different content`,
          actionLabel: 'View Tasks',
          actionRoute: `/tasks`,
          icon: 'target',
          priority: 6,
          skillName: skill.name
        };
      }
    }

    // PRIORITY 5: Overdue tasks (5)
    const overdueTasks = activeTasks.filter(t => {
      if (!t.due_date) return false;
      return isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date));
    });

    if (overdueTasks.length >= 2) {
      return {
        type: 'review_overdue',
        message: `${overdueTasks.length} overdue tasks need attention - Reschedule or complete them`,
        actionLabel: 'Review Now',
        actionRoute: '/tasks',
        icon: 'calendar',
        priority: 5
      };
    }

    // PRIORITY 6: Large tasks need breaking down (4)
    const largeTasks = activeTasks.filter(t => 
      t.title.toLowerCase().includes('research') ||
      t.title.toLowerCase().includes('complete') ||
      t.title.toLowerCase().includes('build') ||
      t.title.toLowerCase().includes('create') ||
      t.title.toLowerCase().includes('develop')
    );

    const taskWithNoSubtasks = largeTasks.find(t => {
      const dueDate = t.due_date ? new Date(t.due_date) : null;
      const daysUntilDue = dueDate ? differenceInDays(dueDate, now) : null;
      return t.status === 'todo' && (daysUntilDue === null || daysUntilDue > 3);
    });

    if (taskWithNoSubtasks) {
      const skill = skills.find(s => s.id === taskWithNoSubtasks.linked_skill_id);
      return {
        type: 'break_down',
        message: `"${taskWithNoSubtasks.title}" is complex - Break it into smaller steps`,
        actionLabel: 'Break Down',
        askQuery: `Break down the task "${taskWithNoSubtasks.title}" into smaller actionable steps`,
        icon: 'sparkles',
        priority: 4,
        skillName: skill?.name
      };
    }

    // PRIORITY 7: Skills without tasks (3) - SKIP if already flagged
    const skillsWithTasks = new Set(activeTasks.map(t => t.linked_skill_id).filter(Boolean));
    const stalledSkill = skills.find(s => 
      !skillsAlreadyFlagged.has(s.id) && 
      !skillsWithTasks.has(s.id) && 
      s.level === 'Beginner'
    );

    if (stalledSkill) {
      return {
        type: 'add_task_to_skill',
        message: `${stalledSkill.name} has no tasks - Create one to start building momentum`,
        actionLabel: 'Add Task',
        askQuery: `Create a task to help me learn ${stalledSkill.name}`,
        icon: 'brain',
        priority: 3,
        skillName: stalledSkill.name
      };
    }

    // PRIORITY 8: Complete in-progress tasks (2)
    const inProgressTasks = activeTasks.filter(t => t.status === 'in-progress');
    if (inProgressTasks.length > 0) {
      const oldestInProgress = inProgressTasks[0];
      const skill = skills.find(s => s.id === oldestInProgress.linked_skill_id);
      return {
        type: 'complete_task',
        message: `Finish "${oldestInProgress.title}" - You're already working on it`,
        actionLabel: 'View Task',
        actionRoute: '/tasks',
        icon: 'check',
        priority: 2,
        skillName: skill?.name
      };
    }

    // PRIORITY 9: Tasks due today (1)
    const todayTasks = activeTasks.filter(t => t.due_date && isToday(new Date(t.due_date)));
    if (todayTasks.length > 0) {
      return {
        type: 'start_task',
        message: `"${todayTasks[0].title}" is due today - Start now to stay on track`,
        actionLabel: 'Start Now',
        actionRoute: '/tasks',
        icon: 'target',
        priority: 1
      };
    }

    // PRIORITY 10: No tasks - plan week (0)
    if (activeTasks.length === 0) {
      return {
        type: 'plan_week',
        message: 'No active tasks - Plan your week to build momentum',
        actionLabel: 'Plan Week',
        askQuery: 'Help me plan my tasks for this week',
        icon: 'calendar',
        priority: 0
      };
    }

    // Default: start highest priority task
    const highPriorityTask = activeTasks.find(t => t.priority === 'high' && t.status === 'todo');
    if (highPriorityTask) {
      const skill = skills.find(s => s.id === highPriorityTask.linked_skill_id);
      return {
        type: 'start_task',
        message: `"${highPriorityTask.title}" is high priority - Start it to make progress`,
        actionLabel: 'Start Task',
        actionRoute: '/tasks',
        icon: 'target',
        skillName: skill?.name
      };
    }

    return null;
  }, [tasks, skills, pages, skillProgress]);

  function getNextLevel(currentLevel: string): string {
    const levels: Record<string, string> = {
      'Beginner': 'Intermediate',
      'Intermediate': 'Advanced',
      'Advanced': 'Expert',
      'Expert': 'Master'
    };
    return levels[currentLevel] || 'Next Level';
  }

  const handleAction = () => {
    if (!suggestedAction) return;
    
    if (suggestedAction.askQuery) {
      navigate(`/ask?q=${encodeURIComponent(suggestedAction.askQuery)}`);
    } else if (suggestedAction.actionRoute) {
      navigate(suggestedAction.actionRoute);
    }
  };

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'sparkles': return <Sparkles className="w-4 h-4" />;
      case 'target': return <Target className="w-4 h-4" />;
      case 'calendar': return <Calendar className="w-4 h-4" />;
      case 'brain': return <Brain className="w-4 h-4" />;
      case 'check': return <CheckSquare className="w-4 h-4" />;
      case 'zap': return <Zap className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!suggestedAction) {
    return (
      <div className="p-4 h-full flex flex-col items-center justify-center text-center">
        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-3">
          <Zap className="w-5 h-5 text-green-500" />
        </div>
        <p className="text-sm font-medium text-foreground">You're all set!</p>
        <p className="text-xs text-muted-foreground mt-1">No suggested actions right now</p>
      </div>
    );
  }

  return (
    <div className="p-4 h-full">
      <div className="flex items-center gap-2 text-primary font-medium text-xs mb-3 uppercase tracking-wide">
        <Sparkles className="w-3.5 h-3.5" />
        Suggested Next Action
      </div>

      <button
        onClick={handleAction}
        className="w-full hover:bg-secondary/30 rounded-xl p-4 transition-all text-left group"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary group-hover:scale-105 transition-transform">
            {getIcon(suggestedAction.icon)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {suggestedAction.message}
            </p>
            {suggestedAction.skillName && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                <Brain className="w-3 h-3" />
                <span>{suggestedAction.skillName}</span>
                {suggestedAction.progress !== undefined && (
                  <span className="ml-1 text-primary font-medium">
                    • {Math.round(suggestedAction.progress)}%
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-1 mt-2 text-xs text-primary font-medium">
              {suggestedAction.actionLabel}
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}
