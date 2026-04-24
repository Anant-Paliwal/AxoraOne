/**
 * Background Sync Manager
 * Syncs local changes to server silently in background
 * Makes Axora feel instant like Notion
 */

import { offlineDBHelpers } from './offline-db';
import { api } from './api';

class SyncManager {
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private syncCallbacks: Set<(status: SyncStatus) => void> = new Set();
  
  start() {
    console.log('🔄 Sync Manager started');
    
    // Sync every 3 seconds
    this.syncInterval = setInterval(() => {
      this.sync();
    }, 3000);
    
    // Sync on visibility change (when user returns to tab)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.sync();
      }
    });
    
    // Sync on online event
    window.addEventListener('online', () => {
      console.log('🌐 Back online, syncing...');
      this.sync();
    });
    
    // Initial sync
    this.sync();
  }
  
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    console.log('⏸️ Sync Manager stopped');
  }
  
  async sync() {
    if (this.isSyncing) return;
    if (!navigator.onLine) {
      this.notifyStatus('offline');
      return;
    }
    
    // Get pending events first to check if we need to sync
    const events = await offlineDBHelpers.getPendingSyncEvents(10);
    
    if (events.length === 0) {
      // No pending events, just mark as synced without showing indicator
      this.notifyStatus('synced');
      this.isSyncing = false;
      return;
    }
    
    // Only show syncing indicator if there are actual events to sync
    this.isSyncing = true;
    this.notifyStatus('syncing');
    
    try {
      console.log(`🔄 Syncing ${events.length} events...`);
      
      for (const event of events) {
        try {
          // Mark as syncing
          await offlineDBHelpers.updateSyncEventStatus(event.id, 'syncing');
          
          // Sync to server
          const payload = JSON.parse(event.payload_json);
          
          if (event.entity_type === 'page') {
            await this.syncPage(event.entity_id, event.op_type, payload);
          } else if (event.entity_type === 'task') {
            await this.syncTask(event.entity_id, event.op_type, payload);
          }
          
          // Mark as synced
          await offlineDBHelpers.updateSyncEventStatus(event.id, 'synced');
          
        } catch (error: any) {
          console.error(`❌ Sync failed for ${event.entity_type} ${event.entity_id}:`, error);
          
          // Mark as failed
          await offlineDBHelpers.updateSyncEventStatus(
            event.id,
            'failed',
            error.message
          );
        }
      }
      
      // Cleanup old synced events
      await offlineDBHelpers.clearSyncedEvents();
      
      this.notifyStatus('synced');
      console.log('✅ Sync complete');
      
    } catch (error) {
      console.error('❌ Sync error:', error);
      this.notifyStatus('error');
    } finally {
      this.isSyncing = false;
    }
  }
  
  private async syncPage(pageId: string, opType: string, payload: any) {
    if (opType === 'upsert' || opType === 'patch') {
      await api.updatePage(pageId, payload);
    } else if (opType === 'delete') {
      await api.deletePage(pageId);
    }
  }
  
  private async syncTask(taskId: string, opType: string, payload: any) {
    if (opType === 'upsert') {
      await api.createTask(payload);
    } else if (opType === 'patch') {
      await api.updateTask(taskId, payload);
    } else if (opType === 'delete') {
      await api.deleteTask(taskId);
    }
  }
  
  triggerSync() {
    // Trigger immediate sync
    setTimeout(() => this.sync(), 100);
  }
  
  // Subscribe to sync status changes
  onStatusChange(callback: (status: SyncStatus) => void) {
    this.syncCallbacks.add(callback);
    return () => this.syncCallbacks.delete(callback);
  }
  
  private notifyStatus(status: SyncStatus) {
    this.syncCallbacks.forEach(callback => callback(status));
  }
}

export type SyncStatus = 'syncing' | 'synced' | 'offline' | 'error';

export const syncManager = new SyncManager();
