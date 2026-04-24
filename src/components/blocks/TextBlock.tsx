import { useState, useRef, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { 
  Trash2, 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Code,
  Highlighter,
  Palette
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Block } from './types';

interface TextBlockProps {
  block: Block;
  editable: boolean;
  onUpdate: (data: any) => void;
  onDelete?: () => void;
  onEnter?: () => void;
  onPasteMultiline?: (lines: string[]) => void;
  onPasteSpecial?: (type: string, data: any) => void;
}

const TEXT_COLORS = [
  { name: 'Default', value: 'inherit' },
  { name: 'Gray', value: '#6b7280' },
  { name: 'Brown', value: '#92400e' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Yellow', value: '#ca8a04' },
  { name: 'Green', value: '#16a34a' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Purple', value: '#9333ea' },
  { name: 'Pink', value: '#db2777' },
  { name: 'Red', value: '#dc2626' },
];

const HIGHLIGHT_COLORS = [
  { name: 'None', value: 'transparent' },
  { name: 'Gray', value: '#f3f4f6' },
  { name: 'Brown', value: '#fef3c7' },
  { name: 'Orange', value: '#ffedd5' },
  { name: 'Yellow', value: '#fef9c3' },
  { name: 'Green', value: '#dcfce7' },
  { name: 'Blue', value: '#dbeafe' },
  { name: 'Purple', value: '#f3e8ff' },
  { name: 'Pink', value: '#fce7f3' },
  { name: 'Red', value: '#fee2e2' },
];

// Convert markdown to HTML for TipTap
function markdownToHtml(markdown: string): string {
  if (!markdown) return '';
  
  let html = markdown;
  
  // Bold **text** or __text__
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  
  // Italic *text* or _text_ (but not inside bold)
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  html = html.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');
  
  // Strikethrough ~~text~~
  html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');
  
  // Inline code `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Auto-link URLs (but not already in anchor tags)
  html = html.replace(/(?<!href="|>)(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Wrap in paragraph if no HTML tags
  if (!html.includes('<')) {
    html = `<p>${html}</p>`;
  }
  
  return html;
}

// Detect content type from pasted text
function detectContentType(text: string): { type: string; data: any } | null {
  const lines = text.split('\n').filter(l => l.trim());
  
  // Check for markdown table
  const tableLines = lines.filter(l => l.includes('|') && l.trim().startsWith('|'));
  if (tableLines.length >= 2) {
    const rows = tableLines
      .filter(l => !l.match(/^\|[\s-:|]+\|$/))
      .map(l => l.split('|').filter(c => c.trim()).map(c => c.trim()));
    
    if (rows.length >= 1) {
      return { type: 'table', data: { headers: rows[0], rows: rows.slice(1) } };
    }
  }
  
  // Check for bullet list
  const bulletLines = lines.filter(l => /^[\s]*[-*•]\s/.test(l));
  if (bulletLines.length >= 2 && bulletLines.length === lines.length) {
    return { type: 'list', data: { items: lines.map(l => l.replace(/^[\s]*[-*•]\s/, '').trim()), listType: 'bullet' } };
  }
  
  // Check for numbered list
  const numberedLines = lines.filter(l => /^[\s]*\d+[.)]\s/.test(l));
  if (numberedLines.length >= 2 && numberedLines.length === lines.length) {
    return { type: 'list', data: { items: lines.map(l => l.replace(/^[\s]*\d+[.)]\s/, '').trim()), listType: 'numbered' } };
  }
  
  // Check for code block
  if (text.startsWith('```') || lines.every(l => l.startsWith('    ') || l.startsWith('\t'))) {
    const code = text.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
    return { type: 'code', data: { code: code.trim(), language: 'javascript' } };
  }
  
  return null;
}

export function TextBlockComponent({ 
  block, 
  editable, 
  onUpdate, 
  onDelete,
  onEnter,
  onPasteMultiline,
  onPasteSpecial
}: TextBlockProps) {
  const [blockType, setBlockType] = useState<'text' | 'h1' | 'h2' | 'h3'>(block.data?.blockType || 'text');
  const [textColor, setTextColor] = useState(block.data?.textColor || 'inherit');
  const [bgColor, setBgColor] = useState(block.data?.bgColor || 'transparent');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>(block.data?.textAlign || 'left');
  const [showToolbar, setShowToolbar] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize content - convert markdown to HTML if needed
  const initialContent = block.data?.html || markdownToHtml(block.data?.content || '');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'text-primary underline hover:text-primary/80',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Placeholder.configure({
        placeholder: blockType === 'h1' ? 'Heading 1' : blockType === 'h2' ? 'Heading 2' : blockType === 'h3' ? 'Heading 3' : "Type '/' for commands, or just start typing...",
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: initialContent,
    editable,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[1.5em]',
          blockType === 'h1' && 'text-3xl font-bold',
          blockType === 'h2' && 'text-2xl font-semibold',
          blockType === 'h3' && 'text-xl font-medium',
        ),
        style: `color: ${textColor}; background-color: ${bgColor}; text-align: ${textAlign};`,
      },
      handleKeyDown: (view, event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          // Check if editor is empty or at end
          const { state } = view;
          const { selection } = state;
          const { $from } = selection;
          
          // If at end of content and pressing Enter, create new block
          if ($from.pos === state.doc.content.size - 1 || state.doc.textContent.trim() === '') {
            event.preventDefault();
            onEnter?.();
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData('text/plain') || '';
        const html = event.clipboardData?.getData('text/html') || '';
        
        // Check for HTML table
        if (html && (html.includes('<table') || html.includes('<tr')) && onPasteSpecial) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const table = doc.querySelector('table');
          
          if (table) {
            event.preventDefault();
            const rows = Array.from(table.querySelectorAll('tr'));
            const headers = Array.from(rows[0]?.querySelectorAll('th, td') || []).map(c => c.textContent?.trim() || '');
            const dataRows = rows.slice(1).map(row => 
              Array.from(row.querySelectorAll('td')).map(c => c.textContent?.trim() || '')
            );
            onPasteSpecial('table', { headers, rows: dataRows });
            return true;
          }
        }
        
        // Check for special content types
        const detected = detectContentType(text);
        if (detected && onPasteSpecial) {
          event.preventDefault();
          onPasteSpecial(detected.type, detected.data);
          return true;
        }
        
        // Handle multiline paste
        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (lines.length > 1 && onPasteMultiline) {
          event.preventDefault();
          
          // Insert first line in current block
          const { state, dispatch } = view;
          const tr = state.tr.insertText(lines[0]);
          dispatch(tr);
          
          // Create new blocks for remaining lines
          onPasteMultiline(lines.slice(1));
          return true;
        }
        
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      onUpdate({ 
        ...block.data, 
        content: text,
        html: html,
        blockType,
        textColor,
        bgColor,
        textAlign
      });
    },
  });

  // Update editor when block type changes
  useEffect(() => {
    if (editor) {
      editor.setOptions({
        editorProps: {
          attributes: {
            class: cn(
              'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[1.5em]',
              blockType === 'h1' && 'text-3xl font-bold',
              blockType === 'h2' && 'text-2xl font-semibold',
              blockType === 'h3' && 'text-xl font-medium',
            ),
            style: `color: ${textColor}; background-color: ${bgColor}; text-align: ${textAlign};`,
          },
        },
      });
    }
  }, [editor, blockType, textColor, bgColor, textAlign]);

  const saveStyles = (updates: any) => {
    const newData = {
      ...block.data,
      blockType,
      textColor,
      bgColor,
      textAlign,
      ...updates
    };
    onUpdate(newData);
  };

  if (!editor) {
    return <div className="h-6 animate-pulse bg-muted/30 rounded" />;
  }

  return (
    <div 
      ref={containerRef}
      className="group relative" 
      id={block.id}
      onMouseEnter={() => setShowToolbar(true)}
      onMouseLeave={() => setShowToolbar(false)}
    >
      {/* Formatting Toolbar */}
      {editable && (
        <div className={cn(
          "flex items-center gap-0.5 mb-0.5 p-0.5 rounded transition-opacity",
          showToolbar ? "opacity-100" : "opacity-0"
        )}>
          {/* Block Type */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded hover:bg-accent text-xs font-medium min-w-[60px]">
                {blockType === 'h1' ? 'H1' : blockType === 'h2' ? 'H2' : blockType === 'h3' ? 'H3' : 'Text'}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => { setBlockType('text'); saveStyles({ blockType: 'text' }); }}>
                <span className="text-sm">Text</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setBlockType('h1'); saveStyles({ blockType: 'h1' }); }}>
                <Heading1 className="w-4 h-4 mr-2" />
                <span className="text-lg font-bold">Heading 1</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setBlockType('h2'); saveStyles({ blockType: 'h2' }); }}>
                <Heading2 className="w-4 h-4 mr-2" />
                <span className="text-base font-semibold">Heading 2</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setBlockType('h3'); saveStyles({ blockType: 'h3' }); }}>
                <Heading3 className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Heading 3</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-5 bg-border mx-1" />

          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn("p-1.5 rounded hover:bg-accent", editor.isActive('bold') && "bg-accent")}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn("p-1.5 rounded hover:bg-accent", editor.isActive('italic') && "bg-accent")}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={cn("p-1.5 rounded hover:bg-accent", editor.isActive('strike') && "bg-accent")}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={cn("p-1.5 rounded hover:bg-accent", editor.isActive('code') && "bg-accent")}
            title="Code"
          >
            <Code className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              const url = window.prompt('Enter URL:');
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            }}
            className={cn("p-1.5 rounded hover:bg-accent", editor.isActive('link') && "bg-accent")}
            title="Link"
          >
            <LinkIcon className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-border mx-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded hover:bg-accent" title="Text Color">
                <Palette className="w-4 h-4" style={{ color: textColor !== 'inherit' ? textColor : undefined }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <div className="grid grid-cols-5 gap-1 p-2">
                {TEXT_COLORS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => { 
                      setTextColor(color.value); 
                      saveStyles({ textColor: color.value }); 
                      if (color.value !== 'inherit') {
                        editor.chain().focus().setColor(color.value).run();
                      } else {
                        editor.chain().focus().unsetColor().run();
                      }
                    }}
                    className={cn(
                      "w-6 h-6 rounded border border-border",
                      textColor === color.value && "ring-2 ring-primary"
                    )}
                    style={{ backgroundColor: color.value === 'inherit' ? '#000' : color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded hover:bg-accent" title="Highlight">
                <Highlighter className="w-4 h-4" style={{ color: bgColor !== 'transparent' ? bgColor : undefined }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <div className="grid grid-cols-5 gap-1 p-2">
                {HIGHLIGHT_COLORS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => { 
                      setBgColor(color.value); 
                      saveStyles({ bgColor: color.value }); 
                      if (color.value !== 'transparent') {
                        editor.chain().focus().setHighlight({ color: color.value }).run();
                      } else {
                        editor.chain().focus().unsetHighlight().run();
                      }
                    }}
                    className={cn(
                      "w-6 h-6 rounded border border-border",
                      bgColor === color.value && "ring-2 ring-primary"
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-5 bg-border mx-1" />

          <button
            onClick={() => { setTextAlign('left'); saveStyles({ textAlign: 'left' }); }}
            className={cn("p-1.5 rounded hover:bg-accent", textAlign === 'left' && "bg-accent")}
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setTextAlign('center'); saveStyles({ textAlign: 'center' }); }}
            className={cn("p-1.5 rounded hover:bg-accent", textAlign === 'center' && "bg-accent")}
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setTextAlign('right'); saveStyles({ textAlign: 'right' }); }}
            className={cn("p-1.5 rounded hover:bg-accent", textAlign === 'right' && "bg-accent")}
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </button>

          <div className="flex-1" />

          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* TipTap Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}
