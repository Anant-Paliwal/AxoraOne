/**
 * Intelligence Visibility Utilities
 * 
 * Surfaces existing intelligence without adding complexity.
 * Computes calm, single-line status indicators from existing data.
 */

import { Task, Page, Skill } from '@/types/workspace';
import { isPast, isToday, differenceInDays } from 'date-fns';

export interface PageIntelligenceStatus {
  text: string;
  type: 'active' | 'planning' | 'inactive' | 'blocked';
  skillName?: string;
}

export interface TaskContextStatus {
  text: string;
  type: 'page' | 'skill' | 'goal';
}

export interface PrimaryInsight {
  message: string;
  action: string;
  actionRoute?: string;
  type: 'urgent' | 'progress' | 'opportunity';
}

/**
 * Compute ONE intelligence status line for a page
 * Priority: blocked > active > planning > inactive
 */
export function computePageIntelligence(
  page: Page,
  tasks: Task[],
  skills: Skill[]
): PageIntelligenceStatus {
  // Find tasks linked to this page
  const linkedTasks = tasks.filter(t => t.linkedPageId === page.id);
  const activeTasks = linkedTasks.filter(t => t.status === 'in-progress');
  const blockedTasks = linkedTasks.filter(t => t.status === 'blocked');
  const todoTasks = linkedTasks.filter(t => t.status === 'todo');
  
  // Find primary skill (most confident or most recent)
  const linkedSkillIds = linkedTasks
    .map(t => t.linkedSkillId)
    .filter(Boolean) as string[];
  
  const primarySkill = linkedSkillIds.length > 0
    ? skills.find(s => s.id === linkedSkillIds[0])
    : null;

  // Priority 1: Blocked
  if (blockedTasks.length > 0) {
    return {
      text: `Blocked by ${blockedTasks.length} delayed task${blockedTasks.length > 1 ? 's' : ''}`,
      type: 'blocked'
    };
  }

  // Priority 2: Active contribution
  if (activeTasks.length > 0 && primarySkill) {
    return {
      text: `Contributing to ${primarySkill.name}`,
      type: 'active',
      skillName: primarySkill.name
    };
  }

  // Priority 3: Planning only
  if (todoTasks.length > 0 && activeTasks.length === 0) {
    return {
      text: 'Planning only — no execution yet',
      type: 'planning'
    };
  }

  // Priority 4: Inactive
  if (linkedTasks.length === 0) {
    return {
      text: 'Inactive — no linked tasks',
      type: 'inactive'
    };
  }

  // Default: Show task count
  return {
    text: `${linkedTasks.length} task${linkedTasks.length > 1 ? 's' : ''} linked`,
    type: 'planning'
  };
}

/**
 * Compute ONE contextual line for a task
 * Shows what the task supports/trains/blocks
 */
export function computeTaskContext(
  task: Task,
  pages: Page[],
  skills: Skill[]
): TaskContextStatus | null {
  // Priority 1: Skill training
  if (task.linkedSkillId) {
    const skill = skills.find(s => s.id === task.linkedSkillId);
    if (skill) {
      return {
        text: `Trains: ${skill.name}`,
        type: 'skill'
      };
    }
  }

  // Priority 2: Page support
  if (task.linkedPageId) {
    const page = pages.find(p => p.id === task.linkedPageId);
    if (page) {
      return {
        text: `Supports: ${page.title}`,
        type: 'page'
      };
    }
  }

  // Priority 3: Blocking other tasks (if we had that data)
  // For now, return null if no context
  return null;
}

/**
 * Compute ONE primary insight for the home screen
 * This replaces multiple widgets with a single decisive voice
 */
export function computePrimaryInsight(
  tasks: Task[],
  skills: Skill[],
  pages: Page[]
): PrimaryInsight {
  const now = new Date();
  
  // Analyze task state
  const overdueTasks = tasks.filter(t => 
    t.status !== 'done' && 
    t.dueDate && 
    isPast(new Date(t.dueDate)) && 
    !isToday(new Date(t.dueDate))
  );
  
  const todayTasks = tasks.filter(t => 
    t.status !== 'done' && 
    t.dueDate && 
    isToday(new Date(t.dueDate))
  );
  
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
  const blockedTasks = tasks.filter(t => t.status === 'blocked');
  const todoTasks = tasks.filter(t => t.status === 'todo');

  // Priority 1: Urgent - Overdue tasks
  if (overdueTasks.length > 0) {
    return {
      message: `${overdueTasks.length} task${overdueTasks.length > 1 ? 's' : ''} overdue — timeline needs adjustment`,
      action: 'Review overdue tasks',
      actionRoute: '/tasks?filter=overdue',
      type: 'urgent'
    };
  }

  // Priority 2: Urgent - Blocked tasks
  if (blockedTasks.length > 0) {
    return {
      message: `${blockedTasks.length} task${blockedTasks.length > 1 ? 's' : ''} blocked — progress is stalled`,
      action: 'Unblock tasks',
      actionRoute: '/tasks?filter=blocked',
      type: 'urgent'
    };
  }

  // Priority 3: Progress - Too many in progress
  if (inProgressTasks.length > 5) {
    return {
      message: `${inProgressTasks.length} tasks in progress — focus is scattered`,
      action: 'Prioritize work',
      actionRoute: '/tasks?filter=in-progress',
      type: 'progress'
    };
  }

  // Priority 4: Progress - Planning without execution
  if (todoTasks.length > 5 && inProgressTasks.length === 0) {
    return {
      message: 'Lots of planning, no execution yet',
      action: 'Start a task',
      actionRoute: '/tasks?filter=todo',
      type: 'progress'
    };
  }

  // Priority 5: Opportunity - Today's tasks
  if (todayTasks.length > 0) {
    return {
      message: `${todayTasks.length} task${todayTasks.length > 1 ? 's' : ''} due today`,
      action: 'View today',
      actionRoute: '/tasks?filter=today',
      type: 'opportunity'
    };
  }

  // Priority 6: Opportunity - Active work
  if (inProgressTasks.length > 0) {
    const primaryTask = inProgressTasks[0];
    return {
      message: `Working on ${inProgressTasks.length} task${inProgressTasks.length > 1 ? 's' : ''}`,
      action: 'Continue work',
      actionRoute: '/tasks?filter=in-progress',
      type: 'progress'
    };
  }

  // Default: All clear
  return {
    message: 'All tasks on track',
    action: 'View tasks',
    actionRoute: '/tasks',
    type: 'opportunity'
  };
}

/**
 * Get intelligence status color classes
 */
export function getIntelligenceStatusColor(type: string): string {
  switch (type) {
    case 'active':
      return 'text-green-600 dark:text-green-400';
    case 'planning':
      return 'text-blue-600 dark:text-blue-400';
    case 'inactive':
      return 'text-muted-foreground';
    case 'blocked':
      return 'text-destructive';
    case 'urgent':
      return 'text-destructive';
    case 'progress':
      return 'text-warning';
    case 'opportunity':
      return 'text-primary';
    default:
      return 'text-muted-foreground';
  }
}
