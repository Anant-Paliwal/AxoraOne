/**
 * Offline Sync Context
 * Provides offline-first functionality throughout the app
 */

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { syncWorker } from '@/lib/sync-worker';

interface OfflineSyncContextType {
  // Context is mainly for initialization
  // Actual sync operations use hooks
}

const OfflineSyncContext = createContext<OfflineSyncContextType | undefined>(undefined);

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Start sync worker on mount
    console.log('🚀 Initializing offline-first system...');
    syncWorker.start();

    // Cleanup on unmount
    return () => {
      syncWorker.stop();
    };
  }, []);

  return (
    <OfflineSyncContext.Provider value={{}}>
      {children}
    </OfflineSyncContext.Provider>
  );
}

export function useOfflineSyncContext() {
  const context = useContext(OfflineSyncContext);
  if (context === undefined) {
    throw new Error('useOfflineSyncContext must be used within OfflineSyncProvider');
  }
  return context;
}
