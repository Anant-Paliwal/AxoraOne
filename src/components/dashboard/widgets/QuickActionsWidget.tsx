import { useNavigate } from 'react-router-dom';
import { FileText, CheckSquare, BookOpen, Zap, Plus, Search } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const QUICK_ACTIONS = [
  { id: 'new-page', label: 'New Page', icon: FileText, route: '/pages/new', color: 'text-blue-500' },
  { id: 'new-task', label: 'New Task', icon: CheckSquare, route: '/tasks', color: 'text-green-500' },
  { id: 'ask-ai', label: 'Ask AI', icon: Zap, route: '/ask', color: 'text-amber-500' },
  { id: 'search', label: 'Search', icon: Search, route: '/pages', color: 'text-purple-500' },
];

export function QuickActionsWidget({ settings }: { settings?: Record<string, any> }) {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();

  const handleAction = (route: string) => {
    if (route.startsWith('/workspace/')) {
      navigate(route.replace('/workspace/', `/workspace/${currentWorkspace?.id}/`));
    } else {
      navigate(route);
    }
  };

  return (
    <div className="p-4 h-full">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-amber-500" />
        <h3 className="font-semibold text-sm text-foreground">Quick Actions</h3>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => handleAction(action.route)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground bg-secondary/50 rounded-lg hover:bg-secondary transition-colors"
            >
              <Icon className={`w-3.5 h-3.5 ${action.color}`} />
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
