/**
 * Primary Insight Widget
 * 
 * Shows ONE decisive insight with ONE action.
 * Replaces multiple noisy widgets with a single calm voice.
 */

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, TrendingUp, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PrimaryInsight } from '@/lib/intelligenceUtils';

interface PrimaryInsightWidgetProps {
  insight: PrimaryInsight;
  workspaceId: string;
}

export function PrimaryInsightWidget({ insight, workspaceId }: PrimaryInsightWidgetProps) {
  const navigate = useNavigate();

  const handleAction = () => {
    if (insight.actionRoute) {
      navigate(`/workspace/${workspaceId}${insight.actionRoute}`);
    }
  };

  const getIcon = () => {
    switch (insight.type) {
      case 'urgent':
        return AlertTriangle;
      case 'progress':
        return TrendingUp;
      case 'opportunity':
        return Sparkles;
      default:
        return Sparkles;
    }
  };

  const Icon = getIcon();

  const getColorClasses = () => {
    switch (insight.type) {
      case 'urgent':
        return {
          bg: 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          icon: 'text-red-500',
          iconBg: 'bg-red-500/10'
        };
      case 'progress':
        return {
          bg: 'bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20',
          border: 'border-amber-200 dark:border-amber-800',
          icon: 'text-amber-500',
          iconBg: 'bg-amber-500/10'
        };
      case 'opportunity':
        return {
          bg: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          icon: 'text-blue-500',
          iconBg: 'bg-blue-500/10'
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/30 dark:to-gray-900/20',
          border: 'border-gray-200 dark:border-gray-800',
          icon: 'text-gray-500',
          iconBg: 'bg-gray-500/10'
        };
    }
  };

  const colors = getColorClasses();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-6 rounded-2xl border',
        colors.bg,
        colors.border
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn('p-3 rounded-xl', colors.iconBg)}>
          <Icon className={cn('w-6 h-6', colors.icon)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {insight.message}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Next best action
          </p>
          
          <Button
            onClick={handleAction}
            variant="outline"
            size="sm"
            className="rounded-xl"
          >
            {insight.action}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
