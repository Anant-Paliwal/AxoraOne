/**
 * Sync Status Indicator
 * Shows subtle sync status without blocking UI
 */

import { useState, useEffect } from 'react';
import { Check, Loader2, WifiOff, AlertCircle } from 'lucide-react';
import { syncManager, SyncStatus as SyncStatusType } from '@/lib/sync-manager';
import { cn } from '@/lib/utils';

export function SyncStatus() {
  const [status, setStatus] = useState<SyncStatusType>('synced');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    // Subscribe to sync status changes
    const unsubscribe = syncManager.onStatusChange(setStatus);
    
    // Listen to online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Don't show anything if synced and online (silent when everything is good)
  if (status === 'synced' && isOnline) {
    return null;
  }
  
  // Also don't show if we just checked and there's nothing to sync
  if (status === 'synced') {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-sm',
          'transition-all duration-200',
          status === 'syncing' && 'bg-blue-500 text-white',
          status === 'offline' && 'bg-yellow-500 text-white',
          status === 'error' && 'bg-red-500 text-white'
        )}
      >
        {status === 'syncing' && (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Syncing...</span>
          </>
        )}
        
        {status === 'offline' && (
          <>
            <WifiOff className="w-4 h-4" />
            <span>Offline - Changes will sync when online</span>
          </>
        )}
        
        {status === 'error' && (
          <>
            <AlertCircle className="w-4 h-4" />
            <span>Sync error - Retrying...</span>
          </>
        )}
      </div>
    </div>
  );
}

export function SyncStatusCompact() {
  const [status, setStatus] = useState<SyncStatusType>('synced');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const unsubscribe = syncManager.onStatusChange(setStatus);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {status === 'syncing' && (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Syncing</span>
        </>
      )}
      
      {status === 'synced' && isOnline && (
        <>
          <Check className="w-3 h-3 text-green-500" />
          <span>Saved</span>
        </>
      )}
      
      {!isOnline && (
        <>
          <WifiOff className="w-3 h-3 text-yellow-500" />
          <span>Offline</span>
        </>
      )}
      
      {status === 'error' && (
        <>
          <AlertCircle className="w-3 h-3 text-red-500" />
          <span>Error</span>
        </>
      )}
    </div>
  );
}
