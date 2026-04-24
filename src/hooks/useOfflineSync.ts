/**
 * React hook for offline-first data management
 * Provides autosave and sync status
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineDBHelpers } from '@/lib/offline-db';
import { syncWorker } from '@/lib/sync-worker';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export type SyncStatus = 'idle' | 'saving' | 'saved-offline' | 'syncing' | 'synced' | 'error';

export function useOfflineSync() {
  const { currentWorkspace } = useWorkspace();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Update online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Poll sync status
  useEffect(() => {
    const updateSyncStatus = async () => {
      const status = await syncWorker.getSyncStatus();
      setPendingCount(status.pending + status.syncing);
      
      if (status.failed > 0) {
        setSyncStatus('error');
      } else if (status.syncing > 0) {
        setSyncStatus('syncing');
      } else if (status.pending > 0) {
        setSyncStatus('saved-offline');
      } else {
        setSyncStatus('synced');
      }
    };

    updateSyncStatus();
    const interval = setInterval(updateSyncStatus, 2000);

    return () => clearInterval(interval);
  }, []);

  // Save page with offline-first approach
  const savePage = useCallback(async (
    pageId: string,
    data: {
      title?: string;
      content_json?: string;
      icon?: string;
      parent_id?: string;
    }
  ) => {
    if (!currentWorkspace?.id) return;

    try {
      setSyncStatus('saving');

      // 1. Save locally FIRST
      const savedPage = await offlineDBHelpers.savePage({
        id: pageId,
        workspace_id: currentWorkspace.id,
        ...data,
      });

      // 2. Enqueue sync event
      await offlineDBHelpers.enqueueSyncEvent(
        'page',
        pageId,
        'upsert',
        {
          title: savedPage.title,
          content: savedPage.content_json,
          icon: savedPage.icon,
          parent_id: savedPage.parent_id,
          workspace_id: currentWorkspace.id,
        }
      );

      // 3. Update UI status
      if (isOnline) {
        setSyncStatus('syncing');
        // Trigger immediate sync
        syncWorker.syncNow();
      } else {
        setSyncStatus('saved-offline');
      }

      return savedPage;
    } catch (error) {
      console.error('Save page error:', error);
      setSyncStatus('error');
      throw error;
    }
  }, [currentWorkspace?.id, isOnline]);

  // Save task with offline-first approach
  const saveTask = useCallback(async (
    taskId: string,
    data: {
      title?: string;
      status?: 'todo' | 'in-progress' | 'done' | 'blocked';
      priority?: 'low' | 'medium' | 'high';
      due_date?: string;
      linked_page_id?: string;
      skill_ids?: string[];
      description?: string;
    }
  ) => {
    if (!currentWorkspace?.id) return;

    try {
      setSyncStatus('saving');

      // 1. Save locally FIRST
      const savedTask = await offlineDBHelpers.saveTask({
        id: taskId,
        workspace_id: currentWorkspace.id,
        ...data,
        skill_ids: data.skill_ids ? JSON.stringify(data.skill_ids) : undefined,
      });

      // 2. Enqueue sync event
      await offlineDBHelpers.enqueueSyncEvent(
        'task',
        taskId,
        'upsert',
        {
          title: savedTask.title,
          status: savedTask.status,
          priority: savedTask.priority,
          due_date: savedTask.due_date,
          linked_page_id: savedTask.linked_page_id,
          skill_ids: savedTask.skill_ids ? JSON.parse(savedTask.skill_ids) : [],
          description: savedTask.description,
          workspace_id: currentWorkspace.id,
        }
      );

      // 3. Update UI status
      if (isOnline) {
        setSyncStatus('syncing');
        // Trigger immediate sync
        syncWorker.syncNow();
      } else {
        setSyncStatus('saved-offline');
      }

      return savedTask;
    } catch (error) {
      console.error('Save task error:', error);
      setSyncStatus('error');
      throw error;
    }
  }, [currentWorkspace?.id, isOnline]);

  // Load page from local DB first
  const loadPage = useCallback(async (pageId: string) => {
    return await offlineDBHelpers.getPage(pageId);
  }, []);

  // Load task from local DB first
  const loadTask = useCallback(async (taskId: string) => {
    return await offlineDBHelpers.getTask(taskId);
  }, []);

  // Delete page
  const deletePage = useCallback(async (pageId: string) => {
    if (!currentWorkspace?.id) return;

    try {
      // 1. Delete locally
      await offlineDBHelpers.deletePage(pageId);

      // 2. Enqueue sync event
      await offlineDBHelpers.enqueueSyncEvent(
        'page',
        pageId,
        'delete',
        { id: pageId }
      );

      // 3. Trigger sync if online
      if (isOnline) {
        syncWorker.syncNow();
      }
    } catch (error) {
      console.error('Delete page error:', error);
      throw error;
    }
  }, [currentWorkspace?.id, isOnline]);

  // Delete task
  const deleteTask = useCallback(async (taskId: string) => {
    if (!currentWorkspace?.id) return;

    try {
      // 1. Delete locally
      await offlineDBHelpers.deleteTask(taskId);

      // 2. Enqueue sync event
      await offlineDBHelpers.enqueueSyncEvent(
        'task',
        taskId,
        'delete',
        { id: taskId }
      );

      // 3. Trigger sync if online
      if (isOnline) {
        syncWorker.syncNow();
      }
    } catch (error) {
      console.error('Delete task error:', error);
      throw error;
    }
  }, [currentWorkspace?.id, isOnline]);

  return {
    syncStatus,
    pendingCount,
    isOnline,
    savePage,
    saveTask,
    loadPage,
    loadTask,
    deletePage,
    deleteTask,
  };
}

// Hook for autosave with debounce
export function useAutosave<T>(
  saveFunction: (data: T) => Promise<void>,
  debounceMs = 500
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const save = useCallback((data: T) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsSaving(true);

    // Debounce save
    timeoutRef.current = setTimeout(async () => {
      try {
        await saveFunction(data);
      } catch (error) {
        console.error('Autosave error:', error);
      } finally {
        setIsSaving(false);
      }
    }, debounceMs);
  }, [saveFunction, debounceMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { save, isSaving };
}
