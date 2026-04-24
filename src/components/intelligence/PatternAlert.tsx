import { motion } from 'framer-motion';
import { 
  AlertTriangle, TrendingDown, Clock, Brain, 
  FileText, Zap, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Pattern } from '@/stores/intelligenceStore';

interface PatternAlertProps {
  pattern: Pattern;
  onAction?: () => void;
}

const patternConfig: Record<string, {
  icon: typeof AlertTriangle;
  title: string;
  color: string;
  bg: string;
}> = {
  stalled_tasks: {
    icon: Clock,
    title: 'Stalled Tasks Detected',
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
  },
  skill_bottleneck: {
    icon: Brain,
    title: 'Skill Bottleneck',
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
  },
  neglected_pages: {
    icon: FileText,
    title: 'Neglected Pages',
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
  },
  overload: {
    icon: Zap,
    title: 'Overload Warning',
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
  },
  momentum: {
    icon: TrendingDown,
    title: 'Momentum Drop',
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800'
  }
};

export function PatternAlert({ pattern, onAction }: PatternAlertProps) {
  const config = patternConfig[pattern.type] || {
    icon: AlertTriangle,
    title: pattern.type,
    color: 'text-muted-foreground',
    bg: 'bg-secondary border-border'
  };
  const Icon = config.icon;

  const getDescription = () => {
    switch (pattern.type) {
      case 'stalled_tasks':
        return `${pattern.data?.count || 0} tasks haven't progressed in over a week`;
      case 'skill_bottleneck':
        const bottlenecks = pattern.data?.bottlenecks || [];
        if (bottlenecks.length > 0) {
          return `"${bottlenecks[0].skill?.name}" is blocking ${bottlenecks[0].blocked_tasks} tasks`;
        }
        return 'Some skills are blocking task progress';
      case 'neglected_pages':
        return `${pattern.data?.count || 0} pages haven't been updated in 30+ days`;
      case 'overload':
        return `${pattern.data?.urgent_tasks || 0} urgent tasks need attention`;
      default:
        return 'Pattern detected in your workspace';
    }
  };

  const getActionLabel = () => {
    switch (pattern.type) {
      case 'stalled_tasks':
        return 'Review Tasks';
      case 'skill_bottleneck':
        return 'Focus on Skill';
      case 'neglected_pages':
        return 'Review Pages';
      case 'overload':
        return 'Prioritize';
      default:
        return 'Take Action';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'p-4 rounded-xl border',
        config.bg
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg bg-white/50 dark:bg-black/20', config.color)}>
          <Icon className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm">{config.title}</h4>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              pattern.severity === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
              pattern.severity === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
              'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
            )}>
              {pattern.severity}
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground mb-3">
            {getDescription()}
          </p>
          
          {onAction && (
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={onAction}
            >
              {getActionLabel()}
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
