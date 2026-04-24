import { useState, useEffect } from 'react';
import { X, Flag, Calendar, MapPin, Cake, Bell, Target, Milestone, ListTodo, ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { api } from '@/lib/api';
import { Page, Skill, Task } from '@/types/workspace';
import { cn } from '@/lib/utils';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated: () => void;
  task?: any;
  parentTask?: Task;
  defaultEventType?: 'task' | 'event' | 'birthday' | 'reminder' | 'milestone';
  defaultDate?: Date;
}

const EVENT_TYPES = [
  { value: 'task', label: 'Task', icon: ListTodo, color: 'text-blue-500' },
  { value: 'event', label: 'Event', icon: Calendar, color: 'text-purple-500' },
  { value: 'birthday', label: 'Birthday', icon: Cake, color: 'text-pink-500' },
  { value: 'reminder', label: 'Reminder', icon: Bell, color: 'text-orange-500' },
  { value: 'milestone', label: 'Milestone', icon: Milestone, color: 'text-green-500' },
];

const EVENT_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Teal', value: '#14b8a6' },
];

export function CreateTaskDialog({ 
  open, 
  onOpenChange, 
  onTaskCreated, 
  task, 
  parentTask,
  defaultEventType = 'task',
  defaultDate 
}: CreateTaskDialogProps) {
  const { currentWorkspace } = useWorkspace();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkedPageId, setLinkedPageId] = useState<string>('');
  const [linkedSkillId, setLinkedSkillId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [status, setStatus] = useState<'todo' | 'in-progress' | 'done' | 'blocked'>('todo');
  const [isRecurring, setIsRecurring] = useState(false);
  const [eventType, setEventType] = useState<string>(defaultEventType);
  const [color, setColor] = useState('#3b82f6');
  const [location, setLocation] = useState('');
  const [allDay, setAllDay] = useState(true);
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState<Page[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [parentTaskId, setParentTaskId] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setLinkedPageId(task.linked_page_id || task.linkedPageId || '');
      setLinkedSkillId(task.linked_skill_id || task.linkedSkillId || '');
      setPriority(task.priority || 'medium');
      setStatus(task.status || 'todo');
      setIsRecurring(task.is_recurring || task.isRecurring || false);
      setEventType(task.event_type || task.eventType || 'task');
      setColor(task.color || '#3b82f6');
      setLocation(task.location || '');
      setAllDay(task.all_day ?? task.allDay ?? true);
      setParentTaskId(task.parent_task_id || task.parentTaskId || '');
      
      if (task.due_date || task.dueDate) {
        const date = new Date(task.due_date || task.dueDate);
        setDueDate(date.toISOString().split('T')[0]);
        setDueTime(date.toTimeString().slice(0, 5));
      }
    } else {
      setTitle('');
      setDescription('');
      setLinkedPageId('');
      setLinkedSkillId('');
      setDueDate(defaultDate ? defaultDate.toISOString().split('T')[0] : '');
      setDueTime('');
      setPriority('medium');
      setStatus('todo');
      setIsRecurring(false);
      setEventType(defaultEventType);
      setColor('#3b82f6');
      setLocation('');
      setAllDay(true);
      setParentTaskId(parentTask?.id || '');
    }
  }, [task, open, defaultEventType, defaultDate, parentTask]);

  useEffect(() => {
    if (open && currentWorkspace?.id) {
      loadData();
    }
  }, [open, currentWorkspace?.id]);

  const loadData = async () => {
    if (!currentWorkspace?.id) return;
    try {
      const [pagesData, skillsData, tasksData] = await Promise.all([
        api.getPagesByWorkspace(currentWorkspace.id),
        api.getSkills(currentWorkspace.id),
        api.getTasks(currentWorkspace.id)
      ]);
      setPages(pagesData);
      setSkills(skillsData);
      setTasks(tasksData.filter((t: Task) => !t.parentTaskId));
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !currentWorkspace?.id) return;

    setLoading(true);
    try {
      let dueDateValue: string | undefined;
      if (dueDate) {
        const dateTime = new Date(dueDate);
        if (dueTime && !allDay) {
          const [hours, minutes] = dueTime.split(':');
          dateTime.setHours(parseInt(hours), parseInt(minutes));
        }
        dueDateValue = dateTime.toISOString();
      }

      const taskData = {
        title: title.trim(),
        description: description.trim() || undefined,
        status: task?.status || status,
        priority,
        due_date: dueDateValue,
        linked_page_id: linkedPageId || undefined,
        linked_skill_id: linkedSkillId || undefined,
        is_recurring: isRecurring,
        workspace_id: currentWorkspace.id,
        event_type: eventType,
        color: eventType !== 'task' ? color : undefined,
        location: location || undefined,
        all_day: allDay,
        parent_task_id: parentTaskId || undefined,
        created_from: parentTask ? 'manual' : 'manual',
      };

      if (task) {
        await api.updateTask(task.id, taskData);
      } else {
        await api.createTask(taskData);
      }
      
      onTaskCreated();
      onOpenChange(false);
    } catch (error) {
      console.error(`Failed to ${task ? 'update' : 'create'} task:`, error);
      alert(`Failed to ${task ? 'update' : 'create'} task. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const selectedEventType = EVENT_TYPES.find(t => t.value === eventType);
  const EventIcon = selectedEventType?.icon || ListTodo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] p-0 gap-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border sticky top-0 bg-background z-10">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <EventIcon className={cn("w-5 h-5", selectedEventType?.color)} />
            {task ? 'Edit' : 'Create'} {selectedEventType?.label || 'Task'}
            {parentTask && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (Subtask of {parentTask.title})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5 pt-4">
          {/* Event Type Selector */}
          <div className="flex gap-2 flex-wrap">
            {EVENT_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setEventType(type.value)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm font-medium",
                    eventType === type.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-secondary"
                  )}
                >
                  <Icon className={cn("w-4 h-4", type.color)} />
                  {type.label}
                </button>
              );
            })}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{selectedEventType?.label} Title</Label>
            <Input
              id="title"
              placeholder={eventType === 'birthday' ? "Person's name" : `${selectedEventType?.label} title`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add details, notes, or instructions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{eventType === 'birthday' ? 'Birthday Date' : 'Due Date'}</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Time</Label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <Switch
                    checked={allDay}
                    onCheckedChange={setAllDay}
                    className="scale-75"
                  />
                  All day
                </label>
              </div>
              <Input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="h-11"
                disabled={allDay}
              />
            </div>
          </div>

          {/* Event-specific: Color & Location */}
          {eventType !== 'task' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {EVENT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={cn(
                        "w-7 h-7 rounded-full transition-all",
                        color === c.value && "ring-2 ring-offset-2 ring-primary"
                      )}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Location (Optional)</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Add location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="h-11 pl-9"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Task-specific fields */}
          {eventType === 'task' && (
            <>
              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                    <SelectTrigger className="h-11">
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
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">
                        <div className="flex items-center gap-2">
                          <Flag className="w-4 h-4 text-destructive" />
                          High
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div className="flex items-center gap-2">
                          <Flag className="w-4 h-4 text-warning" />
                          Medium
                        </div>
                      </SelectItem>
                      <SelectItem value="low">
                        <div className="flex items-center gap-2">
                          <Flag className="w-4 h-4 text-muted-foreground" />
                          Low
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Linked Page & Skill */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Linked Page</Label>
                  <Select value={linkedPageId || "none"} onValueChange={(v) => setLinkedPageId(v === "none" ? "" : v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select a page" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {pages.map((page) => (
                        <SelectItem key={page.id} value={page.id}>
                          <div className="flex items-center gap-2">
                            {page.icon && <span>{page.icon}</span>}
                            <span className="truncate">{page.title}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Linked Skill</Label>
                  <Select value={linkedSkillId || "none"} onValueChange={(v) => setLinkedSkillId(v === "none" ? "" : v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select a skill" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {skills.map((skill) => (
                        <SelectItem key={skill.id} value={skill.id}>
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-primary" />
                            {skill.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Parent Task (for subtasks) */}
              {!parentTask && (
                <div className="space-y-2">
                  <Label>Parent Task (Optional - makes this a subtask)</Label>
                  <Select value={parentTaskId || "none"} onValueChange={(v) => setParentTaskId(v === "none" ? "" : v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select parent task" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Top-level task)</SelectItem>
                      {tasks.filter(t => t.id !== task?.id).map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {/* Recurring Toggle */}
          <div className="flex items-center justify-between py-2 border-t border-border pt-4">
            <Label htmlFor="recurring" className="cursor-pointer flex items-center gap-2">
              <Bell className="w-4 h-4 text-muted-foreground" />
              {eventType === 'birthday' ? 'Remind every year' : 'Recurring'}
            </Label>
            <Switch
              id="recurring"
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || loading}
              className="bg-primary hover:bg-primary/90"
            >
              {loading ? (task ? 'Updating...' : 'Creating...') : (task ? 'Update' : 'Create')} {selectedEventType?.label}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
