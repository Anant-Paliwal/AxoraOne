import { useState, useCallback, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
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
import { Extension } from '@tiptap/core';
import { Check, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Convert markdown-style formatting to HTML
function convertMarkdownToHTML(text: string): string {
  if (!text) return '';
  
  let html = text;
  
  // Convert **bold** to <strong>
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Convert *italic* or _italic_ to <em>
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  
  // Convert `code` to <code>
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');
  
  // Convert [link](url) to <a>
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Convert line breaks
  html = html.replace(/\n/g, '<br>');
  
  // Convert headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Convert bullet lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  // Convert numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  
  return html;
}

interface ContentViewerProps {
  content: string;
  className?: string;
}

// Code block with copy functionality
function CodeBlockWithCopy({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  }, [code]);

  return (
    <div className="relative group my-4">
      {language && (
        <div className="absolute top-0 left-0 px-3 py-1 text-xs font-medium text-muted-foreground bg-secondary/80 rounded-tl-lg rounded-br-lg">
          {language}
        </div>
      )}
      <button
        onClick={handleCopy}
        className={cn(
          "absolute top-2 right-2 p-2 rounded-lg transition-all",
          "opacity-0 group-hover:opacity-100",
          "bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground",
          copied && "bg-green-500/20 text-green-500"
        )}
        title="Copy code"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
      <pre className="bg-secondary/50 rounded-lg p-4 pt-8 overflow-x-auto">
        <code className="text-sm font-mono leading-relaxed">{code}</code>
      </pre>
    </div>
  );
}

// Collapsible section component
function CollapsibleSection({ title, children, defaultOpen = true }: { 
  title: string; 
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-lg my-4 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-secondary/30 hover:bg-secondary/50 transition-colors text-left"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="font-medium">{title}</span>
      </button>
      {isOpen && (
        <div className="p-4 border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
}

export function ContentViewer({ content, className }: ContentViewerProps) {
  // Convert markdown and sanitize HTML before passing to editor
  const processedContent = useMemo(() => {
    if (!content) return '';
    
    // If content looks like HTML already, use it directly
    if (content.trim().startsWith('<')) {
      return content;
    }
    
    // Otherwise, convert markdown-style formatting to HTML
    return convertMarkdownToHTML(content);
  }, [content]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: {
            class: 'scroll-mt-20',
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: 'content-bullet-list',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'content-ordered-list',
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'content-code-block',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'content-blockquote',
          },
        },
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'content-link',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'content-image',
        },
      }),
      Youtube.configure({
        controls: true,
        nocookie: true,
        HTMLAttributes: {
          class: 'content-video',
        },
      }),
      Table.configure({
        resizable: false,
        HTMLAttributes: {
          class: 'content-table',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: 'content-table-header',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'content-table-cell',
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'content-task-list',
        },
      }),
      TaskItem.configure({
        HTMLAttributes: {
          class: 'content-task-item',
        },
        nested: true,
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: processedContent,
    editable: false,
    editorProps: {
      attributes: {
        class: 'content-viewer-prose focus:outline-none',
      },
    },
  });

  if (!editor) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-secondary rounded w-3/4"></div>
        <div className="h-4 bg-secondary rounded w-1/2"></div>
        <div className="h-4 bg-secondary rounded w-5/6"></div>
      </div>
    );
  }

  return (
    <div className={cn("content-viewer", className)}>
      <EditorContent editor={editor} />
    </div>
  );
}

export { CodeBlockWithCopy, CollapsibleSection };
