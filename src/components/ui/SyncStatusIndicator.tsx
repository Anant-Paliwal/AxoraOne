/**
 * Minimal sync status indicator
 * Shows saving/syncing state without being intrusive
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, CloudOff, Check, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SyncStatus } from '@/hooks/useOfflineSync';

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  pendingCount?: number;
  className?: string;
  showLabel?: boolean;
}

export function SyncStatusIndicator({
  status,
  pendingCount = 0,
  className,
  showLabel = true,
}: SyncStatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
        return {
          icon: Loader2,
          label: 'Saving...',
          color: 'text-muted-foreground',
          animate: true,
        };
      case 'saved-offline':
        return {
          icon: CloudOff,
          label: 'Saved offline',
          color: 'text-warning',
          animate: false,
        };
      case 'syncing':
        return {
          icon: Loader2,
          label: 'Syncing...',
          color: 'text-blue-500',
          animate: true,
        };
      case 'synced':
        return {
          icon: Check,
          label: 'Synced',
          color: 'text-success',
          animate: false,
        };
      case 'error':
        return {
          icon: AlertCircle,
          label: 'Sync error',
          color: 'text-destructive',
          animate: false,
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();

  if (!config || status === 'idle') {
    return null;
  }

  const Icon = config.icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'flex items-center gap-2 text-sm',
          config.color,
          className
        )}
      >
        <Icon
          className={cn(
            'h-4 w-4',
            config.animate && 'animate-spin'
          )}
        />
        {showLabel && (
          <span className="font-medium">
            {config.label}
            {pendingCount > 0 && status === 'saved-offline' && (
              <span className="ml-1 text-xs">({pendingCount})</span>
            )}
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Compact version for toolbar
export function SyncStatusBadge({
  status,
  pendingCount = 0,
}: {
  status: SyncStatus;
  pendingCount?: number;
}) {
  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
      case 'syncing':
        return {
          icon: Loader2,
          color: 'bg-blue-500/10 text-blue-500',
          animate: true,
        };
      case 'saved-offline':
        return {
          icon: CloudOff,
          color: 'bg-warning/10 text-warning',
          animate: false,
        };
      case 'synced':
        return {
          icon: Check,
          color: 'bg-success/10 text-success',
          animate: false,
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'bg-destructive/10 text-destructive',
          animate: false,
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();

  if (!config || status === 'idle') {
    return null;
  }

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
        config.color
      )}
    >
      <Icon
        className={cn(
          'h-3 w-3',
          config.animate && 'animate-spin'
        )}
      />
      {pendingCount > 0 && status === 'saved-offline' && (
        <span>{pendingCount}</span>
      )}
    </motion.div>
  );
}
