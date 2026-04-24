import { useState, useCallback } from 'react';
import { Calendar, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Block } from './types';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  color?: string;
  description?: string;
}

interface CalendarBlockProps {
  block: Block;
  editable: boolean;
  onUpdate: (data: any) => void;
  onDelete?: () => void;
  externalEvents?: CalendarEvent[]; // Real-time events from timeline, tasks, etc.
}

export function CalendarBlockComponent({ block, editable, onUpdate, onDelete, externalEvents = [] }: CalendarBlockProps) {
  const [events, setEvents] = useState<CalendarEvent[]>(block.data?.events || []);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [newEvent, setNewEvent] = useState({ title: '', time: '', color: '#6366f1', description: '' });

  const saveData = useCallback((newEvents: CalendarEvent[]) => {
    onUpdate({ events: newEvents });
  }, [onUpdate]);

  // Combine internal events with external real-time events
  const allEvents = [...events, ...externalEvents];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days: (number | null)[] = [];
    for (let i = 0; i < startingDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const formatDate = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-${String(day).padStart(2, '0')}`;
  };

  const getEventsForDate = (day: number) => {
    const dateStr = formatDate(day);
    return allEvents.filter(e => e.date === dateStr);
  };

  const addEvent = () => {
    if (!selectedDate || !newEvent.title) return;
    
    const event: CalendarEvent = {
      id: Date.now().toString(),
      title: newEvent.title,
      date: selectedDate,
      time: newEvent.time,
      color: newEvent.color,
      description: newEvent.description
    };
    
    const newEvents = [...events, event];
    setEvents(newEvents);
    saveData(newEvents);
    setNewEvent({ title: '', time: '', color: '#6366f1', description: '' });
    setShowEventDialog(false);
    toast.success('Event added');
  };

  const updateEvent = () => {
    if (!editingEvent) return;
    
    const newEvents = events.map(e => e.id === editingEvent.id ? editingEvent : e);
    setEvents(newEvents);
    saveData(newEvents);
    setEditingEvent(null);
    toast.success('Event updated');
  };

  const deleteEvent = (eventId: string) => {
    const newEvents = events.filter(e => e.id !== eventId);
    setEvents(newEvents);
    saveData(newEvents);
    toast.success('Event deleted');
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="my-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Calendar</span>
        </div>
        {editable && onDelete && (
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-7 w-7 p-0 text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      <div className="p-0">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="font-semibold">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
          
          {days.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="h-20" />;
            }
            
            const dateStr = formatDate(day);
            const dayEvents = getEventsForDate(day);
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            
            return (
              <div
                key={day}
                className={cn(
                  "h-20 border border-border rounded p-1 cursor-pointer hover:bg-accent/30 transition-colors overflow-hidden",
                  isToday && "bg-primary/10 border-primary"
                )}
                onClick={() => {
                  if (editable) {
                    setSelectedDate(dateStr);
                    setShowEventDialog(true);
                  }
                }}
              >
                <div className={cn("text-xs font-medium mb-1", isToday && "text-primary")}>
                  {day}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map(event => (
                    <div
                      key={event.id}
                      className="text-xs px-1 py-0.5 rounded truncate"
                      style={{ backgroundColor: event.color + '20', color: event.color }}
                      onClick={e => {
                        e.stopPropagation();
                        if (editable) setEditingEvent(event);
                      }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-muted-foreground">+{dayEvents.length - 2} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Event - {selectedDate}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={newEvent.title}
                onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="Event title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Time</label>
              <Input
                type="time"
                value={newEvent.time}
                onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Color</label>
              <div className="flex gap-2 mt-1">
                {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(color => (
                  <button
                    key={color}
                    className={cn(
                      "w-6 h-6 rounded-full",
                      newEvent.color === color && "ring-2 ring-offset-2 ring-primary"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewEvent({ ...newEvent, color })}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEventDialog(false)}>Cancel</Button>
              <Button onClick={addEvent}>Add Event</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          {editingEvent && (
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={editingEvent.title}
                  onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={editingEvent.date}
                  onChange={e => setEditingEvent({ ...editingEvent, date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Time</label>
                <Input
                  type="time"
                  value={editingEvent.time || ''}
                  onChange={e => setEditingEvent({ ...editingEvent, time: e.target.value })}
                />
              </div>
              <div className="flex justify-between">
                <Button variant="destructive" onClick={() => {
                  deleteEvent(editingEvent.id);
                  setEditingEvent(null);
                }}>
                  Delete
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditingEvent(null)}>Cancel</Button>
                  <Button onClick={updateEvent}>Save</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
