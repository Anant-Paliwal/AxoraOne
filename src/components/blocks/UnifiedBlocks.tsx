// UnifiedBlocks.tsx - Main export file for all block components
// Each block type is now in its own file for better organization

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Re-export types
export type { Block, BlockType, Column, Row } from './types';
export { BLOCK_TYPES } from './types';

// Import all block components
import { TextBlockComponent } from './TextBlock';
import { DatabaseBlockComponent } from './DatabaseBlock';
import { DatabaseViewsBlockComponent } from './DatabaseViewsBlock';
import { TableBlockComponent } from './TableBlock';
import { TabsBlockComponent } from './TabsBlock';
import { LinkedPagesBlockComponent } from './LinkedPagesBlock';
import { LinkedMentionBlockComponent } from './LinkedMentionBlock';
import { CalendarBlockComponent } from './CalendarBlock';
import { GalleryBlockComponent } from './GalleryBlock';
import { TimelineBlockComponent } from './TimelineBlock';
import { ListBlockComponent } from './ListBlock';
import { FormBlockComponent } from './FormBlock';
import { CommentBlockComponent } from './CommentBlock';
import { TextSelectionToolbar } from './TextSelectionToolbar';
import { 
  CalloutBlockComponent, 
  QuoteBlockComponent, 
  DividerBlockComponent, 
  ToggleBlockComponent, 
  CodeBlockComponent,
  HeadingBlockComponent,
  ChecklistBlockComponent
} from './SimpleBlocks';
import { ImageBlockComponent, VideoBlockComponent, EmbedBlockComponent, FileBlockComponent } from './ResizableMedia';

// Re-export all block components
export {
  TextBlockComponent,
  DatabaseBlockComponent,
  DatabaseViewsBlockComponent,
  TableBlockComponent,
  TabsBlockComponent,
  LinkedPagesBlockComponent,
  LinkedMentionBlockComponent,
  CalendarBlockComponent,
  GalleryBlockComponent,
  TimelineBlockComponent,
  ListBlockComponent,
  FormBlockComponent,
  CommentBlockComponent,
  TextSelectionToolbar,
  CalloutBlockComponent,
  QuoteBlockComponent,
  DividerBlockComponent,
  ToggleBlockComponent,
  CodeBlockComponent,
  HeadingBlockComponent,
  ChecklistBlockComponent,
  ImageBlockComponent,
  VideoBlockComponent,
  EmbedBlockComponent,
  FileBlockComponent
};

// Import types for renderer
import { Block, BlockType, BLOCK_TYPES } from './types';

// ============================================
// UNIFIED BLOCK RENDERER
// ============================================

interface UnifiedBlockRendererProps {
  block: Block;
  editable?: boolean;
  onUpdate?: (blockId: string, data: any) => void;
  onDelete?: (blockId: string) => void;
  onMoveUp?: (blockId: string) => void;
  onMoveDown?: (blockId: string) => void;
  onDuplicate?: (blockId: string) => void;
  onEnter?: () => void;
  onPasteMultiline?: (lines: string[]) => void;
  onPasteSpecial?: (type: string, data: any) => void;
}

export function UnifiedBlockRenderer({
  block,
  editable = false,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onEnter,
  onPasteMultiline,
  onPasteSpecial
}: UnifiedBlockRendererProps) {
  const handleUpdate = (data: any) => onUpdate?.(block.id, data);
  const handleDelete = () => onDelete?.(block.id);

  switch (block.type) {
    case 'text':
      return <TextBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={handleDelete} onEnter={onEnter} onPasteMultiline={onPasteMultiline} onPasteSpecial={onPasteSpecial} />;
    case 'heading':
      return <HeadingBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={handleDelete} />;
    case 'checklist':
      return <ChecklistBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={handleDelete} />;
    case 'database':
    case 'database_table':
      // Use original DatabaseBlock with upload feature - Table view only
      return <DatabaseBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={handleDelete} />;
    case 'database_board':
      // Board/Kanban view only
      return <DatabaseViewsBlockComponent block={{ ...block, data: { ...block.data, currentView: 'board', lockedView: true } }} editable={editable} onUpdate={handleUpdate} onDelete={handleDelete} />;
    case 'table':
      return <TableBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={handleDelete} />;
    case 'tabs':
      return <TabsBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={handleDelete} />;
    case 'linked_pages':
      return <LinkedPagesBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={handleDelete} />;
    case 'linked_mention':
      return <LinkedMentionBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={handleDelete} />;
    case 'calendar':
      return <CalendarBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={handleDelete} />;
    case 'gallery':
      return <GalleryBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={handleDelete} />;
    case 'timeline':
      return <TimelineBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={handleDelete} />;
    case 'list':
      return <ListBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={handleDelete} />;
    case 'form':
      return <FormBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={handleDelete} />;
    case 'callout':
      return <CalloutBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={handleDelete} />;
    case 'quote':
      return <QuoteBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={handleDelete} />;
    case 'divider':
      return <DividerBlockComponent block={block} editable={editable} onDelete={handleDelete} />;
    case 'toggle':
      return <ToggleBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={handleDelete} />;
    case 'code':
      return <CodeBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={handleDelete} />;
    case 'comment':
      return <CommentBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={handleDelete} />;
    case 'image':
      return <ImageBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={handleDelete} />;
    case 'video':
      return <VideoBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={handleDelete} />;
    case 'embed':
      return <EmbedBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={handleDelete} />;
    case 'file':
      return <FileBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={handleDelete} />;
    default:
      return (
        <div className="py-2 text-muted-foreground my-1">
          <p className="text-sm">Unknown block type: {block.type}</p>
        </div>
      );
  }
}

// ============================================
// BLOCK PICKER (Add Block Menu)
// ============================================

interface BlockPickerProps {
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}

export function BlockPicker({ onSelect, onClose }: BlockPickerProps) {
  const [search, setSearch] = useState('');
  
  const filteredBlocks = BLOCK_TYPES.filter(b => 
    b.label.toLowerCase().includes(search.toLowerCase()) ||
    b.description.toLowerCase().includes(search.toLowerCase())
  );

  const categories = {
    basic: 'Basic Blocks',
    database: 'Database Views',
    advanced: 'Advanced Blocks',
    media: 'Media'
  };

  return (
    <div className="w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
      {/* Search */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search blocks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-8"
            autoFocus
          />
        </div>
      </div>

      {/* Block List */}
      <div className="max-h-[400px] overflow-y-auto p-2">
        {Object.entries(categories).map(([cat, label]) => {
          const blocks = filteredBlocks.filter(b => b.category === cat);
          if (blocks.length === 0) return null;
          
          return (
            <div key={cat} className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                {label}
              </p>
              {blocks.map(block => {
                const Icon = block.icon;
                return (
                  <button
                    key={block.type}
                    onClick={() => {
                      onSelect(block.type as BlockType);
                      onClose();
                    }}
                    className="w-full text-left px-2 py-2 rounded-lg hover:bg-accent transition-colors flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{block.label}</p>
                      <p className="text-xs text-muted-foreground">{block.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// BLOCK EDITOR (Full Block Management)
// ============================================

interface BlockEditorProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  editable?: boolean;
}

export function BlockEditor({ blocks, onChange, editable = true }: BlockEditorProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState<number | null>(null);

  const addBlock = (type: BlockType, position?: number) => {
    const newBlock: Block = {
      id: Date.now().toString(),
      type,
      data: {},
      position: position ?? blocks.length
    };
    
    const newBlocks = [...blocks];
    if (position !== undefined) {
      newBlocks.splice(position, 0, newBlock);
      newBlocks.forEach((b, i) => b.position = i);
    } else {
      newBlocks.push(newBlock);
    }
    
    onChange(newBlocks);
    setShowPicker(false);
    setPickerPosition(null);
  };

  const updateBlock = (blockId: string, data: any) => {
    onChange(blocks.map(b => b.id === blockId ? { ...b, data } : b));
  };

  const deleteBlock = (blockId: string) => {
    onChange(blocks.filter(b => b.id !== blockId));
  };

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    const idx = blocks.findIndex(b => b.id === blockId);
    if (idx === -1) return;
    
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    
    const newBlocks = [...blocks];
    [newBlocks[idx], newBlocks[newIdx]] = [newBlocks[newIdx], newBlocks[idx]];
    newBlocks.forEach((b, i) => b.position = i);
    onChange(newBlocks);
  };

  const duplicateBlock = (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    
    const idx = blocks.findIndex(b => b.id === blockId);
    const newBlock: Block = {
      ...block,
      id: Date.now().toString(),
      position: idx + 1
    };
    
    const newBlocks = [...blocks];
    newBlocks.splice(idx + 1, 0, newBlock);
    newBlocks.forEach((b, i) => b.position = i);
    onChange(newBlocks);
  };

  return (
    <div className="relative">
      {blocks.length === 0 && editable && (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
          <p className="text-muted-foreground mb-4">No blocks yet</p>
          <Button variant="outline" onClick={() => setShowPicker(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add first block
          </Button>
        </div>
      )}

      {blocks.map((block, idx) => (
        <div key={block.id}>
          {editable && (
            <div className="relative h-2 group">
              <button
                onClick={() => {
                  setPickerPosition(idx);
                  setShowPicker(true);
                }}
                className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs">
                  <Plus className="w-3 h-3" />
                  Add block
                </div>
              </button>
            </div>
          )}
          
          <UnifiedBlockRenderer
            block={block}
            editable={editable}
            onUpdate={updateBlock}
            onDelete={deleteBlock}
            onMoveUp={() => moveBlock(block.id, 'up')}
            onMoveDown={() => moveBlock(block.id, 'down')}
            onDuplicate={() => duplicateBlock(block.id)}
          />
        </div>
      ))}

      {editable && blocks.length > 0 && (
        <div className="mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPickerPosition(null);
              setShowPicker(true);
            }}
            className="w-full border-2 border-dashed border-border hover:border-primary/50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add block
          </Button>
        </div>
      )}

      {showPicker && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
            <BlockPicker
              onSelect={(type) => addBlock(type, pickerPosition ?? undefined)}
              onClose={() => setShowPicker(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}
