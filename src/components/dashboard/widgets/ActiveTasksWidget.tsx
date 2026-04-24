import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckSquare, Loader2, Circle, CheckCircle2, Clock, AlertTriangle, Plus, Filter, MoreHorizontal } from 'lucide-react';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';
import { format, isPast, isToday } from 'date-fns';
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
  linked_skill_id?: string;
}

const PRIORITY_COLORS = {
  high: 'text-red-500',
  medium: 'text-orange-500',
  low: 'text-blue-500',
};

const STATUS_ICONS = {
  'todo': Circle,
  'in-progress': Clock,
  'in_progress': Clock,
  'done': CheckCircle2,
  'completed': CheckCircle2,
};

export function ActiveTasksWidget() {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  
  // ✅ CACHE-FIRST LOADING - Instant load from IndexedDB
  const { tasks: cachedTasks, loading, fromCache } = useCacheFirstTasks(
    currentWorkspace?.id,
    () => currentWorkspace?.id ? api.getTasks(currentWorkspace.id) : Promise.resolve([])
  );
  
  const tasks = cachedTasks || [];
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  
  // Create task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateTask = async () => {
    if (!currentWorkspace || !newTaskTitle.trim()) return;
    
    try {
      setCreating(true);
      await api.createTask({
        workspace_id: currentWorkspace.id,
        title: newTaskTitle,
        priority: newTaskPriority,
        due_date: newTaskDueDate || undefined,
        status: 'todo',
      });
      
      // Reset form
      setNewTaskTitle('');
      setNewTaskPriority('medium');
      setNewTaskDueDate('');
      setShowCreateDialog(false);
      
      // Tasks will auto-refresh from cache-first hook
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setCreating(false);
    }
  };

  const getTaskStatus = (task: Task) => {
    if (task.status === 'done' || task.status === 'completed') {
      return { label: 'Done', color: 'text-green-600 dark:text-green-400' };
    }
    if (task.due_date) {
      const dueDate = new Date(task.due_date);
      if (isPast(dueDate) && !isToday(dueDate)) {
        return { label: 'Overdue', color: 'text-red-600 dark:text-red-400' };
      }
      if (isToday(dueDate)) {
        return { label: 'Due today', color: 'text-orange-600 dark:text-orange-400' };
      }
    }
    if (task.status === 'in-progress' || task.status === 'in_progress') {
      return { label: 'In Progress', color: 'text-blue-600 dark:text-blue-400' };
    }
    return { label: 'To Do', color: 'text-muted-foreground' };
  };

  if (loading && !fromCache && tasks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Filter active tasks (not done)
  const activeTasks = tasks
    .filter(t => {
      const statusMatch = filterStatus === 'all' || t.status === filterStatus;
      const priorityMatch = filterPriority === 'all' || t.priority === filterPriority;
      const notDone = t.status !== 'done' && t.status !== 'completed';
      return notDone && statusMatch && priorityMatch;
    })
    .sort((a, b) => {
      // Sort by: overdue first, then by due date, then by priority
      const aOverdue = a.due_date && isPast(new Date(a.due_date));
      const bOverdue = b.due_date && isPast(new Date(b.due_date));
      
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return (priorityOrder[a.priority as keyof typeof priorityOrder] || 3) - 
             (priorityOrder[b.priority as keyof typeof priorityOrder] || 3);
    });

  const overdueTasks = activeTasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)));
  const inProgressTasks = activeTasks.filter(t => t.status === 'in-progress' || t.status === 'in_progress');

  return (
    <div className="h-full flex flex-col group">
      {/* Header - Outside border */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-primary" />
          <h3 className="font-medium text-sm text-foreground">Active Tasks</h3>
        </div>
        <div className="flex items-center gap-1">
          {/* Create Task Button - Shows on hover */}
          <button 
            onClick={() => setShowCreateDialog(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-secondary rounded"
            title="Create task"
          >
            <Plus className="w-4 h-4 text-muted-foreground hover:text-primary" />
          </button>
          
          {/* Filter Button - Shows on hover */}
          <button 
            onClick={() => setShowFilterDialog(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-secondary rounded"
            title="Filter tasks"
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
              <DropdownMenuItem onClick={() => navigate('/tasks')}>
                <CheckSquare className="w-4 h-4 mr-2" />
                View all tasks
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowFilterDialog(true)}>
                <Filter className="w-4 h-4 mr-2" />
                Filter options
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content - Inside border */}
      <div className="flex-1 flex flex-col bg-card border border-border/50 rounded-xl overflow-hidden">
        <div className="p-4 flex-1 flex flex-col">
          {/* Quick Stats */}
          <div className="flex items-center gap-4 text-xs mb-3 pb-3 border-b border-border/50">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground">{activeTasks.length}</span>
              <span className="text-muted-foreground">Active</span>
            </div>
            {inProgressTasks.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-blue-500" />
                <span className="font-semibold text-foreground">{inProgressTasks.length}</span>
                <span className="text-muted-foreground">In Progress</span>
              </div>
            )}
            {overdueTasks.length > 0 && (
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-red-500" />
                <span className="font-semibold text-foreground">{overdueTasks.length}</span>
                <span className="text-muted-foreground">Overdue</span>
              </div>
            )}
          </div>

          {/* Task List */}
          {activeTasks.length > 0 ? (
            <div className="flex-1 overflow-y-auto space-y-2">
              {activeTasks.slice(0, 8).map((task) => {
                const status = getTaskStatus(task);
                const StatusIcon = STATUS_ICONS[task.status as keyof typeof STATUS_ICONS] || Circle;
                
                return (
                  <button
                    key={task.id}
                    onClick={() => navigate('/tasks')}
                    className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors text-left group"
                  >
                    <div className={cn(
                      "w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5",
                      task.priority === 'high' ? "bg-red-500/10" :
                      task.priority === 'medium' ? "bg-orange-500/10" :
                      "bg-secondary"
                    )}>
                      <StatusIcon className={cn(
                        "w-3 h-3",
                        PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] || "text-muted-foreground"
                      )} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn("text-xs", status.color)}>
                          {status.label}
                        </span>
                        {task.due_date && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(task.due_date), 'MMM d')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
              
              {activeTasks.length > 8 && (
                <Link to="/tasks">
                  <div className="text-center py-2 text-xs text-primary hover:underline">
                    +{activeTasks.length - 8} more tasks
                  </div>
                </Link>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
              <CheckCircle2 className="w-8 h-8 text-green-500/30 mb-2" />
              <p className="text-sm text-muted-foreground">All tasks completed!</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Task Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Task Title</Label>
              <Input
                id="task-title"
                placeholder="Enter task title..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-priority">Priority</Label>
              <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                <SelectTrigger id="task-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due-date">Due Date (Optional)</Label>
              <Input
                id="task-due-date"
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTask} disabled={!newTaskTitle.trim() || creating}>
              {creating ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter Dialog */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filter Tasks</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filter-status">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="filter-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-priority">Priority</Label>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger id="filter-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setFilterStatus('all');
                setFilterPriority('all');
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
