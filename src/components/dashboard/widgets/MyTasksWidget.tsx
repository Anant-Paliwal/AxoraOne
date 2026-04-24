import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  CheckSquare, Plus, Loader2, Zap, Clock, Brain, 
  AlertTriangle, ArrowRight, Calendar
} from 'lucide-react';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { differenceInDays, format, isToday, isTomorrow, isPast } from 'date-fns';

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
}

interface TaskWithReason extends Task {
  reason: string;
  urgency: 'critical' | 'high' | 'normal';
  linkedSkillName?: string;
}

export function MyTasksWidget({ settings }: { settings?: Record<string, any> }) {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
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
      const [tasksData, skillsData] = await Promise.all([
        api.getTasks(currentWorkspace.id),
        api.getSkills(currentWorkspace.id)
      ]);
      setTasks(tasksData || []);
      setSkills(skillsData || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // INTELLIGENCE: Rank tasks with REASONS, not scores
  // SKILL IMPACT: Tasks linked to skills with overdue tasks get boosted
  const rankedTasks = useMemo((): TaskWithReason[] => {
    const activeTasks = tasks.filter(t => t.status !== 'done');
    const now = new Date();

    // Calculate skill health - skills with overdue tasks are "blocking"
    const skillHealth: Record<string, { overdue: number; total: number }> = {};
    activeTasks.forEach(t => {
      if (t.linked_skill_id) {
        if (!skillHealth[t.linked_skill_id]) {
          skillHealth[t.linked_skill_id] = { overdue: 0, total: 0 };
        }
        skillHealth[t.linked_skill_id].total++;
        if (t.due_date && new Date(t.due_date) < now) {
          skillHealth[t.linked_skill_id].overdue++;
        }
      }
    });

    return activeTasks.map(task => {
      const skill = skills.find(s => s.id === task.linked_skill_id);
      const dueDate = task.due_date ? new Date(task.due_date) : null;
      const daysUntilDue = dueDate ? differenceInDays(dueDate, now) : null;
      
      // Check if task is overdue (past the due date/time)
      const isOverdue = dueDate && dueDate < now;
      
      // SKILL IMPACT: Check if this task's skill has other overdue tasks
      const skillData = task.linked_skill_id ? skillHealth[task.linked_skill_id] : null;
      const skillIsBlocking = skillData && skillData.overdue > 0;
      const blockedBySkill = skillIsBlocking && skillData.overdue > 1;

      let reason = '';
      let urgency: 'critical' | 'high' | 'normal' = 'normal';

      // Determine reason based on context - SKILL IMPACT VISIBLE
      if (isOverdue) {
        reason = `Overdue by ${Math.abs(daysUntilDue!)} day${Math.abs(daysUntilDue!) > 1 ? 's' : ''}`;
        if (skill) reason += ` • Blocking ${skill.name}`;
        urgency = 'critical';
      } else if (dueDate && isToday(dueDate)) {
        reason = skill ? `Due today • ${skill.name}` : 'Due today';
        urgency = 'critical';
      } else if (dueDate && isTomorrow(dueDate)) {
        reason = skill ? `Due tomorrow • ${skill.name}` : 'Due tomorrow';
        urgency = 'high';
      } else if (blockedBySkill && skill) {
        // SKILL INTELLIGENCE: This task is part of a struggling skill
        reason = `${skill.name} has ${skillData!.overdue} overdue task${skillData!.overdue > 1 ? 's' : ''}`;
        urgency = 'high';
      } else if (daysUntilDue !== null && daysUntilDue <= 3) {
        reason = skill ? `Due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''} • ${skill.name}` : `Due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`;
        urgency = 'high';
      } else if (task.priority === 'high') {
        reason = skill ? `High priority • ${skill.name}` : 'High priority';
        urgency = 'high';
      } else if (skill) {
        reason = `Part of ${skill.name}`;
      } else if (dueDate) {
        reason = `Due ${format(dueDate, 'MMM d')}`;
      } else {
        reason = task.status === 'in-progress' ? 'In progress' : 'Planned';
      }

      return {
        ...task,
        reason,
        urgency,
        linkedSkillName: skill?.name
      };
    }).sort((a, b) => {
      // Sort by urgency first
      const urgencyOrder = { critical: 0, high: 1, normal: 2 };
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      }
      // Then by due date
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    });
  }, [tasks, skills]);

  const topTasks = rankedTasks.slice(0, 5);
  const overdueTasks = rankedTasks.filter(t => t.urgency === 'critical');

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          High Impact Tasks
        </h3>
        <span className="text-xs text-muted-foreground">
          {rankedTasks.length} active
        </span>
      </div>
      
      <div className="flex-1 space-y-1">
        {topTasks.length > 0 ? (
          topTasks.map((task) => (
            <button
              key={task.id}
              onClick={() => navigate('/tasks')}
              className="w-full flex items-start gap-2.5 hover:bg-secondary/50 p-2 rounded-lg transition-colors text-left"
            >
              <div className={cn(
                "w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5",
                task.urgency === 'critical' ? "bg-red-500/10" :
                task.urgency === 'high' ? "bg-orange-500/10" :
                "bg-secondary"
              )}>
                {task.urgency === 'critical' ? (
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                ) : task.urgency === 'high' ? (
                  <Clock className="w-3 h-3 text-orange-500" />
                ) : (
                  <CheckSquare className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm truncate",
                  task.urgency === 'critical' ? "text-foreground font-medium" : "text-foreground"
                )}>
                  {task.title}
                </p>
                <p className={cn(
                  "text-xs mt-0.5 truncate",
                  task.urgency === 'critical' ? "text-red-500" :
                  task.urgency === 'high' ? "text-orange-500" :
                  "text-muted-foreground"
                )}>
                  {task.reason}
                </p>
              </div>
            </button>
          ))
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
            <CheckSquare className="w-8 h-8 text-green-500/30 mb-2" />
            <p className="text-xs text-muted-foreground">All caught up!</p>
          </div>
        )}
      </div>
      
      <Button
        variant="outline"
        size="sm"
        className="w-full mt-3 h-8 text-xs gap-1.5"
        onClick={() => navigate('/tasks')}
      >
        <Plus className="w-3 h-3" />
        Add Task
      </Button>
    </div>
  );
}
