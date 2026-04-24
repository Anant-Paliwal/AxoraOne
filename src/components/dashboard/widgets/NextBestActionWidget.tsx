/**
 * Next Best Action Widget
 * 
 * Dashboard widget that shows the primary insight.
 * Users can choose to show/hide this on their home page.
 */

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, TrendingUp, Sparkles, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { computePrimaryInsight } from '@/lib/intelligenceUtils';
import { api } from '@/lib/api';
import { Task, Skill, Page } from '@/types/workspace';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface NextBestActionWidgetProps {
  settings?: Record<string, any>;
}

export function NextBestActionWidget({ settings }: NextBestActionWidgetProps) {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [pages, setPages] = useState<Page[]>([]);

  useEffect(() => {
    if (currentWorkspace) {
      loadData();
    }
  }, [currentWorkspace]);

  const loadData = async () => {
    if (!currentWorkspace) return;
    
    setLoading(true);
    try {
      const [tasksData, skillsData, pagesData] = await Promise.all([
        api.getTasks(currentWorkspace.id).catch(() => []),
        api.getSkills(currentWorkspace.id).catch(() => []),
        api.getPagesByWorkspace(currentWorkspace.id).catch(() => [])
      ]);
      
      // Transform tasks
      const transformedTasks = (tasksData || []).map((t: any) => ({
        ...t,
        dueDate: t.due_date,
        linkedPageId: t.linked_page_id,
        linkedSkillId: t.linked_skill_id,
      }));
      
      setTasks(transformedTasks);
      setSkills(skillsData || []);
      setPages(pagesData || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const insight = useMemo(() => 
    computePrimaryInsight(tasks, skills, pages),
    [tasks, skills, pages]
  );

  const handleAction = () => {
    if (insight?.actionRoute && currentWorkspace) {
      navigate(`/workspace/${currentWorkspace.id}${insight.actionRoute}`);
    }
  };

  const getIcon = () => {
    if (!insight) return Sparkles;
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
    if (!insight) return {
      icon: 'text-muted-foreground',
      iconBg: 'bg-secondary'
    };

    switch (insight.type) {
      case 'urgent':
        return {
          icon: 'text-red-500',
          iconBg: 'bg-red-500/10'
        };
      case 'progress':
        return {
          icon: 'text-amber-500',
          iconBg: 'bg-amber-500/10'
        };
      case 'opportunity':
        return {
          icon: 'text-blue-500',
          iconBg: 'bg-blue-500/10'
        };
      default:
        return {
          icon: 'text-muted-foreground',
          iconBg: 'bg-secondary'
        };
    }
  };

  const colors = getColorClasses();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!insight || tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <div className={cn('p-3 rounded-xl mb-3', colors.iconBg)}>
          <Sparkles className={cn('w-5 h-5', colors.icon)} />
        </div>
        <p className="text-sm text-muted-foreground">
          No tasks yet. Create some to see your next best action.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 h-full">
      <div className="flex items-start gap-3">
        <div className={cn('p-2.5 rounded-lg flex-shrink-0', colors.iconBg)}>
          <Icon className={cn('w-5 h-5', colors.icon)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Next best action
          </p>
          <h3 className={cn(
            "text-sm font-semibold mb-3 leading-snug",
            colors.icon
          )}>
            {insight.message}
          </h3>
          
          <Button
            onClick={handleAction}
            variant="outline"
            size="sm"
            className="rounded-lg text-xs h-8"
          >
            {insight.action}
            <ChevronRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Widget metadata for dashboard configuration
export const NextBestActionWidgetConfig = {
  id: 'next-best-action',
  name: 'Next Best Action',
  description: 'Shows your most important action based on workspace state',
  category: 'intelligence',
  defaultSize: { w: 2, h: 1 },
  minSize: { w: 2, h: 1 },
  maxSize: { w: 4, h: 2 },
};
