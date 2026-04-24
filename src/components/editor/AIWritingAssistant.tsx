import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Wand2, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface Suggestion {
  type: 'grammar' | 'spelling' | 'style' | 'clarity';
  text: string;
  suggestion: string;
  reason: string;
}

interface AIWritingAssistantProps {
  content: string;
  selectedText?: string;
  onApplySuggestion: (newText: string) => void;
}

export function AIWritingAssistant({ 
  content, 
  selectedText, 
  onApplySuggestion 
}: AIWritingAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'actions'>('suggestions');

  const analyzText = async () => {
    setLoading(true);
    try {
      const textToAnalyze = selectedText || content.replace(/<[^>]*>/g, ' ').trim();
      
      const prompt = `Analyze this text and provide suggestions for improvement. Focus on grammar, spelling, style, and clarity. Return a JSON array of suggestions with format: [{"type": "grammar|spelling|style|clarity", "text": "original text", "suggestion": "improved text", "reason": "explanation"}]. Text: ${textToAnalyze.substring(0, 1000)}`;
      
      const result = await api.query(prompt, 'ask', 'all', 'gpt-4o-mini', null);
      
      // Try to parse JSON from response
      try {
        const jsonMatch = result.response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setSuggestions(parsed.slice(0, 5)); // Limit to 5 suggestions
        } else {
          toast.info('No specific suggestions found');
        }
      } catch {
        toast.info('Analysis complete - text looks good!');
      }
    } catch (error: any) {
      toast.error('Failed to analyze text');
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      id: 'improve',
      label: 'Improve Writing',
      icon: Wand2,
      description: 'Enhance clarity and flow',
      action: async () => {
        setLoading(true);
        try {
          const text = selectedText || content.replace(/<[^>]*>/g, ' ').trim();
          const result = await api.query(
            `Improve this text. Return ONLY the improved text: ${text.substring(0, 500)}`,
            'ask',
            'all',
            'gpt-4o-mini',
            null
          );
          onApplySuggestion(result.response.replace(/\*\*/g, '').replace(/###?\s/g, ''));
          toast.success('Text improved!');
        } catch (error) {
          toast.error('Failed to improve text');
        } finally {
          setLoading(false);
        }
      },
    },
    {
      id: 'simplify',
      label: 'Simplify',
      icon: CheckCircle2,
      description: 'Make it easier to understand',
      action: async () => {
        setLoading(true);
        try {
          const text = selectedText || content.replace(/<[^>]*>/g, ' ').trim();
          const result = await api.query(
            `Simplify this text. Return ONLY the simplified text: ${text.substring(0, 500)}`,
            'ask',
            'all',
            'gpt-4o-mini',
            null
          );
          onApplySuggestion(result.response.replace(/\*\*/g, '').replace(/###?\s/g, ''));
          toast.success('Text simplified!');
        } catch (error) {
          toast.error('Failed to simplify text');
        } finally {
          setLoading(false);
        }
      },
    },
    {
      id: 'expand',
      label: 'Expand',
      icon: Sparkles,
      description: 'Add more detail',
      action: async () => {
        setLoading(true);
        try {
          const text = selectedText || content.replace(/<[^>]*>/g, ' ').trim();
          const result = await api.query(
            `Expand on this text with more details. Return ONLY the expanded text: ${text.substring(0, 500)}`,
            'ask',
            'all',
            'gpt-4o-mini',
            null
          );
          onApplySuggestion(result.response.replace(/\*\*/g, '').replace(/###?\s/g, ''));
          toast.success('Text expanded!');
        } catch (error) {
          toast.error('Failed to expand text');
        } finally {
          setLoading(false);
        }
      },
    },
    {
      id: 'tone',
      label: 'Adjust Tone',
      icon: Wand2,
      description: 'Change writing style',
      action: async () => {
        setLoading(true);
        try {
          const text = selectedText || content.replace(/<[^>]*>/g, ' ').trim();
          const result = await api.query(
            `Make this text more professional and formal. Return ONLY the adjusted text: ${text.substring(0, 500)}`,
            'ask',
            'all',
            'gpt-4o-mini',
            null
          );
          onApplySuggestion(result.response.replace(/\*\*/g, '').replace(/###?\s/g, ''));
          toast.success('Tone adjusted!');
        } catch (error) {
          toast.error('Failed to adjust tone');
        } finally {
          setLoading(false);
        }
      },
    },
  ];

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setIsOpen(true);
          if (suggestions.length === 0) {
            analyzText();
          }
        }}
        className="rounded-lg"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        AI Assistant
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="bg-card border border-border rounded-xl shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">AI Writing Assistant</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('suggestions')}
          className={cn(
            "flex-1 px-4 py-2 text-sm font-medium transition-colors",
            activeTab === 'suggestions'
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Suggestions
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          className={cn(
            "flex-1 px-4 py-2 text-sm font-medium transition-colors",
            activeTab === 'actions'
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Quick Actions
        </button>
      </div>

      {/* Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {!loading && activeTab === 'suggestions' && (
          <div className="space-y-3">
            {suggestions.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No suggestions - your writing looks great!
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={analyzText}
                  className="mt-4"
                >
                  Analyze Again
                </Button>
              </div>
            ) : (
              suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-3 bg-background border border-border rounded-lg"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        {suggestion.type}
                      </span>
                      <p className="text-sm text-foreground mt-1">
                        {suggestion.reason}
                      </p>
                    </div>
                  </div>
                  <div className="pl-6 space-y-2">
                    <div>
                      <span className="text-xs text-muted-foreground">Original:</span>
                      <p className="text-sm text-foreground line-through">
                        {suggestion.text}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Suggestion:</span>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {suggestion.suggestion}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onApplySuggestion(suggestion.suggestion)}
                      className="mt-2"
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!loading && activeTab === 'actions' && (
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={action.action}
                  disabled={loading}
                  className="p-3 bg-background border border-border rounded-lg hover:border-primary transition-colors text-left disabled:opacity-50"
                >
                  <Icon className="w-5 h-5 text-primary mb-2" />
                  <p className="text-sm font-medium text-foreground mb-1">
                    {action.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
