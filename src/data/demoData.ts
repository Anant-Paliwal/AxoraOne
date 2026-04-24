import { Page, Skill, Task, Workspace } from '@/types/workspace';

export const demoPages: Page[] = [
  {
    id: 'page-1',
    title: 'Q3 Product Strategy',
    icon: '🚀',
    content: `# Q3 Product Strategy

Our primary goal for Q3 is to accelerate user acquisition through targeted content marketing and strategic partnerships.

## Key Objectives
- Launch the AI Agent marketplace
- Increase user retention by 15%
- Expand enterprise features

## Risks
- Market changes due to competition
- Resource constraints
- Alignment issues with marketing

## Timeline
- July: MVP launch
- August: Beta testing
- September: Full release`,
    tags: ['Strategy', 'Product'],
    linkedPages: ['page-2', 'page-3'],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-03-10'),
    category: 'Product Engineering',
  },
  {
    id: 'page-2',
    title: 'Engineering Roadmap',
    icon: '⚙️',
    content: `# Engineering Roadmap

## Q3 Priorities
1. Infrastructure scaling
2. API v2 development
3. Performance optimization

## Team Allocation
- Backend: 4 engineers
- Frontend: 3 engineers
- DevOps: 2 engineers`,
    tags: ['Engineering', 'Roadmap'],
    linkedPages: ['page-1'],
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-03-08'),
    category: 'Product Engineering',
  },
  {
    id: 'page-3',
    title: 'Marketing Plan',
    icon: '📣',
    content: `# Marketing Plan Q3

## Campaign Strategy
- Content marketing focus
- Partnership with TechDaily
- Social media expansion

## Budget
- Total: $150,000
- Content: $50,000
- Ads: $60,000
- Events: $40,000`,
    tags: ['Marketing', 'Growth'],
    linkedPages: ['page-1'],
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-03-05'),
    category: 'Marketing Q3',
  },
  {
    id: 'page-4',
    title: 'Design System Assets',
    icon: '🎨',
    content: `# Design System

## Colors
- Primary: #8B5CF6
- Secondary: #F3F4F6
- Accent: #10B981

## Typography
- Headings: Plus Jakarta Sans
- Body: Inter

## Components
- Buttons
- Cards
- Forms
- Navigation`,
    tags: ['Design', 'UI'],
    linkedPages: [],
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-03-01'),
    category: 'Design System',
  },
];

export const demoSkills: Skill[] = [
  {
    id: 'skill-1',
    name: 'Product Management',
    level: 'Advanced',
    description: 'Strategic product planning, roadmap development, and stakeholder management.',
    evidence: ['Q3 Product Strategy', 'Engineering Roadmap'],
    goals: ['Lead product launches', 'Improve user retention metrics'],
    updatedAt: new Date('2024-03-10'),
  },
  {
    id: 'skill-2',
    name: 'Data Analysis',
    level: 'Intermediate',
    description: 'SQL queries, data visualization, and insight generation from complex datasets.',
    evidence: ['Q3 Product Strategy'],
    goals: ['Become proficient in advanced SQL', 'Learn Python for data science'],
    updatedAt: new Date('2024-03-08'),
  },
  {
    id: 'skill-3',
    name: 'Technical Writing',
    level: 'Advanced',
    description: 'Creating clear documentation, API guides, and user manuals.',
    evidence: ['Engineering Roadmap', 'Design System Assets'],
    goals: ['Improve documentation standards', 'Create video tutorials'],
    updatedAt: new Date('2024-03-05'),
  },
  {
    id: 'skill-4',
    name: 'AI/ML Fundamentals',
    level: 'Beginner',
    description: 'Understanding machine learning concepts and AI integration patterns.',
    evidence: [],
    goals: ['Complete ML course', 'Build first AI feature'],
    updatedAt: new Date('2024-02-28'),
  },
];

export const demoTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Review PR #402',
    status: 'todo',
    dueDate: new Date('2024-03-12'),
    linkedPageId: 'page-2',
    priority: 'medium',
    createdAt: new Date('2024-03-10'),
  },
  {
    id: 'task-2',
    title: 'Prepare slide deck for Q3 kickoff',
    status: 'in-progress',
    dueDate: new Date('2024-03-13'),
    linkedPageId: 'page-1',
    priority: 'high',
    createdAt: new Date('2024-03-08'),
  },
  {
    id: 'task-3',
    title: 'Weekly team sync',
    status: 'todo',
    dueDate: new Date('2024-03-11'),
    priority: 'high',
    createdAt: new Date('2024-03-10'),
  },
  {
    id: 'task-4',
    title: 'Update API documentation',
    status: 'done',
    linkedPageId: 'page-2',
    priority: 'low',
    createdAt: new Date('2024-03-01'),
  },
  {
    id: 'task-5',
    title: 'Fix login bug',
    status: 'todo',
    dueDate: new Date('2024-03-10'),
    priority: 'high',
    createdAt: new Date('2024-03-09'),
  },
];

export const demoWorkspace: Workspace = {
  id: 'workspace-1',
  name: 'Product Engineering',
  icon: '🏢',
  pages: demoPages,
  skills: demoSkills,
  tasks: demoTasks,
};

export const workspaces = [
  { id: 'ws-1', name: 'Product Engineering', icon: '🚀' },
  { id: 'ws-2', name: 'Marketing Q3', icon: '📊' },
  { id: 'ws-3', name: 'Design System', icon: '🎨' },
];

export const favoritePages = [
  { id: 'page-1', title: 'Q3 Roadmap', icon: '📋' },
  { id: 'page-wiki', title: 'Team Wiki', icon: '⭐' },
];
