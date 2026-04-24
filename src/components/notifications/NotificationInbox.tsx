import { useState, forwardRef } from 'react';
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
  MoreHorizontal,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

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
  info: 'text-blue-500 bg-blue-500/10',
  success: 'text-green-500 bg-green-500/10',
  warning: 'text-yellow-500 bg-yellow-500/10',
  error: 'text-red-500 bg-red-500/10',
  task: 'text-purple-500 bg-purple-500/10',
  page: 'text-cyan-500 bg-cyan-500/10',
  skill: 'text-orange-500 bg-orange-500/10',
  quiz: 'text-pink-500 bg-pink-500/10',
  reminder: 'text-indigo-500 bg-indigo-500/10',
  users: 'text-violet-500 bg-violet-500/10',
};

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (link: string) => void;
}

const NotificationItem = forwardRef<HTMLDivElement, NotificationItemProps>(({ 
  notification, 
  onMarkRead, 
  onDelete,
  onNavigate 
}, ref) => {
  const iconKey = notification.icon || notification.type;
  const Icon = typeIcons[iconKey] || Info;
  const colorClass = typeColors[notification.type] || typeColors.info;

  return (
    <div
      ref={ref}
      className={cn(
        "p-3 border-b border-border last:border-0 hover:bg-secondary/50 transition-colors cursor-pointer group",
        !notification.is_read && "bg-primary/5"
      )}
      onClick={() => {
        if (!notification.is_read) onMarkRead(notification.id);
        if (notification.link) onNavigate(notification.link);
      }}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg shrink-0", colorClass)}>
          <Icon className="w-4 h-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm line-clamp-1",
                !notification.is_read ? "font-semibold text-foreground" : "text-foreground/80"
              )}>
                {notification.title}
              </p>
              {notification.message && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {notification.message}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!notification.is_read && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkRead(notification.id);
                  }}
                >
                  <Check className="w-3 h-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification.id);
                }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </span>
            {!notification.is_read && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
            {notification.link && (
              <span className="text-[10px] text-primary">
                {notification.link_label || 'View'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

NotificationItem.displayName = 'NotificationItem';

// Motion wrapper for AnimatePresence
const MotionNotificationItem = motion(NotificationItem);

export function NotificationInbox() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    clearAll 
  } = useNotifications();

  const handleNavigate = (link: string) => {
    setOpen(false);
    navigate(link);
  };

  const notificationsPath = currentWorkspace 
    ? `/workspace/${currentWorkspace.id}/notifications` 
    : '/notifications';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-96 p-0" 
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={markAllAsRead} disabled={unreadCount === 0}>
                <CheckCheck className="w-4 h-4 mr-2" />
                Mark all as read
              </DropdownMenuItem>
              <DropdownMenuItem onClick={clearAll} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear all
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                <Bell className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-1">No new notifications</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {notifications.map((notification) => (
                <MotionNotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={markAsRead}
                  onDelete={deleteNotification}
                  onNavigate={handleNavigate}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  layout
                />
              ))}
            </AnimatePresence>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-2 border-t border-border">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs"
              onClick={() => {
                setOpen(false);
                navigate(notificationsPath);
              }}
            >
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
