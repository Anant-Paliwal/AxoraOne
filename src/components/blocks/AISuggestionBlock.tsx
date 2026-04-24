import { useState } from 'react';
import { Sparkles, Check, X, RefreshCw, Loader2, Wand2, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Block } from './types';

interface AISuggestionBlockProps {
  block: Block;
  editable: boolean;
  onUpdate: (data: any) => void;
  onDelete?: () => void;
}

export function AISuggestionBlockComponent({ block, editable, onUpdate, onDelete }: AISuggestionBlockProps) {
  const [suggestion, setSuggestion] = useState(block.data?.suggestion || '');
  const [originalContent, setOriginalContent] = useState(block.data?.originalContent || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isAccepted, setIsAccepted] = useState(block.data?.accepted || false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [suggestionType, setSuggestionType] = useState<'improve' | 'expand' | 'simplify' | 'summarize'>(
    block.data?.suggestionType || 'improve'
  );

  const generateSuggestion = async (type: 'improve' | 'expand' | 'simplify' | 'summarize') => {
    if (!originalContent.trim()) {
      toast.error('Please add some content first');
      return;
    }

    setIsLoading(true);
    setSuggestionType(type);

    try {
      const prompts = {
        improve: `Improve the following text, making it clearer and more professional:\n\n${originalContent}`,
        expand: `Expand on the following text with more details and examples:\n\n${originalContent}`,
        simplify: `Simplify the following text, making it easier to understand:\n\n${originalContent}`,
        summarize: `Summarize the following text in a concise way:\n\n${originalContent}`
      };

      const response = await api.query(prompts[type], 'quick');

      const newSuggestion = response.response || response.message || '';
      setSuggestion(newSuggestion);
      onUpdate({ 
        suggestion: newSuggestion, 
        originalContent, 
        suggestionType: type,
        accepted: false 
      });
    } catch (error) {
      console.error('AI suggestion error:', error);
      toast.error('Failed to generate suggestion');
    } finally {
      setIsLoading(false);
    }
  };

  const acceptSuggestion = () => {
    setIsAccepted(true);
    onUpdate({ 
      suggestion, 
      originalContent, 
      suggestionType,
      accepted: true 
    });
    toast.success('Suggestion accepted! You can copy it to use.');
  };

  const rejectSuggestion = () => {
    setSuggestion('');
    setIsAccepted(false);
    onUpdate({ 
      suggestion: '', 
      originalContent, 
      suggestionType,
      accepted: false 
    });
  };

  const copySuggestion = () => {
    navigator.clipboard.writeText(suggestion);
    toast.success('Copied to clipboard');
  };

  return (
    <div className={cn(
      "my-2 border rounded-lg overflow-hidden",
      isAccepted 
        ? "border-green-500/30 bg-green-500/5" 
        : "border-purple-500/30 bg-purple-500/5"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Sparkles className={cn(
            "w-4 h-4",
            isAccepted ? "text-green-500" : "text-purple-500"
          )} />
          <span className="font-medium text-sm">AI Suggestion</span>
          {isAccepted && (
            <span className="text-xs text-green-600 bg-green-500/10 px-2 py-0.5 rounded">
              Accepted
            </span>
          )}
        </div>
        {editable && onDelete && (
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-7 w-7 p-0 text-destructive">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Original Content Input */}
        {editable && !suggestion && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Enter content to improve:
            </label>
            <textarea
              value={originalContent}
              onChange={e => {
                setOriginalContent(e.target.value);
                onUpdate({ ...block.data, originalContent: e.target.value });
              }}
              placeholder="Paste or type the content you want AI to improve..."
              className="w-full min-h-[100px] p-3 rounded-lg border border-border bg-background resize-none outline-none focus:ring-2 focus:ring-primary/20"
            />
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => generateSuggestion('improve')}
                disabled={isLoading || !originalContent.trim()}
                className="gap-2"
              >
                {isLoading && suggestionType === 'improve' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                Improve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => generateSuggestion('expand')}
                disabled={isLoading || !originalContent.trim()}
              >
                {isLoading && suggestionType === 'expand' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  '📝'
                )}
                Expand
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => generateSuggestion('simplify')}
                disabled={isLoading || !originalContent.trim()}
              >
                {isLoading && suggestionType === 'simplify' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  '✨'
                )}
                Simplify
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => generateSuggestion('summarize')}
                disabled={isLoading || !originalContent.trim()}
              >
                {isLoading && suggestionType === 'summarize' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  '📋'
                )}
                Summarize
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 text-purple-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">AI is thinking...</span>
            </div>
          </div>
        )}

        {/* Suggestion Display */}
        {suggestion && !isLoading && (
          <div className="space-y-3">
            {/* Show Original Toggle */}
            {originalContent && (
              <button
                onClick={() => setShowOriginal(!showOriginal)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
              >
                {showOriginal ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showOriginal ? 'Hide original' : 'Show original'}
              </button>
            )}

            {showOriginal && originalContent && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                <p className="text-xs font-medium mb-1">Original:</p>
                {originalContent}
              </div>
            )}

            {/* Suggestion */}
            <div className="p-3 rounded-lg bg-background border border-border">
              <p className="text-xs font-medium text-purple-500 mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {suggestionType === 'improve' && 'Improved version:'}
                {suggestionType === 'expand' && 'Expanded version:'}
                {suggestionType === 'simplify' && 'Simplified version:'}
                {suggestionType === 'summarize' && 'Summary:'}
              </p>
              <p className="text-sm whitespace-pre-wrap">{suggestion}</p>
            </div>

            {/* Action Buttons */}
            {editable && !isAccepted && (
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={acceptSuggestion} className="gap-2">
                  <Check className="w-4 h-4" />
                  Accept
                </Button>
                <Button size="sm" variant="outline" onClick={copySuggestion} className="gap-2">
                  <Copy className="w-4 h-4" />
                  Copy
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => generateSuggestion(suggestionType)}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </Button>
                <Button size="sm" variant="ghost" onClick={rejectSuggestion} className="gap-2 text-destructive">
                  <X className="w-4 h-4" />
                  Discard
                </Button>
              </div>
            )}

            {isAccepted && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={copySuggestion} className="gap-2">
                  <Copy className="w-4 h-4" />
                  Copy to use
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
