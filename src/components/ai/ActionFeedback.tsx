import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Undo2, X, Check, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface ExecutedAction {
  id: string;
  type: string;
  title: string;
  operation: string;
  success: boolean;
  error?: string;
}

interface ActionFeedbackProps {
  executedActions: ExecutedAction[];
  previewId: string;
  onUndo: (actionIds?: string[]) => Promise<any>;
  onDismiss: () => void;
  isUndoing: boolean;
}

export function ActionFeedback({
  executedActions,
  previewId,
  onUndo,
  onDismiss,
  isUndoing
}: ActionFeedbackProps) {
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  const successCount = executedActions.filter(a => a.success).length;
  const failCount = executedActions.filter(a => !a.success).length;

  const sendFeedback = async (rating: 'helpful' | 'not_helpful', comment?: string) => {
    try {
      await api.sendActionFeedback({
        preview_id: previewId,
        rating,
        comment,
        executed_actions: executedActions.map(a => a.id)
      });
      setFeedbackSent(true);
      toast.success('Thanks for your feedback!');
    } catch (error) {
      console.error('Failed to send feedback:', error);
      // Don't show error to user, feedback is optional
    }
  };

  if (executedActions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mt-4 p-4 rounded-xl border border-border bg-card"
    >
      {/* Results Summary */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {failCount === 0 ? (
            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
              <Check className="w-4 h-4 text-green-500" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-yellow-500" />
            </div>
          )}
          <div>
            <p className="font-medium text-sm">
              {failCount === 0 
                ? `✅ ${successCount} action${successCount !== 1 ? 's' : ''} completed`
                : `${successCount} succeeded, ${failCount} failed`
              }
            </p>
            <p className="text-xs text-muted-foreground">
              Items have been added to your workspace
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-secondary rounded transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Failed Actions */}
      {failCount > 0 && (
        <div className="mb-3 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-xs font-medium text-destructive mb-1">Failed Actions:</p>
          {executedActions.filter(a => !a.success).map(action => (
            <p key={action.id} className="text-xs text-destructive/80">
              • {action.title}: {action.error || 'Unknown error'}
            </p>
          ))}
        </div>
      )}

      {/* Feedback Section */}
      {!feedbackSent ? (
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <p className="text-sm text-muted-foreground">Was this helpful?</p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => sendFeedback('helpful')}
              className="gap-1.5 h-8"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              Yes
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFeedbackInput(true)}
              className="gap-1.5 h-8"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
              No
            </Button>
            <div className="w-px h-4 bg-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUndo()}
              disabled={isUndoing}
              className="gap-1.5 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Undo2 className="w-3.5 h-3.5" />
              {isUndoing ? 'Undoing...' : 'Undo All'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="pt-3 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            ✓ Feedback recorded. Thank you!
          </p>
        </div>
      )}

      {/* Feedback Input */}
      <AnimatePresence>
        {showFeedbackInput && !feedbackSent && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-3 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">
                What could be improved?
              </p>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Tell us what went wrong..."
                className="w-full p-2 text-sm rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                rows={2}
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFeedbackInput(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => sendFeedback('not_helpful', feedbackText)}
                >
                  Send Feedback
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
