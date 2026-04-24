import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronLeft, ChevronRight, Loader2, ListTodo, Cake, Bell, Milestone } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  dueDate?: string;
  due_date?: string;
  status: string;
  event_type?: string;
  eventType?: string;
  color?: string;
}

const EVENT_TYPE_ICONS = {
  task: ListTodo,
  event: Calendar,
  birthday: Cake,
  reminder: Bell,
  milestone: Milestone,
};

const DEFAULT_COLORS = {
  task: '#3b82f6',
  event: '#8b5cf6',
  birthday: '#ec4899',
  reminder: '#f97316',
  milestone: '#22c55e',
};

export function CalendarWidget({ settings }: { settings?: Record<string, any> }) {
  const { currentWorkspace } = useWorkspace();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (currentWorkspace) {
      loadTasks();
    }
  }, [currentWorkspace]);

  const loadTasks = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      const data = await api.getTasks(currentWorkspace.id);
      // Transform to handle both snake_case and camelCase
      const transformed = data.map((t: any) => ({
        ...t,
        dueDate: t.due_date || t.dueDate,
        eventType: t.event_type || t.eventType || 'task',
      }));
      setTasks(transformed);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getTasksForDay = (date: Date) => {
    return tasks.filter(task => task.dueDate && isSameDay(new Date(task.dueDate), date));
  };

  const hasTaskOnDay = (date: Date) => getTasksForDay(date).length > 0;

  const getEventColor = (task: Task) => {
    if (task.color) return task.color;
    const eventType = task.eventType || 'task';
    return DEFAULT_COLORS[eventType as keyof typeof DEFAULT_COLORS] || DEFAULT_COLORS.task;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-5">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const todayTasks = getTasksForDay(new Date());

  return (
    <div className="p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-500" />
          Calendar
        </h3>
        <Link to={`/workspace/${currentWorkspace?.id}/calendar`}>
          <span className="text-xs text-primary hover:underline">Open</span>
        </Link>
      </div>

      {/* Mini Calendar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <button 
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-1 hover:bg-secondary rounded"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <span className="text-xs font-medium">{format(currentDate, 'MMMM yyyy')}</span>
          <button 
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-1 hover:bg-secondary rounded"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 text-center">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-[10px] text-muted-foreground font-medium py-0.5">{d}</div>
          ))}
          {days.map((d, i) => {
            const dayTasks = getTasksForDay(d);
            const hasEvents = dayTasks.length > 0;
            return (
              <div
                key={i}
                className={cn(
                  'text-[10px] p-1 rounded relative',
                  !isSameMonth(d, currentDate) && 'text-muted-foreground/40',
                  isToday(d) && 'bg-primary text-primary-foreground font-bold',
                  hasEvents && !isToday(d) && 'font-medium'
                )}
              >
                {format(d, 'd')}
                {hasEvents && !isToday(d) && (
                  <span 
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ backgroundColor: getEventColor(dayTasks[0]) }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Today's Items */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Today</p>
        <div className="space-y-1">
          {todayTasks.slice(0, 4).map((task) => {
            const eventType = task.eventType || 'task';
            const Icon = EVENT_TYPE_ICONS[eventType as keyof typeof EVENT_TYPE_ICONS] || ListTodo;
            return (
              <div
                key={task.id}
                className="flex items-center gap-2 text-xs p-1.5 rounded bg-secondary/50"
              >
                <div 
                  className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: getEventColor(task) }}
                >
                  <Icon className="w-2.5 h-2.5 text-white" />
                </div>
                <span className={cn(
                  "truncate flex-1",
                  task.status === 'done' && "line-through text-muted-foreground"
                )}>
                  {task.title}
                </span>
              </div>
            );
          })}
          {todayTasks.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">Nothing scheduled today</p>
          )}
          {todayTasks.length > 4 && (
            <p className="text-xs text-muted-foreground text-center">+{todayTasks.length - 4} more</p>
          )}
        </div>
      </div>
    </div>
  );
}
