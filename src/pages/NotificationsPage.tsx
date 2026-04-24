import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Info,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  ListTodo,
  FileText,
  Target,
  Brain,
  Clock,
  Users,
  Filter,
  Search,
  Archive,
  RefreshCw
} from 'lucide-react';
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
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';

const typeIcons: Record<string, React.ElementType> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
  task: ListTodo,
  page: FileText,
  skill: Target,
  quiz: Brain,
  reminder: Clock,
  users: Users,
};

const typeColors: Record<string, string> = {
  info: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  success: 'text-green-500 bg-green-500/10 border-green-500/20',
  warning: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
  error: 'text-red-500 bg-red-500/10 border-red-500/20',
  task: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  page: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
  skill: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  quiz: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
  reminder: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
  users: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
};

const typeLabels: Record<string, string> = {
  info: 'Info',
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
  task: 'Task',
  page: 'Page',
  skill: 'Skill',
  quiz: 'Quiz',
  reminder: 'Reminder',
  users: 'Team',
};

interface NotificationCardProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (link: string) => void;
}

function NotificationCard({ notification, onMarkRead, onDelete, onNavigate }: NotificationCardProps) {
  const iconKey = notification.icon || notification.type;
  const Icon = typeIcons[iconKey] || Info;
  const colorClass = typeColors[notification.type] || typeColors.info;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative bg-card border rounded-xl p-5 cursor-pointer group",
        "shadow-sm hover:shadow-lg transition-all duration-200",
        !notification.is_read && "ring-2 ring-primary/20 bg-primary/[0.02]"
      )}
      onClick={() => {
        if (!notification.is_read) onMarkRead(notification.id);
        if (notification.link) onNavigate(notification.link);
      }}
    >
      {/* Unread indicator */}
      {!notification.is_read && (
        <div className="absolute top-4 right-4">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
          </span>
        </div>
      )}

      <div className="flex gap-4">
        {/* Icon */}
        <div className={cn("p-3 rounded-xl border shrink-0", colorClass)}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className={cn("text-[10px] px-2 py-0", colorClass)}>
                  {typeLabels[notification.type] || 'Info'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </span>
              </div>
              
              <h3 className={cn(
                "text-base mb-1",
                !notification.is_read ? "font-semibold text-foreground" : "font-medium text-foreground/90"
              )}>
                {notification.title}
              </h3>
              
              {notification.message && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {notification.message}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2">
              {notification.link && (
                <span className="text-xs text-primary font-medium">
                  {notification.link_label || 'View details'} →
                </span>
              )}
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(notification.created_at), 'MMM d, yyyy • h:mm a')}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!notification.is_read && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkRead(notification.id);
                  }}
                >
                  <Check className="w-3 h-3 mr-1" />
                  Mark read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification.id);
                }}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refresh
  } = useNotifications();

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = searchQuery === '' || 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || n.type === filterType;
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'unread' && !n.is_read) ||
      (filterStatus === 'read' && n.is_read);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleNavigate = (link: string) => {
    navigate(link);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <Bell className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Notifications</h1>
              <p className="text-sm text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
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
              placeholder="Search notifications..."
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
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="page">Page</SelectItem>
                <SelectItem value="skill">Skill</SelectItem>
                <SelectItem value="quiz">Quiz</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={refresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            {unreadCount > 0 && (
              <Button variant="outline" onClick={markAllAsRead}>
                <CheckCheck className="w-4 h-4 mr-2" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="outline" className="text-destructive" onClick={clearAll}>
                <Trash2 className="w-4 h-4 mr-2" />
                Clear all
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-card border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{notifications.length}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="bg-card border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-primary">{unreadCount}</div>
            <div className="text-xs text-muted-foreground">Unread</div>
          </div>
          <div className="bg-card border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-500">
              {notifications.filter(n => n.type === 'success').length}
            </div>
            <div className="text-xs text-muted-foreground">Success</div>
          </div>
          <div className="bg-card border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-500">
              {notifications.filter(n => n.type === 'warning' || n.type === 'error').length}
            </div>
            <div className="text-xs text-muted-foreground">Alerts</div>
          </div>
        </div>

        {/* Notifications Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mb-4" />
            <p className="text-sm text-muted-foreground">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              {searchQuery || filterType !== 'all' || filterStatus !== 'all' ? (
                <Search className="w-8 h-8 text-muted-foreground" />
              ) : (
                <Bell className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <h3 className="text-lg font-semibold mb-1">
              {searchQuery || filterType !== 'all' || filterStatus !== 'all' 
                ? 'No matching notifications' 
                : 'All caught up!'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {searchQuery || filterType !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'You have no notifications at the moment. We\'ll let you know when something important happens.'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onMarkRead={markAsRead}
                  onDelete={deleteNotification}
                  onNavigate={handleNavigate}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
