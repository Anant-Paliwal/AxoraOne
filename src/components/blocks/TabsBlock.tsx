import { useState, useCallback } from 'react';
import { 
  Plus, 
  Trash2, 
  MoreHorizontal, 
  Edit2,
  X,
  Check,
  GripVertical,
  Database,
  Table,
  Calendar,
  Image,
  List,
  FileText,
  Code,
  MessageSquare,
  Clock,
  FormInput,
  Quote,
  ToggleLeft,
  Minus,
  AlertCircle,
  Link2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { Block, BlockType } from './types';

// Import block components
import { TextBlockComponent } from './TextBlock';
import { DatabaseBlockComponent } from './DatabaseBlock';
import { TableBlockComponent } from './TableBlock';
import { CalendarBlockComponent } from './CalendarBlock';
import { GalleryBlockComponent } from './GalleryBlock';
import { TimelineBlockComponent } from './TimelineBlock';
import { ListBlockComponent } from './ListBlock';
import { FormBlockComponent } from './FormBlock';
import { CommentBlockComponent } from './CommentBlock';
import { 
  CalloutBlockComponent, 
  QuoteBlockComponent, 
  DividerBlockComponent, 
  ToggleBlockComponent, 
  CodeBlockComponent 
} from './SimpleBlocks';
import { ImageBlockComponent, VideoBlockComponent } from './ResizableMedia';

interface Tab {
  id: string;
  name: string;
  icon?: string;
  blocks: Block[];
}

interface TabsBlockProps {
  block: Block;
  editable: boolean;
  onUpdate: (data: any) => void;
  onDelete?: () => void;
}

// Block types available in tabs
const TAB_BLOCK_TYPES = [
  { type: 'text', label: 'Text', icon: FileText, category: 'basic' },
  { type: 'list', label: 'List', icon: List, category: 'basic' },
  { type: 'toggle', label: 'Toggle', icon: ToggleLeft, category: 'basic' },
  { type: 'callout', label: 'Callout', icon: AlertCircle, category: 'basic' },
  { type: 'quote', label: 'Quote', icon: Quote, category: 'basic' },
  { type: 'divider', label: 'Divider', icon: Minus, category: 'basic' },
  { type: 'code', label: 'Code', icon: Code, category: 'basic' },
  { type: 'comment', label: 'Comment', icon: MessageSquare, category: 'basic' },
  { type: 'database', label: 'Database', icon: Database, category: 'advanced' },
  { type: 'table', label: 'Table', icon: Table, category: 'advanced' },
  { type: 'calendar', label: 'Calendar', icon: Calendar, category: 'advanced' },
  { type: 'gallery', label: 'Gallery', icon: Image, category: 'advanced' },
  { type: 'timeline', label: 'Timeline', icon: Clock, category: 'advanced' },
  { type: 'form', label: 'Form', icon: FormInput, category: 'advanced' },
  { type: 'linked_mention', label: '@Mention', icon: Link2, category: 'advanced' },
  { type: 'image', label: 'Image', icon: Image, category: 'media' },
];

// Full block renderer for tab content
function TabBlockRenderer({ 
  block, 
  editable, 
  onUpdate,
  onDelete 
}: { 
  block: Block; 
  editable: boolean;
  onUpdate: (data: any) => void;
  onDelete: () => void;
}) {
  const handleUpdate = (data: any) => onUpdate(data);

  switch (block.type) {
    case 'text':
      return <TextBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={onDelete} />;
    case 'database':
      return <DatabaseBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={onDelete} />;
    case 'table':
      return <TableBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={onDelete} />;
    case 'calendar':
      return <CalendarBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={onDelete} />;
    case 'gallery':
      return <GalleryBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={onDelete} />;
    case 'timeline':
      return <TimelineBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={onDelete} />;
    case 'list':
      return <ListBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={onDelete} />;
    case 'form':
      return <FormBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={onDelete} />;
    case 'callout':
      return <CalloutBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={onDelete} />;
    case 'quote':
      return <QuoteBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={onDelete} />;
    case 'divider':
      return <DividerBlockComponent block={block} editable={editable} onDelete={onDelete} />;
    case 'toggle':
      return <ToggleBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={onDelete} />;
    case 'code':
      return <CodeBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={onDelete} />;
    case 'comment':
      return <CommentBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={onDelete} />;
    case 'image':
      return <ImageBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={onDelete} />;
    case 'video':
      return <VideoBlockComponent block={block} editable={editable} onUpdate={handleUpdate} onDelete={onDelete} />;
    case 'linked_mention':
      return <LinkedMentionInTab block={block} editable={editable} onUpdate={handleUpdate} onDelete={onDelete} />;
    default:
      return (
        <div className="p-4 bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground">Unknown block type: {block.type}</p>
        </div>
      );
  }
}

// Linked Mention component for tabs
function LinkedMentionInTab({ 
  block, 
  editable, 
  onUpdate,
  onDelete 
}: { 
  block: Block; 
  editable: boolean;
  onUpdate: (data: any) => void;
  onDelete: () => void;
}) {
  const [mentionType, setMentionType] = useState<'page' | 'skill' | 'task'>(block.data?.mentionType || 'page');
  const [mentionId, setMentionId] = useState(block.data?.mentionId || '');
  const [mentionName, setMentionName] = useState(block.data?.mentionName || '');
  const [searchQuery, setSearchQuery] = useState('');

  const saveMention = (type: 'page' | 'skill' | 'task', id: string, name: string) => {
    setMentionType(type);
    setMentionId(id);
    setMentionName(name);
    onUpdate({ mentionType: type, mentionId: id, mentionName: name });
  };

  if (mentionId && mentionName) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm group">
        <span>
          {mentionType === 'page' && '📄'}
          {mentionType === 'skill' && '🎯'}
          {mentionType === 'task' && '✅'}
        </span>
        <span className="font-medium">{mentionName}</span>
        {editable && (
          <button 
            onClick={() => saveMention(mentionType, '', '')}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-primary/20 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        )}
        {editable && onDelete && (
          <button 
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/20 text-destructive rounded ml-1"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  if (!editable) {
    return <span className="text-muted-foreground text-sm">No mention selected</span>;
  }

  return (
    <div className="p-3 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <Link2 className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Link to...</span>
        {onDelete && (
          <button onClick={onDelete} className="ml-auto p-1 hover:bg-destructive/10 text-destructive rounded">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* Type selector */}
      <div className="flex gap-2 mb-3">
        {(['page', 'skill', 'task'] as const).map(type => (
          <button
            key={type}
            onClick={() => setMentionType(type)}
            className={cn(
              "px-3 py-1.5 text-xs rounded-md transition-colors",
              mentionType === type 
                ? "bg-primary text-primary-foreground" 
                : "bg-secondary hover:bg-secondary/80"
            )}
          >
            {type === 'page' && '📄 Page'}
            {type === 'skill' && '🎯 Skill'}
            {type === 'task' && '✅ Task'}
          </button>
        ))}
      </div>

      {/* Search/Input */}
      <Input
        placeholder={`Search ${mentionType}s or enter name...`}
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && searchQuery.trim()) {
            saveMention(mentionType, `manual-${Date.now()}`, searchQuery.trim());
            setSearchQuery('');
          }
        }}
        className="h-8 text-sm"
      />
      <p className="text-xs text-muted-foreground mt-2">
        Press Enter to create a link to "{searchQuery || '...'}"
      </p>
    </div>
  );
}

export function TabsBlockComponent({ block, editable, onUpdate, onDelete }: TabsBlockProps) {
  const [tabs, setTabs] = useState<Tab[]>(block.data?.tabs || [
    { id: '1', name: 'Tab 1', icon: '📄', blocks: [] },
  ]);
  const [activeTabId, setActiveTabId] = useState(block.data?.activeTabId || tabs[0]?.id);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showBlockPicker, setShowBlockPicker] = useState(false);

  const saveData = useCallback((newTabs: Tab[], newActiveTabId?: string) => {
    onUpdate({ 
      tabs: newTabs, 
      activeTabId: newActiveTabId || activeTabId 
    });
  }, [onUpdate, activeTabId]);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const addTab = () => {
    const newTab: Tab = {
      id: Date.now().toString(),
      name: `Tab ${tabs.length + 1}`,
      icon: '📄',
      blocks: []
    };
    const newTabs = [...tabs, newTab];
    setTabs(newTabs);
    setActiveTabId(newTab.id);
    saveData(newTabs, newTab.id);
  };

  const deleteTab = (tabId: string) => {
    if (tabs.length <= 1) return;
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0].id);
      saveData(newTabs, newTabs[0].id);
    } else {
      saveData(newTabs);
    }
  };

  const renameTab = (tabId: string, newName: string) => {
    const newTabs = tabs.map(t => t.id === tabId ? { ...t, name: newName } : t);
    setTabs(newTabs);
    saveData(newTabs);
    setEditingTabId(null);
  };

  const updateTabIcon = (tabId: string, icon: string) => {
    const newTabs = tabs.map(t => t.id === tabId ? { ...t, icon } : t);
    setTabs(newTabs);
    saveData(newTabs);
  };

  const addBlockToTab = (tabId: string, blockType: BlockType) => {
    const newBlock: Block = {
      id: Date.now().toString(),
      type: blockType,
      data: {},
      position: activeTab?.blocks.length || 0
    };
    const newTabs = tabs.map(t => 
      t.id === tabId 
        ? { ...t, blocks: [...t.blocks, newBlock] }
        : t
    );
    setTabs(newTabs);
    saveData(newTabs);
    setShowBlockPicker(false);
  };

  const updateBlockInTab = (tabId: string, blockId: string, data: any) => {
    const newTabs = tabs.map(t => 
      t.id === tabId 
        ? { 
            ...t, 
            blocks: t.blocks.map(b => b.id === blockId ? { ...b, data } : b)
          }
        : t
    );
    setTabs(newTabs);
    saveData(newTabs);
  };

  const deleteBlockFromTab = (tabId: string, blockId: string) => {
    const newTabs = tabs.map(t => 
      t.id === tabId 
        ? { ...t, blocks: t.blocks.filter(b => b.id !== blockId) }
        : t
    );
    setTabs(newTabs);
    saveData(newTabs);
  };

  const ICONS = ['📄', '⭐', '👤', '📁', '📝', '📊', '📅', '🎯', '💡', '🔖', '📌', '🏷️'];

  return (
    <div className="my-2">
      {/* Tab Bar */}
      <div className="flex items-center border-b border-border/30">
        <div className="flex-1 flex items-center overflow-x-auto">
          {tabs.map(tab => (
            <div key={tab.id} className="relative group/tab">
              {editingTabId === tab.id ? (
                <div className="flex items-center px-2 py-2">
                  <Input
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    className="h-6 w-24 text-sm"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') renameTab(tab.id, editingName);
                      if (e.key === 'Escape') setEditingTabId(null);
                    }}
                  />
                  <button onClick={() => renameTab(tab.id, editingName)} className="p-1 ml-1">
                    <Check className="w-3 h-3 text-green-500" />
                  </button>
                  <button onClick={() => setEditingTabId(null)} className="p-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setActiveTabId(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2",
                    activeTabId === tab.id
                      ? "text-foreground border-primary"
                      : "text-muted-foreground hover:text-foreground border-transparent hover:border-border/50"
                  )}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              )}
              
              {/* Tab Actions */}
              {editable && activeTabId === tab.id && editingTabId !== tab.id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="absolute right-1 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover/tab:opacity-100 hover:bg-accent rounded">
                      <MoreHorizontal className="w-3 h-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => {
                      setEditingTabId(tab.id);
                      setEditingName(tab.name);
                    }}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5">
                      <p className="text-xs text-muted-foreground mb-1">Icon</p>
                      <div className="grid grid-cols-6 gap-1">
                        {ICONS.map(icon => (
                          <button
                            key={icon}
                            onClick={() => updateTabIcon(tab.id, icon)}
                            className={cn(
                              "w-6 h-6 rounded hover:bg-accent flex items-center justify-center",
                              tab.icon === icon && "bg-accent"
                            )}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>
                    {tabs.length > 1 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => deleteTab(tab.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete tab
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
          
          {/* Add Tab Button */}
          {editable && (
            <button
              onClick={addTab}
              className="flex items-center gap-1 px-3 py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Block Delete Button */}
        {editable && onDelete && (
          <Button variant="ghost" size="sm" onClick={onDelete} className="mr-2 h-7 w-7 p-0 text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Tab Content */}
      <div className="p-4 min-h-[200px]">
        {activeTab && (
          <div className="space-y-3">
            {activeTab.blocks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-4">No content in this tab</p>
                {editable && (
                  <DropdownMenu open={showBlockPicker} onOpenChange={setShowBlockPicker}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Add block
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Basic</div>
                      {TAB_BLOCK_TYPES.filter(b => b.category === 'basic').map(bt => (
                        <DropdownMenuItem key={bt.type} onClick={() => addBlockToTab(activeTab.id, bt.type as BlockType)}>
                          <bt.icon className="w-4 h-4 mr-2" />
                          {bt.label}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Advanced</div>
                      {TAB_BLOCK_TYPES.filter(b => b.category === 'advanced').map(bt => (
                        <DropdownMenuItem key={bt.type} onClick={() => addBlockToTab(activeTab.id, bt.type as BlockType)}>
                          <bt.icon className="w-4 h-4 mr-2" />
                          {bt.label}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Media</div>
                      {TAB_BLOCK_TYPES.filter(b => b.category === 'media').map(bt => (
                        <DropdownMenuItem key={bt.type} onClick={() => addBlockToTab(activeTab.id, bt.type as BlockType)}>
                          <bt.icon className="w-4 h-4 mr-2" />
                          {bt.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ) : (
              <>
                {activeTab.blocks.map((contentBlock) => (
                  <div key={contentBlock.id} className="group/block relative">
                    <TabBlockRenderer
                      block={contentBlock}
                      editable={editable}
                      onUpdate={(data) => updateBlockInTab(activeTab.id, contentBlock.id, data)}
                      onDelete={() => deleteBlockFromTab(activeTab.id, contentBlock.id)}
                    />
                  </div>
                ))}
                
                {/* Add Block Button */}
                {editable && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-full py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors flex items-center justify-center gap-1">
                        <Plus className="w-4 h-4" />
                        Add block
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Basic</div>
                      {TAB_BLOCK_TYPES.filter(b => b.category === 'basic').map(bt => (
                        <DropdownMenuItem key={bt.type} onClick={() => addBlockToTab(activeTab.id, bt.type as BlockType)}>
                          <bt.icon className="w-4 h-4 mr-2" />
                          {bt.label}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Advanced</div>
                      {TAB_BLOCK_TYPES.filter(b => b.category === 'advanced').map(bt => (
                        <DropdownMenuItem key={bt.type} onClick={() => addBlockToTab(activeTab.id, bt.type as BlockType)}>
                          <bt.icon className="w-4 h-4 mr-2" />
                          {bt.label}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Media</div>
                      {TAB_BLOCK_TYPES.filter(b => b.category === 'media').map(bt => (
                        <DropdownMenuItem key={bt.type} onClick={() => addBlockToTab(activeTab.id, bt.type as BlockType)}>
                          <bt.icon className="w-4 h-4 mr-2" />
                          {bt.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
