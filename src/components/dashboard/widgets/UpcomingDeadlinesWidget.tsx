import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Loader2, ListTodo, Cake, Bell, Milestone, Clock, Plus, Filter, MoreHorizontal } from 'lucide-react';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { useCacheFirstTasks } from '@/hooks/useCacheFirst';
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
  event_type?: string;
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

export function UpcomingDeadlinesWidget() {
  const { currentWorkspace } = useWorkspace();
  
  // ✅ CACHE-FIRST LOADING - Instant load from IndexedDB
  const { tasks: cachedTasks, loading, fromCache } = useCacheFirstTasks(
    currentWorkspace?.id,
    () => currentWorkspace?.id ? api.getTasks(currentWorkspace.id) : Promise.resolve([])
  );
  
  const [tasks, setTasks] = useState<Task[]>([]);
  
  useEffect(() => {
    if (cachedTasks.length > 0) {
      setTasks(cachedTasks);
    }
  }, [cachedTasks]);
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterUrgency, setFilterUrgency] = useState<string>('all');
  
  // Create deadline form state
  const [newDeadlineTitle, setNewDeadlineTitle] = useState('');
  const [newDeadlineType, setNewDeadlineType] = useState('task');
  const [newDeadlineDate, setNewDeadlineDate] = useState('');
  const [newDeadlinePriority, setNewDeadlinePriority] = useState('medium');
  const [creating, setCreating] = useState(false);

  const loadTasks = async () => {
    if (!currentWorkspace) return;
    try {
      const data = await api.getTasks(currentWorkspace.id);
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const handleCreateDeadline = async () => {
    if (!currentWorkspace || !newDeadlineTitle.trim() || !newDeadlineDate) return;
    
    try {
      setCreating(true);
      await api.createTask({
        workspace_id: currentWorkspace.id,
        title: newDeadlineTitle,
        event_type: newDeadlineType,
        due_date: newDeadlineDate,
        priority: newDeadlinePriority,
        status: 'todo',
      });
      
      // Reset form
      setNewDeadlineTitle('');
      setNewDeadlineType('task');
      setNewDeadlineDate('');
      setNewDeadlinePriority('medium');
      setShowCreateDialog(false);
      
      // Reload tasks
      await loadTasks();
    } catch (error) {
      console.error('Failed to create deadline:', error);
    } finally {
      setCreating(false);
    }
  };

  const getDeadlineLabel = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    
    // Check if overdue (past the due date/time)
    if (due < now) {
      if (isToday(due)) {
        return { label: 'Overdue today', color: 'text-destructive bg-destructive/10' };
      }
      return { label: 'Overdue', color: 'text-destructive bg-destructive/10' };
    }
    
    if (isToday(due)) return { label: 'Today', color: 'text-amber-500 bg-amber-500/10' };
    if (isTomorrow(due)) return { label: 'Tomorrow', color: 'text-amber-500 bg-amber-500/10' };
    return { label: format(due, 'MMM d'), color: 'text-muted-foreground bg-secondary' };
  };

  const getEventColor = (task: Task) => {
    if (task.color) return task.color;
    const eventType = task.event_type || 'task';
    return DEFAULT_COLORS[eventType as keyof typeof DEFAULT_COLORS] || DEFAULT_COLORS.task;
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-5">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Filter tasks with due dates and sort by date
  const upcomingTasks = tasks
    .filter(t => {
      if (!t.due_date || t.status === 'done') return false;
      
      const typeMatch = filterType === 'all' || t.event_type === filterType;
      
      if (filterUrgency === 'overdue') {
        return isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && typeMatch;
      } else if (filterUrgency === 'today') {
        return isToday(new Date(t.due_date)) && typeMatch;
      } else if (filterUrgency === 'this_week') {
        const daysUntil = Math.ceil((new Date(t.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return daysUntil >= 0 && daysUntil <= 7 && typeMatch;
      }
      
      return typeMatch;
    })
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 6);

  return (
    <div className="h-full flex flex-col group">
      {/* Header - Outside border */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-500" />
          Upcoming
        </h3>
        <div className="flex items-center gap-1">
          {/* Add Deadline Button - Shows on hover */}
          <button 
            onClick={() => setShowCreateDialog(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-secondary rounded"
            title="Set deadline"
          >
            <Plus className="w-4 h-4 text-muted-foreground hover:text-primary" />
          </button>
          
          {/* Filter Button - Shows on hover */}
          <button 
            onClick={() => setShowFilterDialog(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-secondary rounded"
            title="Filter deadlines"
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
              <DropdownMenuItem onClick={() => window.location.href = `/workspace/${currentWorkspace?.id}/tasks`}>
                <Clock className="w-4 h-4 mr-2" />
                View all deadlines
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Set deadline
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowFilterDialog(true)}>
                <Filter className="w-4 h-4 mr-2" />
                Filter by type
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content - Inside border */}
      <div className="flex-1 flex flex-col bg-card border border-border/50 rounded-xl overflow-hidden">
        <div className="p-4 flex-1 flex flex-col">
          {upcomingTasks.length > 0 ? (
            <div className="space-y-2 flex-1 overflow-y-auto">
              {upcomingTasks.map((task) => {
                const status = getDeadlineLabel(task.due_date!);
                const eventType = task.event_type || 'task';
                const Icon = EVENT_TYPE_ICONS[eventType as keyof typeof EVENT_TYPE_ICONS] || ListTodo;
                return (
                  <Link key={task.id} to={`/workspace/${currentWorkspace?.id}/tasks`}>
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer">
                      <div 
                        className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: getEventColor(task) }}
                      >
                        <Icon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{eventType}</p>
                      </div>
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap", status.color)}>
                        {status.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground flex-1 flex flex-col items-center justify-center">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No upcoming items</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Deadline Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set New Deadline</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deadline-title">Title</Label>
              <Input
                id="deadline-title"
                placeholder="Enter task or event title..."
                value={newDeadlineTitle}
                onChange={(e) => setNewDeadlineTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateDeadline()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline-type">Type</Label>
              <Select value={newDeadlineType} onValueChange={setNewDeadlineType}>
                <SelectTrigger id="deadline-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="milestone">Milestone</SelectItem>
                  <SelectItem value="birthday">Birthday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline-date">Deadline Date</Label>
              <Input
                id="deadline-date"
                type="date"
                value={newDeadlineDate}
                onChange={(e) => setNewDeadlineDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline-priority">Priority</Label>
              <Select value={newDeadlinePriority} onValueChange={setNewDeadlinePriority}>
                <SelectTrigger id="deadline-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDeadline} disabled={!newDeadlineTitle.trim() || !newDeadlineDate || creating}>
              {creating ? 'Creating...' : 'Set Deadline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter Dialog */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filter Deadlines</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filter-type">Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger id="filter-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="task">Tasks</SelectItem>
                  <SelectItem value="event">Events</SelectItem>
                  <SelectItem value="reminder">Reminders</SelectItem>
                  <SelectItem value="milestone">Milestones</SelectItem>
                  <SelectItem value="birthday">Birthdays</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-urgency">Urgency</Label>
              <Select value={filterUrgency} onValueChange={setFilterUrgency}>
                <SelectTrigger id="filter-urgency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Deadlines</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setFilterType('all');
                setFilterUrgency('all');
              }}
            >
              Clear Filters
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
