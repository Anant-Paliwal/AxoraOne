import { useState, useCallback } from 'react';
import { Clock, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Block } from './types';

interface TimelineItem {
  id: string;
  title: string;
  date: string;
  description?: string;
  color?: string;
}

interface TimelineBlockProps {
  block: Block;
  editable: boolean;
  onUpdate: (data: any) => void;
  onDelete?: () => void;
}

export function TimelineBlockComponent({ block, editable, onUpdate, onDelete }: TimelineBlockProps) {
  const [items, setItems] = useState<TimelineItem[]>(block.data?.items || []);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<TimelineItem | null>(null);
  const [newItem, setNewItem] = useState({ title: '', date: '', description: '', color: '#6366f1' });

  const saveData = useCallback((newItems: TimelineItem[]) => {
    onUpdate({ items: newItems });
  }, [onUpdate]);

  const addItem = () => {
    if (!newItem.title || !newItem.date) return;
    
    const item: TimelineItem = {
      id: Date.now().toString(),
      ...newItem
    };
    
    const newItems = [...items, item].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setItems(newItems);
    saveData(newItems);
    setNewItem({ title: '', date: '', description: '', color: '#6366f1' });
    setShowAddDialog(false);
  };

  const updateItem = () => {
    if (!editingItem) return;
    const newItems = items.map(i => i.id === editingItem.id ? editingItem : i)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setItems(newItems);
    saveData(newItems);
    setEditingItem(null);
  };

  const deleteItem = (itemId: string) => {
    const newItems = items.filter(i => i.id !== itemId);
    setItems(newItems);
    saveData(newItems);
  };

  return (
    <div className="my-2">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Timeline</span>
        </div>
        {editable && onDelete && (
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-7 w-7 p-0 text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      <div className="p-4">
        {editable && (
          <div className="mb-4">
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Event
            </Button>
          </div>
        )}

        {items.length > 0 ? (
          <div className="relative pl-6 border-l-2 border-border space-y-6">
            {items.map((item) => (
              <div key={item.id} className="relative group">
                <div 
                  className="absolute -left-[25px] w-4 h-4 rounded-full border-2 border-background"
                  style={{ backgroundColor: item.color || '#6366f1' }}
                />
                <div className="bg-accent/30 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {new Date(item.date).toLocaleDateString()}
                      </p>
                      <h4 className="font-medium">{item.title}</h4>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                      )}
                    </div>
                    {editable && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingItem(item)} className="p-1 hover:bg-accent rounded">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteItem(item.id)} className="p-1 hover:bg-accent rounded">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No timeline events yet</p>
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Timeline Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Input placeholder="Title" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} />
            <Input type="date" value={newItem.date} onChange={e => setNewItem({...newItem, date: e.target.value})} />
            <Input placeholder="Description" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={addItem}>Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4 mt-4">
              <Input value={editingItem.title} onChange={e => setEditingItem({...editingItem, title: e.target.value})} />
              <Input type="date" value={editingItem.date} onChange={e => setEditingItem({...editingItem, date: e.target.value})} />
              <Input value={editingItem.description || ''} onChange={e => setEditingItem({...editingItem, description: e.target.value})} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
                <Button onClick={updateItem}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
