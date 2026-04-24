import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Reorder } from 'framer-motion';
import {
  Bold, Italic, Strikethrough, Code, List, Quote,
  Link as LinkIcon, Image as ImageIcon, Video,
  Sparkles, Wand2, CheckSquare,
  Palette, Highlighter, Plus, Database,
  Calendar, Clock, FileText, LayoutGrid, GripVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  DatabaseBlock,
  FormBlock,
  GalleryBlock,
  CalendarBlock,
  TimelineBlock,
  ListBlock
} from '@/components/blocks';
import { MentionPopup, MentionSuggestion } from './MentionPopup';

interface EnhancedTiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  blocks?: any[];
  onBlocksChange?: (blocks: any[]) => void;
  workspaceId?: string;
}

export function EnhancedTiptapEditor({
  content,
  onChange,
  placeholder = "Type '/' for commands, '@' for mentions...",
  editable = true,
  blocks = [],
  onBlocksChange,
  workspaceId: propWorkspaceId
}: EnhancedTiptapEditorProps) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = propWorkspaceId || currentWorkspace?.id || '';
  
  const [showAIMenu, setShowAIMenu] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [showBlocksMenu, setShowBlocksMenu] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  
  // Mention state
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionType, setMentionType] = useState<'page' | 'skill' | 'task' | null>(null);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const editorContainerRef = useRef<HTMLDivElement>(null);
  
  const [insertedBlocks, setInsertedBlocks] = useState<Array<{
    id: string;
    type: string;
    position: number;
    data?: any;
    metadata: {
      created_at: string;
      updated_at: string;
    };
    view_type?: string;
    config?: any;
  }>>(blocks || []);

  // Notify parent when blocks change
  useEffect(() => {
    if (onBlocksChange) {
      onBlocksChange(insertedBlocks);
    }
  }, [insertedBlocks]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const colors = [
    { name: 'Default', value: '#000000' },
    { name: 'Gray', value: '#6B7280' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Yellow', value: '#EAB308' },
    { name: 'Green', value: '#22C55E' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Purple', value: '#A855F7' },
    { name: 'Pink', value: '#EC4899' },
  ];

  const highlights = [
    { name: 'None', value: '' },
    { name: 'Gray', value: '#F3F4F6' },
    { name: 'Red', value: '#FEE2E2' },
    { name: 'Orange', value: '#FFEDD5' },
    { name: 'Yellow', value: '#FEF3C7' },
    { name: 'Green', value: '#D1FAE5' },
    { name: 'Blue', value: '#DBEAFE' },
    { name: 'Purple', value: '#F3E8FF' },
    { name: 'Pink', value: '#FCE7F3' },
  ];

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // Disable link in StarterKit to avoid duplicate
        link: false,
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') return 'Heading';
          return placeholder;
        },
      }),
      Link.configure({
        openOnClick: !editable,
        HTMLAttributes: { class: 'text-primary underline cursor-pointer hover:text-primary/80' },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: { class: 'rounded-lg max-w-full h-auto my-4' },
      }),
      Youtube.configure({
        controls: true,
        nocookie: true,
        width: 640,
        height: 360,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: 'border-collapse table-auto w-full my-4' },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: { class: 'border border-border bg-muted font-semibold text-left p-2' },
      }),
      TableCell.configure({
        HTMLAttributes: { class: 'border border-border p-2' },
      }),
      TaskList.configure({
        HTMLAttributes: { class: 'not-prose pl-2 space-y-2' },
      }),
      TaskItem.configure({
        HTMLAttributes: { class: 'flex items-start gap-2' },
        nested: true,
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      if (editable) onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none max-w-none dark:prose-invert',
      },
    },
  });

  // Update content when prop changes (without remounting)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      const { from, to } = editor.state.selection;
      editor.commands.setContent(content, { emitUpdate: false });
      // Restore cursor position if possible
      if (from === to) {
        editor.commands.setTextSelection(Math.min(from, editor.state.doc.content.size));
      }
    }
  }, [content, editor]);

  // Handle @ mention detection
  useEffect(() => {
    if (!editor || !editable) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Close mention popup on Escape
      if (event.key === 'Escape' && showMentionPopup) {
        setShowMentionPopup(false);
        return;
      }
    };

    const handleInput = () => {
      const { state } = editor;
      const { from } = state.selection;
      const textBefore = state.doc.textBetween(Math.max(0, from - 50), from, '\n');
      const lastAtIndex = textBefore.lastIndexOf('@');

      if (lastAtIndex !== -1) {
        const textAfterAt = textBefore.substring(lastAtIndex + 1);
        
        // Check if we're in a valid mention context (no space after @)
        if (!textAfterAt.includes(' ')) {
          const query = textAfterAt.toLowerCase();
          
          // Determine mention type from prefix
          let type: 'page' | 'skill' | 'task' | null = null;
          if (query.startsWith('page:') || query.startsWith('p:')) {
            type = 'page';
          } else if (query.startsWith('skill:') || query.startsWith('s:')) {
            type = 'skill';
          } else if (query.startsWith('task:') || query.startsWith('t:')) {
            type = 'task';
          }

          setMentionQuery(query);
          setMentionType(type);
          setShowMentionPopup(true);

          // Calculate popup position (use viewport coordinates for fixed positioning)
          if (editorContainerRef.current) {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              const rect = range.getBoundingClientRect();
              setMentionPosition({
                top: rect.bottom + 8,
                left: Math.max(rect.left, 250), // Ensure not behind sidebar
              });
            }
          }
          return;
        }
      }

      setShowMentionPopup(false);
    };

    editor.on('update', handleInput);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      editor.off('update', handleInput);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editor, editable, showMentionPopup]);

  // Handle mention selection
  const handleMentionSelect = useCallback((item: MentionSuggestion) => {
    if (!editor) return;

    const { state } = editor;
    const { from } = state.selection;
    const textBefore = state.doc.textBetween(Math.max(0, from - 50), from, '\n');
    const lastAtIndex = textBefore.lastIndexOf('@');

    if (lastAtIndex === -1) return;

    const deleteFrom = from - (textBefore.length - lastAtIndex);
    const deleteTo = from;

    // Create mention HTML with proper styling
    const mentionHtml = `<span class="mention mention-${item.type}" data-mention-type="${item.type}" data-mention-id="${item.id}" contenteditable="false">@${item.name}</span>&nbsp;`;

    editor
      .chain()
      .focus()
      .deleteRange({ from: deleteFrom, to: deleteTo })
      .insertContent(mentionHtml)
      .run();

    setShowMentionPopup(false);
    setMentionQuery('');
    setMentionType(null);
  }, [editor]);

  if (!editor) return null;

  const handleAIAction = async (action: string) => {
    setShowAIMenu(false);
    setAiLoading(true);

    try {
      const selectedText = editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
        ' '
      );

      let prompt = '';
      const baseText = selectedText || editor.getText();

      switch (action) {
        case 'improve':
          prompt = `Improve and enhance this text. Return ONLY plain text: ${baseText}`;
          break;
        case 'simplify':
          prompt = `Simplify this text. Return ONLY plain text: ${baseText}`;
          break;
        case 'expand':
          prompt = `Expand on this topic. Return ONLY plain text: ${baseText}`;
          break;
        case 'summarize':
          prompt = `Summarize this text. Return ONLY plain text: ${baseText}`;
          break;
        case 'continue':
          prompt = `Continue writing from here. Return ONLY plain text: ${baseText}`;
          break;
        default:
          return;
      }

      const result = await api.query(prompt, 'ask', 'all', 'gpt-4o-mini', null);
      const cleanText = result.response.replace(/\*\*/g, '').replace(/###?\s/g, '').replace(/`/g, '');

      if (selectedText) {
        editor.chain().focus().deleteSelection().insertContent(cleanText).run();
      } else {
        editor.chain().focus().setTextSelection(editor.state.doc.content.size).insertContent('<p>' + cleanText + '</p>').run();
      }

      toast.success('AI content generated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate AI content');
    } finally {
      setAiLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      editor.chain().focus().setImage({ src: reader.result as string }).run();
      toast.success('Image inserted!');
    };
    reader.readAsDataURL(file);
  };





  const insertBlock = (blockType: string, data?: any) => {
    const blockId = `block-${Date.now()}`;
    // ✅ CRITICAL FIX #7: Standardized block structure
    const newBlock = {
      id: blockId,
      type: blockType,
      position: insertedBlocks.length,
      data: data || {},
      metadata: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      view_type: blockType === 'database' ? 'table' : undefined,
      config: {}
    };
    setInsertedBlocks([...insertedBlocks, newBlock]);
    setShowBlocksMenu(false);
    toast.success(`${blockType.charAt(0).toUpperCase() + blockType.slice(1)} block added!`);
  };

  const removeBlock = (blockId: string) => {
    setInsertedBlocks(insertedBlocks.filter(b => b.id !== blockId));
    toast.success('Block removed');
  };



  const blockTypes = [
    { type: 'database', icon: Database, label: 'Database', description: 'Structured data with views' },
    { type: 'form', icon: FileText, label: 'Form', description: 'Input form with fields' },
    { type: 'gallery', icon: LayoutGrid, label: 'Gallery', description: 'Image gallery grid' },
    { type: 'calendar', icon: Calendar, label: 'Calendar', description: 'Event calendar view' },
    { type: 'timeline', icon: Clock, label: 'Timeline', description: 'Chronological timeline' },
    { type: 'list', icon: List, label: 'List', description: 'Checklist or bullet list' },
  ];

  const ToolbarButton = ({ onClick, isActive = false, disabled = false, children }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "p-1.5 rounded transition-colors",
        isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="bg-background flex">
      {/* Main Editor Area */}
      <div className="flex-1 min-w-0">
        {/* Minimal Floating Toolbar - Only show when editing */}
        {editable && (
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/50">
            <div className="max-w-5xl mx-auto px-8 py-3">
              <div className="flex items-center gap-1.5">
                {/* Text Formatting - Compact */}
                <div className="flex items-center gap-0.5 bg-secondary/30 rounded-lg p-0.5">
                  <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')}>
                    <Bold className="w-4 h-4" />
                  </ToolbarButton>
                  <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')}>
                    <Italic className="w-4 h-4" />
                  </ToolbarButton>
                  <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')}>
                    <Strikethrough className="w-4 h-4" />
                  </ToolbarButton>
                  <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')}>
                    <Code className="w-4 h-4" />
                  </ToolbarButton>
                </div>

                <div className="w-px h-5 bg-border/30" />

                {/* Color & Highlight - Compact */}
                <div className="flex items-center gap-0.5 bg-secondary/30 rounded-lg p-0.5 relative">
                  <div className="relative">
                    <ToolbarButton onClick={() => setShowColorPicker(!showColorPicker)}>
                      <Palette className="w-4 h-4" />
                    </ToolbarButton>
                    {showColorPicker && (
                      <div className="absolute top-full left-0 mt-2 p-3 bg-popover border border-border rounded-lg shadow-lg z-50">
                        <div className="text-xs font-medium mb-2 text-muted-foreground">Text Color</div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {colors.map((color) => (
                            <button
                              key={color.value}
                              onClick={() => {
                                editor.chain().focus().setColor(color.value).run();
                                setShowColorPicker(false);
                              }}
                              className="w-6 h-6 rounded hover:scale-110 transition-transform border border-border/50"
                              style={{ backgroundColor: color.value }}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <ToolbarButton onClick={() => setShowHighlightPicker(!showHighlightPicker)}>
                      <Highlighter className="w-4 h-4" />
                    </ToolbarButton>
                    {showHighlightPicker && (
                      <div className="absolute top-full left-0 mt-2 p-3 bg-popover border border-border rounded-lg shadow-lg z-50">
                        <div className="text-xs font-medium mb-2 text-muted-foreground">Highlight</div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {highlights.map((highlight) => (
                            <button
                              key={highlight.value}
                              onClick={() => {
                                if (highlight.value) {
                                  editor.chain().focus().setHighlight({ color: highlight.value }).run();
                                } else {
                                  editor.chain().focus().unsetHighlight().run();
                                }
                                setShowHighlightPicker(false);
                              }}
                              className="w-6 h-6 rounded hover:scale-110 transition-transform border border-border/50"
                              style={{ backgroundColor: highlight.value || '#fff' }}
                              title={highlight.name}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-px h-5 bg-border/30" />

                {/* Insert Menu */}
                <div className="relative">
                  <ToolbarButton onClick={() => setShowUploadMenu(!showUploadMenu)}>
                    <Plus className="w-4 h-4" />
                  </ToolbarButton>
                  {showUploadMenu && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                      <div className="p-1">
                        <button onClick={() => { setShowImageDialog(true); setShowUploadMenu(false); }} className="w-full text-left px-3 py-2 rounded hover:bg-accent transition-colors flex items-center gap-3">
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">Image</span>
                        </button>
                        <button onClick={() => { setShowVideoDialog(true); setShowUploadMenu(false); }} className="w-full text-left px-3 py-2 rounded hover:bg-accent transition-colors flex items-center gap-3">
                          <Video className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">Video</span>
                        </button>
                        <button onClick={() => { setShowLinkDialog(true); setShowUploadMenu(false); }} className="w-full text-left px-3 py-2 rounded hover:bg-accent transition-colors flex items-center gap-3">
                          <LinkIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">Link</span>
                        </button>
                        <div className="h-px bg-border my-1" />
                        <button onClick={() => { editor.chain().focus().toggleTaskList().run(); setShowUploadMenu(false); }} className="w-full text-left px-3 py-2 rounded hover:bg-accent transition-colors flex items-center gap-3">
                          <CheckSquare className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">To-do List</span>
                        </button>
                        <button onClick={() => { editor.chain().focus().toggleBulletList().run(); setShowUploadMenu(false); }} className="w-full text-left px-3 py-2 rounded hover:bg-accent transition-colors flex items-center gap-3">
                          <List className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">Bullet List</span>
                        </button>
                        <button onClick={() => { editor.chain().focus().toggleBlockquote().run(); setShowUploadMenu(false); }} className="w-full text-left px-3 py-2 rounded hover:bg-accent transition-colors flex items-center gap-3">
                          <Quote className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">Quote</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Advanced Blocks Menu */}
                <div className="relative">
                  <ToolbarButton onClick={() => setShowBlocksMenu(!showBlocksMenu)}>
                    <LayoutGrid className="w-4 h-4" />
                  </ToolbarButton>
                  {showBlocksMenu && (
                    <div className="absolute top-full left-0 mt-2 w-72 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                      <div className="p-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                          Advanced Blocks
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {blockTypes.map((block) => {
                            const Icon = block.icon;
                            return (
                              <button
                                key={block.type}
                                onClick={() => insertBlock(block.type)}
                                className="flex flex-col items-start gap-1 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                              >
                                <Icon className="w-5 h-5 text-primary" />
                                <span className="text-sm font-medium text-foreground">{block.label}</span>
                                <span className="text-xs text-muted-foreground">{block.description}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1" />

                {/* AI Tools - Prominent */}
                <div className="relative">
                  <button
                    onClick={() => setShowAIMenu(!showAIMenu)}
                    disabled={aiLoading}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium",
                      "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600",
                      aiLoading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {aiLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>AI</span>
                  </button>

                  {showAIMenu && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border rounded-lg shadow-lg z-50">
                      <div className="p-1">
                        {['improve', 'simplify', 'expand', 'summarize', 'continue'].map((action) => (
                          <button
                            key={action}
                            onClick={() => handleAIAction(action)}
                            className="w-full text-left px-3 py-2 rounded hover:bg-accent transition-colors flex items-center gap-3"
                          >
                            <Wand2 className="w-4 h-4 text-purple-500" />
                            <span className="text-sm capitalize">{action}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Editor Content - Clean, spacious, professional */}
        <div className="max-w-5xl mx-auto px-8 py-8 relative" ref={editorContainerRef}>
          <EditorContent editor={editor} className="notion-editor" />
          
          {/* Mention Popup */}
          {showMentionPopup && workspaceId && (
            <MentionPopup
              isOpen={showMentionPopup}
              query={mentionQuery}
              type={mentionType}
              workspaceId={workspaceId}
              onSelect={handleMentionSelect}
              onClose={() => setShowMentionPopup(false)}
              position={mentionPosition}
            />
          )}

          {/* Inserted Blocks - Drag & Drop Enabled */}
          {insertedBlocks.length > 0 && (
            <Reorder.Group
              axis="y"
              values={insertedBlocks}
              onReorder={(newBlocks) => {
                // ✅ CRITICAL FIX #7: Update positions on reorder
                const updatedBlocks = newBlocks.map((block, index) => ({
                  ...block,
                  position: index,
                  metadata: {
                    ...block.metadata,
                    updated_at: new Date().toISOString()
                  }
                }));
                setInsertedBlocks(updatedBlocks);
              }}
              className="mt-12 space-y-6"
            >
              {insertedBlocks.map((block) => (
                <Reorder.Item
                  key={block.id}
                  value={block}
                  className="group/block relative"
                >
                  {/* Drag Handle */}
                  <div className="absolute -left-8 top-4 opacity-0 group-hover/block:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-5 h-5 text-muted-foreground" />
                  </div>

                  {/* Block Content */}
                  {(() => {
                    switch (block.type) {
                      case 'database':
                        return (
                          <DatabaseBlock
                            id={block.id}
                            initialData={block.data}
                            onRemove={() => removeBlock(block.id)}
                            onDataChange={(data) => {
                              // ✅ CRITICAL FIX #7: Update metadata on change
                              setInsertedBlocks(insertedBlocks.map(b =>
                                b.id === block.id ? {
                                  ...b,
                                  data,
                                  metadata: {
                                    ...b.metadata,
                                    updated_at: new Date().toISOString()
                                  }
                                } : b
                              ));
                            }}
                          />
                        );
                      case 'form':
                        return <FormBlock id={block.id} onRemove={() => removeBlock(block.id)} />;
                      case 'gallery':
                        return <GalleryBlock id={block.id} onRemove={() => removeBlock(block.id)} />;
                      case 'calendar':
                        return <CalendarBlock id={block.id} onRemove={() => removeBlock(block.id)} />;
                      case 'timeline':
                        return <TimelineBlock id={block.id} onRemove={() => removeBlock(block.id)} />;
                      case 'list':
                        return <ListBlock id={block.id} onRemove={() => removeBlock(block.id)} />;
                      default:
                        return null;
                    }
                  })()}
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}
        </div>
      </div>

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

      {/* Dialogs */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowLinkDialog(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Insert Link</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Link text"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              />
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              />
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => { setShowLinkDialog(false); setLinkUrl(''); setLinkText(''); }} className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (linkUrl) {
                    if (linkText) {
                      editor.chain().focus().insertContent(`<a href="${linkUrl}">${linkText}</a>`).run();
                    } else {
                      editor.chain().focus().setLink({ href: linkUrl }).run();
                    }
                    setLinkUrl('');
                    setLinkText('');
                    setShowLinkDialog(false);
                    toast.success('Link inserted!');
                  }
                }}
                disabled={!linkUrl}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      {showImageDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowImageDialog(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Insert Image</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              />
              <div className="text-center text-sm text-muted-foreground">OR</div>
              <button onClick={() => fileInputRef.current?.click()} className="w-full px-4 py-2 border border-border rounded-lg hover:bg-secondary">
                Choose File
              </button>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => { setShowImageDialog(false); setImageUrl(''); }} className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (imageUrl) {
                    editor.chain().focus().setImage({ src: imageUrl }).run();
                    setImageUrl('');
                    setShowImageDialog(false);
                    toast.success('Image inserted!');
                  }
                }}
                disabled={!imageUrl}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      {showVideoDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowVideoDialog(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Embed YouTube Video</h3>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="YouTube URL or video ID"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            />
            <div className="flex gap-2 mt-6">
              <button onClick={() => { setShowVideoDialog(false); setVideoUrl(''); }} className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (videoUrl) {
                    let videoId = videoUrl;
                    if (videoUrl.includes('youtube.com/watch?v=')) {
                      videoId = videoUrl.split('v=')[1]?.split('&')[0] || videoUrl;
                    } else if (videoUrl.includes('youtu.be/')) {
                      videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0] || videoUrl;
                    }
                    editor.chain().focus().setYoutubeVideo({ src: `https://www.youtube.com/watch?v=${videoId}` }).run();
                    setVideoUrl('');
                    setShowVideoDialog(false);
                    toast.success('Video embedded!');
                  }
                }}
                disabled={!videoUrl}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                Embed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
