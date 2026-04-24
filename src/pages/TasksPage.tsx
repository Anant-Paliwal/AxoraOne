import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckSquare, Plus, Calendar, Flag, MoreHorizontal, Link2, X, Trash2, Edit, Target, Save, Loader2, ChevronRight, ChevronDown, ListTodo, Cake, Bell, Milestone, AlertTriangle, Clock, Filter, LayoutGrid, List, CalendarDays, BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Task, Page, Skill } from '@/types/workspace';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { api } from '@/lib/api';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { ConnectedItems } from '@/components/graph/ConnectedItems';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format, isToday, isTomorrow, isPast, isThisWeek, startOfDay } from 'date-fns';
import { toast } from 'sonner';
import { computeTaskContext } from '@/lib/intelligenceUtils';
import { useCacheFirstTasks } from '@/hooks/useCacheFirst';
import { offlineDBHelpers } from '@/lib/offline-db';
import { syncManager } from '@/lib/sync-manager';

type ViewMode = 'list' | 'board' | 'calendar';
type FilterType = 'all' | 'today' | 'upcoming' | 'overdue' | 'completed' | 'blocked' | 'by-skill' | 'by-page' | 'events' | 'birthdays';

const EVENT_TYPE_CONFIG = {
  task: { icon: ListTodo, color: 'text-blue-500', bg: 'bg-blue-500' },
  event: { icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-500' },
  birthday: { icon: Cake, color: 'text-pink-500', bg: 'bg-pink-500' },
  reminder: { icon: Bell, color: 'text-orange-500', bg: 'bg-orange-500' },
  milestone: { icon: Milestone, color: 'text-green-500', bg: 'bg-green-500' },
};

const STATUS_CONFIG = {
  'todo': { icon: ListTodo, color: 'text-muted-foreground', label: 'To Do' },
  'in-progress': { icon: Clock, color: 'text-warning', label: 'In Progress' },
  'done': { icon: CheckSquare, color: 'text-success', label: 'Done' },
  'blocked': { icon: AlertTriangle, color: 'text-destructive', label: 'Blocked' },
};

const PRIORITY_CONFIG = {
  low: { color: 'text-muted-foreground', label: 'Low' },
  medium: { color: 'text-warning', label: 'Medium' },
  high: { color: 'text-destructive', label: 'High' },
};

export function TasksPage() {
  const { currentWorkspace, canEdit, canAdmin, getUserRole } = useWorkspace();
  const [filter, setFilter] = useState<FilterType>('today');
  
  // ✅ CACHE-FIRST LOADING - Instant load from IndexedDB
  const { tasks: cachedTasks, loading, fromCache } = useCacheFirstTasks(
    currentWorkspace?.id,
    () => currentWorkspace?.id ? api.getTasks(currentWorkspace.id) : Promise.resolve([])
  );
  
  // Transform tasks to match expected format
  const [tasks, setTasks] = useState<Task[]>([]);
  
  useEffect(() => {
    if (cachedTasks.length > 0) {
      const transformedTasks = cachedTasks.map((t: any) => ({
        ...t,
        dueDate: t.due_date || t.dueDate,
        linkedPageId: t.linked_page_id || t.linkedPageId,
        linkedSkillId: t.linked_skill_id || t.linkedSkillId,
        parentTaskId: t.parent_task_id || t.parentTaskId,
        eventType: t.event_type || t.eventType || 'task',
        createdFrom: t.created_from || t.createdFrom || 'manual',
        isRecurring: t.is_recurring || t.isRecurring,
        allDay: t.all_day || t.allDay,
        createdAt: t.created_at || t.createdAt,
        completedAt: t.completed_at || t.completedAt,
        orderIndex: t.order_index || t.orderIndex,
        blockedReason: t.blocked_reason || t.blockedReason,
      }));
      setTasks(transformedTasks);
    }
  }, [cachedTasks]);
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [defaultEventType, setDefaultEventType] = useState<'task' | 'event' | 'birthday' | 'reminder' | 'milestone'>('task');
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<string>('');
  const [selectedPageFilter, setSelectedPageFilter] = useState<string>('');
  const [parentTaskForSubtask, setParentTaskForSubtask] = useState<Task | null>(null);
  
  // Permission checks
  const userCanEdit = canEdit();
  const userRole = getUserRole();

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadPagesAndSkills();
    }
  }, [currentWorkspace?.id]);

  const loadPagesAndSkills = async () => {
    if (!currentWorkspace?.id) return;
    try {
      const [pagesData, skillsData] = await Promise.all([
        api.getPagesByWorkspace(currentWorkspace.id),
        api.getSkills(currentWorkspace.id)
      ]);
      setPages(pagesData);
      setSkills(skillsData);
    } catch (error) {
      console.error('Failed to load pages and skills:', error);
    }
  };

  // Organize tasks into parent/subtask hierarchy
  const organizedTasks = useMemo(() => {
    const parentTasks = tasks.filter(t => !t.parentTaskId);
    const subtaskMap = new Map<string, Task[]>();
    
    tasks.filter(t => t.parentTaskId).forEach(subtask => {
      const existing = subtaskMap.get(subtask.parentTaskId!) || [];
      subtaskMap.set(subtask.parentTaskId!, [...existing, subtask]);
    });

    return parentTasks.map(task => ({
      ...task,
      subtasks: subtaskMap.get(task.id) || []
    }));
  }, [tasks]);

  // Filter tasks based on current filter
  const filteredTasks = useMemo(() => {
    const today = startOfDay(new Date());
    
    return organizedTasks.filter((task) => {
      const taskDate = task.dueDate ? new Date(task.dueDate) : null;
      
      switch (filter) {
        case 'all':
          return true;
        case 'today':
          return taskDate && isToday(taskDate);
        case 'upcoming':
          return task.status !== 'done' && taskDate && taskDate > today;
        case 'overdue':
          return task.status !== 'done' && taskDate && isPast(taskDate) && !isToday(taskDate);
        case 'completed':
          return task.status === 'done';
        case 'blocked':
          return task.status === 'blocked';
        case 'events':
          return task.eventType === 'event';
        case 'birthdays':
          return task.eventType === 'birthday';
        case 'by-skill':
          return selectedSkillFilter ? task.linkedSkillId === selectedSkillFilter : !!task.linkedSkillId;
        case 'by-page':
          return selectedPageFilter ? task.linkedPageId === selectedPageFilter : !!task.linkedPageId;
        default:
          return true;
      }
    });
  }, [organizedTasks, filter, selectedSkillFilter, selectedPageFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: tasks.length,
    today: tasks.filter(t => t.dueDate && isToday(new Date(t.dueDate))).length,
    overdue: tasks.filter(t => t.status !== 'done' && t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))).length,
    completed: tasks.filter(t => t.status === 'done').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    events: tasks.filter(t => t.eventType === 'event').length,
    birthdays: tasks.filter(t => t.eventType === 'birthday').length,
  }), [tasks]);

  const toggleTaskStatus = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const statusOrder: ('todo' | 'in-progress' | 'done')[] = ['todo', 'in-progress', 'done'];
    const currentIndex = statusOrder.indexOf(task.status as any);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    
    // ✅ OPTIMISTIC UPDATE - Update UI instantly
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: nextStatus } : t));
    if (selectedTask?.id === taskId) {
      setSelectedTask({ ...selectedTask, status: nextStatus });
    }
    
    // Save to IndexedDB
    await offlineDBHelpers.saveTask({
      id: taskId,
      workspace_id: currentWorkspace!.id,
      status: nextStatus as any,
    });
    
    // Queue sync event
    await offlineDBHelpers.enqueueSyncEvent('task', taskId, 'patch', {
      status: nextStatus,
    });
    
    // Trigger background sync
    syncManager.triggerSync();
    
    toast.success(`Task marked as ${nextStatus.replace('-', ' ')}`);
  };

  const deleteTask = async (taskId: string) => {
    // Permission check - only admins and owners can delete
    if (!canAdmin()) {
      toast.error('You don\'t have permission to delete tasks');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.deleteTask(taskId);
      setTasks(tasks.filter(t => t.id !== taskId && t.parentTaskId !== taskId));
      if (selectedTask?.id === taskId) setSelectedTask(null);
      toast.success('Task deleted');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const toggleExpanded = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const openCreateDialog = (eventType: 'task' | 'event' | 'birthday' | 'reminder' | 'milestone' = 'task', parentTask?: Task) => {
    setDefaultEventType(eventType);
    setParentTaskForSubtask(parentTask || null);
    setEditingTask(null);
    setCreateDialogOpen(true);
  };

  const getLinkedPage = (pageId?: string) => pages.find(p => p.id === pageId);
  const getLinkedSkill = (skillId?: string) => skills.find(s => s.id === skillId);

  const formatDueDate = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
                  <CheckSquare className="w-8 h-8" />
                  Tasks & Events
                </h1>
                <p className="text-muted-foreground mt-1">
                  {stats.total} items · {stats.overdue > 0 && <span className="text-destructive">{stats.overdue} overdue</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-secondary rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn("p-2 rounded", viewMode === 'list' ? "bg-background shadow-sm" : "hover:bg-background/50")}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('board')}
                    className={cn("p-2 rounded", viewMode === 'board' ? "bg-background shadow-sm" : "hover:bg-background/50")}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>

                {/* Create Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="rounded-xl">
                      <Plus className="w-4 h-4 mr-2" />
                      Create
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => openCreateDialog('task')}>
                      <ListTodo className="w-4 h-4 mr-2 text-blue-500" />
                      Task
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openCreateDialog('event')}>
                      <Calendar className="w-4 h-4 mr-2 text-purple-500" />
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

            {/* Smart Filters */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              {[
                { value: 'all', label: 'All', count: stats.total },
                { value: 'today', label: 'Today', count: stats.today },
                { value: 'upcoming', label: 'Upcoming' },
                { value: 'overdue', label: 'Overdue', count: stats.overdue, highlight: stats.overdue > 0 },
                { value: 'completed', label: 'Completed', count: stats.completed },
                { value: 'blocked', label: 'Blocked', count: stats.blocked },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value as FilterType)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2",
                    filter === f.value
                      ? "bg-primary text-primary-foreground"
                      : f.highlight
                        ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  {f.label}
                  {f.count !== undefined && f.count > 0 && (
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-xs",
                      filter === f.value ? "bg-primary-foreground/20" : "bg-foreground/10"
                    )}>
                      {f.count}
                    </span>
                  )}
                </button>
              ))}
              
              <div className="h-6 w-px bg-border mx-2" />
              
              {/* Event Type Filters */}
              <button
                onClick={() => setFilter('events')}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2",
                  filter === 'events' ? "bg-purple-500 text-white" : "bg-secondary hover:bg-secondary/80"
                )}
              >
                <Calendar className="w-4 h-4" />
                Events
              </button>
              <button
                onClick={() => setFilter('birthdays')}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2",
                  filter === 'birthdays' ? "bg-pink-500 text-white" : "bg-secondary hover:bg-secondary/80"
                )}
              >
                <Cake className="w-4 h-4" />
                Birthdays
              </button>

              {/* Skill/Page Filters */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn(
                    "px-3 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2",
                    filter === 'by-skill' ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
                  )}>
                    <Target className="w-4 h-4" />
                    By Skill
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => { setFilter('by-skill'); setSelectedSkillFilter(''); }}>
                    All Skills
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {skills.map(skill => (
                    <DropdownMenuItem key={skill.id} onClick={() => { setFilter('by-skill'); setSelectedSkillFilter(skill.id); }}>
                      {skill.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn(
                    "px-3 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2",
                    filter === 'by-page' ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
                  )}>
                    <BookOpen className="w-4 h-4" />
                    By Page
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => { setFilter('by-page'); setSelectedPageFilter(''); }}>
                    All Pages
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {pages.slice(0, 10).map(page => (
                    <DropdownMenuItem key={page.id} onClick={() => { setFilter('by-page'); setSelectedPageFilter(page.id); }}>
                      {page.icon} {page.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>



            {/* Tasks List */}
            <div className="space-y-2">
              <AnimatePresence>
                {filteredTasks.map((task, index) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    index={index}
                    isSelected={selectedTask?.id === task.id}
                    isExpanded={expandedTasks.has(task.id)}
                    onSelect={() => setSelectedTask(task)}
                    onToggleStatus={() => toggleTaskStatus(task.id)}
                    onToggleExpand={() => toggleExpanded(task.id)}
                    onEdit={() => { setEditingTask(task); setCreateDialogOpen(true); }}
                    onDelete={() => deleteTask(task.id)}
                    onAddSubtask={() => openCreateDialog('task', task)}
                    getLinkedPage={getLinkedPage}
                    getLinkedSkill={getLinkedSkill}
                    formatDueDate={formatDueDate}
                    onSubtaskToggle={toggleTaskStatus}
                    onSubtaskDelete={deleteTask}
                    pages={pages}
                    skills={skills}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Empty State */}
            {filteredTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                  <CheckSquare className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No items found</h3>
                <p className="text-muted-foreground mb-4">
                  {filter === 'all' ? "You haven't created any tasks yet." : `No ${filter} items.`}
                </p>
                <Button className="rounded-xl" onClick={() => openCreateDialog('task')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create your first task
                </Button>
              </div>
            )}
          </div>

          {/* Task Detail Panel */}
          <AnimatePresence>
            {selectedTask && (
              <TaskDetailPanel
                task={selectedTask}
                pages={pages}
                skills={skills}
                onClose={() => setSelectedTask(null)}
                onUpdate={(updates) => {
                  api.updateTask(selectedTask.id, updates);
                  setTasks(tasks.map(t => t.id === selectedTask.id ? { ...t, ...updates } : t));
                  setSelectedTask({ ...selectedTask, ...updates });
                }}
                onDelete={() => deleteTask(selectedTask.id)}
                onToggleStatus={() => toggleTaskStatus(selectedTask.id)}
                getLinkedPage={getLinkedPage}
                getLinkedSkill={getLinkedSkill}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            setEditingTask(null);
            setParentTaskForSubtask(null);
          }
        }}
        onTaskCreated={async () => {
          // Refresh tasks from API after creation
          if (currentWorkspace?.id) {
            try {
              const freshTasks = await api.getTasks(currentWorkspace.id);
              // Update cache
              await offlineDBHelpers.saveTasks(freshTasks);
              // Update state
              const transformedTasks = freshTasks.map((t: any) => ({
                ...t,
                dueDate: t.due_date || t.dueDate,
                linkedPageId: t.linked_page_id || t.linkedPageId,
                linkedSkillId: t.linked_skill_id || t.linkedSkillId,
                parentTaskId: t.parent_task_id || t.parentTaskId,
                eventType: t.event_type || t.eventType || 'task',
                createdFrom: t.created_from || t.createdFrom || 'manual',
                isRecurring: t.is_recurring || t.isRecurring,
                allDay: t.all_day || t.allDay,
                createdAt: t.created_at || t.createdAt,
                completedAt: t.completed_at || t.completedAt,
                orderIndex: t.order_index || t.orderIndex,
                blockedReason: t.blocked_reason || t.blockedReason,
              }));
              setTasks(transformedTasks);
            } catch (error) {
              console.error('Failed to refresh tasks:', error);
            }
          }
        }}
        task={editingTask}
        parentTask={parentTaskForSubtask || undefined}
        defaultEventType={defaultEventType}
      />
    </div>
  );
}


// Task Item Component
function TaskItem({ 
  task, index, isSelected, isExpanded, onSelect, onToggleStatus, onToggleExpand, onEdit, onDelete, onAddSubtask, getLinkedPage, getLinkedSkill, formatDueDate, onSubtaskToggle, onSubtaskDelete, pages, skills
}: {
  task: Task & { subtasks?: Task[] };
  index: number;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleStatus: () => void;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddSubtask: () => void;
  getLinkedPage: (id?: string) => Page | undefined;
  getLinkedSkill: (id?: string) => Skill | undefined;
  formatDueDate: (date: Date) => string;
  onSubtaskToggle: (id: string) => void;
  onSubtaskDelete: (id: string) => void;
  pages: Page[];
  skills: Skill[];
}) {
  const eventConfig = EVENT_TYPE_CONFIG[task.eventType || 'task'];
  const statusConfig = STATUS_CONFIG[task.status];
  const EventIcon = eventConfig.icon;
  const StatusIcon = statusConfig.icon;
  const linkedPage = getLinkedPage(task.linkedPageId);
  const linkedSkill = getLinkedSkill(task.linkedSkillId);
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const completedSubtasks = task.subtasks?.filter(s => s.status === 'done').length || 0;
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && task.status !== 'done';
  
  // Compute task context - ONE line only
  const taskContext = useMemo(() => computeTaskContext(task, pages, skills), [task, pages, skills]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.02 }}
    >
      <div
        onClick={onSelect}
        className={cn(
          "group bg-card border rounded-lg hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer",
          isSelected && "border-primary bg-primary/5",
          isOverdue && "border-destructive/50"
        )}
      >
        <div className="p-3 flex items-start gap-3">
          {/* Expand/Collapse for subtasks */}
          {hasSubtasks ? (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
              className="mt-0.5 p-0.5 rounded hover:bg-secondary transition-colors"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-5" />
          )}

          {/* Status Toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleStatus(); }}
            className={cn("mt-0.5 p-0.5 rounded-full transition-colors flex-shrink-0", statusConfig.color)}
          >
            <StatusIcon className="w-4 h-4" />
          </button>

          {/* Event Type Icon */}
          {task.eventType !== 'task' && (
            <div 
              className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: task.color || undefined }}
            >
              <EventIcon className="w-3.5 h-3.5 text-white" />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={cn(
                "font-medium text-sm",
                task.status === 'done' ? "text-muted-foreground line-through" : "text-foreground"
              )}>
                {task.title}
              </h3>
              {hasSubtasks && (
                <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                  {completedSubtasks}/{task.subtasks!.length}
                </span>
              )}
            </div>
            
            {/* Intelligence Context - ONE line only */}
            {taskContext && (
              <div className="text-xs text-muted-foreground mb-2 italic">
                {taskContext.text}
              </div>
            )}
            
            <div className="flex items-center gap-3 flex-wrap">
              {task.dueDate && (
                <div className={cn(
                  "flex items-center gap-1 text-xs",
                  isOverdue ? "text-destructive" : "text-muted-foreground"
                )}>
                  <Calendar className="w-3 h-3" />
                  <span>{formatDueDate(new Date(task.dueDate))}</span>
                </div>
              )}
              {task.location && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>📍 {task.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Flag className={cn("w-3 h-3", PRIORITY_CONFIG[task.priority].color)} />
                <span className={cn("text-xs", PRIORITY_CONFIG[task.priority].color)}>
                  {PRIORITY_CONFIG[task.priority].label}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all">
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />Edit
              </DropdownMenuItem>
              {task.eventType === 'task' && (
                <DropdownMenuItem onClick={onAddSubtask}>
                  <Plus className="w-4 h-4 mr-2" />Add Subtask
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Subtasks */}
        <AnimatePresence>
          {isExpanded && hasSubtasks && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border overflow-hidden"
            >
              <div className="pl-12 pr-3 py-2 space-y-1 bg-secondary/30">
                {task.subtasks!.map((subtask) => {
                  const subtaskStatus = STATUS_CONFIG[subtask.status];
                  const SubtaskIcon = subtaskStatus.icon;
                  return (
                    <div
                      key={subtask.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-secondary/50 transition-colors"
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); onSubtaskToggle(subtask.id); }}
                        className={cn("p-0.5 rounded-full", subtaskStatus.color)}
                      >
                        <SubtaskIcon className="w-3.5 h-3.5" />
                      </button>
                      <span className={cn(
                        "text-sm flex-1",
                        subtask.status === 'done' && "line-through text-muted-foreground"
                      )}>
                        {subtask.title}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); onSubtaskDelete(subtask.id); }}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
                <button
                  onClick={(e) => { e.stopPropagation(); onAddSubtask(); }}
                  className="flex items-center gap-2 p-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add subtask
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Task Detail Panel Component
function TaskDetailPanel({
  task, pages, skills, onClose, onUpdate, onDelete, onToggleStatus, getLinkedPage, getLinkedSkill
}: {
  task: Task;
  pages: Page[];
  skills: Skill[];
  onClose: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  getLinkedPage: (id?: string) => Page | undefined;
  getLinkedSkill: (id?: string) => Skill | undefined;
}) {
  const eventConfig = EVENT_TYPE_CONFIG[task.eventType || 'task'];
  const EventIcon = eventConfig.icon;
  const linkedPage = getLinkedPage(task.linkedPageId);
  const linkedSkill = getLinkedSkill(task.linkedSkillId);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="w-[400px] flex-shrink-0"
    >
      <div className="bg-card border border-border rounded-xl p-6 sticky top-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: task.color || eventConfig.bg.replace('bg-', '#') }}
            >
              <EventIcon className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">{task.title}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Status */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Status</label>
            <Select
              value={task.status}
              onValueChange={(value: any) => onUpdate({ status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Description</label>
              <p className="text-sm text-foreground whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Due Date */}
          {task.dueDate && (
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Due Date</label>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{format(new Date(task.dueDate), 'EEEE, MMMM d, yyyy')}</span>
              </div>
            </div>
          )}

          {/* Location */}
          {task.location && (
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Location</label>
              <p className="text-sm">📍 {task.location}</p>
            </div>
          )}

          {/* Priority */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Priority</label>
            <div className="flex items-center gap-2">
              <Flag className={cn("w-4 h-4", PRIORITY_CONFIG[task.priority].color)} />
              <span className={cn("text-sm font-medium", PRIORITY_CONFIG[task.priority].color)}>
                {PRIORITY_CONFIG[task.priority].label}
              </span>
            </div>
          </div>

          {/* Linked Skill */}
          {linkedSkill && (
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Linked Skill</label>
              <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">{linkedSkill.name}</span>
              </div>
            </div>
          )}

          {/* Linked Page */}
          {linkedPage && (
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Linked Page</label>
              <div className="flex items-center gap-2 p-3 bg-secondary/50 border border-border rounded-lg">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{linkedPage.icon} {linkedPage.title}</span>
              </div>
            </div>
          )}

          {/* Connected Items */}
          {task.eventType === 'task' && (
            <div className="pt-4 border-t border-border">
              <ConnectedItems itemId={task.id} itemType="task" showAddButton={true} compact={false} />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={onDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>

          {task.status !== 'done' && (
            <Button className="w-full bg-success hover:bg-success/90" onClick={onToggleStatus}>
              <CheckSquare className="w-4 h-4 mr-2" />
              Mark Complete
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
