import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Check, FileText, Brain, ListTodo, HelpCircle, Layers, 
  ChevronDown, ChevronUp, AlertTriangle, Loader2, Undo2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PreviewAction {
  id: string;
  type: 'page' | 'skill' | 'task' | 'quiz' | 'flashcard';
  operation: 'create' | 'update' | 'delete';
  title: string;
  preview: string;
  data: any;
  selected: boolean;
}

export interface ActionPreview {
  preview_id: string;
  mode: string;
  query: string;
  response: string;
  actions: PreviewAction[];
  sources: any[];
  suggested_actions: any[];
}

interface ActionPreviewDialogProps {
  preview: ActionPreview | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedActions: string[]) => Promise<any>;
  onSkip: () => void;
  isExecuting: boolean;
}

const typeIcons = {
  page: FileText,
  skill: Brain,
  task: ListTodo,
  quiz: HelpCircle,
  flashcard: Layers,
};

const operationColors = {
  create: 'text-green-500 bg-green-500/10',
  update: 'text-blue-500 bg-blue-500/10',
  delete: 'text-red-500 bg-red-500/10',
};

const operationLabels = {
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
};

export function ActionPreviewDialog({
  preview,
  isOpen,
  onClose,
  onConfirm,
  onSkip,
  isExecuting
}: ActionPreviewDialogProps) {
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());

  // Initialize selected actions when preview changes
  useState(() => {
    if (preview?.actions) {
      setSelectedActions(new Set(preview.actions.map(a => a.id)));
    }
  });

  if (!isOpen || !preview) return null;

  const toggleAction = (actionId: string) => {
    const newSelected = new Set(selectedActions);
    if (newSelected.has(actionId)) {
      newSelected.delete(actionId);
    } else {
      newSelected.add(actionId);
    }
    setSelectedActions(newSelected);
  };

  const toggleExpand = (actionId: string) => {
    const newExpanded = new Set(expandedActions);
    if (newExpanded.has(actionId)) {
      newExpanded.delete(actionId);
    } else {
      newExpanded.add(actionId);
    }
    setExpandedActions(newExpanded);
  };

  const selectAll = () => {
    setSelectedActions(new Set(preview.actions.map(a => a.id)));
  };

  const selectNone = () => {
    setSelectedActions(new Set());
  };

  const handleConfirm = async () => {
    await onConfirm(Array.from(selectedActions));
  };

  const groupedActions = preview.actions.reduce((acc, action) => {
    if (!acc[action.operation]) {
      acc[action.operation] = [];
    }
    acc[action.operation].push(action);
    return acc;
  }, {} as Record<string, PreviewAction[]>);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Review Actions</h2>
                  <p className="text-sm text-muted-foreground">
                    {preview.mode.toUpperCase()} mode wants to perform {preview.actions.length} action{preview.actions.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* AI Response Preview */}
          <div className="p-4 border-b border-border bg-muted/10">
            <p className="text-sm text-muted-foreground mb-1">AI Response:</p>
            <p className="text-sm line-clamp-3">{preview.response}</p>
          </div>

          {/* Actions List */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Selection Controls */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">
                {selectedActions.size} of {preview.actions.length} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs text-primary hover:underline"
                >
                  Select All
                </button>
                <span className="text-muted-foreground">|</span>
                <button
                  onClick={selectNone}
                  className="text-xs text-primary hover:underline"
                >
                  Select None
                </button>
              </div>
            </div>

            {/* Grouped Actions */}
            {Object.entries(groupedActions).map(([operation, actions]) => (
              <div key={operation} className="mb-4">
                <h3 className={cn(
                  "text-sm font-medium mb-2 px-2 py-1 rounded-lg inline-block",
                  operationColors[operation as keyof typeof operationColors]
                )}>
                  {operationLabels[operation as keyof typeof operationLabels]} ({actions.length})
                </h3>
                
                <div className="space-y-2">
                  {actions.map((action) => {
                    const Icon = typeIcons[action.type];
                    const isSelected = selectedActions.has(action.id);
                    const isExpanded = expandedActions.has(action.id);

                    return (
                      <div
                        key={action.id}
                        className={cn(
                          "border rounded-xl transition-all",
                          isSelected 
                            ? "border-primary/50 bg-primary/5" 
                            : "border-border bg-card hover:border-border/80"
                        )}
                      >
                        <div className="p-3 flex items-start gap-3">
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleAction(action.id)}
                            className={cn(
                              "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
                              isSelected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/30 hover:border-primary/50"
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </button>

                          {/* Icon */}
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                            operationColors[action.operation]
                          )}>
                            <Icon className="w-4 h-4" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{action.title}</span>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                {action.type}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {action.preview}
                            </p>
                          </div>

                          {/* Expand Button */}
                          <button
                            onClick={() => toggleExpand(action.id)}
                            className="p-1 hover:bg-secondary rounded transition-colors flex-shrink-0"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {/* Expanded Details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-3 pb-3 pt-0 ml-16">
                                <div className="p-3 bg-muted/50 rounded-lg">
                                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                                    {JSON.stringify(action.data, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {preview.actions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No actions to preview</p>
                <p className="text-sm mt-1">The AI response doesn't require any changes to your workspace</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={onSkip}
              disabled={isExecuting}
              className="gap-2"
            >
              <Undo2 className="w-4 h-4" />
              Skip Actions
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isExecuting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={selectedActions.size === 0 || isExecuting}
                className="gap-2 min-w-[140px]"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirm ({selectedActions.size})
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
