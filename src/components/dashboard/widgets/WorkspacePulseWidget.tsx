import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Sparkles, AlertCircle, Loader2, Lightbulb, AlertTriangle, 
  ArrowRight, Brain, FileText, Clock, Zap
} from 'lucide-react';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

interface BlockingInsight {
  type: 'blocking_skill' | 'overdue_cluster' | 'planning_no_execution' | 'execution_heavy' | 'skill_stalled' | 'skill_ready_to_evolve' | 'skill_no_contributions' | 'skill_needs_diversity';
  message: string;
  severity: 'warning' | 'critical' | 'info' | 'success';
  relatedItem?: { type: string; id: string; name: string };
  actionLabel?: string;
  actionRoute?: string;
  progress?: number;
}

export function WorkspacePulseWidget({ settings }: { settings?: Record<string, any> }) {
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
      
      // Load skill progress for all skills
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

  // INTELLIGENCE: Analyze what's slowing the user down + SKILL INSIGHTS
  const blockingInsight = useMemo((): BlockingInsight | null => {
    // PRIORITY 1: Skills ready to evolve (HIGHEST PRIORITY - SUCCESS!)
    for (const skill of skills) {
      const progress = skillProgress[skill.id];
      if (progress?.can_evolve) {
        return {
          type: 'skill_ready_to_evolve',
          message: `${skill.name} ready to evolve to ${getNextLevel(skill.level)}!`,
          severity: 'success',
          relatedItem: { type: 'skill', id: skill.id, name: skill.name },
          actionLabel: 'Evolve Now',
          actionRoute: `/skills`,
          progress: 100
        };
      }
    }

    // PRIORITY 2: Skills close to evolution (80%+)
    for (const skill of skills) {
      const progress = skillProgress[skill.id];
      if (progress && progress.progress >= 80 && progress.progress < 100) {
        const needed = Math.ceil((100 - progress.progress) / 15);
        return {
          type: 'skill_ready_to_evolve',
          message: `${skill.name} at ${Math.round(progress.progress)}% - ${needed} more contribution${needed > 1 ? 's' : ''} to evolve`,
          severity: 'info',
          relatedItem: { type: 'skill', id: skill.id, name: skill.name },
          actionLabel: 'Link Page',
          actionRoute: `/pages`,
          progress: progress.progress
        };
      }
    }

    if (tasks.length === 0) return null;

    const activeTasks = tasks.filter(t => t.status !== 'done');
    const overdueTasks = activeTasks.filter(t => {
      if (!t.due_date) return false;
      return new Date(t.due_date) < new Date();
    });

    // PRIORITY 3: Overdue cluster tied to same skill (CRITICAL)
    if (overdueTasks.length >= 2) {
      const skillGroups: Record<string, Task[]> = {};
      overdueTasks.forEach(t => {
        if (t.linked_skill_id) {
          if (!skillGroups[t.linked_skill_id]) skillGroups[t.linked_skill_id] = [];
          skillGroups[t.linked_skill_id].push(t);
        }
      });

      for (const [skillId, groupTasks] of Object.entries(skillGroups)) {
        if (groupTasks.length >= 2) {
          const skill = skills.find(s => s.id === skillId);
          return {
            type: 'blocking_skill',
            message: `${skill?.name || 'A skill'} blocked by ${groupTasks.length} overdue tasks`,
            severity: 'critical',
            relatedItem: skill ? { type: 'skill', id: skill.id, name: skill.name } : undefined,
            actionLabel: 'View Tasks',
            actionRoute: `/tasks`
          };
        }
      }

      // Group by linked_page_id
      const pageGroups: Record<string, Task[]> = {};
      overdueTasks.forEach(t => {
        if (t.linked_page_id) {
          if (!pageGroups[t.linked_page_id]) pageGroups[t.linked_page_id] = [];
          pageGroups[t.linked_page_id].push(t);
        }
      });

      for (const [pageId, groupTasks] of Object.entries(pageGroups)) {
        if (groupTasks.length >= 2) {
          const page = pages.find(p => p.id === pageId);
          return {
            type: 'overdue_cluster',
            message: `${groupTasks.length} overdue tasks tied to "${page?.title || 'same page'}"`,
            severity: 'critical',
            relatedItem: page ? { type: 'page', id: page.id, name: page.title } : undefined,
            actionLabel: 'View Page',
            actionRoute: `/pages/${pageId}`
          };
        }
      }

      // Generic overdue warning
      return {
        type: 'overdue_cluster',
        message: `${overdueTasks.length} overdue tasks need attention`,
        severity: 'warning',
        actionLabel: 'View Tasks',
        actionRoute: '/tasks'
      };
    }

    // PRIORITY 4: Skills with no contributions (WARNING)
    for (const skill of skills) {
      const progress = skillProgress[skill.id];
      if (progress && progress.contribution_count === 0) {
        return {
          type: 'skill_no_contributions',
          message: `${skill.name} has no contributions yet - Start building progress`,
          severity: 'warning',
          relatedItem: { type: 'skill', id: skill.id, name: skill.name },
          actionLabel: 'Link Page',
          actionRoute: `/pages`,
          progress: 0
        };
      }
    }

    // PRIORITY 5: Skills need diversity
    for (const skill of skills) {
      const progress = skillProgress[skill.id];
      if (progress && progress.contribution_types === 1 && progress.contribution_count >= 3) {
        return {
          type: 'skill_needs_diversity',
          message: `${skill.name} needs contribution diversity - Try completing a task`,
          severity: 'info',
          relatedItem: { type: 'skill', id: skill.id, name: skill.name },
          actionLabel: 'View Tasks',
          actionRoute: `/tasks`
        };
      }
    }

    // PRIORITY 6: Planning without execution
    const planningTasks = activeTasks.filter(t => 
      t.title.toLowerCase().includes('plan') || 
      t.title.toLowerCase().includes('research') ||
      t.title.toLowerCase().includes('design')
    );
    const executionTasks = activeTasks.filter(t => 
      t.title.toLowerCase().includes('build') || 
      t.title.toLowerCase().includes('implement') ||
      t.title.toLowerCase().includes('create') ||
      t.title.toLowerCase().includes('complete')
    );

    if (planningTasks.length > 0 && executionTasks.length === 0) {
      return {
        type: 'planning_no_execution',
        message: 'Planning detected, but no execution tasks scheduled',
        severity: 'info',
        actionLabel: 'Add Task',
        actionRoute: '/tasks'
      };
    }

    // PRIORITY 7: Skill with no active tasks
    const beginnerSkills = skills.filter(s => s.level === 'Beginner');
    const skillsWithTasks = new Set(activeTasks.map(t => t.linked_skill_id).filter(Boolean));
    const stalledSkills = beginnerSkills.filter(s => !skillsWithTasks.has(s.id));
    
    if (stalledSkills.length > 0) {
      const skill = stalledSkills[0];
      return {
        type: 'skill_stalled',
        message: `${skill.name} has no active tasks`,
        severity: 'info',
        relatedItem: { type: 'skill', id: skill.id, name: skill.name },
        actionLabel: 'Add Task',
        actionRoute: '/tasks'
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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeTasks = tasks.filter(t => t.status !== 'done');
  const overdueTasks = activeTasks.filter(t => t.due_date && new Date(t.due_date) < new Date());

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 text-primary font-medium text-sm mb-4">
        <Brain className="w-4 h-4" />
        WHAT'S SLOWING YOU DOWN
      </div>
      
      {/* THE ONE INSIGHT - This is the soul of the OS */}
      {blockingInsight ? (
        <div className="flex-1 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
              blockingInsight.severity === 'critical' 
                ? "bg-red-500/10" 
                : blockingInsight.severity === 'warning'
                ? "bg-orange-500/10"
                : blockingInsight.severity === 'success'
                ? "bg-green-500/10"
                : "bg-primary/10"
            )}>
              {blockingInsight.severity === 'critical' ? (
                <AlertCircle className="w-4 h-4 text-red-500" />
              ) : blockingInsight.severity === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-orange-500" />
              ) : blockingInsight.severity === 'success' ? (
                <Sparkles className="w-4 h-4 text-green-500" />
              ) : (
                <Lightbulb className="w-4 h-4 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium",
                blockingInsight.severity === 'critical' 
                  ? "text-red-600 dark:text-red-400" 
                  : blockingInsight.severity === 'warning'
                  ? "text-orange-600 dark:text-orange-400"
                  : blockingInsight.severity === 'success'
                  ? "text-green-600 dark:text-green-400"
                  : "text-foreground"
              )}>
                {blockingInsight.message}
              </p>
              
              {blockingInsight.relatedItem && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                  {blockingInsight.relatedItem.type === 'skill' ? (
                    <Brain className="w-3 h-3" />
                  ) : (
                    <FileText className="w-3 h-3" />
                  )}
                  <span>{blockingInsight.relatedItem.name}</span>
                  {blockingInsight.progress !== undefined && (
                    <span className="ml-1 text-primary font-medium">
                      • {Math.round(blockingInsight.progress)}%
                    </span>
                  )}
                </div>
              )}

              {blockingInsight.actionRoute && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-3 h-7 px-3 text-xs gap-1"
                  onClick={() => navigate(blockingInsight.actionRoute!)}
                >
                  {blockingInsight.actionLabel}
                  <ArrowRight className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                You're on track
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeTasks.length} active tasks, no blockers detected
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Compact Stats - Secondary info */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
        <span>{activeTasks.length} active</span>
        {overdueTasks.length > 0 && (
          <span className="text-red-500">{overdueTasks.length} overdue</span>
        )}
        <Link to="/tasks" className="text-primary hover:underline">
          All tasks →
        </Link>
      </div>
    </div>
  );
}
