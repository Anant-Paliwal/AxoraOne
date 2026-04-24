import { useState, useCallback, useMemo } from 'react';
import { Plus, X, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Block } from './types';

interface ListItem {
  id: string;
  text: string;
  checked?: boolean;
}

interface ListBlockProps {
  block: Block;
  editable: boolean;
  onUpdate: (data: any) => void;
  onDelete?: () => void;
}

// Helper to normalize items from various formats
function normalizeItems(rawItems: any[]): ListItem[] {
  if (!rawItems || !Array.isArray(rawItems)) return [];
  
  return rawItems.map((item, idx) => {
    if (typeof item === 'string') {
      return { id: `item-${Date.now()}-${idx}`, text: item, checked: false };
    }
    if (typeof item === 'object' && item !== null) {
      return {
        id: item.id || `item-${Date.now()}-${idx}`,
        text: item.text || '',
        checked: item.checked || false
      };
    }
    return { id: `item-${Date.now()}-${idx}`, text: String(item), checked: false };
  });
}

export function ListBlockComponent({ block, editable, onUpdate, onDelete }: ListBlockProps) {
  // Normalize items on initial load
  const initialItems = useMemo(() => normalizeItems(block.data?.items), []);
  const [items, setItems] = useState<ListItem[]>(initialItems);
  const [listType, setListType] = useState<'bullet' | 'numbered' | 'todo'>(block.data?.listType || block.data?.style || 'bullet');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const saveData = useCallback((newItems: ListItem[], newType?: string) => {
    onUpdate({ items: newItems, listType: newType || listType });
  }, [onUpdate, listType]);

  const addItem = () => {
    const newItem: ListItem = { id: Date.now().toString(), text: '', checked: false };
    const newItems = [...items, newItem];
    setItems(newItems);
    setEditingId(newItem.id);
    setEditText('');
  };

  const updateItem = (id: string, text: string) => {
    const newItems = items.map(i => i.id === id ? { ...i, text } : i);
    setItems(newItems);
    saveData(newItems);
    setEditingId(null);
  };

  const toggleItem = (id: string) => {
    const newItems = items.map(i => i.id === id ? { ...i, checked: !i.checked } : i);
    setItems(newItems);
    saveData(newItems);
  };

  const deleteItem = (id: string) => {
    const newItems = items.filter(i => i.id !== id);
    setItems(newItems);
    saveData(newItems);
  };

  return (
    <div className="my-2 group">
      <div className="flex items-center justify-between mb-2">
        {editable && (
          <select
            value={listType}
            onChange={e => {
              const newType = e.target.value as any;
              setListType(newType);
              saveData(items, newType);
            }}
            className="h-7 px-2 rounded border border-input bg-background text-xs"
          >
            <option value="bullet">Bullet List</option>
            <option value="numbered">Numbered List</option>
            <option value="todo">To-Do List</option>
          </select>
        )}
        {editable && onDelete && (
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100">
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>

      <ul className={cn("space-y-0.5 pl-1", listType === 'numbered' && "list-decimal list-inside")}>
        {items.map((item, idx) => (
          <li key={item.id} className="flex items-start gap-2 group/item">
            {listType === 'todo' && (
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleItem(item.id)}
                className="mt-1 h-4 w-4"
                disabled={!editable}
              />
            )}
            {listType === 'bullet' && <span className="mt-0.5 text-muted-foreground">•</span>}
            {listType === 'numbered' && <span className="mt-0.5 text-muted-foreground">{idx + 1}.</span>}
            
            {editingId === item.id ? (
              <div className="flex-1 flex items-center gap-1">
                <Input
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') updateItem(item.id, editText);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="h-6 text-sm"
                  autoFocus
                />
                <button onClick={() => updateItem(item.id, editText)}>
                  <Check className="w-4 h-4 text-green-500" />
                </button>
              </div>
            ) : (
              <span
                className={cn(
                  "flex-1 text-sm",
                  item.checked && "line-through text-muted-foreground",
                  editable && "cursor-pointer hover:bg-accent/30 rounded px-1"
                )}
                onClick={() => {
                  if (editable) {
                    setEditingId(item.id);
                    setEditText(item.text);
                  }
                }}
              >
                {item.text || <span className="text-muted-foreground italic">Click to edit...</span>}
              </span>
            )}
            
            {editable && (
              <button
                onClick={() => deleteItem(item.id)}
                className="opacity-0 group-hover/item:opacity-100 p-0.5"
              >
                <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {editable && (
        <button className="mt-1 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 pl-1" onClick={addItem}>
          <Plus className="w-3 h-3" />
          Add item
        </button>
      )}
    </div>
  );
}
