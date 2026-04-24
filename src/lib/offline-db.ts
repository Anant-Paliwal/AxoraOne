/**
 * Offline-First Local Database using IndexedDB
 * Guarantees NO data loss even if internet/tab/app crashes
 */

import Dexie, { Table } from 'dexie';

// Local storage schemas
export interface PageLocal {
  id: string;
  workspace_id: string;
  title: string;
  content_json: string; // JSON stringified blocks
  updated_at_local: number;
  version_local: number;
  icon?: string;
  parent_id?: string;
}

export interface TaskLocal {
  id: string;
  workspace_id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'done' | 'blocked';
  priority?: 'low' | 'medium' | 'high';
  due_date?: string;
  linked_page_id?: string;
  skill_ids?: string; // JSON stringified array
  parent_task_id?: string;
  event_type?: string;
  description?: string;
  updated_at_local: number;
  version_local: number;
}

export interface SkillLocal {
  id: string;
  workspace_id: string;
  name: string;
  level?: string;
  confidence_score?: number;
  activation_count?: number;
  last_activated_at?: string;
  success_rate?: number;
  updated_at_local: number;
  version_local: number;
}

export interface SyncQueueEvent {
  id: string;
  entity_type: 'page' | 'task';
  entity_id: string;
  op_type: 'upsert' | 'patch' | 'delete';
  payload_json: string;
  created_at: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retry_count: number;
  error_message?: string;
}

export interface SyncState {
  workspace_id: string;
  last_sync_at: number;
  is_offline: boolean;
}

// Dexie database class
class OfflineDatabase extends Dexie {
  pages_local!: Table<PageLocal, string>;
  tasks_local!: Table<TaskLocal, string>;
  skills_local!: Table<SkillLocal, string>;
  sync_queue!: Table<SyncQueueEvent, string>;
  sync_state!: Table<SyncState, string>;

  constructor() {
    super('AxoraOfflineDB');
    
    this.version(2).stores({
      pages_local: 'id, workspace_id, updated_at_local',
      tasks_local: 'id, workspace_id, updated_at_local',
      skills_local: 'id, workspace_id, updated_at_local',
      sync_queue: 'id, entity_type, entity_id, status, created_at',
      sync_state: 'workspace_id'
    });
  }
}

// Singleton instance
export const offlineDB = new OfflineDatabase();

// Helper functions
export const offlineDBHelpers = {
  // Save page locally
  async savePage(page: Partial<PageLocal> & { id: string; workspace_id: string }) {
    const now = Date.now();
    const existing = await offlineDB.pages_local.get(page.id);
    
    const pageData: PageLocal = {
      id: page.id,
      workspace_id: page.workspace_id,
      title: page.title || existing?.title || 'Untitled',
      content_json: page.content_json || existing?.content_json || '[]',
      updated_at_local: now,
      version_local: (existing?.version_local || 0) + 1,
      icon: page.icon || existing?.icon,
      parent_id: page.parent_id || existing?.parent_id,
    };

    await offlineDB.pages_local.put(pageData);
    return pageData;
  },

  // Save task locally
  async saveTask(task: Partial<TaskLocal> & { id: string; workspace_id: string }) {
    const now = Date.now();
    const existing = await offlineDB.tasks_local.get(task.id);
    
    const taskData: TaskLocal = {
      id: task.id,
      workspace_id: task.workspace_id,
      title: task.title || existing?.title || 'Untitled Task',
      status: task.status || existing?.status || 'todo',
      priority: task.priority || existing?.priority,
      due_date: task.due_date || existing?.due_date,
      linked_page_id: task.linked_page_id || existing?.linked_page_id,
      skill_ids: task.skill_ids || existing?.skill_ids,
      parent_task_id: task.parent_task_id || existing?.parent_task_id,
      event_type: task.event_type || existing?.event_type,
      description: task.description || existing?.description,
      updated_at_local: now,
      version_local: (existing?.version_local || 0) + 1,
    };

    await offlineDB.tasks_local.put(taskData);
    return taskData;
  },

  // Enqueue sync event
  async enqueueSyncEvent(
    entityType: 'page' | 'task',
    entityId: string,
    opType: 'upsert' | 'patch' | 'delete',
    payload: any
  ) {
    const event: SyncQueueEvent = {
      id: `${entityType}-${entityId}-${Date.now()}`,
      entity_type: entityType,
      entity_id: entityId,
      op_type: opType,
      payload_json: JSON.stringify(payload),
      created_at: Date.now(),
      status: 'pending',
      retry_count: 0,
    };

    await offlineDB.sync_queue.add(event);
    return event;
  },

  // Get pending sync events
  async getPendingSyncEvents(limit = 10): Promise<SyncQueueEvent[]> {
    return await offlineDB.sync_queue
      .where('status')
      .equals('pending')
      .limit(limit)
      .toArray();
  },

  // Update sync event status
  async updateSyncEventStatus(
    eventId: string,
    status: 'syncing' | 'synced' | 'failed',
    errorMessage?: string
  ) {
    const event = await offlineDB.sync_queue.get(eventId);
    if (event) {
      event.status = status;
      if (status === 'failed') {
        event.retry_count += 1;
        event.error_message = errorMessage;
      }
      await offlineDB.sync_queue.put(event);
    }
  },

  // Get sync state for workspace
  async getSyncState(workspaceId: string): Promise<SyncState | undefined> {
    return await offlineDB.sync_state.get(workspaceId);
  },

  // Update sync state
  async updateSyncState(workspaceId: string, isOffline: boolean) {
    const state: SyncState = {
      workspace_id: workspaceId,
      last_sync_at: Date.now(),
      is_offline: isOffline,
    };
    await offlineDB.sync_state.put(state);
  },

  // Get page from local DB
  async getPage(pageId: string): Promise<PageLocal | undefined> {
    return await offlineDB.pages_local.get(pageId);
  },

  // Get task from local DB
  async getTask(taskId: string): Promise<TaskLocal | undefined> {
    return await offlineDB.tasks_local.get(taskId);
  },

  // Get all pages for workspace
  async getPagesByWorkspace(workspaceId: string): Promise<PageLocal[]> {
    return await offlineDB.pages_local
      .where('workspace_id')
      .equals(workspaceId)
      .toArray();
  },

  // Get all tasks for workspace
  async getTasksByWorkspace(workspaceId: string): Promise<TaskLocal[]> {
    return await offlineDB.tasks_local
      .where('workspace_id')
      .equals(workspaceId)
      .toArray();
  },

  // Delete page locally
  async deletePage(pageId: string) {
    await offlineDB.pages_local.delete(pageId);
  },

  // Delete task locally
  async deleteTask(taskId: string) {
    await offlineDB.tasks_local.delete(taskId);
  },

  // Clear synced events (cleanup)
  async clearSyncedEvents() {
    const syncedEvents = await offlineDB.sync_queue
      .where('status')
      .equals('synced')
      .toArray();
    
    // Keep synced events for 24 hours before cleanup
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const toDelete = syncedEvents.filter(e => e.created_at < oneDayAgo);
    
    await Promise.all(toDelete.map(e => offlineDB.sync_queue.delete(e.id)));
  },

  // Save skill locally
  async saveSkill(skill: Partial<SkillLocal> & { id: string; workspace_id: string }) {
    const now = Date.now();
    const existing = await offlineDB.skills_local.get(skill.id);
    
    const skillData: SkillLocal = {
      id: skill.id,
      workspace_id: skill.workspace_id,
      name: skill.name || existing?.name || 'Untitled Skill',
      level: skill.level || existing?.level,
      confidence_score: skill.confidence_score ?? existing?.confidence_score,
      activation_count: skill.activation_count ?? existing?.activation_count,
      last_activated_at: skill.last_activated_at || existing?.last_activated_at,
      success_rate: skill.success_rate ?? existing?.success_rate,
      updated_at_local: now,
      version_local: (existing?.version_local || 0) + 1,
    };

    await offlineDB.skills_local.put(skillData);
    return skillData;
  },

  // Get skill from local DB
  async getSkill(skillId: string): Promise<SkillLocal | undefined> {
    return await offlineDB.skills_local.get(skillId);
  },

  // Get all skills for workspace
  async getSkillsByWorkspace(workspaceId: string): Promise<SkillLocal[]> {
    return await offlineDB.skills_local
      .where('workspace_id')
      .equals(workspaceId)
      .toArray();
  },

  // Delete skill locally
  async deleteSkill(skillId: string) {
    await offlineDB.skills_local.delete(skillId);
  },

  // Save multiple tasks at once (for bulk operations)
  async saveTasks(tasks: any[]) {
    for (const task of tasks) {
      await this.saveTask(task);
    }
  },

  // Save multiple pages at once (for bulk operations)
  async savePages(pages: any[]) {
    for (const page of pages) {
      await this.savePage(page);
    }
  },

  // Save multiple skills at once (for bulk operations)
  async saveSkills(skills: any[]) {
    for (const skill of skills) {
      await this.saveSkill(skill);
    }
  },
};
