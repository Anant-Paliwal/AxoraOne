import { motion } from 'framer-motion';
import { 
  Link2, FileText, CheckSquare, Brain, Sparkles,
  Check, X, Undo2, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ProposedAction } from '@/stores/intelligenceStore';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProposedActionCardProps {
  action: ProposedAction;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

const actionTypeConfig: Record<string, { icon: typeof Link2; label: string; color: string }> = {
  link_page_to_skill: {
    icon: Link2,
    label: 'Link Page to Skill',
    color: 'text-blue-500'
  },
  extract_tasks: {
    icon: CheckSquare,
    label: 'Extract Tasks',
    color: 'text-green-500'
  },
  create_task: {
    icon: CheckSquare,
    label: 'Create Task',
    color: 'text-purple-500'
  },
  update_priority: {
    icon: Sparkles,
    label: 'Update Priority',
    color: 'text-amber-500'
  },
  create_page: {
    icon: FileText,
    label: 'Create Page',
    color: 'text-indigo-500'
  },
  suggest_skill: {
    icon: Brain,
    label: 'Suggest Skill',
    color: 'text-pink-500'
  }
};

const trustLevelLabels: Record<number, string> = {
  1: 'Read Only',
  2: 'Suggest',
  3: 'Act',
  4: 'Autonomous'
};

export function ProposedActionCard({ action, onApprove, onReject }: ProposedActionCardProps) {
  const config = actionTypeConfig[action.action_type] || {
    icon: Sparkles,
    label: action.action_type,
    color: 'text-muted-foreground'
  };
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg bg-secondary', config.color)}>
          <Icon className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm">{config.label}</h4>
            {action.reversible && (
              <Tooltip>
                <TooltipTrigger>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Undo2 className="w-3 h-3" />
                    Reversible
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  This action can be undone
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground mb-2">
            {action.reason}
          </p>
          
          {action.expected_impact && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
              <Info className="w-3.5 h-3.5" />
              <span>{action.expected_impact}</span>
            </div>
          )}
          
          {/* Show payload details */}
          {action.payload && Object.keys(action.payload).length > 0 && (
            <div className="text-xs bg-secondary/50 rounded-md p-2 mb-3">
              {action.payload.skill_name && (
                <span className="inline-flex items-center gap-1 mr-2">
                  <Brain className="w-3 h-3" />
                  {action.payload.skill_name}
                </span>
              )}
              {action.payload.confidence && (
                <span className="text-muted-foreground">
                  ({Math.round(action.payload.confidence * 100)}% confidence)
                </span>
              )}
              {action.payload.title && (
                <span className="inline-flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {action.payload.title}
                </span>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              className="h-8"
              onClick={() => onApprove(action.id)}
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => onReject(action.id)}
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
