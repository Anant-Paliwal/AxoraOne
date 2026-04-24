import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  FileText, 
  CheckSquare, 
  ChevronRight, 
  Loader2,
  Target,
  Brain,
  Layers,
  Trash2,
  Edit,
  Plus,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  activity_type: string;
  entity_type: string;
  entity_id: string;
  action: string;
  details?: any;
  created_at: string;
}

const actionIcons: Record<string, React.ElementType> = {
  create: Plus,
  update: Edit,
  delete: Trash2,
  complete: CheckCircle,
};

const entityIcons: Record<string, React.ElementType> = {
  page: FileText,
  task: CheckSquare,
  skill: Target,
  quiz: Brain,
  flashcard: Layers,
};

const actionColors: Record<string, string> = {
  create: 'text-green-500 bg-green-500/10',
  update: 'text-blue-500 bg-blue-500/10',
  delete: 'text-red-500 bg-red-500/10',
  complete: 'text-purple-500 bg-purple-500/10',
};

export function RecentActivityWidget({ settings }: { settings?: Record<string, any> }) {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentWorkspace) {
      loadActivity();
    }
  }, [currentWorkspace]);

  const loadActivity = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      const data = await api.getRecentActivity(currentWorkspace.id, 10);
      setActivities(data || []);
    } catch (error) {
      console.error('Failed to load activity:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const handleActivityClick = (activity: Activity) => {
    if (activity.entity_type === 'page' && activity.entity_id) {
      navigate(`/workspace/${currentWorkspace?.id}/pages/${activity.entity_id}`);
    } else if (activity.entity_type === 'task') {
      navigate(`/workspace/${currentWorkspace?.id}/tasks`);
    } else if (activity.entity_type === 'skill') {
      navigate(`/workspace/${currentWorkspace?.id}/skills`);
    }
  };

  const handleViewAll = () => {
    navigate(`/workspace/${currentWorkspace?.id}/activity`);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Recent Activity
        </h3>
        <button 
          onClick={handleViewAll}
          className="text-xs text-primary hover:underline"
        >
          View all
        </button>
      </div>
      
      {/* Activity List - Top 5 only */}
      <div className="flex-1 overflow-auto">
        {activities.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {activities.slice(0, 5).map((activity, index) => {
              const entityName = activity.details?.entity_name || activity.entity_type;
              const EntityIcon = entityIcons[activity.entity_type] || FileText;
              const ActionIcon = actionIcons[activity.action] || Edit;
              const colorClass = actionColors[activity.action] || 'text-gray-500 bg-gray-500/10';
              const actionText = activity.action === 'create' ? 'Created' : 
                               activity.action === 'update' ? 'Updated' : 
                               activity.action === 'complete' ? 'Completed' : 
                               activity.action === 'delete' ? 'Deleted' : activity.action;
              
              return (
                <motion.div 
                  key={activity.id} 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => handleActivityClick(activity)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-secondary/30 transition-colors cursor-pointer group border-b border-border/50 last:border-0"
                >
                  {/* Icon */}
                  <div className={cn("w-6 h-6 rounded flex items-center justify-center flex-shrink-0", colorClass)}>
                    <ActionIcon className="w-3 h-3" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">
                      <span className="text-muted-foreground">{actionText}</span>{' '}
                      <span className="font-medium">{entityName}</span>
                    </p>
                  </div>
                  
                  {/* Time & Arrow */}
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {formatTimeAgo(activity.created_at)}
                  </span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </motion.div>
              );
            })}
          </AnimatePresence>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-4">
            <Clock className="w-6 h-6 mb-1 opacity-30" />
            <p className="text-xs">No activity yet</p>
          </div>
        )}
      </div>
      
      {/* Footer - Show count if more than 5 */}
      {activities.length > 5 && (
        <div className="px-3 py-1.5 border-t border-border bg-secondary/20">
          <button 
            onClick={handleViewAll}
            className="w-full text-[10px] text-center text-muted-foreground hover:text-primary transition-colors"
          >
            +{activities.length - 5} more activities
          </button>
        </div>
      )}
    </div>
  );
}
