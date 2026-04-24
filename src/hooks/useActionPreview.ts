import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { ActionPreview, PreviewAction } from '@/components/ai/ActionPreviewDialog';

interface ExecutedAction {
  id: string;
  type: string;
  title: string;
  operation: string;
  success: boolean;
  created_id?: string;
  error?: string;
}

interface UseActionPreviewOptions {
  onPreviewGenerated?: (preview: ActionPreview) => void;
  onActionsExecuted?: (results: ExecutedAction[]) => void;
  onSkipped?: () => void;
}

export function useActionPreview(options: UseActionPreviewOptions = {}) {
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [currentPreview, setCurrentPreview] = useState<ActionPreview | null>(null);
  const [executedActions, setExecutedActions] = useState<ExecutedAction[]>([]);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  /**
   * Generate a preview for BUILD or PLAN mode actions
   */
  const generatePreview = useCallback(async (params: {
    query: string;
    mode: 'agent' | 'plan';
    workspace_id?: string;
    session_id?: string;
    model?: string;
    mentioned_items?: Array<{type: string, id: string, name: string}>;
    enabled_sources?: string[];
  }): Promise<ActionPreview | null> => {
    setIsGeneratingPreview(true);
    
    try {
      const preview = await api.generateActionPreview(params);
      
      // Transform to match our interface
      const transformedPreview: ActionPreview = {
        preview_id: preview.preview_id,
        mode: preview.mode,
        query: preview.query,
        response: preview.response,
        actions: preview.actions.map((a: any) => ({
          ...a,
          selected: true
        })),
        sources: preview.sources || [],
        suggested_actions: preview.suggested_actions || []
      };
      
      setCurrentPreview(transformedPreview);
      
      // Only show dialog if there are actions to preview
      if (transformedPreview.actions.length > 0) {
        setShowPreviewDialog(true);
        options.onPreviewGenerated?.(transformedPreview);
      }
      
      return transformedPreview;
    } catch (error: any) {
      console.error('Failed to generate preview:', error);
      toast.error(error.message || 'Failed to generate preview');
      return null;
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [options]);

  /**
   * Execute selected actions from the preview
   */
  const executeSelectedActions = useCallback(async (selectedActionIds: string[]): Promise<ExecutedAction[]> => {
    if (!currentPreview) {
      toast.error('No preview to execute');
      return [];
    }

    setIsExecuting(true);
    
    try {
      const result = await api.executeActions({
        preview_id: currentPreview.preview_id,
        selected_actions: selectedActionIds
      });
      
      setExecutedActions(result.executed_actions);
      setShowPreviewDialog(false);
      setShowFeedback(true);
      
      // Show success/failure toast
      const successCount = result.executed_actions.filter((a: ExecutedAction) => a.success).length;
      const failCount = result.executed_actions.length - successCount;
      
      if (failCount === 0) {
        toast.success(`✅ ${successCount} action${successCount !== 1 ? 's' : ''} completed`);
      } else {
        toast.warning(`${successCount} succeeded, ${failCount} failed`);
      }
      
      options.onActionsExecuted?.(result.executed_actions);
      
      return result.executed_actions;
    } catch (error: any) {
      console.error('Failed to execute actions:', error);
      toast.error(error.message || 'Failed to execute actions');
      return [];
    } finally {
      setIsExecuting(false);
    }
  }, [currentPreview, options]);

  /**
   * Skip actions and just use the response
   */
  const skipActions = useCallback(() => {
    setShowPreviewDialog(false);
    options.onSkipped?.();
  }, [options]);

  /**
   * Undo executed actions
   */
  const undoActions = useCallback(async (actionIds?: string[]): Promise<boolean> => {
    if (!currentPreview) {
      toast.error('No actions to undo');
      return false;
    }

    setIsUndoing(true);
    
    try {
      const result = await api.undoActions({
        preview_id: currentPreview.preview_id,
        action_ids: actionIds
      });
      
      if (result.success) {
        toast.success(`↩️ Undone ${result.undone_count} action${result.undone_count !== 1 ? 's' : ''}`);
        setExecutedActions([]);
        setShowFeedback(false);
      } else {
        toast.error(result.message || 'Failed to undo some actions');
      }
      
      return result.success;
    } catch (error: any) {
      console.error('Failed to undo actions:', error);
      toast.error(error.message || 'Failed to undo actions');
      return false;
    } finally {
      setIsUndoing(false);
    }
  }, [currentPreview]);

  /**
   * Dismiss feedback UI
   */
  const dismissFeedback = useCallback(() => {
    setShowFeedback(false);
    setExecutedActions([]);
    setCurrentPreview(null);
  }, []);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setCurrentPreview(null);
    setExecutedActions([]);
    setShowPreviewDialog(false);
    setShowFeedback(false);
    setIsGeneratingPreview(false);
    setIsExecuting(false);
    setIsUndoing(false);
  }, []);

  /**
   * Check if a mode requires preview (AGENT or PLAN)
   */
  const requiresPreview = useCallback((mode: string): boolean => {
    return mode === 'agent' || mode === 'plan';
  }, []);

  return {
    // State
    isGeneratingPreview,
    isExecuting,
    isUndoing,
    currentPreview,
    executedActions,
    showPreviewDialog,
    showFeedback,
    
    // Actions
    generatePreview,
    executeSelectedActions,
    skipActions,
    undoActions,
    dismissFeedback,
    reset,
    requiresPreview,
    
    // Dialog controls
    setShowPreviewDialog,
    setShowFeedback
  };
}
