// Block Types and Interfaces
import { FileText, Database, Table as TableIcon, Calendar, Image, List, Clock, FormInput, ChevronDown, LayoutGrid, Layers, Link2, ImageIcon, Video, Code, FileIcon } from 'lucide-react';

export type BlockType = 
  | 'text' 
  | 'heading' 
  | 'database' 
  | 'database_table'
  | 'database_board'
  | 'table' 
  | 'tabs'
  | 'linked_pages'
  | 'linked_mention'
  | 'gallery' 
  | 'calendar' 
  | 'timeline' 
  | 'list' 
  | 'checklist'
  | 'form'
  | 'callout'
  | 'quote'
  | 'divider'
  | 'toggle'
  | 'code'
  | 'image'
  | 'video'
  | 'embed'
  | 'file'
  | 'comment';

export interface Block {
  id: string;
  type: BlockType;
  data: any;
  position: number;
}

export interface Column {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'multi_select' | 'date' | 'checkbox' | 'url' | 'email';
  width?: number;
  hidden?: boolean;
  config?: {
    options?: { value: string; label: string; color: string }[];
  };
}

export interface Row {
  id: string;
  [key: string]: any;
}

export const BLOCK_TYPES = [
  { type: 'text', label: 'Text', icon: FileText, description: 'Plain text paragraph', category: 'basic' },
  { type: 'heading', label: 'Heading', icon: FileText, description: 'Section heading', category: 'basic' },
  { type: 'list', label: 'List', icon: List, description: 'Bullet or numbered list', category: 'basic' },
  { type: 'checklist', label: 'Checklist', icon: List, description: 'Todo checklist', category: 'basic' },
  { type: 'toggle', label: 'Toggle', icon: ChevronDown, description: 'Collapsible content', category: 'basic' },
  { type: 'callout', label: 'Callout', icon: FileText, description: 'Highlighted info box', category: 'basic' },
  { type: 'quote', label: 'Quote', icon: FileText, description: 'Block quote', category: 'basic' },
  { type: 'divider', label: 'Divider', icon: FileText, description: 'Horizontal line', category: 'basic' },
  { type: 'code', label: 'Code', icon: Code, description: 'Code block', category: 'basic' },
  { type: 'comment', label: 'Comment', icon: FileText, description: 'Add a comment', category: 'basic' },
  { type: 'table', label: 'Table', icon: TableIcon, description: 'Simple spreadsheet table', category: 'database' },
  { type: 'database', label: 'Database – Table', icon: Database, description: 'Full database with table view', category: 'database' },
  { type: 'database_board', label: 'Database – Board', icon: LayoutGrid, description: 'Kanban board view', category: 'database' },
  { type: 'tabs', label: 'Tabs', icon: Layers, description: 'Multiple views with tabs', category: 'advanced' },
  { type: 'linked_pages', label: 'Linked Pages', icon: LayoutGrid, description: 'Grid of linked pages', category: 'advanced' },
  { type: 'linked_mention', label: '@Mention', icon: Link2, description: 'Link to page, skill, or task', category: 'advanced' },
  { type: 'gallery', label: 'Gallery', icon: ImageIcon, description: 'Image gallery grid', category: 'advanced' },
  { type: 'calendar', label: 'Calendar', icon: Calendar, description: 'Event calendar view', category: 'advanced' },
  { type: 'timeline', label: 'Timeline', icon: Clock, description: 'Chronological timeline', category: 'advanced' },
  { type: 'form', label: 'Form', icon: FormInput, description: 'Input form with fields', category: 'advanced' },
  { type: 'image', label: 'Image', icon: Image, description: 'Upload or embed image', category: 'media' },
  { type: 'video', label: 'Video', icon: Video, description: 'YouTube, Vimeo, or video file', category: 'media' },
  { type: 'embed', label: 'Embed', icon: Code, description: 'Embed external content', category: 'media' },
  { type: 'file', label: 'File', icon: FileIcon, description: 'Upload file attachment', category: 'media' },
] as const;
