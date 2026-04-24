import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  Sparkles, 
  FileText, 
  CheckSquare, 
  ChevronRight, 
  Loader2,
  Target,
  Brain,
  Layers,
  GitBranch,
  Trash2,
  Edit,
  Plus,
  CheckCircle,
  Filter,
  Search,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

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
  view: FileText,
};

const entityIcons: Record<string, React.ElementType> = {
  page: FileText,
  task: CheckSquare,
  skill: Target,
  quiz: Brain,
  flashcard: Layers,
  connection: GitBranch,
  graph_edge: GitBranch,
};

const actionColors: Record<string, string> = {
  create: 'text-green-500 bg-green-500/10 border-green-500/20',
  update: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  delete: 'text-red-500 bg-red-500/10 border-red-500/20',
  complete: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  view: 'text-gray-500 bg-gray-500/10 border-gray-500/20',
};

const entityLabels: Record<string, string> = {
  page: 'Page',
  task: 'Task',
  skill: 'Skill',
  quiz: 'Quiz',
  flashcard: 'Flashcard',
  connection: 'Connection',
  graph_edge: 'Connection',
};

const actionLabels: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  complete: 'Completed',
  view: 'Viewed',
};

export function ActivityPage() {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');

  useEffect(() => {
    if (currentWorkspace) {
      loadActivity();
    }
  }, [currentWorkspace]);

  const loadActivity = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      const data = await api.getRecentActivity(currentWorkspace.id, 100);
      setActivities(data || []);
    } catch (error) {
      console.error('Failed to load activity:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    const entityName = activity.details?.entity_name || '';
    const matchesSearch = searchQuery === '' || 
      entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.entity_type.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || activity.entity_type === filterType;
    const matchesAction = filterAction === 'all' || activity.action === filterAction;
    
    return matchesSearch && matchesType && matchesAction;
  });

  // Group activities by date
  const groupedActivities = filteredActivities.reduce((groups, activity) => {
    const date = format(new Date(activity.created_at), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, Activity[]>);

  const handleActivityClick = (activity: Activity) => {
    if (activity.entity_type === 'page' && activity.entity_id) {
      navigate(`/workspace/${currentWorkspace?.id}/pages/${activity.entity_id}`);
    } else if (activity.entity_type === 'task') {
      navigate(`/workspace/${currentWorkspace?.id}/tasks`);
    } else if (activity.entity_type === 'skill') {
      navigate(`/workspace/${currentWorkspace?.id}/skills`);
    } else if (activity.entity_type === 'quiz' && activity.entity_id) {
      navigate(`/workspace/${currentWorkspace?.id}/quiz/${activity.entity_id}`);
    } else if (activity.entity_type === 'flashcard' && activity.entity_id) {
      navigate(`/workspace/${currentWorkspace?.id}/flashcards/${activity.entity_id}`);
    } else if (activity.entity_type === 'graph_edge' || activity.entity_type === 'connection') {
      navigate(`/workspace/${currentWorkspace?.id}/graph`);
    }
  };

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Today';
    } else if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return 'Yesterday';
    }
    return format(date, 'EEEE, MMMM d, yyyy');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Activity History</h1>
              <p className="text-sm text-muted-foreground">
                All changes and actions in your workspace
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search activity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[130px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="page">Pages</SelectItem>
                <SelectItem value="task">Tasks</SelectItem>
                <SelectItem value="skill">Skills</SelectItem>
                <SelectItem value="quiz">Quizzes</SelectItem>
                <SelectItem value="flashcard">Flashcards</SelectItem>
                <SelectItem value="connection">Connections</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Created</SelectItem>
                <SelectItem value="update">Updated</SelectItem>
                <SelectItem value="delete">Deleted</SelectItem>
                <SelectItem value="complete">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={loadActivity}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <div className="bg-card border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{activities.length}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="bg-card border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-500">
              {activities.filter(a => a.action === 'create').length}
            </div>
            <div className="text-xs text-muted-foreground">Created</div>
          </div>
          <div className="bg-card border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-500">
              {activities.filter(a => a.action === 'update').length}
            </div>
            <div className="text-xs text-muted-foreground">Updated</div>
          </div>
          <div className="bg-card border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-500">
              {activities.filter(a => a.action === 'complete').length}
            </div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="bg-card border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-500">
              {activities.filter(a => a.action === 'delete').length}
            </div>
            <div className="text-xs text-muted-foreground">Deleted</div>
          </div>
        </div>

        {/* Activity Timeline */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Loading activity...</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No activity found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {searchQuery || filterType !== 'all' || filterAction !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Start creating pages, tasks, or skills to see your activity here'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedActivities).map(([date, dayActivities]) => (
              <div key={date}>
                {/* Date Header */}
                <div className="flex items-center gap-3 mb-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-muted-foreground">
                    {formatDateHeader(date)}
                  </h2>
                  <div className="flex-1 h-px bg-border" />
                  <Badge variant="secondary" className="text-xs">
                    {dayActivities.length} {dayActivities.length === 1 ? 'action' : 'actions'}
                  </Badge>
                </div>

                {/* Day's Activities */}
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {dayActivities.map((activity, index) => {
                      const entityName = activity.details?.entity_name || activity.entity_type;
                      const EntityIcon = entityIcons[activity.entity_type] || FileText;
                      const ActionIcon = actionIcons[activity.action] || Edit;
                      const colorClass = actionColors[activity.action] || actionColors.view;
                      
                      return (
                        <motion.div
                          key={activity.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: index * 0.02 }}
                          whileHover={{ x: 4 }}
                          onClick={() => handleActivityClick(activity)}
                          className={cn(
                            "relative bg-card border rounded-xl p-4 cursor-pointer group",
                            "hover:shadow-md transition-all duration-200"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            {/* Action Icon */}
                            <div className={cn("p-2.5 rounded-xl border shrink-0", colorClass)}>
                              <ActionIcon className="w-4 h-4" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className={cn("text-[10px] px-2 py-0", colorClass)}>
                                  {actionLabels[activity.action] || activity.action}
                                </Badge>
                                <Badge variant="secondary" className="text-[10px] px-2 py-0">
                                  <EntityIcon className="w-3 h-3 mr-1" />
                                  {entityLabels[activity.entity_type] || activity.entity_type}
                                </Badge>
                              </div>
                              
                              <p className="text-sm font-medium text-foreground">
                                {entityName}
                              </p>
                              
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(activity.created_at), 'h:mm a')} • {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                              </p>
                            </div>

                            {/* Arrow */}
                            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
