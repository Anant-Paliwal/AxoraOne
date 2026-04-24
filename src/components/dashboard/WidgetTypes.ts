// Dashboard Widget Type Definitions

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  settings?: Record<string, any>;
}

export type WidgetType = 
  | 'pinned-pages'
  | 'skill-progress'
  | 'upcoming-deadlines'
  | 'quick-pages'
  | 'calendar-insight'
  | 'next-best-action'
  | 'active-tasks';

export interface WidgetDefinition {
  type: WidgetType;
  name: string;
  description: string;
  icon: string;
  category: 'insights' | 'productivity' | 'navigation' | 'learning';
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  maxSize: { w: number; h: number };
}

export const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  {
    type: 'next-best-action',
    name: 'Next Best Action',
    description: 'Your most important action based on workspace intelligence',
    icon: 'sparkles',
    category: 'insights',
    defaultSize: { w: 2, h: 1 },
    minSize: { w: 2, h: 1 },
    maxSize: { w: 4, h: 2 }
  },
  {
    type: 'active-tasks',
    name: 'Active Tasks',
    description: 'All your active tasks with status and priorities',
    icon: 'check-square',
    category: 'productivity',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 1, h: 2 },
    maxSize: { w: 3, h: 3 }
  },
  {
    type: 'pinned-pages',
    name: 'Active Contexts',
    description: 'Pages you\'re actively working on',
    icon: 'pin',
    category: 'navigation',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 1, h: 1 },
    maxSize: { w: 3, h: 2 }
  },
  {
    type: 'skill-progress',
    name: 'Skill Status',
    description: 'Skills actively helping vs needing attention',
    icon: 'brain',
    category: 'learning',
    defaultSize: { w: 1, h: 2 },
    minSize: { w: 1, h: 2 },
    maxSize: { w: 2, h: 3 }
  },
  {
    type: 'calendar-insight',
    name: 'Calendar',
    description: 'Mini calendar with week insights',
    icon: 'calendar',
    category: 'productivity',
    defaultSize: { w: 1, h: 2 },
    minSize: { w: 1, h: 2 },
    maxSize: { w: 2, h: 3 }
  },
  {
    type: 'upcoming-deadlines',
    name: 'Deadlines',
    description: 'Tasks and events due soon',
    icon: 'calendar',
    category: 'productivity',
    defaultSize: { w: 1, h: 2 },
    minSize: { w: 1, h: 1 },
    maxSize: { w: 2, h: 3 }
  },
  {
    type: 'quick-pages',
    name: 'Quick Pages',
    description: 'Pinned, frequent, and recent pages',
    icon: 'file-text',
    category: 'navigation',
    defaultSize: { w: 1, h: 2 },
    minSize: { w: 1, h: 2 },
    maxSize: { w: 2, h: 3 }
  }
];

export const WIDGET_CATEGORIES = [
  { id: 'insights', name: 'Insights', icon: 'sparkles' },
  { id: 'productivity', name: 'Productivity', icon: 'check-square' },
  { id: 'navigation', name: 'Navigation', icon: 'compass' },
  { id: 'learning', name: 'Learning', icon: 'book-open' }
] as const;

// Minimal, focused default layout - ONE VOICE
export const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: 'widget-next-action', type: 'next-best-action', x: 0, y: 0, w: 3, h: 1, settings: {} },
  { id: 'widget-tasks', type: 'active-tasks', x: 0, y: 1, w: 2, h: 2, settings: {} },
  { id: 'widget-calendar', type: 'calendar-insight', x: 2, y: 1, w: 1, h: 2, settings: {} },
  { id: 'widget-skills', type: 'skill-progress', x: 0, y: 3, w: 1, h: 2, settings: {} },
  { id: 'widget-deadlines', type: 'upcoming-deadlines', x: 1, y: 3, w: 1, h: 2, settings: {} },
];
