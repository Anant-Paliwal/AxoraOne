import { useState } from 'react';
import { Trash2, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Block } from './types';

// Callout Block
export function CalloutBlockComponent({ block, editable, onUpdate, onDelete }: { 
  block: Block; 
  editable: boolean; 
  onUpdate: (data: any) => void; 
  onDelete?: () => void 
}) {
  const [content, setContent] = useState(block.data?.content || '');
  const [type, setType] = useState<'info' | 'warning' | 'success' | 'error'>(block.data?.type || 'info');
  const [emoji, setEmoji] = useState(block.data?.emoji || '💡');

  const colors = {
    info: 'text-blue-700 dark:text-blue-300',
    warning: 'text-yellow-700 dark:text-yellow-300',
    success: 'text-green-700 dark:text-green-300',
    error: 'text-red-700 dark:text-red-300',
  };

  return (
    <div className={cn("my-1 py-1 group", colors[type])}>
      <div className="flex items-start gap-2">
        <span className="text-xl flex-shrink-0">{emoji}</span>
        <div className="flex-1 min-w-0">
          {editable ? (
            <textarea
              value={content}
              onChange={e => { setContent(e.target.value); onUpdate({ content: e.target.value, type, emoji }); }}
              className="w-full bg-transparent resize-none outline-none"
              placeholder="Type your callout content..."
            />
          ) : (
            <p>{content}</p>
          )}
        </div>
        {editable && onDelete && (
          <button onClick={onDelete} className="opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4 opacity-50 hover:opacity-100" /></button>
        )}
      </div>
    </div>
  );
}

// Quote Block
export function QuoteBlockComponent({ block, editable, onUpdate, onDelete }: { 
  block: Block; 
  editable: boolean; 
  onUpdate: (data: any) => void; 
  onDelete?: () => void 
}) {
  const [content, setContent] = useState(block.data?.content || '');
  const [author, setAuthor] = useState(block.data?.author || '');

  return (
    <blockquote className="my-1 pl-3 border-l-2 border-muted-foreground/30 italic group">
      {editable ? (
        <div className="space-y-1">
          <textarea
            value={content}
            onChange={e => { setContent(e.target.value); onUpdate({ content: e.target.value, author }); }}
            className="w-full bg-transparent resize-none outline-none text-muted-foreground"
            placeholder="Quote text..."
          />
          <Input
            value={author}
            onChange={e => { setAuthor(e.target.value); onUpdate({ content, author: e.target.value }); }}
            placeholder="— Author"
            className="h-6 text-xs border-0 bg-transparent shadow-none"
          />
        </div>
      ) : (
        <>
          <p className="text-muted-foreground">{content}</p>
          {author && <footer className="text-xs text-muted-foreground/70 mt-1">— {author}</footer>}
        </>
      )}
      {editable && onDelete && (
        <button onClick={onDelete} className="mt-1 opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3 text-muted-foreground" /></button>
      )}
    </blockquote>
  );
}

// Divider Block
export function DividerBlockComponent({ block, onDelete, editable }: { 
  block: Block; 
  onDelete?: () => void; 
  editable: boolean 
}) {
  return (
    <div className="my-2 relative group">
      <hr className="border-border/50" />
      {editable && onDelete && (
        <button onClick={onDelete} className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100">
          <Trash2 className="w-3 h-3 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

// Toggle Block
export function ToggleBlockComponent({ block, editable, onUpdate, onDelete }: { 
  block: Block; 
  editable: boolean; 
  onUpdate: (data: any) => void; 
  onDelete?: () => void 
}) {
  const [title, setTitle] = useState(block.data?.title || 'Toggle');
  const [content, setContent] = useState(block.data?.content || '');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 py-1 hover:bg-accent/20 text-left rounded"
      >
        <ChevronDown className={cn("w-4 h-4 transition-transform flex-shrink-0", isOpen && "rotate-180")} />
        {editable ? (
          <Input
            value={title}
            onChange={e => { e.stopPropagation(); setTitle(e.target.value); onUpdate({ title: e.target.value, content }); }}
            onClick={e => e.stopPropagation()}
            className="h-7 flex-1 border-0 bg-transparent shadow-none"
          />
        ) : (
          <span className="font-medium">{title}</span>
        )}
        {editable && onDelete && (
          <button onClick={e => { e.stopPropagation(); onDelete(); }}><Trash2 className="w-4 h-4 text-destructive opacity-0 group-hover:opacity-100" /></button>
        )}
      </button>
      {isOpen && (
        <div className="pl-6 py-1">
          {editable ? (
            <textarea
              value={content}
              onChange={e => { setContent(e.target.value); onUpdate({ title, content: e.target.value }); }}
              className="w-full min-h-[40px] bg-transparent resize-none outline-none text-muted-foreground"
              placeholder="Toggle content..."
            />
          ) : (
            <p className="text-muted-foreground">{content}</p>
          )}
        </div>
      )}
    </div>
  );
}

// Code Block
export function CodeBlockComponent({ block, editable, onUpdate, onDelete }: { 
  block: Block; 
  editable: boolean; 
  onUpdate: (data: any) => void; 
  onDelete?: () => void 
}) {
  const [code, setCode] = useState(block.data?.code || '');
  const [language, setLanguage] = useState(block.data?.language || 'javascript');

  return (
    <div className="my-1 group">
      <div className="flex items-center justify-between px-2 py-0.5">
        {editable ? (
          <select
            value={language}
            onChange={e => { setLanguage(e.target.value); onUpdate({ code, language: e.target.value }); }}
            className="h-5 px-1 text-xs rounded bg-transparent text-muted-foreground border-0 outline-none"
          >
            {['javascript', 'typescript', 'python', 'html', 'css', 'json', 'sql', 'bash'].map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-muted-foreground">{language}</span>
        )}
        {editable && onDelete && (
          <button onClick={onDelete} className="opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3 text-muted-foreground" /></button>
        )}
      </div>
      <pre className="px-2 py-1 overflow-x-auto font-mono text-sm">
        {editable ? (
          <textarea
            value={code}
            onChange={e => { setCode(e.target.value); onUpdate({ code: e.target.value, language }); }}
            className="w-full bg-transparent font-mono text-sm resize-none outline-none min-h-[60px]"
            placeholder="// Your code here..."
          />
        ) : (
          <code className="font-mono text-sm">{code}</code>
        )}
      </pre>
    </div>
  );
}


// Heading Block - Supports H1, H2, H3
export function HeadingBlockComponent({ block, editable, onUpdate, onDelete }: { 
  block: Block; 
  editable: boolean; 
  onUpdate: (data: any) => void; 
  onDelete?: () => void 
}) {
  const [content, setContent] = useState(block.data?.content || '');
  const [level, setLevel] = useState<1 | 2 | 3>(block.data?.level || 2);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    onUpdate({ content: newContent, level });
  };

  const handleLevelChange = (newLevel: 1 | 2 | 3) => {
    setLevel(newLevel);
    onUpdate({ content, level: newLevel });
  };

  const headingStyles = {
    1: 'text-3xl font-bold',
    2: 'text-2xl font-semibold',
    3: 'text-xl font-medium',
  };

  const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;

  return (
    <div className="my-2 group relative" id={block.id}>
      {editable && (
        <div className="absolute -left-16 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          {[1, 2, 3].map((l) => (
            <button
              key={l}
              onClick={() => handleLevelChange(l as 1 | 2 | 3)}
              className={cn(
                "w-6 h-6 rounded text-xs font-bold transition-colors",
                level === l 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted hover:bg-accent text-muted-foreground"
              )}
            >
              H{l}
            </button>
          ))}
        </div>
      )}
      
      {editable ? (
        <input
          type="text"
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          className={cn(
            "w-full bg-transparent outline-none border-none",
            headingStyles[level]
          )}
          placeholder={`Heading ${level}`}
        />
      ) : (
        <HeadingTag className={headingStyles[level]}>{content || `Heading ${level}`}</HeadingTag>
      )}
      
      {editable && onDelete && (
        <button 
          onClick={onDelete} 
          className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
        </button>
      )}
    </div>
  );
}

// Checklist Block - Todo items with checkboxes
export function ChecklistBlockComponent({ block, editable, onUpdate, onDelete }: { 
  block: Block; 
  editable: boolean; 
  onUpdate: (data: any) => void; 
  onDelete?: () => void 
}) {
  const [items, setItems] = useState<Array<{ id: string; text: string; checked: boolean }>>(
    block.data?.items || [{ id: '1', text: '', checked: false }]
  );

  const updateItems = (newItems: typeof items) => {
    setItems(newItems);
    onUpdate({ items: newItems });
  };

  const toggleItem = (id: string) => {
    const newItems = items.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    updateItems(newItems);
  };

  const updateItemText = (id: string, text: string) => {
    const newItems = items.map(item => 
      item.id === id ? { ...item, text } : item
    );
    updateItems(newItems);
  };

  const addItem = (afterId?: string) => {
    const newItem = { id: Date.now().toString(), text: '', checked: false };
    
    if (afterId) {
      const index = items.findIndex(item => item.id === afterId);
      const newItems = [...items];
      newItems.splice(index + 1, 0, newItem);
      updateItems(newItems);
    } else {
      updateItems([...items, newItem]);
    }
    
    // Focus the new item after a short delay
    setTimeout(() => {
      const newInput = document.querySelector(`[data-checklist-item="${newItem.id}"]`) as HTMLInputElement;
      newInput?.focus();
    }, 50);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return; // Keep at least one item
    const newItems = items.filter(item => item.id !== id);
    updateItems(newItems);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem(id);
    } else if (e.key === 'Backspace') {
      const item = items.find(i => i.id === id);
      if (item && item.text === '' && items.length > 1) {
        e.preventDefault();
        const index = items.findIndex(i => i.id === id);
        removeItem(id);
        
        // Focus previous item
        if (index > 0) {
          setTimeout(() => {
            const prevInput = document.querySelector(`[data-checklist-item="${items[index - 1].id}"]`) as HTMLInputElement;
            prevInput?.focus();
          }, 50);
        }
      }
    }
  };

  return (
    <div className="my-2 group" id={block.id}>
      <div className="space-y-1">
        {items.map((item, index) => (
          <div key={item.id} className="flex items-center gap-2 group/item">
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => toggleItem(item.id)}
              className="w-4 h-4 rounded border-2 border-muted-foreground/50 checked:bg-primary checked:border-primary cursor-pointer"
            />
            
            {editable ? (
              <input
                type="text"
                value={item.text}
                onChange={(e) => updateItemText(item.id, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, item.id)}
                data-checklist-item={item.id}
                className={cn(
                  "flex-1 bg-transparent outline-none border-none text-sm",
                  item.checked && "line-through text-muted-foreground"
                )}
                placeholder="Todo item..."
              />
            ) : (
              <span className={cn(
                "flex-1 text-sm",
                item.checked && "line-through text-muted-foreground"
              )}>
                {item.text || 'Empty item'}
              </span>
            )}
            
            {editable && items.length > 1 && (
              <button 
                onClick={() => removeItem(item.id)}
                className="opacity-0 group-hover/item:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
              </button>
            )}
          </div>
        ))}
      </div>
      
      {editable && (
        <button
          onClick={() => addItem()}
          className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <span className="text-lg leading-none">+</span> Add item
        </button>
      )}
      
      {editable && onDelete && (
        <button 
          onClick={onDelete} 
          className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
        </button>
      )}
    </div>
  );
}
