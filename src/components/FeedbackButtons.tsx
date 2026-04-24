import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface FeedbackButtonsProps {
  messageId: string;
  workspaceId: string;
  query: string;
  mode: string;
  executedActions?: any[];
  onFeedbackSubmitted?: (rating: 'helpful' | 'not_helpful') => void;
}

export function FeedbackButtons({
  messageId,
  workspaceId,
  query,
  mode,
  executedActions = [],
  onFeedbackSubmitted
}: FeedbackButtonsProps) {
  const [rating, setRating] = useState<'helpful' | 'not_helpful' | null>(null);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (newRating: 'helpful' | 'not_helpful', withComment: boolean = false) => {
    if (rating) return; // Already submitted

    setRating(newRating);

    if (withComment) {
      setShowCommentDialog(true);
      return;
    }

    await submitFeedback(newRating, '');
  };

  const submitFeedback = async (feedbackRating: 'helpful' | 'not_helpful', feedbackComment: string) => {
    setIsSubmitting(true);

    try {
      const response = await api.submitFeedback({
        workspace_id: workspaceId,
        preview_id: messageId,
        query: query,
        mode: mode,
        rating: feedbackRating,
        comment: feedbackComment || undefined,
        executed_actions: executedActions
      });

      if (response.success) {
        toast({
          title: "Thank you!",
          description: "Your feedback helps improve the AI.",
        });

        onFeedbackSubmitted?.(feedbackRating);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive"
      });
      setRating(null); // Reset on error
    } finally {
      setIsSubmitting(false);
      setShowCommentDialog(false);
      setComment('');
    }
  };

  const handleCommentSubmit = () => {
    if (rating) {
      submitFeedback(rating, comment);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-muted-foreground">Was this helpful?</span>
        
        <Button
          size="sm"
          variant={rating === 'helpful' ? 'default' : 'ghost'}
          onClick={() => handleFeedback('helpful')}
          disabled={rating !== null || isSubmitting}
          className="h-7 px-2"
        >
          <ThumbsUp className={`w-3.5 h-3.5 ${rating === 'helpful' ? 'fill-current' : ''}`} />
        </Button>

        <Button
          size="sm"
          variant={rating === 'not_helpful' ? 'default' : 'ghost'}
          onClick={() => handleFeedback('not_helpful', true)}
          disabled={rating !== null || isSubmitting}
          className="h-7 px-2"
        >
          <ThumbsDown className={`w-3.5 h-3.5 ${rating === 'not_helpful' ? 'fill-current' : ''}`} />
        </Button>

        {rating && (
          <span className="text-xs text-muted-foreground ml-2">
            Thanks for your feedback!
          </span>
        )}
      </div>

      {/* Comment Dialog */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Help us improve</DialogTitle>
            <DialogDescription>
              What could have been better? (Optional)
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="Tell us what went wrong or what you expected..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="resize-none"
          />

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowCommentDialog(false);
                if (rating) {
                  submitFeedback(rating, '');
                }
              }}
            >
              Skip
            </Button>
            <Button
              onClick={handleCommentSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
