import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Type,
  Bold,
  Italic,
  Underline,
  Link,
  Strikethrough,
  Code,
  MoreHorizontal,
  MessageSquare,
  Pencil,
  SpellCheck,
  HelpCircle,
  Sparkles,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface TextSelectionToolbarProps {
  containerRef: React.RefObject<HTMLElement>;
  onFormat?: (format: string, value?: any) => void;
  onAIAction?: (action: string, selectedText: string, result: string) => void;
  onOpenAskAnything?: (query: string, context?: string) => void;
  onReplaceText?: (oldText: string, newText: string) => void;
}

export function TextSelectionToolbar({ containerRef, onFormat, onAIAction, onOpenAskAnything, onReplaceText }: TextSelectionToolbarProps) {
  const { currentWorkspace } = useWorkspace();
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [activeInput, setActiveInput] = useState<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const handleSelectionChange = useCallback(() => {
    // First check for textarea/input selection
    const activeElement = document.activeElement;
    
    if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
      const input = activeElement as HTMLTextAreaElement | HTMLInputElement;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      
      if (start !== end) {
        const text = input.value.substring(start, end).trim();
        
        if (text.length >= 2) {
          // Check if within container
          if (containerRef.current && !containerRef.current.contains(input)) {
            setIsVisible(false);
            return;
          }
          
          setSelectedText(text);
          setSelectionRange({ start, end });
          setActiveInput(input);
          
          // Get position - LEFT side of the input element
          const rect = input.getBoundingClientRect();
          
          setPosition({
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX - 220 // Position to the LEFT
          });
          
          setIsVisible(true);
          setAiResult('');
          setActiveAction(null);
          return;
        }
      }
    }
    
    // Fall back to regular DOM selection
    const selection = window.getSelection();
    
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setIsVisible(false);
      setAiResult('');
      setActiveAction(null);
      return;
    }

    // Check if selection is within our container
    if (containerRef.current) {
      const range = selection.getRangeAt(0);
      if (!containerRef.current.contains(range.commonAncestorContainer)) {
        setIsVisible(false);
        return;
      }
    }

    const text = selection.toString().trim();
    if (text.length < 2) {
      setIsVisible(false);
      return;
    }

    setSelectedText(text);

    // Get position - LEFT side of selection
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    setPosition({
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX - 220 // Position to the LEFT
    });
    
    setIsVisible(true);
    setAiResult('');
    setActiveAction(null);
  }, [containerRef]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mouseup', handleSelectionChange);
    document.addEventListener('keyup', handleSelectionChange);
    
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleSelectionChange);
      document.removeEventListener('keyup', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
          const input = activeElement as HTMLTextAreaElement | HTMLInputElement;
          if (input.selectionStart !== input.selectionEnd) return;
        }
        
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) return;
        
        setIsVisible(false);
        setAiResult('');
        setActiveAction(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFormat = (format: string) => {
    onFormat?.(format);
  };

  // Use the same API as FloatingAskAnything
  const handleAIAction = async (action: string) => {
    if (!selectedText) return;
    
    setIsLoading(true);
    setActiveAction(action);
    setAiResult('');
    
    try {
      // Build the query based on action
      const queries: Record<string, string> = {
        improve: `Improve this text, making it clearer and more professional. Only return the improved text:\n\n"${selectedText}"`,
        proofread: `Proofread and fix any grammar, spelling, or punctuation errors. Only return the corrected text:\n\n"${selectedText}"`,
        explain: `Explain this text in simple terms:\n\n"${selectedText}"`,
        summarize: `Summarize this text briefly:\n\n"${selectedText}"`,
        expand: `Expand on this text with more details:\n\n"${selectedText}"`,
      };

      const query = queries[action] || queries.improve;
      
      // Use the same API as FloatingAskAnything (queryEnhanced or query)
      const result = await api.queryEnhanced(
        query,
        'ask', // mode
        currentWorkspace?.id,
        [], // mentioned items
        undefined // session id
      ).catch(async () => {
        // Fallback to regular query
        return api.query(query, 'ask');
      });
      
      const responseText = result.response || result.text || '';
      setAiResult(responseText);
      onAIAction?.(action, selectedText, responseText);
      
    } catch (error) {
      console.error('AI action error:', error);
      toast.error('Failed to process with AI');
    } finally {
      setIsLoading(false);
    }
  };

  const copyResult = () => {
    navigator.clipboard.writeText(aiResult);
    toast.success('Copied to clipboard');
  };

  const replaceWithResult = () => {
    // Try to replace in the active input/textarea
    if (activeInput && selectionRange) {
      const { start, end } = selectionRange;
      const currentValue = activeInput.value;
      const newValue = currentValue.substring(0, start) + aiResult + currentValue.substring(end);
      
      // Update the input value
      activeInput.value = newValue;
      
      // Trigger input event so React state updates
      const event = new Event('input', { bubbles: true });
      activeInput.dispatchEvent(event);
      
      // Also trigger change event
      const changeEvent = new Event('change', { bubbles: true });
      activeInput.dispatchEvent(changeEvent);
      
      toast.success('Text replaced');
    } else {
      // Fallback: try to use document.execCommand for contenteditable
      try {
        document.execCommand('insertText', false, aiResult);
        toast.success('Text replaced');
      } catch (e) {
        // If that fails, call the callback
        onReplaceText?.(selectedText, aiResult);
        onAIAction?.('replace', selectedText, aiResult);
      }
    }
    
    setIsVisible(false);
    setAiResult('');
    setSelectionRange(null);
    setActiveInput(null);
  };

  // Open Ask Anything with the selected text as context and trigger search
  const openAskAnything = () => {
    const queryText = `Explain this: "${selectedText.substring(0, 200)}${selectedText.length > 200 ? '...' : ''}"`;
    
    // Trigger the floating Ask Anything button click
    const askAnythingButton = document.querySelector('[title="Ask Anything"]') as HTMLButtonElement;
    if (askAnythingButton) {
      askAnythingButton.click();
      
      // After a short delay, set the query and trigger search
      setTimeout(() => {
        const askInput = document.querySelector('input[placeholder*="Ask"], input[placeholder*="ask"], input[placeholder*="Search"]') as HTMLInputElement;
        if (askInput) {
          // Set the value using native setter to trigger React state
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(askInput, queryText);
          }
          
          // Trigger input event
          const inputEvent = new Event('input', { bubbles: true });
          askInput.dispatchEvent(inputEvent);
          
          // Focus the input
          askInput.focus();
          
          // After another delay, trigger Enter key to search
          setTimeout(() => {
            const enterEvent = new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              which: 13,
              bubbles: true
            });
            askInput.dispatchEvent(enterEvent);
          }, 200);
        }
      }, 400);
    }
    
    onOpenAskAnything?.(queryText, selectedText);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 animate-in fade-in-0 slide-in-from-right-2 duration-150"
      style={{
        top: position.top,
        left: Math.max(10, position.left)
      }}
    >
      {/* Notion-style vertical toolbar on LEFT side */}
      <div className="flex flex-col bg-popover border border-border rounded-lg shadow-xl overflow-hidden w-[200px]">
        {/* Formatting Row */}
        <div className="flex items-center gap-0.5 p-1.5 border-b border-border">
          <button
            onClick={() => handleFormat('turnInto')}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="Turn into"
          >
            <Type className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleFormat('bold')}
            className="p-1.5 rounded hover:bg-accent transition-colors font-bold text-sm"
            title="Bold"
          >
            B
          </button>
          <button
            onClick={() => handleFormat('italic')}
            className="p-1.5 rounded hover:bg-accent transition-colors italic text-sm"
            title="Italic"
          >
            I
          </button>
          <button
            onClick={() => handleFormat('underline')}
            className="p-1.5 rounded hover:bg-accent transition-colors underline text-sm"
            title="Underline"
          >
            U
          </button>
          
          <div className="w-px h-5 bg-border mx-0.5" />
          
          <button
            onClick={() => handleFormat('link')}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="Link"
          >
            <Link className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleFormat('strikethrough')}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleFormat('code')}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="Code"
          >
            <Code className="w-4 h-4" />
          </button>
          
          <div className="w-px h-5 bg-border mx-0.5" />
          
          <button
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="More"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Comment */}
        <button
          onClick={() => handleFormat('comment')}
          className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-3 border-b border-border"
        >
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <span>Comment</span>
        </button>

        {/* AI Actions */}
        {isLoading ? (
          <div className="flex items-center gap-2 px-3 py-3">
            <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
            <span className="text-sm text-muted-foreground">Processing...</span>
          </div>
        ) : aiResult ? (
          <div className="p-3 space-y-2 border-t border-border">
            <p className="text-xs text-muted-foreground font-medium">AI Result:</p>
            <p className="text-sm bg-muted/50 p-2 rounded max-h-32 overflow-y-auto whitespace-pre-wrap">{aiResult}</p>
            <div className="flex gap-2">
              <button
                onClick={copyResult}
                className="flex-1 px-2 py-1.5 text-xs bg-secondary hover:bg-secondary/80 rounded font-medium"
              >
                Copy
              </button>
              <button
                onClick={replaceWithResult}
                className="flex-1 px-2 py-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded font-medium"
              >
                Replace
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={() => handleAIAction('improve')}
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-3"
            >
              <Pencil className="w-4 h-4 text-muted-foreground" />
              <span>Improve writing</span>
            </button>
            <button
              onClick={() => handleAIAction('proofread')}
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-3"
            >
              <SpellCheck className="w-4 h-4 text-muted-foreground" />
              <span>Proofread</span>
            </button>
            <button
              onClick={() => handleAIAction('explain')}
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-3"
            >
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
              <span>Explain</span>
            </button>
            <button
              onClick={openAskAnything}
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-3 border-t border-border"
            >
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>Ask AI...</span>
              <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
