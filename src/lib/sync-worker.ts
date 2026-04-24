/**
 * Background Sync Worker
 * Syncs local changes to server when online
 */

import { offlineDB, offlineDBHelpers, SyncQueueEvent } from './offline-db';
import { api } from './api';

class SyncWorker {
  private isRunning = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL_MS = 15000; // 15 seconds
  private readonly MAX_RETRY_COUNT = 5;
  private readonly RETRY_BACKOFF_BASE = 2000; // 2 seconds base

  // Start the sync worker
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🔄 Sync Worker started');

    // Initial sync
    this.syncNow();

    // Periodic sync
    this.syncInterval = setInterval(() => {
      this.syncNow();
    }, this.SYNC_INTERVAL_MS);

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  // Stop the sync worker
  stop() {
    this.isRunning = false;
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    console.log('🛑 Sync Worker stopped');
  }

  // Handle online event
  private handleOnline = () => {
    console.log('🌐 Network online - triggering sync');
    this.syncNow();
  };

  // Handle offline event
  private handleOffline = () => {
    console.log('📴 Network offline');
  };

  // Check if online
  private isOnline(): boolean {
    return navigator.onLine;
  }

  // Sync now
  async syncNow() {
    if (!this.isOnline()) {
      return;
    }

    try {
      // Get pending events
      const pendingEvents = await offlineDBHelpers.getPendingSyncEvents(10);
      
      if (pendingEvents.length === 0) {
        // Cleanup old synced events
        await offlineDBHelpers.clearSyncedEvents();
        return;
      }

      console.log(`🔄 Syncing ${pendingEvents.length} events...`);

      // Mark all as syncing
      await Promise.all(
        pendingEvents.map(e => offlineDBHelpers.updateSyncEventStatus(e.id, 'syncing'))
      );

      // Prepare events for API
      const eventsToSync = pendingEvents.map(e => ({
        id: e.id,
        entity_type: e.entity_type,
        entity_id: e.entity_id,
        op_type: e.op_type,
        payload: JSON.parse(e.payload_json),
        created_at: e.created_at,
      }));

      // Call batch sync API
      const response = await api.syncEvents(eventsToSync);

      // Process results
      for (const result of response.results) {
        if (result.ok) {
          await offlineDBHelpers.updateSyncEventStatus(result.event_id, 'synced');
        } else {
          await offlineDBHelpers.updateSyncEventStatus(
            result.event_id,
            'failed',
            result.error || 'Unknown error'
          );
        }
      }

      console.log(`✅ Sync completed: ${response.synced_count} synced, ${response.failed_count} failed`);
    } catch (error) {
      console.error('❌ Sync error:', error);
      
      // Reset pending events back to pending status
      const pendingEvents = await offlineDB.sync_queue
        .where('status')
        .equals('syncing')
        .toArray();
      
      await Promise.all(
        pendingEvents.map(e => offlineDB.sync_queue.update(e.id, { status: 'pending' }))
      );
    }
  }

  // Get sync status
  async getSyncStatus() {
    const pendingCount = await offlineDB.sync_queue
      .where('status')
      .equals('pending')
      .count();
    
    const syncingCount = await offlineDB.sync_queue
      .where('status')
      .equals('syncing')
      .count();
    
    const failedCount = await offlineDB.sync_queue
      .where('status')
      .equals('failed')
      .count();

    return {
      pending: pendingCount,
      syncing: syncingCount,
      failed: failedCount,
      isOnline: this.isOnline(),
    };
  }
}

// Singleton instance
export const syncWorker = new SyncWorker();
