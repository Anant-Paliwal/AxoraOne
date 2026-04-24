import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Calendar, Loader2, Clock, AlertTriangle, CheckCircle2,
  ArrowRight, Brain
} from 'lucide-react';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';
import { format, isToday, isTomorrow, isPast, differenceInDays, addDays } from 'date-fns';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date?: string;
  linked_skill_id?: string;
}

interface Skill {
  id: string;
  name: string;
}

export function UpcomingWidget({ settings }: { settings?: Record<string, any> }) {
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

  // Split tasks into "Next Up" and "At Risk"
  const { nextUp, atRisk } = useMemo(() => {
    const activeTasks = tasks.filter(t => t.status !== 'done' && t.due_date);
    const now = new Date();
    const threeDaysFromNow = addDays(now, 3);

    const nextUp: (Task & { dateLabel: string; skillName?: string })[] = [];
    const atRisk: (Task & { dateLabel: string; skillName?: string })[] = [];

    activeTasks.forEach(task => {
      const dueDate = new Date(task.due_date!);
      const skill = skills.find(s => s.id === task.linked_skill_id);
      
      // Check if task is overdue (past the due date/time)
      const isOverdue = dueDate < now;

      let dateLabel = '';
      if (isOverdue) {
        if (isToday(dueDate)) {
          // Overdue today (time has passed)
          dateLabel = 'Overdue today';
        } else {
          const daysOverdue = Math.abs(differenceInDays(dueDate, now));
          dateLabel = `${daysOverdue}d overdue`;
        }
      } else if (isToday(dueDate)) {
        dateLabel = 'Today';
      } else if (isTomorrow(dueDate)) {
        dateLabel = 'Tomorrow';
      } else {
        dateLabel = format(dueDate, 'MMM d');
      }

      const taskWithMeta = {
        ...task,
        dateLabel,
        skillName: skill?.name
      };

      if (isOverdue) {
        atRisk.push(taskWithMeta);
      } else {
        nextUp.push(taskWithMeta);
      }
    });

    // Sort next up by date
    nextUp.sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
    
    // Sort at risk by how overdue
    atRisk.sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());

    return { 
      nextUp: nextUp.slice(0, 3), 
      atRisk: atRisk.slice(0, 2) 
    };
  }, [tasks, skills]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasContent = nextUp.length > 0 || atRisk.length > 0;

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm text-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Upcoming
        </h3>
        <Link to="/calendar">
          <span className="text-xs text-primary hover:underline">Calendar</span>
        </Link>
      </div>

      {hasContent ? (
        <div className="flex-1 space-y-4">
          {/* At Risk Section */}
          {atRisk.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3 h-3 text-red-500" />
                <span className="text-xs font-medium text-red-500">At Risk</span>
              </div>
              <div className="space-y-1">
                {atRisk.map(task => (
                  <button
                    key={task.id}
                    onClick={() => navigate('/tasks')}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/30 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{task.title}</p>
                      <p className="text-xs text-red-500">{task.dateLabel}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Next Up Section */}
          {nextUp.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="w-3 h-3 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Next Up</span>
              </div>
              <div className="space-y-1">
                {nextUp.map(task => (
                  <button
                    key={task.id}
                    onClick={() => navigate('/tasks')}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn(
                          "text-xs",
                          task.dateLabel === 'Today' ? "text-primary font-medium" :
                          task.dateLabel === 'Tomorrow' ? "text-orange-500" :
                          "text-muted-foreground"
                        )}>
                          {task.dateLabel}
                        </span>
                        {task.skillName && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <Brain className="w-3 h-3" />
                            {task.skillName}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <CheckCircle2 className="w-8 h-8 text-green-500/30 mb-2" />
          <p className="text-xs text-muted-foreground">No upcoming deadlines</p>
        </div>
      )}
    </div>
  );
}
