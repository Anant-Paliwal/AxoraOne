import { motion } from 'framer-motion';
import { 
  Lightbulb, AlertTriangle, Info, X, ChevronRight, 
  Zap, Brain, Target, TrendingUp 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Insight } from '@/stores/intelligenceStore';

interface InsightCardProps {
  insight: Insight;
  onDismiss: (id: string) => void;
  onAction: (id: string, actionIndex: number) => void;
  compact?: boolean;
}

const severityConfig = {
  info: {
    icon: Info,
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    iconColor: 'text-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
  },
  critical: {
    icon: Zap,
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    iconColor: 'text-red-500',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
  }
};

const insightTypeIcons: Record<string, typeof Lightbulb> = {
  next_action: Target,
  skill_unlocked: Brain,
  pattern_detected: TrendingUp,
  overload: AlertTriangle,
  default: Lightbulb
};

export function InsightCard({ insight, onDismiss, onAction, compact = false }: InsightCardProps) {
  const config = severityConfig[insight.severity] || severityConfig.info;
  const Icon = config.icon;
  const TypeIcon = insightTypeIcons[insight.insight_type] || insightTypeIcons.default;

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border',
          config.bg,
          config.border
        )}
      >
        <div className={cn('p-1.5 rounded-md', config.badge)}>
          <TypeIcon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{insight.title}</p>
        </div>
        {insight.suggested_actions.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={() => onAction(insight.id, 0)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          onClick={() => onDismiss(insight.id)}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'p-4 rounded-xl border',
        config.bg,
        config.border
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg', config.badge)}>
          <Icon className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium">{insight.title}</h4>
            <span className={cn('text-xs px-2 py-0.5 rounded-full', config.badge)}>
              {insight.severity}
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground mb-3">
            {insight.description}
          </p>
          
          {insight.suggested_actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {insight.suggested_actions.map((action, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant={index === 0 ? 'default' : 'outline'}
                  className="h-8"
                  onClick={() => onAction(insight.id, index)}
                >
                  {action.label || action.type}
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              ))}
            </div>
          )}
        </div>
        
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          onClick={() => onDismiss(insight.id)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
