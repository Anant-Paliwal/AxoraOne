/**
 * Optimistic Update Hooks
 * Updates UI instantly, syncs to server in background
 */

import { useState, useCallback } from 'react';
import { offlineDBHelpers } from '@/lib/offline-db';
import { syncManager } from '@/lib/sync-manager';

export function useOptimisticPage(initialPage: any) {
  const [page, setPage] = useState(initialPage);
  
  const updateTitle = useCallback(async (newTitle: string) => {
    // 1. Update UI immediately
    setPage((prev: any) => ({ ...prev, title: newTitle }));
    
    // 2. Update local cache
    await offlineDBHelpers.savePage({
      id: page.id,
      workspace_id: page.workspace_id,
      title: newTitle,
    });
    
    // 3. Queue sync event
    await offlineDBHelpers.enqueueSyncEvent('page', page.id, 'patch', {
      title: newTitle,
    });
    
    // 4. Trigger background sync
    syncManager.triggerSync();
  }, [page?.id, page?.workspace_id]);
  
  const updateContent = useCallback(async (newContent: any) => {
    // 1. Update UI immediately
    setPage((prev: any) => ({ ...prev, content_json: newContent }));
    
    // 2. Update local cache
    await offlineDBHelpers.savePage({
      id: page.id,
      workspace_id: page.workspace_id,
      content_json: JSON.stringify(newContent),
    });
    
    // 3. Queue sync event
    await offlineDBHelpers.enqueueSyncEvent('page', page.id, 'patch', {
      content_json: newContent,
    });
    
    // 4. Trigger background sync
    syncManager.triggerSync();
  }, [page?.id, page?.workspace_id]);
  
  const updateIcon = useCallback(async (newIcon: string) => {
    // 1. Update UI immediately
    setPage((prev: any) => ({ ...prev, icon: newIcon }));
    
    // 2. Update local cache
    await offlineDBHelpers.savePage({
      id: page.id,
      workspace_id: page.workspace_id,
      icon: newIcon,
    });
    
    // 3. Queue sync event
    await offlineDBHelpers.enqueueSyncEvent('page', page.id, 'patch', {
      icon: newIcon,
    });
    
    // 4. Trigger background sync
    syncManager.triggerSync();
  }, [page?.id, page?.workspace_id]);
  
  return {
    page,
    setPage,
    updateTitle,
    updateContent,
    updateIcon,
  };
}

export function useOptimisticTask(initialTask: any) {
  const [task, setTask] = useState(initialTask);
  
  const updateStatus = useCallback(async (newStatus: string) => {
    // 1. Update UI immediately
    setTask((prev: any) => ({ ...prev, status: newStatus }));
    
    // 2. Update local cache
    await offlineDBHelpers.saveTask({
      id: task.id,
      workspace_id: task.workspace_id,
      status: newStatus as any,
    });
    
    // 3. Queue sync event
    await offlineDBHelpers.enqueueSyncEvent('task', task.id, 'patch', {
      status: newStatus,
    });
    
    // 4. Trigger background sync
    syncManager.triggerSync();
  }, [task?.id, task?.workspace_id]);
  
  const updateTitle = useCallback(async (newTitle: string) => {
    // 1. Update UI immediately
    setTask((prev: any) => ({ ...prev, title: newTitle }));
    
    // 2. Update local cache
    await offlineDBHelpers.saveTask({
      id: task.id,
      workspace_id: task.workspace_id,
      title: newTitle,
    });
    
    // 3. Queue sync event
    await offlineDBHelpers.enqueueSyncEvent('task', task.id, 'patch', {
      title: newTitle,
    });
    
    // 4. Trigger background sync
    syncManager.triggerSync();
  }, [task?.id, task?.workspace_id]);
  
  const updatePriority = useCallback(async (newPriority: string) => {
    // 1. Update UI immediately
    setTask((prev: any) => ({ ...prev, priority: newPriority }));
    
    // 2. Update local cache
    await offlineDBHelpers.saveTask({
      id: task.id,
      workspace_id: task.workspace_id,
      priority: newPriority as any,
    });
    
    // 3. Queue sync event
    await offlineDBHelpers.enqueueSyncEvent('task', task.id, 'patch', {
      priority: newPriority,
    });
    
    // 4. Trigger background sync
    syncManager.triggerSync();
  }, [task?.id, task?.workspace_id]);
  
  return {
    task,
    setTask,
    updateStatus,
    updateTitle,
    updatePriority,
  };
}

export function useOptimisticTasks(initialTasks: any[]) {
  const [tasks, setTasks] = useState(initialTasks);
  
  const updateTaskStatus = useCallback(async (taskId: string, newStatus: string) => {
    // 1. Update UI immediately
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    
    // 2. Find task
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    
    // 3. Update local cache
    await offlineDBHelpers.saveTask({
      id: taskId,
      workspace_id: task.workspace_id,
      status: newStatus as any,
    });
    
    // 4. Queue sync event
    await offlineDBHelpers.enqueueSyncEvent('task', taskId, 'patch', {
      status: newStatus,
    });
    
    // 5. Trigger background sync
    syncManager.triggerSync();
  }, [tasks]);
  
  const addTask = useCallback(async (newTask: any) => {
    // 1. Update UI immediately
    setTasks((prev) => [newTask, ...prev]);
    
    // 2. Update local cache
    await offlineDBHelpers.saveTask(newTask);
    
    // 3. Queue sync event
    await offlineDBHelpers.enqueueSyncEvent('task', newTask.id, 'upsert', newTask);
    
    // 4. Trigger background sync
    syncManager.triggerSync();
  }, []);
  
  const removeTask = useCallback(async (taskId: string) => {
    // 1. Update UI immediately
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    
    // 2. Delete from local cache
    await offlineDBHelpers.deleteTask(taskId);
    
    // 3. Queue sync event
    await offlineDBHelpers.enqueueSyncEvent('task', taskId, 'delete', {});
    
    // 4. Trigger background sync
    syncManager.triggerSync();
  }, []);
  
  return {
    tasks,
    setTasks,
    updateTaskStatus,
    addTask,
    removeTask,
  };
}
