import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, isToday, parseISO, addWeeks, subWeeks, startOfDay, differenceInDays, isBefore, isAfter } from 'date-fns';
import {
  Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Clock, Flag, CheckCircle2, Circle, AlertCircle, Loader2, Settings, MoreHorizontal, X, Bell, MapPin, Trash2, Edit2, Copy, ListTodo, Cake, Milestone, ChevronDown, Target, Brain, FileText, Link2, Zap, TrendingUp, AlertTriangle, Sparkles, Home, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Task, Page, Skill } from '@/types/workspace';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { api } from '@/lib/api';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

type ViewType = 'month' | 'week' | 'day' | 'agenda';
type EventType = 'task' | 'event' | 'birthday' | 'reminder' | 'milestone';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  color?: string;
  task?: Task;
  isGoogleEvent?: boolean;
  location?: string;
  description?: string;
  eventType?: EventType;
  linkedPageId?: string;
  linkedSkillId?: string;
  purpose?: string;
}

// Daily load thresholds
const DAILY_LOAD_THRESHOLDS = {
  light: 2,
  moderate: 4,
  heavy: 6,
  overloaded: 8
};

const EVENT_TYPE_ICONS = {
  task: ListTodo,
  event: CalendarIcon,
  birthday: Cake,
  reminder: Bell,
  milestone: Milestone,
};

const DEFAULT_EVENT_COLORS = {
  task: '#3b82f6',
  event: '#8b5cf6',
  birthday: '#ec4899',
  reminder: '#f97316',
  milestone: '#22c55e',
};

const EVENT_COLORS = [
  { name: 'Blue', value: '#3b82f6', bg: 'bg-blue-500' },
  { name: 'Green', value: '#22c55e', bg: 'bg-green-500' },
  { name: 'Purple', value: '#8b5cf6', bg: 'bg-purple-500' },
  { name: 'Orange', value: '#f97316', bg: 'bg-orange-500' },
  { name: 'Pink', value: '#ec4899', bg: 'bg-pink-500' },
  { name: 'Red', value: '#ef4444', bg: 'bg-red-500' },
  { name: 'Yellow', value: '#eab308', bg: 'bg-yellow-500' },
  { name: 'Teal', value: '#14b8a6', bg: 'bg-teal-500' },
];

export function CalendarPage() {
  const { currentWorkspace, canEdit, canAdmin, getUserRole } = useWorkspace();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewType>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [defaultEventType, setDefaultEventType] = useState<EventType>('event');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Permission checks
  const userCanEdit = canEdit();
  const userCanAdmin = canAdmin();
  const userRole = getUserRole();

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadData();
    }
  }, [currentWorkspace?.id]);

  const loadData = async () => {
    if (!currentWorkspace?.id) return;
    try {
      setLoading(true);
      const [tasksData, pagesData, skillsData] = await Promise.all([
        api.getTasks(currentWorkspace.id),
        api.getPagesByWorkspace(currentWorkspace.id),
        api.getSkills(currentWorkspace.id)
      ]);
      
      // Transform snake_case to camelCase for tasks
      const transformedTasks = tasksData.map((t: any) => ({
        ...t,
        dueDate: t.due_date,
        linkedPageId: t.linked_page_id,
        linkedSkillId: t.linked_skill_id,
        parentTaskId: t.parent_task_id,
        eventType: t.event_type || 'task',
        createdFrom: t.created_from || 'manual',
        isRecurring: t.is_recurring,
        allDay: t.all_day ?? true,
        createdAt: t.created_at,
      }));
      setTasks(transformedTasks);
      setPages(pagesData || []);
      setSkills(skillsData || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = loadData; // Alias for compatibility

  // Helper to get linked page
  const getLinkedPage = (pageId?: string) => pages.find(p => p.id === pageId);
  
  // Helper to get linked skill
  const getLinkedSkill = (skillId?: string) => skills.find(s => s.id === skillId);

  // Convert tasks to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    return tasks
      .filter((task) => task.dueDate)
      .map((task) => {
        const dueDate = new Date(task.dueDate!);
        const eventType = task.eventType || 'task';
        const defaultColor = DEFAULT_EVENT_COLORS[eventType] || '#3b82f6';
        const linkedPage = getLinkedPage(task.linkedPageId);
        const linkedSkill = getLinkedSkill(task.linkedSkillId);
        
        // Generate purpose from linked items
        let purpose = task.description || '';
        if (linkedSkill) {
          purpose = purpose || `Part of learning ${linkedSkill.name}`;
        }
        if (linkedPage) {
          purpose = purpose || `Related to ${linkedPage.title}`;
        }
        
        return {
          id: task.id,
          title: task.title,
          start: dueDate,
          end: dueDate,
          allDay: task.allDay ?? true,
          color: task.color || (task.status === 'done' ? '#22c55e' : defaultColor),
          task: task,
          description: task.description,
          location: task.location,
          eventType: eventType,
          linkedPageId: task.linkedPageId,
          linkedSkillId: task.linkedSkillId,
          purpose: purpose,
        };
      });
  }, [tasks, pages, skills]);

  // Calculate daily load for overload indicator
  const getDailyLoad = (date: Date) => {
    const dayEvents = events.filter(e => isSameDay(e.start, date));
    const count = dayEvents.length;
    if (count >= DAILY_LOAD_THRESHOLDS.overloaded) return 'overloaded';
    if (count >= DAILY_LOAD_THRESHOLDS.heavy) return 'heavy';
    if (count >= DAILY_LOAD_THRESHOLDS.moderate) return 'moderate';
    if (count >= DAILY_LOAD_THRESHOLDS.light) return 'light';
    return 'free';
  };

  // Get smart upcoming events with goal awareness
  const smartUpcomingEvents = useMemo(() => {
    const now = new Date();
    const upcoming = events
      .filter(e => e.start >= now)
      .sort((a, b) => {
        // Prioritize by: overdue > today > has skill link > priority > date
        const aIsToday = isToday(a.start);
        const bIsToday = isToday(b.start);
        if (aIsToday && !bIsToday) return -1;
        if (!aIsToday && bIsToday) return 1;
        
        // Skill-linked tasks are more goal-oriented
        const aHasSkill = !!a.linkedSkillId;
        const bHasSkill = !!b.linkedSkillId;
        if (aHasSkill && !bHasSkill) return -1;
        if (!aHasSkill && bHasSkill) return 1;
        
        // Then by priority
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const aPriority = priorityOrder[a.task?.priority || 'medium'];
        const bPriority = priorityOrder[b.task?.priority || 'medium'];
        if (aPriority !== bPriority) return aPriority - bPriority;
        
        return a.start.getTime() - b.start.getTime();
      })
      .slice(0, 7);
    
    return upcoming;
  }, [events]);

  // Calculate weekly insights
  const weeklyInsights = useMemo(() => {
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    const weekEvents = events.filter(e => e.start >= weekStart && e.start <= weekEnd);
    
    const totalTasks = weekEvents.length;
    const completedTasks = weekEvents.filter(e => e.task?.status === 'done').length;
    const skillLinkedTasks = weekEvents.filter(e => e.linkedSkillId).length;
    const overloadedDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
      .filter(d => getDailyLoad(d) === 'overloaded' || getDailyLoad(d) === 'heavy').length;
    
    return {
      totalTasks,
      completedTasks,
      skillLinkedTasks,
      overloadedDays,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      goalAlignmentRate: totalTasks > 0 ? Math.round((skillLinkedTasks / totalTasks) * 100) : 0
    };
  }, [events, currentDate]);

  // Navigation handlers
  const navigatePrev = () => {
    if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, -1));
  };

  const navigateNext = () => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setDefaultEventType('event');
    setEditingTask(null);
    setCreateDialogOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventDetail(true);
  };

  const openCreateDialog = (eventType: EventType) => {
    setDefaultEventType(eventType);
    setSelectedDate(null);
    setEditingTask(null);
    setCreateDialogOpen(true);
  };

  const toggleTaskStatus = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const nextStatus: 'todo' | 'in-progress' | 'done' =
      task.status === 'todo' ? 'in-progress' : task.status === 'in-progress' ? 'done' : 'todo';
    try {
      await api.updateTask(taskId, { status: nextStatus });
      setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)));
      toast.success(`Task marked as ${nextStatus.replace('-', ' ')}`);
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const deleteTask = async (taskId: string) => {
    // Permission check - only admins and owners can delete
    if (!userCanAdmin) {
      toast.error('You don\'t have permission to delete tasks');
      return;
    }
    
    try {
      await api.deleteTask(taskId);
      setTasks(tasks.filter((t) => t.id !== taskId));
      setShowEventDetail(false);
      toast.success('Task deleted');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const connectGoogleCalendar = () => {
    toast.info('Google Calendar integration coming soon!');
    setGoogleConnected(true);
  };

  // Get days for month view
  const getMonthDays = () => {
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
    return days;
  };

  // Get days for week view
  const getWeekDays = () => {
    const weekStart = startOfWeek(currentDate);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  };

  // Get events for a specific day
  const getEventsForDay = (date: Date) => {
    return events.filter((event) => isSameDay(event.start, date));
  };

  // Get hours for day/week view
  const hours = Array.from({ length: 24 }, (_, i) => i);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-30">
        <div className="max-w-[1800px] mx-auto px-3 sm:px-6 py-3 sm:py-4 ml-0 lg:ml-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto pl-12 lg:pl-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="hidden sm:inline">Calendar</span>
              </h1>
              
              {/* Navigation */}
              <div className="flex items-center gap-1 w-full sm:w-auto justify-between sm:justify-start">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={navigatePrev} className="h-8 w-8">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={navigateNext} className="h-8 w-8">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToToday} className="ml-2 text-xs sm:text-sm h-8">
                    Today
                  </Button>
                </div>
              
                {/* Current Date Display */}
                <h2 className="text-sm sm:text-lg font-semibold text-foreground">
                  {view === 'day' ? format(currentDate, 'MMM d') :
                   view === 'week' ? `${format(startOfWeek(currentDate), 'MMM d')} - ${format(endOfWeek(currentDate), 'd')}` :
                   format(currentDate, 'MMM yyyy')}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto pl-12 lg:pl-0">
              {/* View Switcher */}
              <div className="flex items-center bg-secondary rounded-lg p-1 flex-1 sm:flex-initial">
                {(['month', 'week', 'agenda'] as ViewType[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={cn(
                      'px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all capitalize flex-1 sm:flex-initial',
                      view === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {v === 'month' ? 'M' : v === 'week' ? 'W' : 'A'}
                    <span className="hidden sm:inline ml-1">{v.slice(1)}</span>
                  </button>
                ))}
              </div>

              {/* Google Calendar Connect - Hidden on mobile */}
              <Button
                variant={googleConnected ? 'outline' : 'secondary'}
                size="sm"
                onClick={connectGoogleCalendar}
                className="gap-2 hidden sm:flex"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {googleConnected ? 'Connected' : 'Connect Google'}
              </Button>

              <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)} className="hidden sm:flex">
                <Settings className="w-4 h-4" />
              </Button>

              {/* Create Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="gap-1 sm:gap-2" size="sm">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Create</span>
                    <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => openCreateDialog('task')}>
                    <ListTodo className="w-4 h-4 mr-2 text-blue-500" />
                    Task
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openCreateDialog('event')}>
                    <CalendarIcon className="w-4 h-4 mr-2 text-purple-500" />
                    Event
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openCreateDialog('birthday')}>
                    <Cake className="w-4 h-4 mr-2 text-pink-500" />
                    Birthday
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openCreateDialog('reminder')}>
                    <Bell className="w-4 h-4 mr-2 text-orange-500" />
                    Reminder
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openCreateDialog('milestone')}>
                    <Milestone className="w-4 h-4 mr-2 text-green-500" />
                    Milestone
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>


      {/* Main Calendar Content */}
      <div className="max-w-[1800px] mx-auto p-3 sm:p-6">
        <div className="flex gap-3 sm:gap-6">
          {/* Mini Calendar Sidebar - Hidden on mobile */}
          <div className="w-64 flex-shrink-0 hidden lg:block">
            <MiniCalendar 
              currentDate={currentDate} 
              onDateSelect={(date) => { setCurrentDate(date); setView('day'); }}
              events={events}
              getDailyLoad={getDailyLoad}
            />
            
            {/* Weekly Insights - Link to Home */}
            <div className="mt-6 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  This Week
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs gap-1"
                  onClick={() => navigate('/')}
                >
                  <Home className="w-3 h-3" />
                  Dashboard
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-background/50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">{weeklyInsights.completionRate}%</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div className="text-center p-2 bg-background/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{weeklyInsights.goalAlignmentRate}%</div>
                  <div className="text-xs text-muted-foreground">Goal-Aligned</div>
                </div>
              </div>
              {weeklyInsights.overloadedDays > 0 && (
                <div className="mt-3 flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-500/10 rounded-lg p-2">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{weeklyInsights.overloadedDays} heavy day{weeklyInsights.overloadedDays > 1 ? 's' : ''} this week</span>
                </div>
              )}
            </div>
            
            {/* Smart Upcoming Events */}
            <div className="mt-6 bg-card border border-border rounded-xl p-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Smart Upcoming
              </h3>
              <div className="space-y-2">
                {smartUpcomingEvents.map((event) => {
                  const linkedSkill = getLinkedSkill(event.linkedSkillId);
                  const linkedPage = getLinkedPage(event.linkedPageId);
                  const daysUntil = differenceInDays(event.start, new Date());
                  
                  return (
                    <div
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className="p-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors border border-transparent hover:border-border"
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: event.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn(
                              "text-xs",
                              isToday(event.start) ? "text-primary font-medium" : 
                              daysUntil <= 1 ? "text-orange-500" : "text-muted-foreground"
                            )}>
                              {isToday(event.start) ? 'Today' : 
                               daysUntil === 1 ? 'Tomorrow' : 
                               format(event.start, 'MMM d')}
                            </span>
                            {linkedSkill && (
                              <span className="text-xs text-primary/70 flex items-center gap-0.5">
                                <Brain className="w-3 h-3" />
                                {linkedSkill.name}
                              </span>
                            )}
                          </div>
                          {event.purpose && !linkedSkill && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{event.purpose}</p>
                          )}
                        </div>
                        {event.task?.priority === 'high' && (
                          <Flag className="w-3 h-3 text-red-500 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
                {smartUpcomingEvents.length === 0 && (
                  <div className="text-center py-4">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500/50" />
                    <p className="text-sm text-muted-foreground">All caught up!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Calendars List */}
            <div className="mt-6 bg-card border border-border rounded-xl p-4">
              <h3 className="font-semibold text-foreground mb-3">My Calendars</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-border" />
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-foreground">Tasks</span>
                </label>
                {googleConnected && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded border-border" />
                    <span className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm text-foreground">Google Calendar</span>
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Main Calendar View */}
          <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden">
            {view === 'month' && (
              <MonthView
                days={getMonthDays()}
                currentDate={currentDate}
                events={events}
                onDateClick={handleDateClick}
                onEventClick={handleEventClick}
              />
            )}
            {view === 'week' && (
              <WeekView
                days={getWeekDays()}
                events={events}
                onDateClick={handleDateClick}
                onEventClick={handleEventClick}
              />
            )}
            {view === 'day' && (
              <DayView
                date={currentDate}
                events={getEventsForDay(currentDate)}
                onEventClick={handleEventClick}
              />
            )}
            {view === 'agenda' && (
              <AgendaView
                events={events}
                onEventClick={handleEventClick}
              />
            )}
          </div>
        </div>
      </div>

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        open={showEventDetail}
        onClose={() => { setShowEventDetail(false); setSelectedEvent(null); }}
        onToggleStatus={toggleTaskStatus}
        onDelete={deleteTask}
        getLinkedPage={getLinkedPage}
        getLinkedSkill={getLinkedSkill}
        navigate={navigate}
      />

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onTaskCreated={loadTasks}
        task={editingTask}
        defaultEventType={defaultEventType}
        defaultDate={selectedDate || undefined}
      />

      {/* Settings Modal */}
      <CalendarSettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        googleConnected={googleConnected}
        onConnectGoogle={connectGoogleCalendar}
      />
    </div>
  );
}


// Mini Calendar Component with Daily Load Indicator
function MiniCalendar({ currentDate, onDateSelect, events, getDailyLoad }: { 
  currentDate: Date; 
  onDateSelect: (date: Date) => void;
  events: CalendarEvent[];
  getDailyLoad: (date: Date) => string;
}) {
  const [viewDate, setViewDate] = useState(currentDate);
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const days: Date[] = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const hasEvents = (date: Date) => events.some(e => isSameDay(e.start, date));
  
  const getLoadColor = (load: string) => {
    switch (load) {
      case 'overloaded': return 'bg-red-500';
      case 'heavy': return 'bg-orange-500';
      case 'moderate': return 'bg-yellow-500';
      case 'light': return 'bg-green-500';
      default: return '';
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-1 hover:bg-secondary rounded">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-semibold text-sm">{format(viewDate, 'MMMM yyyy')}</span>
        <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-1 hover:bg-secondary rounded">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-xs text-muted-foreground font-medium py-1">{d}</div>
        ))}
        {days.map((d, i) => {
          const load = getDailyLoad(d);
          const loadColor = getLoadColor(load);
          
          return (
            <button
              key={i}
              onClick={() => onDateSelect(d)}
              className={cn(
                'text-xs p-1.5 rounded-full relative transition-colors',
                !isSameMonth(d, viewDate) && 'text-muted-foreground/50',
                isToday(d) && 'bg-primary text-primary-foreground font-bold',
                isSameDay(d, currentDate) && !isToday(d) && 'bg-primary/20 text-primary',
                'hover:bg-secondary'
              )}
            >
              {format(d, 'd')}
              {/* Daily load indicator */}
              {loadColor && !isToday(d) && (
                <span className={cn(
                  "absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
                  loadColor
                )} />
              )}
              {/* Event dot for days without load indicator */}
              {hasEvents(d) && !loadColor && !isToday(d) && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
      {/* Load Legend */}
      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Light
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500" /> Heavy
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Overload
          </span>
        </div>
      </div>
    </div>
  );
}


// Month View Component
function MonthView({ days, currentDate, events, onDateClick, onEventClick }: {
  days: Date[];
  currentDate: Date;
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}) {
  const getEventsForDay = (date: Date) => events.filter(e => isSameDay(e.start, date));

  return (
    <div className="h-[700px] flex flex-col">
      {/* Header */}
      <div className="grid grid-cols-7 border-b border-border">
        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
          <div key={day} className="px-3 py-2 text-sm font-medium text-muted-foreground text-center border-r border-border last:border-r-0">
            {day}
          </div>
        ))}
      </div>
      
      {/* Days Grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6">
        {days.map((day, i) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          
          return (
            <div
              key={i}
              onClick={() => onDateClick(day)}
              className={cn(
                'border-r border-b border-border p-1 min-h-[100px] cursor-pointer transition-colors hover:bg-secondary/30',
                !isCurrentMonth && 'bg-secondary/20',
                isToday(day) && 'bg-primary/5'
              )}
            >
              <div className={cn(
                'text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full',
                isToday(day) && 'bg-primary text-primary-foreground',
                !isCurrentMonth && 'text-muted-foreground'
              )}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                    className="text-xs px-1.5 py-0.5 rounded truncate text-white font-medium cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: event.color }}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground px-1.5">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// Week View Component
function WeekView({ days, events, onDateClick, onEventClick }: {
  days: Date[];
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const getEventsForDay = (date: Date) => events.filter(e => isSameDay(e.start, date));

  return (
    <div className="h-[700px] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex border-b border-border flex-shrink-0">
        <div className="w-16 flex-shrink-0" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              'flex-1 text-center py-2 border-r border-border last:border-r-0',
              isToday(day) && 'bg-primary/5'
            )}
          >
            <div className="text-xs text-muted-foreground">{format(day, 'EEE')}</div>
            <div className={cn(
              'text-lg font-semibold w-8 h-8 mx-auto flex items-center justify-center rounded-full',
              isToday(day) && 'bg-primary text-primary-foreground'
            )}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* All Day Events */}
      <div className="flex border-b border-border flex-shrink-0">
        <div className="w-16 flex-shrink-0 text-xs text-muted-foreground p-2">All day</div>
        {days.map((day) => {
          const dayEvents = getEventsForDay(day).filter(e => e.allDay);
          return (
            <div key={day.toISOString()} className="flex-1 border-r border-border last:border-r-0 p-1 min-h-[40px]">
              {dayEvents.slice(0, 2).map((event) => (
                <div
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="text-xs px-1.5 py-0.5 rounded truncate text-white font-medium cursor-pointer mb-0.5"
                  style={{ backgroundColor: event.color }}
                >
                  {event.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Time Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative">
          {hours.map((hour) => (
            <div key={hour} className="flex h-12 border-b border-border/50">
              <div className="w-16 flex-shrink-0 text-xs text-muted-foreground pr-2 text-right -mt-2">
                {hour === 0 ? '' : format(new Date().setHours(hour, 0), 'h a')}
              </div>
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  onClick={() => onDateClick(day)}
                  className="flex-1 border-r border-border/50 last:border-r-0 hover:bg-secondary/20 cursor-pointer"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// Day View Component
function DayView({ date, events, onEventClick }: {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const allDayEvents = events.filter(e => e.allDay);

  return (
    <div className="h-[700px] flex flex-col overflow-hidden">
      {/* All Day Events */}
      {allDayEvents.length > 0 && (
        <div className="flex border-b border-border flex-shrink-0 p-2">
          <div className="w-16 flex-shrink-0 text-xs text-muted-foreground">All day</div>
          <div className="flex-1 flex flex-wrap gap-1">
            {allDayEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => onEventClick(event)}
                className="text-xs px-2 py-1 rounded text-white font-medium cursor-pointer"
                style={{ backgroundColor: event.color }}
              >
                {event.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time Grid */}
      <div className="flex-1 overflow-y-auto">
        {hours.map((hour) => (
          <div key={hour} className="flex h-16 border-b border-border/50">
            <div className="w-16 flex-shrink-0 text-xs text-muted-foreground pr-2 text-right -mt-2">
              {hour === 0 ? '12 AM' : format(new Date().setHours(hour, 0), 'h a')}
            </div>
            <div className="flex-1 relative hover:bg-secondary/20">
              {/* Events would be positioned here based on time */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Agenda View Component
function AgendaView({ events, onEventClick }: {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}) {
  const sortedEvents = [...events]
    .filter(e => e.start >= startOfDay(new Date()))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const groupedEvents = sortedEvents.reduce((acc, event) => {
    const dateKey = format(event.start, 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  return (
    <div className="h-[700px] overflow-y-auto p-4">
      {Object.entries(groupedEvents).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No upcoming events</p>
        </div>
      ) : (
        Object.entries(groupedEvents).map(([dateKey, dayEvents]) => (
          <div key={dateKey} className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className={cn(
                'w-12 h-12 rounded-xl flex flex-col items-center justify-center',
                isToday(parseISO(dateKey)) ? 'bg-primary text-primary-foreground' : 'bg-secondary'
              )}>
                <span className="text-xs font-medium">{format(parseISO(dateKey), 'EEE')}</span>
                <span className="text-lg font-bold">{format(parseISO(dateKey), 'd')}</span>
              </div>
              <div>
                <p className="font-semibold text-foreground">{format(parseISO(dateKey), 'EEEE')}</p>
                <p className="text-sm text-muted-foreground">{format(parseISO(dateKey), 'MMMM yyyy')}</p>
              </div>
            </div>
            <div className="space-y-2 ml-15">
              {dayEvents.map((event) => (
                <div
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-secondary/50 cursor-pointer transition-colors"
                >
                  <div className="w-1 h-10 rounded-full" style={{ backgroundColor: event.color }} />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{event.title}</p>
                    {event.description && (
                      <p className="text-sm text-muted-foreground truncate">{event.description}</p>
                    )}
                  </div>
                  {event.task && (
                    <span className={cn(
                      'text-xs px-2 py-1 rounded-full font-medium',
                      event.task.status === 'done' ? 'bg-green-500/10 text-green-600' :
                      event.task.status === 'in-progress' ? 'bg-orange-500/10 text-orange-600' :
                      'bg-blue-500/10 text-blue-600'
                    )}>
                      {event.task.status.replace('-', ' ')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}


// Enhanced Event Detail Modal with Purpose & Links
function EventDetailModal({ event, open, onClose, onToggleStatus, onDelete, getLinkedPage, getLinkedSkill, navigate }: {
  event: CalendarEvent | null;
  open: boolean;
  onClose: () => void;
  onToggleStatus: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  getLinkedPage: (pageId?: string) => Page | undefined;
  getLinkedSkill: (skillId?: string) => Skill | undefined;
  navigate: (path: string) => void;
}) {
  if (!event) return null;

  const linkedPage = getLinkedPage(event.linkedPageId);
  const linkedSkill = getLinkedSkill(event.linkedSkillId);
  const EventIcon = EVENT_TYPE_ICONS[event.eventType || 'task'] || ListTodo;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${event.color}20` }}
            >
              <EventIcon className="w-5 h-5" style={{ color: event.color }} />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">{event.title}</DialogTitle>
              <span className="text-xs text-muted-foreground capitalize">{event.eventType || 'task'}</span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit2 className="w-4 h-4 mr-2" />Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="w-4 h-4 mr-2" />Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => event.task && onDelete(event.task.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-4">
          {/* Date & Time */}
          <div className="flex items-center gap-3 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{format(event.start, 'EEEE, MMMM d, yyyy')}</span>
            {isToday(event.start) && (
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">Today</span>
            )}
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{event.location}</span>
            </div>
          )}

          {/* Purpose Section */}
          {(event.purpose || event.description) && (
            <div className="bg-gradient-to-r from-primary/5 to-transparent rounded-xl p-4 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Purpose</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {event.description || event.purpose}
              </p>
            </div>
          )}

          {/* Linked Items Section */}
          {(linkedPage || linkedSkill) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Link2 className="w-4 h-4 text-muted-foreground" />
                Connected To
              </div>
              
              {linkedSkill && (
                <button
                  onClick={() => { onClose(); navigate(`/skills?highlight=${linkedSkill.id}`); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-secondary/50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{linkedSkill.name}</p>
                    <p className="text-xs text-muted-foreground">{linkedSkill.level} • Skill</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
              
              {linkedPage && (
                <button
                  onClick={() => { onClose(); navigate(`/pages/${linkedPage.id}`); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-secondary/50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{linkedPage.title}</p>
                    <p className="text-xs text-muted-foreground">Page</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          )}

          {/* Task Status */}
          {event.task && (
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <button
                  onClick={() => onToggleStatus(event.task!.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    event.task.status === 'done' ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' :
                    event.task.status === 'in-progress' ? 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20' :
                    'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20'
                  )}
                >
                  {event.task.status === 'done' ? <CheckCircle2 className="w-4 h-4" /> :
                   event.task.status === 'in-progress' ? <AlertCircle className="w-4 h-4" /> :
                   <Circle className="w-4 h-4" />}
                  <span className="capitalize">{event.task.status.replace('-', ' ')}</span>
                </button>
              </div>

              {event.task.priority && (
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm text-muted-foreground">Priority</span>
                  <span className={cn(
                    'flex items-center gap-1 text-sm font-medium',
                    event.task.priority === 'high' ? 'text-red-500' :
                    event.task.priority === 'medium' ? 'text-orange-500' : 'text-gray-500'
                  )}>
                    <Flag className="w-3 h-3" />
                    <span className="capitalize">{event.task.priority}</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="pt-4 border-t border-border flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => { onClose(); navigate('/'); }}
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            {event.task && event.task.status !== 'done' && (
              <Button 
                size="sm" 
                className="flex-1"
                onClick={() => onToggleStatus(event.task!.id)}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


// Calendar Settings Modal
function CalendarSettingsModal({ open, onClose, googleConnected, onConnectGoogle }: {
  open: boolean;
  onClose: () => void;
  googleConnected: boolean;
  onConnectGoogle: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogTitle className="text-lg font-semibold mb-4">Calendar Settings</DialogTitle>
        
        <div className="space-y-6">
          {/* Connected Calendars */}
          <div>
            <h3 className="font-medium text-foreground mb-3">Connected Calendars</h3>
            <div className="space-y-3">
              {/* Google Calendar */}
              <div className="flex items-center justify-between p-3 border border-border rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Google Calendar</p>
                    <p className="text-sm text-muted-foreground">
                      {googleConnected ? 'Connected' : 'Sync your Google Calendar events'}
                    </p>
                  </div>
                </div>
                <Button
                  variant={googleConnected ? 'outline' : 'default'}
                  size="sm"
                  onClick={onConnectGoogle}
                >
                  {googleConnected ? 'Disconnect' : 'Connect'}
                </Button>
              </div>

              {/* Outlook Calendar */}
              <div className="flex items-center justify-between p-3 border border-border rounded-xl opacity-60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#0078D4] flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.5V2.55q0-.44.3-.75.3-.3.75-.3h12.9q.44 0 .75.3.3.3.3.75V12zm-6-8.25v3h3v-3zm0 4.5v3h3v-3zm0 4.5v1.83l3.05-1.83zm-5.25-9v3h3.75v-3zm0 4.5v3h3.75v-3zm0 4.5v2.03l2.41 1.5 1.34-.8v-2.73zM9 3.75V6h2l.13.01.12.04v-2.3zM5.98 15.98q.9 0 1.6-.3.7-.32 1.19-.86.48-.55.73-1.28.25-.74.25-1.61 0-.83-.25-1.55-.24-.71-.71-1.24t-1.15-.83q-.68-.3-1.55-.3-.92 0-1.64.3-.71.3-1.2.85-.5.54-.75 1.3-.25.74-.25 1.63 0 .85.26 1.56.26.72.74 1.23.48.52 1.17.81.69.3 1.56.3zM7.5 21h12.39L12 16.08V17q0 .41-.3.7-.29.3-.7.3H7.5zm15-.13v-7.24l-5.9 3.54Z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Outlook Calendar</p>
                    <p className="text-sm text-muted-foreground">Coming soon</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Connect
                </Button>
              </div>
            </div>
          </div>

          {/* Default View */}
          <div>
            <h3 className="font-medium text-foreground mb-3">Default View</h3>
            <div className="flex gap-2">
              {['month', 'week', 'day', 'agenda'].map((v) => (
                <button
                  key={v}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-secondary transition-colors capitalize"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Week Start */}
          <div>
            <h3 className="font-medium text-foreground mb-3">Week Starts On</h3>
            <div className="flex gap-2">
              {['Sunday', 'Monday'].map((day) => (
                <button
                  key={day}
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded-lg border transition-colors',
                    day === 'Sunday' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-secondary'
                  )}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Time Format */}
          <div>
            <h3 className="font-medium text-foreground mb-3">Time Format</h3>
            <div className="flex gap-2">
              {['12-hour', '24-hour'].map((fmt) => (
                <button
                  key={fmt}
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded-lg border transition-colors',
                    fmt === '12-hour' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-secondary'
                  )}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
