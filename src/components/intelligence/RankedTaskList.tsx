import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  CheckSquare, Clock, AlertTriangle, Target, 
  ChevronRight, Zap, Brain, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RankedTask } from '@/stores/intelligenceStore';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RankedTaskListProps {
  tasks: RankedTask[];
  workspaceId: string;
  showReason?: boolean;
  limit?: number;
}

const priorityColors = {
  low: 'text-muted-foreground',
  medium: 'text-amber-500',
  high: 'text-red-500'
};

const statusIcons = {
  'todo': CheckSquare,
  'in-progress': Clock,
  'blocked': AlertTriangle,
  'done': CheckSquare
};

function getScoreColor(score: number): string {
  if (score >= 6) return 'bg-red-500';
  if (score >= 4) return 'bg-amber-500';
  if (score >= 2) return 'bg-blue-500';
  return 'bg-muted';
}

function formatDueDate(dateStr?: string): { text: string; urgent: boolean } {
  if (!dateStr) return { text: '', urgent: false };
  
  const date = new Date(dateStr);
  if (isToday(date)) return { text: 'Today', urgent: true };
  if (isTomorrow(date)) return { text: 'Tomorrow', urgent: false };
  if (isPast(date)) return { text: 'Overdue', urgent: true };
  return { text: format(date, 'MMM d'), urgent: false };
}

export function RankedTaskList({ 
  tasks, 
  workspaceId, 
  showReason = true,
  limit = 5 
}: RankedTaskListProps) {
  const navigate = useNavigate();
  const displayTasks = tasks.slice(0, limit);

  if (displayTasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Target className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p>No active tasks</p>
        <p className="text-sm">Create a task to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayTasks.map((task, index) => {
        const StatusIcon = statusIcons[task.status as keyof typeof statusIcons] || CheckSquare;
        const dueInfo = formatDueDate(task.due_date);
        const score = task.calculated_priority?.score || 0;
        
        return (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              'group flex items-center gap-3 p-3 rounded-lg border bg-card',
              'hover:bg-accent/50 transition-all cursor-pointer'
            )}
            onClick={() => navigate(`/workspace/${workspaceId}/tasks`)}
          >
            {/* Priority Score Indicator */}
            <Tooltip>
              <TooltipTrigger>
                <div className={cn(
                  'w-2 h-8 rounded-full',
                  getScoreColor(score)
                )} />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <div className="text-xs space-y-1">
                  <p className="font-medium">Priority Score: {score.toFixed(1)}</p>
                  {task.calculated_priority?.factors && (
                    <div className="text-muted-foreground">
                      <p>Base: {task.calculated_priority.factors.base}</p>
                      <p>Urgency: +{task.calculated_priority.factors.urgency}</p>
                      <p>Skill Impact: +{task.calculated_priority.factors.skill_bottleneck.toFixed(1)}</p>
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
            
            {/* Status Icon */}
            <StatusIcon className={cn(
              'w-4 h-4 flex-shrink-0',
              task.status === 'blocked' ? 'text-red-500' : 
              task.status === 'in-progress' ? 'text-amber-500' : 
              'text-muted-foreground'
            )} />
            
            {/* Task Content */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{task.title}</p>
              
              {showReason && task.calculated_priority?.recommendation && (
                <p className="text-xs text-muted-foreground truncate">
                  {task.calculated_priority.recommendation}
                </p>
              )}
              
              {/* Tags */}
              <div className="flex items-center gap-2 mt-1">
                {task.linked_skill_id && (
                  <span className="inline-flex items-center gap-1 text-xs text-purple-500">
                    <Brain className="w-3 h-3" />
                  </span>
                )}
                {task.linked_page_id && (
                  <span className="inline-flex items-center gap-1 text-xs text-blue-500">
                    <FileText className="w-3 h-3" />
                  </span>
                )}
                {dueInfo.text && (
                  <span className={cn(
                    'text-xs',
                    dueInfo.urgent ? 'text-red-500 font-medium' : 'text-muted-foreground'
                  )}>
                    {dueInfo.text}
                  </span>
                )}
              </div>
            </div>
            
            {/* Score Badge */}
            {score >= 4 && (
              <div className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                score >= 6 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              )}>
                <Zap className="w-3 h-3" />
                {score >= 6 ? 'Critical' : 'High'}
              </div>
            )}
            
            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.div>
        );
      })}
      
      {tasks.length > limit && (
        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={() => navigate(`/workspace/${workspaceId}/tasks`)}
        >
          View all {tasks.length} tasks
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      )}
    </div>
  );
}
