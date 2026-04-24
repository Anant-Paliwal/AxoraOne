/**
 * Offline-First Page Editor Wrapper
 * Integrates autosave with offline sync
 */

import { useEffect, useCallback, useRef } from 'react';
import { useOfflineSync, useAutosave } from '@/hooks/useOfflineSync';
import { SyncStatusIndicator } from '@/components/ui/SyncStatusIndicator';
import { toast } from 'sonner';

interface OfflinePageEditorProps {
  pageId: string;
  workspaceId: string;
  onContentChange: (content: any) => void;
  children: React.ReactNode | ((props: { save: (data: any) => void }) => React.ReactNode);
}

export function OfflinePageEditor({
  pageId,
  onContentChange,
  children,
}: OfflinePageEditorProps) {
  const { syncStatus, pendingCount, isOnline, savePage, loadPage } = useOfflineSync();
  const lastSavedContent = useRef<string>('');

  // Load page from local DB on mount
  useEffect(() => {
    const loadLocalPage = async () => {
      try {
        const localPage = await loadPage(pageId);
        if (localPage) {
          console.log('📖 Loaded page from local DB');
          // Parse and set content
          const content = JSON.parse(localPage.content_json);
          onContentChange(content);
          lastSavedContent.current = localPage.content_json;
        }
      } catch (error) {
        console.error('Failed to load local page:', error);
      }
    };

    loadLocalPage();
  }, [pageId, loadPage]);

  // Autosave function
  const handleSave = useCallback(async (data: {
    title?: string;
    content_json?: string;
    icon?: string;
  }) => {
    // Skip if content hasn't changed
    if (data.content_json && data.content_json === lastSavedContent.current) {
      return;
    }

    try {
      await savePage(pageId, data);
      
      if (data.content_json) {
        lastSavedContent.current = data.content_json;
      }

      // Show toast only if offline
      if (!isOnline) {
        toast.info('Saved offline', {
          description: 'Changes will sync when online',
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save', {
        description: 'Please try again',
      });
    }
  }, [pageId, savePage, isOnline]);

  // Create autosave hook with 500ms debounce
  const { save: debouncedSave } = useAutosave(handleSave, 500);

  return (
    <div className="relative h-full">
      {/* Sync status indicator */}
      <div className="absolute top-4 right-4 z-50">
        <SyncStatusIndicator
          status={syncStatus}
          pendingCount={pendingCount}
          showLabel={true}
        />
      </div>

      {/* Pass save function to children via context or props */}
      {typeof children === 'function' 
        ? children({ save: debouncedSave })
        : children
      }
    </div>
  );
}
