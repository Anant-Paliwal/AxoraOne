import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Calendar, Loader2, ChevronLeft, ChevronRight, Zap, 
  AlertTriangle, Clock, Plus, Filter, MoreHorizontal
} from 'lucide-react';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  addDays, isSameMonth, isSameDay, addMonths, subMonths, 
  isToday, startOfDay, endOfDay, isPast
} from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date?: string;
  linked_skill_id?: string;
}

export function CalendarInsightWidget() {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  
  // Create event form state
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventType, setNewEventType] = useState('event');
  const [newEventDate, setNewEventDate] = useState('');
  const [creating, setCreating] = useState(false);

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
      setTasks(data || []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!currentWorkspace || !newEventTitle.trim() || !newEventDate) return;
    
    try {
      setCreating(true);
      await api.createTask({
        workspace_id: currentWorkspace.id,
        title: newEventTitle,
        event_type: newEventType,
        due_date: newEventDate,
        status: 'todo',
        priority: 'medium',
      });
      
      // Reset form
      setNewEventTitle('');
      setNewEventType('event');
      setNewEventDate('');
      setShowCreateDialog(false);
      
      // Reload tasks
      await loadTasks();
    } catch (error) {
      console.error('Failed to create event:', error);
    } finally {
      setCreating(false);
    }
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
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
    return days;
  }, [viewDate]);

  // Get tasks for a day
  const getTasksForDay = (date: Date) => {
    return tasks.filter(t => {
      if (!t.due_date || t.status === 'done') return false;
      const typeMatch = filterType === 'all' || t.event_type === filterType;
      return isSameDay(new Date(t.due_date), date) && typeMatch;
    });
  };

  // Calculate daily load
  const getDayLoad = (date: Date) => {
    const count = getTasksForDay(date).length;
    if (count >= 5) return 'overloaded';
    if (count >= 3) return 'heavy';
    if (count >= 1) return 'light';
    return 'free';
  };

  // INTELLIGENCE: Generate week insight
  const weekInsight = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    
    let totalTasks = 0;
    let heavyDays = 0;
    let freeDays = 0;
    let skillLinkedTasks = 0;

    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const dayTasks = getTasksForDay(day);
      totalTasks += dayTasks.length;
      
      if (dayTasks.length >= 3) heavyDays++;
      if (dayTasks.length === 0) freeDays++;
      
      dayTasks.forEach(t => {
        if (t.linked_skill_id) skillLinkedTasks++;
      });
    }

    // Generate insight message
    if (heavyDays >= 3) {
      return {
        message: 'Heavy week ahead — consider rescheduling',
        type: 'warning' as const
      };
    }
    if (freeDays >= 4) {
      return {
        message: 'Light week — good time for deep work',
        type: 'positive' as const
      };
    }
    if (skillLinkedTasks > totalTasks * 0.5) {
      return {
        message: 'Skill-focused week — great for learning',
        type: 'positive' as const
      };
    }
    if (totalTasks === 0) {
      return {
        message: 'No tasks scheduled this week',
        type: 'neutral' as const
      };
    }
    return {
      message: `${totalTasks} tasks this week`,
      type: 'neutral' as const
    };
  }, [tasks, viewDate]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col group">
      {/* Header - Outside border */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <h3 className="font-medium text-sm text-foreground">Calendar</h3>
        </div>
        <div className="flex items-center gap-1">
          {/* Add Event Button - Shows on hover */}
          <button 
            onClick={() => setShowCreateDialog(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-secondary rounded"
            title="Add event"
          >
            <Plus className="w-4 h-4 text-muted-foreground hover:text-primary" />
          </button>
          
          {/* Filter Button - Shows on hover */}
          <button 
            onClick={() => setShowFilterDialog(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-secondary rounded"
            title="Filter events"
          >
            <Filter className="w-4 h-4 text-muted-foreground hover:text-primary" />
          </button>
          
          {/* More Options Dropdown - Shows on hover */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-secondary rounded"
                title="More options"
              >
                <MoreHorizontal className="w-4 h-4 text-muted-foreground hover:text-primary" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/calendar')}>
                <Calendar className="w-4 h-4 mr-2" />
                Full calendar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add event
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowFilterDialog(true)}>
                <Filter className="w-4 h-4 mr-2" />
                View options
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content - Inside border */}
      <div className="flex-1 flex flex-col bg-card border border-border/50 rounded-xl overflow-hidden">
        <div className="p-4 flex-1 flex flex-col">
          {/* Month Navigation */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <button 
              onClick={() => setViewDate(subMonths(viewDate, 1))}
              className="p-1 hover:bg-secondary rounded"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <span className="text-xs sm:text-sm font-medium min-w-[80px] text-center">{format(viewDate, 'MMM yyyy')}</span>
            <button 
              onClick={() => setViewDate(addMonths(viewDate, 1))}
              className="p-1 hover:bg-secondary rounded"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Mini Calendar - Responsive */}
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center mb-3">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-[9px] sm:text-[10px] text-muted-foreground font-medium py-0.5 sm:py-1">{d}</div>
        ))}
        {calendarDays.map((day, i) => {
          const load = getDayLoad(day);
          const isCurrentMonth = isSameMonth(day, viewDate);
          
          return (
            <button
              key={i}
              onClick={() => navigate('/calendar')}
              className={cn(
                'text-[9px] sm:text-[10px] p-0.5 sm:p-1 rounded relative transition-colors',
                !isCurrentMonth && 'text-muted-foreground/40',
                isToday(day) && 'bg-primary text-primary-foreground font-bold',
                !isToday(day) && 'hover:bg-secondary'
              )}
            >
              {format(day, 'd')}
              {/* Load indicator */}
              {load !== 'free' && !isToday(day) && isCurrentMonth && (
                <span className={cn(
                  'absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full',
                  load === 'overloaded' ? 'bg-red-500' :
                  load === 'heavy' ? 'bg-orange-500' :
                  'bg-primary'
                )} />
              )}
            </button>
          );
        })}
      </div>

      {/* Week Insight - THE COMMENTARY */}
      <div className={cn(
        "mt-auto rounded-lg p-2 sm:p-3 text-center",
        weekInsight.type === 'warning' ? 'bg-orange-500/5 border border-orange-500/10' :
        weekInsight.type === 'positive' ? 'bg-green-500/5 border border-green-500/10' :
        'bg-secondary/50'
      )}>
        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
          {weekInsight.type === 'warning' ? (
            <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-500 flex-shrink-0" />
          ) : weekInsight.type === 'positive' ? (
            <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500 flex-shrink-0" />
          ) : (
            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground flex-shrink-0" />
          )}
          <span className={cn(
            "text-[10px] sm:text-xs",
            weekInsight.type === 'warning' ? 'text-orange-600 dark:text-orange-400' :
            weekInsight.type === 'positive' ? 'text-green-600 dark:text-green-400' :
            'text-muted-foreground'
          )}>
            {weekInsight.message}
          </span>
        </div>
      </div>
        </div>
      </div>

      {/* Create Event Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">Event Title</Label>
              <Input
                id="event-title"
                placeholder="Enter event title..."
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateEvent()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-type">Event Type</Label>
              <Select value={newEventType} onValueChange={setNewEventType}>
                <SelectTrigger id="event-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="milestone">Milestone</SelectItem>
                  <SelectItem value="birthday">Birthday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-date">Date</Label>
              <Input
                id="event-date"
                type="date"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateEvent} disabled={!newEventTitle.trim() || !newEventDate || creating}>
              {creating ? 'Creating...' : 'Add Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter Dialog */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filter Calendar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filter-type">Event Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger id="filter-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="event">Events</SelectItem>
                  <SelectItem value="task">Tasks</SelectItem>
                  <SelectItem value="reminder">Reminders</SelectItem>
                  <SelectItem value="milestone">Milestones</SelectItem>
                  <SelectItem value="birthday">Birthdays</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setFilterType('all')}
            >
              Clear Filter
            </Button>
            <Button onClick={() => setShowFilterDialog(false)}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
