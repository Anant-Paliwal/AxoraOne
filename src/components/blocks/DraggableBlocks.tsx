import { useState, useRef, useEffect, useCallback } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { GripVertical, Plus, Trash2, Copy, ChevronUp, ChevronDown, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { UnifiedBlockRenderer, BlockPicker, TextSelectionToolbar } from './UnifiedBlocks';
import { Block, BlockType, BLOCK_TYPES } from './types';

interface DraggableBlockEditorProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  editable?: boolean;
}

// Add Block Button Component - REMOVED (not needed)
function AddBlockButton(_props: { onClick: () => void; visible: boolean }) {
  return null; // Removed - no longer showing + between blocks
}

function DraggableBlockItem({ 
  block, 
  editable, 
  onUpdate, 
  onDelete,
  onEnter,
  onPasteMultiline,
  onPasteSpecial,
  onAddBlockBefore,
  onAddBlockAfter,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  showAddButtons
}: { 
  block: Block; 
  editable: boolean; 
  onUpdate: (blockId: string, data: any) => void;
  onDelete: (blockId: string) => void;
  onEnter?: (blockId: string) => void;
  onPasteMultiline?: (blockId: string, lines: string[]) => void;
  onPasteSpecial?: (blockId: string, type: string, data: any) => void;
  onAddBlockBefore?: (blockId: string) => void;
  onAddBlockAfter?: (blockId: string) => void;
  onDuplicate?: (blockId: string) => void;
  onMoveUp?: (blockId: string) => void;
  onMoveDown?: (blockId: string) => void;
  isFirst?: boolean;
  isLast?: boolean;
  showAddButtons?: boolean;
}) {
  const controls = useDragControls();
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Add Block Before Button */}
      {editable && isFirst && onAddBlockBefore && (
        <AddBlockButton 
          onClick={() => onAddBlockBefore(block.id)} 
          visible={isHovered || showAddButtons || false}
        />
      )}
      
      <Reorder.Item
        value={block}
        id={block.id}
        dragListener={false}
        dragControls={controls}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => setIsDragging(false)}
        className={cn(
          "relative group",
          isDragging && "z-50 opacity-50"
        )}
      >
        {/* Left Side Controls - Drag Handle + Add Button */}
        {editable && (
          <div className={cn(
            "absolute -left-16 top-1 flex items-center gap-1 transition-opacity",
            isHovered ? "opacity-100" : "opacity-0"
          )}>
            {/* Add Block Button */}
            <button
              onClick={() => onAddBlockAfter?.(block.id)}
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
              title="Add block below"
            >
              <Plus className="w-4 h-4" />
            </button>
            
            {/* Drag Handle */}
            <button
              onPointerDown={(e) => controls.start(e)}
              className="p-1 rounded hover:bg-accent cursor-grab active:cursor-grabbing text-muted-foreground"
              title="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Right Side Controls - Actions */}
        {editable && (
          <div className={cn(
            "absolute -right-20 top-1 flex items-center gap-0.5 transition-opacity",
            isHovered ? "opacity-100" : "opacity-0"
          )}>
            {!isFirst && onMoveUp && (
              <button
                onClick={() => onMoveUp(block.id)}
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                title="Move up"
              >
                <ChevronUp className="w-3 h-3" />
              </button>
            )}
            {!isLast && onMoveDown && (
              <button
                onClick={() => onMoveDown(block.id)}
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                title="Move down"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            )}
            {onDuplicate && (
              <button
                onClick={() => onDuplicate(block.id)}
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                title="Duplicate"
              >
                <Copy className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() => onDelete(block.id)}
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Block Content */}
        <div className="py-1">
          <UnifiedBlockRenderer
            block={block}
            editable={editable}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onEnter={onEnter ? () => onEnter(block.id) : undefined}
            onPasteMultiline={onPasteMultiline ? (lines) => onPasteMultiline(block.id, lines) : undefined}
            onPasteSpecial={onPasteSpecial ? (type, data) => onPasteSpecial(block.id, type, data) : undefined}
          />
        </div>
      </Reorder.Item>
      
      {/* Add Block After Button */}
      {editable && onAddBlockAfter && (
        <AddBlockButton 
          onClick={() => onAddBlockAfter(block.id)} 
          visible={isHovered || showAddButtons || false}
        />
      )}
    </div>
  );
}

export function DraggableBlockEditor({ blocks, onChange, editable = true }: DraggableBlockEditorProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [focusedBlockIndex, setFocusedBlockIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts for block navigation
  useEffect(() => {
    if (!editable) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Arrow Up/Down - Navigate between blocks
      if ((e.ctrlKey || e.metaKey) && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const direction = e.key === 'ArrowUp' ? -1 : 1;
        const newIndex = Math.max(0, Math.min(blocks.length - 1, focusedBlockIndex + direction));
        
        if (newIndex !== focusedBlockIndex) {
          setFocusedBlockIndex(newIndex);
          focusBlock(blocks[newIndex].id);
        }
      }

      // Ctrl/Cmd + D - Duplicate current block
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (focusedBlockIndex >= 0 && focusedBlockIndex < blocks.length) {
          duplicateBlock(blocks[focusedBlockIndex].id);
        }
      }

      // Ctrl/Cmd + Shift + Backspace - Delete current block
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Backspace') {
        e.preventDefault();
        if (focusedBlockIndex >= 0 && focusedBlockIndex < blocks.length) {
          deleteBlock(blocks[focusedBlockIndex].id);
        }
      }
      
      // / key - Open block picker (when at start of empty block)
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLTextAreaElement || activeElement instanceof HTMLInputElement) {
          const value = activeElement.value;
          const selectionStart = activeElement.selectionStart || 0;
          if (value === '' || (selectionStart === 1 && value === '/')) {
            e.preventDefault();
            setShowPicker(true);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editable, blocks, focusedBlockIndex]);

  const focusBlock = useCallback((blockId: string) => {
    setTimeout(() => {
      const blockElement = document.querySelector(`[id="${blockId}"] textarea, [id="${blockId}"] input, [id="${blockId}"] [contenteditable]`);
      if (blockElement instanceof HTMLElement) {
        blockElement.focus();
      }
    }, 50);
  }, []);

  const handleReorder = (newBlocks: Block[]) => {
    const updated = newBlocks.map((block, index) => ({
      ...block,
      position: index
    }));
    onChange(updated);
  };

  const addBlock = (type: BlockType, atIndex?: number) => {
    const insertIndex = atIndex !== undefined ? atIndex : blocks.length;
    const newBlock: Block = {
      id: Date.now().toString(),
      type,
      data: getDefaultBlockData(type),
      position: insertIndex
    };
    
    const newBlocks = [
      ...blocks.slice(0, insertIndex),
      newBlock,
      ...blocks.slice(insertIndex)
    ].map((block, index) => ({
      ...block,
      position: index
    }));
    
    onChange(newBlocks);
    setShowPicker(false);
    focusBlock(newBlock.id);
  };

  const addBlockBefore = (blockId: string) => {
    const index = blocks.findIndex(b => b.id === blockId);
    addBlock('text', index);
  };

  const addBlockAfter = (blockId: string, type: BlockType = 'text') => {
    const index = blocks.findIndex(b => b.id === blockId);
    addBlock(type, index + 1);
  };

  const duplicateBlock = (blockId: string) => {
    const index = blocks.findIndex(b => b.id === blockId);
    if (index === -1) return;
    
    const blockToDuplicate = blocks[index];
    const duplicatedBlock: Block = {
      ...blockToDuplicate,
      id: Date.now().toString(),
      data: { ...blockToDuplicate.data },
      position: index + 1
    };
    
    const newBlocks = [
      ...blocks.slice(0, index + 1),
      duplicatedBlock,
      ...blocks.slice(index + 1)
    ].map((block, idx) => ({
      ...block,
      position: idx
    }));
    
    onChange(newBlocks);
    focusBlock(duplicatedBlock.id);
  };

  const moveBlockUp = (blockId: string) => {
    const index = blocks.findIndex(b => b.id === blockId);
    if (index <= 0) return;
    
    const newBlocks = [...blocks];
    [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
    
    onChange(newBlocks.map((block, idx) => ({ ...block, position: idx })));
  };

  const moveBlockDown = (blockId: string) => {
    const index = blocks.findIndex(b => b.id === blockId);
    if (index === -1 || index >= blocks.length - 1) return;
    
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
    
    onChange(newBlocks.map((block, idx) => ({ ...block, position: idx })));
  };

  // Add multiple blocks after a specific block (for paste handling)
  const addMultipleBlocksAfter = (afterBlockId: string, lines: string[]) => {
    const afterIndex = blocks.findIndex(b => b.id === afterBlockId);
    
    const newBlocks: Block[] = lines.map((line, idx) => ({
      id: `${Date.now()}-${idx}`,
      type: 'text' as BlockType,
      data: { content: line.trim() },
      position: afterIndex + 1 + idx
    }));
    
    const updatedBlocks = [
      ...blocks.slice(0, afterIndex + 1),
      ...newBlocks,
      ...blocks.slice(afterIndex + 1)
    ].map((block, index) => ({
      ...block,
      position: index
    }));
    
    onChange(updatedBlocks);
  };

  // Handle special paste (table, list, code, quote)
  const handlePasteSpecial = (afterBlockId: string, type: string, data: any) => {
    const afterIndex = blocks.findIndex(b => b.id === afterBlockId);
    let newBlock: Block;
    
    switch (type) {
      case 'table':
        newBlock = {
          id: `${Date.now()}`,
          type: 'table' as BlockType,
          data: {
            headers: data.headers || ['Column 1', 'Column 2', 'Column 3'],
            rows: data.rows || []
          },
          position: afterIndex + 1
        };
        break;
        
      case 'list':
        newBlock = {
          id: `${Date.now()}`,
          type: 'list' as BlockType,
          data: {
            items: data.items || [],
            listType: data.listType || 'bullet'
          },
          position: afterIndex + 1
        };
        break;
        
      case 'code':
        newBlock = {
          id: `${Date.now()}`,
          type: 'code' as BlockType,
          data: {
            code: data.code || '',
            language: data.language || 'javascript'
          },
          position: afterIndex + 1
        };
        break;
        
      case 'quote':
        newBlock = {
          id: `${Date.now()}`,
          type: 'quote' as BlockType,
          data: {
            content: data.content || ''
          },
          position: afterIndex + 1
        };
        break;
        
      default:
        return;
    }
    
    const updatedBlocks = [
      ...blocks.slice(0, afterIndex + 1),
      newBlock,
      ...blocks.slice(afterIndex + 1)
    ].map((block, index) => ({
      ...block,
      position: index
    }));
    
    onChange(updatedBlocks);
  };

  const updateBlock = (blockId: string, data: any) => {
    onChange(blocks.map(b => b.id === blockId ? { ...b, data } : b));
  };

  const deleteBlock = (blockId: string) => {
    const index = blocks.findIndex(b => b.id === blockId);
    onChange(blocks.filter(b => b.id !== blockId));
    
    // Focus previous block after deletion
    if (index > 0 && blocks.length > 1) {
      focusBlock(blocks[index - 1].id);
    }
  };

  const handleEnter = (blockId: string) => {
    addBlockAfter(blockId, 'text');
  };

  const handlePasteMultiline = (blockId: string, lines: string[]) => {
    addMultipleBlocksAfter(blockId, lines);
  };

  const handlePasteSpecialWrapper = (blockId: string, type: string, data: any) => {
    handlePasteSpecial(blockId, type, data);
  };

  // Get default data for each block type
  const getDefaultBlockData = (type: BlockType): any => {
    switch (type) {
      case 'heading':
        return { content: '', level: 2 };
      case 'checklist':
        return { items: [{ id: '1', text: '', checked: false }] };
      case 'list':
        return { items: [''], style: 'bullet' };
      case 'table':
        return { 
          rows: [['', '', ''], ['', '', '']], 
          hasHeader: true 
        };
      case 'code':
        return { content: '', language: 'javascript' };
      case 'callout':
        return { content: '', type: 'info' };
      case 'quote':
        return { content: '' };
      case 'toggle':
        return { title: '', content: '' };
      case 'database':
        return { 
          viewType: 'table',
          columns: [
            { id: '1', name: 'Name', type: 'text' },
            { id: '2', name: 'Status', type: 'select' }
          ],
          rows: []
        };
      default:
        return { content: '' };
    }
  };

  if (!editable) {
    // View-only mode - no drag & drop
    return (
      <div className="space-y-1">
        {blocks.map(block => (
          <UnifiedBlockRenderer
            key={block.id}
            block={block}
            editable={false}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Text Selection Toolbar - Notion-style floating toolbar */}
      {editable && (
        <TextSelectionToolbar 
          containerRef={containerRef}
          onFormat={(format) => {
            console.log('Format:', format);
          }}
          onAIAction={(action, selectedText, result) => {
            console.log('AI Action:', action, selectedText, result);
            if (action === 'replace') {
              const activeElement = document.activeElement;
              if (activeElement) {
                const blockElement = activeElement.closest('[id]');
                if (blockElement) {
                  const blockId = blockElement.id;
                  const block = blocks.find(b => b.id === blockId);
                  if (block) {
                    const currentContent = block.data?.content || '';
                    const newContent = currentContent.replace(selectedText, result);
                    updateBlock(blockId, { ...block.data, content: newContent });
                  }
                }
              }
            }
          }}
          onReplaceText={(oldText, newText) => {
            const activeElement = document.activeElement;
            if (activeElement) {
              const blockElement = activeElement.closest('[id]');
              if (blockElement) {
                const blockId = blockElement.id;
                const block = blocks.find(b => b.id === blockId);
                if (block) {
                  const currentContent = block.data?.content || block.data?.html || '';
                  const newContent = currentContent.replace(oldText, newText);
                  updateBlock(blockId, { ...block.data, content: newContent, html: newContent });
                }
              }
            }
          }}
        />
      )}

      {blocks.length === 0 ? (
        <div 
          className="py-8 text-muted-foreground cursor-text text-center"
          onClick={() => addBlock('text')}
        >
          <div className="flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Click here or press Enter to start typing...</span>
          </div>
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={blocks}
          onReorder={handleReorder}
          className="space-y-0"
        >
          {blocks.map((block, index) => (
            <DraggableBlockItem
              key={block.id}
              block={block}
              editable={editable}
              onUpdate={updateBlock}
              onDelete={deleteBlock}
              onEnter={handleEnter}
              onPasteMultiline={handlePasteMultiline}
              onPasteSpecial={handlePasteSpecialWrapper}
              onAddBlockBefore={addBlockBefore}
              onAddBlockAfter={addBlockAfter}
              onDuplicate={duplicateBlock}
              onMoveUp={moveBlockUp}
              onMoveDown={moveBlockDown}
              isFirst={index === 0}
              isLast={index === blocks.length - 1}
            />
          ))}
        </Reorder.Group>
      )}

      {/* Block Picker Modal */}
      {showPicker && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
            <BlockPicker
              onSelect={(type) => addBlock(type)}
              onClose={() => setShowPicker(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}
