import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/extension-bubble-menu';
import { FloatingMenu } from '@tiptap/extension-floating-menu';
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
import { useState, useRef, useEffect } from 'react';
import { ResizableImageExtension } from './ResizableImageExtension';
import { ResizableVideoExtension } from './ResizableVideoExtension';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code, 
  List, 
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  Table as TableIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  Youtube as YoutubeIcon,
  FileText,
  Sparkles,
  Wand2,
  ChevronDown,
  CheckSquare,
  AlertCircle,
  Info,
  Lightbulb,
  Zap,
  Palette,
  Highlighter,
  GripVertical,
  Plus,
  Trash,
  Copy,
  MoreHorizontal,
  Columns,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export function TiptapEditor({ content, onChange, placeholder = 'Start writing...', editable = true }: TiptapEditorProps) {
  const [showAIMenu, setShowAIMenu] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
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
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return 'Heading';
          }
          return "Type '/' for commands...";
        },
      }),
      Link.configure({
        openOnClick: !editable,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer hover:text-primary/80',
        },
      }),
      // Keep basic image for backward compatibility
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto',
        },
      }),
      // Add resizable image extension
      ResizableImageExtension.configure({
        HTMLAttributes: {
          class: 'resizable-image-node',
        },
      }),
      // Keep basic YouTube for backward compatibility
      Youtube.configure({
        controls: true,
        nocookie: true,
        width: 640,
        height: 360,
      }),
      // Add resizable video extension
      ResizableVideoExtension.configure({
        HTMLAttributes: {
          class: 'resizable-video-node',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-border bg-muted font-semibold text-left p-2',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-border p-2',
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'not-prose pl-2',
        },
      }),
      TaskItem.configure({
        HTMLAttributes: {
          class: 'flex items-start gap-2',
        },
        nested: true,
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      if (editable) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none max-w-none',
      },
    },
  });

  // Update editor content when content prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

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
      let mode = 'ask';

      switch (action) {
        case 'improve':
          prompt = `Improve and enhance this text while keeping the same meaning. Return ONLY the improved text without any markdown formatting like ** or ###. Use plain text: ${selectedText || editor.getText()}`;
          break;
        case 'simplify':
          prompt = `Simplify this text to make it easier to understand. Return ONLY plain text without markdown: ${selectedText || editor.getText()}`;
          break;
        case 'expand':
          prompt = `Expand on this topic with more details and examples. Return ONLY plain text without markdown: ${selectedText || editor.getText()}`;
          break;
        case 'summarize':
          prompt = `Summarize this text concisely. Return ONLY plain text without markdown: ${selectedText || editor.getText()}`;
          break;
        case 'structure':
          prompt = `Restructure this content with proper organization. Return ONLY plain text without markdown: ${editor.getText()}`;
          break;
        case 'continue':
          prompt = `Continue writing from where this text left off. Return ONLY plain text without markdown: ${editor.getText()}`;
          break;
        case 'explain':
          prompt = `Explain this concept in detail. Return ONLY plain text without markdown: ${selectedText || 'the current topic'}`;
          mode = 'explain';
          break;
        default:
          return;
      }

      // Call AI API
      const result = await api.query(prompt, mode, 'all', 'gpt-4o-mini', null);

      // Clean up markdown from response
      let cleanText = result.response
        .replace(/\*\*/g, '') // Remove bold markers
        .replace(/###\s/g, '') // Remove heading markers
        .replace(/##\s/g, '')
        .replace(/#\s/g, '')
        .replace(/\*/g, '') // Remove italic markers
        .replace(/`/g, ''); // Remove code markers

      // Insert AI response as plain text
      if (selectedText) {
        // Replace selected text
        editor.chain().focus().deleteSelection().insertContent(cleanText).run();
      } else {
        // Append to end
        editor.chain().focus().setTextSelection(editor.state.doc.content.size).insertContent('<p>' + cleanText + '</p>').run();
      }

      toast.success('AI content generated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate AI content');
      console.error('AI error:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // Use resizable image extension for better control
      editor.chain().focus().setResizableImage({ 
        src: base64,
        width: 100,
        alignment: 'center'
      }).run();
      toast.success('Image inserted!');
    };
    reader.readAsDataURL(file);
  };

  const handleImageUrl = () => {
    if (imageUrl) {
      // Use resizable image extension for better control
      editor.chain().focus().setResizableImage({ 
        src: imageUrl,
        width: 100,
        alignment: 'center'
      }).run();
      setImageUrl('');
      setShowImageDialog(false);
      toast.success('Image inserted!');
    }
  };

  const handleVideoUrl = () => {
    if (videoUrl) {
      // Extract YouTube video ID
      let videoId = videoUrl;
      
      // Handle different YouTube URL formats
      if (videoUrl.includes('youtube.com/watch?v=')) {
        videoId = videoUrl.split('v=')[1]?.split('&')[0] || videoUrl;
      } else if (videoUrl.includes('youtu.be/')) {
        videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0] || videoUrl;
      } else if (videoUrl.includes('youtube.com/embed/')) {
        videoId = videoUrl.split('embed/')[1]?.split('?')[0] || videoUrl;
      }

      // Use resizable video extension for better control
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      editor.chain().focus().setResizableVideo({ 
        src: embedUrl,
        width: 100,
        alignment: 'center'
      }).run();
      setVideoUrl('');
      setShowVideoDialog(false);
      toast.success('Video embedded!');
    }
  };

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    disabled = false,
    children 
  }: { 
    onClick: () => void; 
    isActive?: boolean; 
    disabled?: boolean;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "p-2 rounded-lg transition-colors",
        isActive 
          ? "bg-primary text-primary-foreground" 
          : "hover:bg-secondary text-muted-foreground hover:text-foreground",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Toolbar - Only show in edit mode */}
      {editable && (
      <div className="border-b border-border bg-muted/30 p-2 space-y-2">
        {/* Main Formatting Row */}
        <div className="flex items-center gap-1 flex-wrap">
          <div className="flex items-center gap-1 pr-2 border-r border-border">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
            >
              <Bold className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
            >
              <Italic className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
            >
              <Strikethrough className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive('code')}
            >
              <Code className="w-4 h-4" />
            </ToolbarButton>
          </div>

          {/* Headings */}
          <div className="flex items-center gap-1 pr-2 border-r border-border">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
            >
              <Heading1 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
            >
              <Heading2 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive('heading', { level: 3 })}
            >
              <Heading3 className="w-4 h-4" />
            </ToolbarButton>
          </div>

          {/* Lists */}
          <div className="flex items-center gap-1 pr-2 border-r border-border">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
            >
              <List className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
            >
              <ListOrdered className="w-4 h-4" />
            </ToolbarButton>
          </div>

          {/* Blocks */}
          <div className="flex items-center gap-1 pr-2 border-r border-border">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
            >
              <Quote className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              isActive={editor.isActive('codeBlock')}
            >
              <FileText className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
            >
              <Minus className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            >
              <TableIcon className="w-4 h-4" />
            </ToolbarButton>
          </div>

          {/* Media */}
          <div className="flex items-center gap-1 pr-2 border-r border-border">
            <ToolbarButton onClick={() => setShowImageDialog(true)}>
              <ImageIcon className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => setShowVideoDialog(true)}>
              <YoutubeIcon className="w-4 h-4" />
            </ToolbarButton>
          </div>

          {/* AI Tools */}
          <div className="flex items-center gap-1 relative">
            <button
              onClick={() => setShowAIMenu(!showAIMenu)}
              disabled={aiLoading}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors text-sm font-medium",
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
              <ChevronDown className="w-3 h-3" />
            </button>

            {showAIMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
                    AI Actions
                  </div>
                  <button
                    onClick={() => handleAIAction('improve')}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors flex items-center gap-3"
                  >
                    <Wand2 className="w-4 h-4 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Improve Writing</p>
                      <p className="text-xs text-muted-foreground">Enhance clarity and style</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleAIAction('simplify')}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors flex items-center gap-3"
                  >
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Simplify</p>
                      <p className="text-xs text-muted-foreground">Make easier to understand</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleAIAction('expand')}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors flex items-center gap-3"
                  >
                    <FileText className="w-4 h-4 text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Expand</p>
                      <p className="text-xs text-muted-foreground">Add more details</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleAIAction('summarize')}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors flex items-center gap-3"
                  >
                    <Minus className="w-4 h-4 text-orange-500" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Summarize</p>
                      <p className="text-xs text-muted-foreground">Make it concise</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleAIAction('structure')}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors flex items-center gap-3"
                  >
                    <List className="w-4 h-4 text-pink-500" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Structure</p>
                      <p className="text-xs text-muted-foreground">Organize with headings</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleAIAction('continue')}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors flex items-center gap-3"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Continue Writing</p>
                      <p className="text-xs text-muted-foreground">AI continues from here</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleAIAction('explain')}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors flex items-center gap-3"
                  >
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Explain</p>
                      <p className="text-xs text-muted-foreground">Detailed explanation</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Block Types */}
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-colors",
              editor.isActive('paragraph')
                ? "bg-primary text-primary-foreground"
                : "hover:bg-secondary text-muted-foreground"
            )}
          >
            Text
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-colors",
              editor.isActive('heading')
                ? "bg-primary text-primary-foreground"
                : "hover:bg-secondary text-muted-foreground"
            )}
          >
            Heading
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-colors",
              editor.isActive('bulletList')
                ? "bg-primary text-primary-foreground"
                : "hover:bg-secondary text-muted-foreground"
            )}
          >
            Bullet List
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-colors",
              editor.isActive('orderedList')
                ? "bg-primary text-primary-foreground"
                : "hover:bg-secondary text-muted-foreground"
            )}
          >
            Numbered List
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-colors",
              editor.isActive('blockquote')
                ? "bg-primary text-primary-foreground"
                : "hover:bg-secondary text-muted-foreground"
            )}
          >
            Quote
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-colors",
              editor.isActive('codeBlock')
                ? "bg-primary text-primary-foreground"
                : "hover:bg-secondary text-muted-foreground"
            )}
          >
            Code
          </button>
        </div>
      </div>
      )}

      {/* Editor Content */}
      <div className={cn("min-h-[500px]", editable ? "p-6" : "p-0")}>
        <EditorContent editor={editor} />
      </div>

      {/* Image Dialog */}
      {showImageDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Insert Image</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Image URL</label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  onKeyDown={(e) => e.key === 'Enter' && handleImageUrl()}
                />
              </div>

              <div className="text-center text-sm text-muted-foreground">OR</div>

              <div>
                <label className="text-sm font-medium mb-2 block">Upload from Computer</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors"
                >
                  Choose File
                </button>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowImageDialog(false);
                  setImageUrl('');
                }}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImageUrl}
                disabled={!imageUrl}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Dialog */}
      {showVideoDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Embed YouTube Video</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">YouTube URL or Video ID</label>
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or video ID"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  onKeyDown={(e) => e.key === 'Enter' && handleVideoUrl()}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Paste any YouTube URL or just the video ID
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowVideoDialog(false);
                  setVideoUrl('');
                }}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVideoUrl}
                disabled={!videoUrl}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
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
