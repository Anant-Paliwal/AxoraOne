export interface Page {
  id: string;
  title: string;
  content: string;
  icon?: string;
  tags: string[];
  linkedPages: string[];
  createdAt: Date;
  updatedAt: Date;
  category?: string;
}

export interface Skill {
  id: string;
  name: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  description: string;
  evidence: string[];
  goals: string[];
  updatedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done' | 'blocked';
  dueDate?: Date;
  startDate?: Date;
  endDate?: Date;
  linkedPageId?: string;
  linkedSkillId?: string;
  priority: 'low' | 'medium' | 'high';
  isRecurring?: boolean;
  createdAt: Date;
  parentTaskId?: string;
  eventType: 'task' | 'event' | 'birthday' | 'reminder' | 'milestone';
  createdFrom: 'page' | 'skill' | 'ask' | 'manual' | 'calendar';
  blockedReason?: string;
  allDay?: boolean;
  color?: string;
  location?: string;
  recurrenceRule?: string;
  completedAt?: Date;
  orderIndex?: number;
  subtasks?: Task[];
}

export interface GraphNode {
  id: string;
  type: 'page' | 'skill' | 'task';
  label: string;
  x: number;
  y: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'explicit' | 'inferred';
}

export interface Workspace {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  color?: string;
  is_private?: boolean;
  pages: Page[];
  skills: Skill[];
  tasks: Task[];
}

export interface AIResponse {
  title: string;
  summary: string;
  points: {
    text: string;
    citations: string[];
  }[];
  sources: {
    id: string;
    type: 'page' | 'skill';
    title: string;
    updatedAt: Date;
  }[];
  suggestedActions: string[];
}

export type SearchMode = 'ask' | 'explain' | 'plan' | 'agent';
export type SearchScope = 'all' | 'pages' | 'skills' | 'graph' | 'kb';
