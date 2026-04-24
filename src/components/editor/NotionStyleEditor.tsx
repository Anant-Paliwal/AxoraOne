import { useState, useRef, KeyboardEvent } from 'react';
import { motion, Reorder } from 'framer-motion';
import { 
  GripVertical, Plus, Trash2, Type, Heading1, Heading2, Heading3,
  List, CheckSquare, Quote, Code, Image as ImageIcon, Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Block {
  id: string;
  type: 'paragraph' | 'h1' | 'h2' | 'h3' | 'bullet' | 'numbered' | 'todo' | 'quote' | 'code';
  content: string;
  checked?: boolean;
}

interface NotionStyleEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function NotionStyleEditor({ content, onChange, placeholder }: NotionStyleEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>(() => {
    // Parse HTML content into blocks
    if (!content || content === '<p></p>') {
      return [{ id: '1', type: 'paragraph', content: '' }];
    }
    return parseHTMLToBlocks(content);
  });
  
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [showBlockMenu, setShowBlockMenu] = useState<string | null>(null);

  // Convert blocks to HTML whenever they change
  const updateContent = (newBlocks: Block[]) => {
    setBlocks(newBlocks);
    const html = blocksToHTML(newBlocks);
    onChange(html);
  };

  const addBlock = (afterId: string, type: Block['type'] = 'paragraph') => {
    const index = blocks.findIndex(b => b.id === afterId);
    const newBlock: Block = {
      id: Date.now().toString(),
      type,
      content: '',
    };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    updateContent(newBlocks);
    
    // Focus the new block
    setTimeout(() => {
      const input = document.querySelector(`[data-block-id="${newBlock.id}"]`) as HTMLElement;
      input?.focus();
    }, 0);
  };

  const deleteBlock = (id: string) => {
    if (blocks.length === 1) {
      // Don't delete the last block, just clear it
      updateContent([{ id: blocks[0].id, type: 'paragraph', content: '' }]);
      return;
    }
    
    const index = blocks.findIndex(b => b.id === id);
    const newBlocks = blocks.filter(b => b.id !== id);
    updateContent(newBlocks);
    
    // Focus previous block
    if (index > 0) {
      setTimeout(() => {
        const prevBlock = newBlocks[index - 1];
        const input = document.querySelector(`[data-block-id="${prevBlock.id}"]`) as HTMLElement;
        input?.focus();
      }, 0);
    }
  };

  const updateBlock = (id: string, updates: Partial<Block>) => {
    const newBlocks = blocks.map(b => b.id === id ? { ...b, ...updates } : b);
    updateContent(newBlocks);
  };

  const handleKeyDown = (e: KeyboardEvent, blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    // Enter: Create new block
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addBlock(blockId);
    }

    // Backspace on empty block: Delete block
    if (e.key === 'Backspace' && block.content === '') {
      e.preventDefault();
      deleteBlock(blockId);
    }

    // Slash command
    if (e.key === '/' && block.content === '') {
      e.preventDefault();
      setShowBlockMenu(blockId);
    }
  };

  const blockTypes = [
    { type: 'paragraph' as const, icon: Type, label: 'Text', description: 'Plain text' },
    { type: 'h1' as const, icon: Heading1, label: 'Heading 1', description: 'Large heading' },
    { type: 'h2' as const, icon: Heading2, label: 'Heading 2', description: 'Medium heading' },
    { type: 'h3' as const, icon: Heading3, label: 'Heading 3', description: 'Small heading' },
    { type: 'bullet' as const, icon: List, label: 'Bullet List', description: 'Unordered list' },
    { type: 'numbered' as const, icon: List, label: 'Numbered List', description: 'Ordered list' },
    { type: 'todo' as const, icon: CheckSquare, label: 'To-do', description: 'Checkbox list' },
    { type: 'quote' as const, icon: Quote, label: 'Quote', description: 'Block quote' },
    { type: 'code' as const, icon: Code, label: 'Code', description: 'Code block' },
  ];

  return (
    <div className="space-y-1">
      <Reorder.Group axis="y" values={blocks} onReorder={updateContent} className="space-y-1">
        {blocks.map((block) => (
          <Reorder.Item key={block.id} value={block} className="group">
            <BlockItem
              block={block}
              isFocused={focusedBlockId === block.id}
              onFocus={() => setFocusedBlockId(block.id)}
              onBlur={() => setFocusedBlockId(null)}
              onUpdate={(updates) => updateBlock(block.id, updates)}
              onDelete={() => deleteBlock(block.id)}
              onAddBlock={() => addBlock(block.id)}
              onKeyDown={(e) => handleKeyDown(e, block.id)}
              showMenu={showBlockMenu === block.id}
              onMenuSelect={(type) => {
                updateBlock(block.id, { type });
                setShowBlockMenu(null);
              }}
              onMenuClose={() => setShowBlockMenu(null)}
              placeholder={blocks.length === 1 && block.content === '' ? placeholder : undefined}
            />
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
}

interface BlockItemProps {
  block: Block;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onUpdate: (updates: Partial<Block>) => void;
  onDelete: () => void;
  onAddBlock: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
  showMenu: boolean;
  onMenuSelect: (type: Block['type']) => void;
  onMenuClose: () => void;
  placeholder?: string;
}

function BlockItem({
  block,
  isFocused,
  onFocus,
  onBlur,
  onUpdate,
  onDelete,
  onAddBlock,
  onKeyDown,
  showMenu,
  onMenuSelect,
  onMenuClose,
  placeholder
}: BlockItemProps) {
  const inputRef = useRef<HTMLDivElement>(null);

  const getBlockStyles = () => {
    switch (block.type) {
      case 'h1':
        return 'text-4xl font-bold';
      case 'h2':
        return 'text-3xl font-bold';
      case 'h3':
        return 'text-2xl font-semibold';
      case 'quote':
        return 'border-l-4 border-primary pl-4 italic text-muted-foreground';
      case 'code':
        return 'font-mono bg-secondary p-4 rounded-lg text-sm';
      default:
        return 'text-base';
    }
  };

  const getBlockPrefix = () => {
    switch (block.type) {
      case 'bullet':
        return <span className="mr-2 text-muted-foreground">•</span>;
      case 'numbered':
        return <span className="mr-2 text-muted-foreground">1.</span>;
      case 'todo':
        return (
          <input
            type="checkbox"
            checked={block.checked || false}
            onChange={(e) => onUpdate({ checked: e.target.checked })}
            className="mr-2 w-4 h-4 rounded border-border"
          />
        );
      default:
        return null;
    }
  };

  const blockTypes = [
    { type: 'paragraph' as const, icon: Type, label: 'Text' },
    { type: 'h1' as const, icon: Heading1, label: 'Heading 1' },
    { type: 'h2' as const, icon: Heading2, label: 'Heading 2' },
    { type: 'h3' as const, icon: Heading3, label: 'Heading 3' },
    { type: 'bullet' as const, icon: List, label: 'Bullet List' },
    { type: 'numbered' as const, icon: List, label: 'Numbered List' },
    { type: 'todo' as const, icon: CheckSquare, label: 'To-do' },
    { type: 'quote' as const, icon: Quote, label: 'Quote' },
    { type: 'code' as const, icon: Code, label: 'Code' },
  ];

  return (
    <div className="relative flex items-start gap-1 py-1 group/block">
      {/* Drag Handle - Shows on hover */}
      <button
        className="opacity-0 group-hover/block:opacity-100 transition-opacity p-1 hover:bg-accent rounded cursor-grab active:cursor-grabbing flex-shrink-0"
        title="Drag to reorder"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Add Block Button - Shows on hover */}
      <button
        onClick={onAddBlock}
        className="opacity-0 group-hover/block:opacity-100 transition-opacity p-1 hover:bg-accent rounded flex-shrink-0"
        title="Add block below"
      >
        <Plus className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Block Content */}
      <div className="flex-1 min-w-0 relative">
        <div className="flex items-start gap-2">
          {getBlockPrefix()}
          <div
            ref={inputRef}
            contentEditable
            suppressContentEditableWarning
            data-block-id={block.id}
            onFocus={onFocus}
            onBlur={onBlur}
            onInput={(e) => {
              const text = e.currentTarget.textContent || '';
              onUpdate({ content: text });
            }}
            onKeyDown={onKeyDown}
            className={cn(
              'flex-1 outline-none min-h-[1.5em] whitespace-pre-wrap break-words',
              getBlockStyles(),
              block.checked && 'line-through text-muted-foreground'
            )}
            data-placeholder={placeholder || `Type '/' for commands...`}
          >
            {block.content}
          </div>
        </div>

        {/* Block Type Menu */}
        {showMenu && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
            <div className="p-1 max-h-80 overflow-y-auto">
              {blockTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.type}
                    onClick={() => onMenuSelect(type.type)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent rounded transition-colors text-left"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Delete Button - Shows on hover */}
      <button
        onClick={onDelete}
        className="opacity-0 group-hover/block:opacity-100 transition-opacity p-1 hover:bg-destructive/10 hover:text-destructive rounded flex-shrink-0"
        title="Delete block"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// Helper functions
function parseHTMLToBlocks(html: string): Block[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const blocks: Block[] = [];
  
  doc.body.childNodes.forEach((node, index) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const block: Block = {
        id: Date.now().toString() + index,
        type: 'paragraph',
        content: element.textContent || '',
      };

      switch (element.tagName.toLowerCase()) {
        case 'h1':
          block.type = 'h1';
          break;
        case 'h2':
          block.type = 'h2';
          break;
        case 'h3':
          block.type = 'h3';
          break;
        case 'ul':
          block.type = 'bullet';
          break;
        case 'ol':
          block.type = 'numbered';
          break;
        case 'blockquote':
          block.type = 'quote';
          break;
        case 'pre':
        case 'code':
          block.type = 'code';
          break;
      }

      blocks.push(block);
    }
  });

  return blocks.length > 0 ? blocks : [{ id: '1', type: 'paragraph', content: '' }];
}

function blocksToHTML(blocks: Block[]): string {
  return blocks.map(block => {
    const content = block.content || '';
    
    switch (block.type) {
      case 'h1':
        return `<h1>${content}</h1>`;
      case 'h2':
        return `<h2>${content}</h2>`;
      case 'h3':
        return `<h3>${content}</h3>`;
      case 'bullet':
        return `<ul><li>${content}</li></ul>`;
      case 'numbered':
        return `<ol><li>${content}</li></ol>`;
      case 'todo':
        return `<p><input type="checkbox" ${block.checked ? 'checked' : ''} /> ${content}</p>`;
      case 'quote':
        return `<blockquote>${content}</blockquote>`;
      case 'code':
        return `<pre><code>${content}</code></pre>`;
      default:
        return `<p>${content}</p>`;
    }
  }).join('');
}
