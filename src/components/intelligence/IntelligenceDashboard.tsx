import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, Brain, Target, FileText, TrendingUp,
  ChevronRight, Loader2, Zap, Clock, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIntelligenceStore } from '@/stores/intelligenceStore';
import { InsightCard } from './InsightCard';
import { ProposedActionCard } from './ProposedActionCard';
import { RankedTaskList } from './RankedTaskList';
import { PatternAlert } from './PatternAlert';
import { toast } from 'sonner';

interface IntelligenceDashboardProps {
  workspaceId: string;
}

export function IntelligenceDashboard({ workspaceId }: IntelligenceDashboardProps) {
  const navigate = useNavigate();
  const {
    homeIntelligence,
    loadingHome,
    fetchHomeIntelligence,
    dismissInsight,
    actOnInsight,
    approveAction,
    rejectAction
  } = useIntelligenceStore();

  useEffect(() => {
    if (workspaceId) {
      fetchHomeIntelligence(workspaceId).catch(error => {
        console.error('Failed to load intelligence:', error);
        toast.error('Intelligence system is initializing. Please run the migration.');
      });
    }
  }, [workspaceId, fetchHomeIntelligence]);

  const handleInsightAction = async (insightId: string, actionIndex: number) => {
    try {
      const result = await actOnInsight(insightId, actionIndex);
      if (result?.action?.route) {
        navigate(result.action.route);
      }
      toast.success('Action completed');
    } catch (error) {
      console.error('Insight action error:', error);
      toast.error('Failed to perform action');
    }
  };

  const handleApproveAction = async (actionId: string) => {
    try {
      await approveAction(actionId);
      toast.success('Action approved and executed');
      fetchHomeIntelligence(workspaceId);
    } catch (error) {
      console.error('Approve action error:', error);
      toast.error('Failed to approve action');
    }
  };

  const handleRejectAction = async (actionId: string) => {
    try {
      await rejectAction(actionId);
      toast.success('Action dismissed');
      fetchHomeIntelligence(workspaceId);
    } catch (error) {
      console.error('Reject action error:', error);
      toast.error('Failed to dismiss action');
    }
  };

  if (loadingHome) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!homeIntelligence) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Brain className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Intelligence System Initializing</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Run the intelligence migration to activate the Living Intelligence OS
        </p>
        <code className="text-xs bg-secondary px-3 py-1 rounded">
          run-intelligence-migration.sql
        </code>
      </div>
    );
  }

  const { 
    high_impact_tasks, 
    active_contexts, 
    skill_intelligence, 
    insights, 
    pending_actions, 
    patterns,
    stats 
  } = homeIntelligence;

  return (
    <div className="space-y-6">
      {/* Quick Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800"
        >
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Target className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.total_active_tasks}</p>
            <p className="text-xs text-muted-foreground">Active Tasks</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border border-green-200 dark:border-green-800"
        >
          <div className="p-2 rounded-lg bg-green-500/10">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.completed_today}</p>
            <p className="text-xs text-muted-foreground">Done Today</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "flex items-center gap-3 p-4 rounded-xl border",
            stats.overdue > 0 
              ? "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800"
              : "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/30 dark:to-gray-900/20 border-gray-200 dark:border-gray-800"
          )}
        >
          <div className={cn(
            "p-2 rounded-lg",
            stats.overdue > 0 ? "bg-red-500/10" : "bg-gray-500/10"
          )}>
            <Clock className={cn(
              "w-5 h-5",
              stats.overdue > 0 ? "text-red-500" : "text-muted-foreground"
            )} />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.overdue}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </div>
        </motion.div>
      </div>

      {/* Pattern Alerts */}
      {patterns.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Detected Patterns
          </h3>
          <div className="grid gap-3">
            {patterns.slice(0, 2).map((pattern, index) => (
              <PatternAlert 
                key={index} 
                pattern={pattern}
                onAction={() => {
                  if (pattern.type === 'stalled_tasks') {
                    navigate(`/workspace/${workspaceId}/tasks?filter=in-progress`);
                  } else if (pattern.type === 'neglected_pages') {
                    navigate(`/workspace/${workspaceId}/pages`);
                  } else if (pattern.type === 'skill_bottleneck') {
                    navigate(`/workspace/${workspaceId}/skills`);
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* High Impact Tasks */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="w-4 h-4" />
              High Impact Tasks
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => navigate(`/workspace/${workspaceId}/tasks`)}
            >
              View All
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
          <RankedTaskList 
            tasks={high_impact_tasks} 
            workspaceId={workspaceId}
            limit={5}
          />
        </div>

        {/* Active Contexts (Pages) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Active Contexts
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => navigate(`/workspace/${workspaceId}/pages`)}
            >
              View All
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
          <div className="space-y-2">
            {active_contexts.slice(0, 5).map((page, index) => (
              <motion.div
                key={page.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/workspace/${workspaceId}/pages/${page.id}`)}
              >
                <span className="text-xl">{page.icon || '📄'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{page.title}</p>
                  {page.tags && page.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {page.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            AI Insights
          </h3>
          <AnimatePresence mode="popLayout">
            <div className="grid gap-3">
              {insights.slice(0, 3).map(insight => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onDismiss={dismissInsight}
                  onAction={handleInsightAction}
                />
              ))}
            </div>
          </AnimatePresence>
        </div>
      )}

      {/* Pending Actions */}
      {pending_actions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Suggested Actions
          </h3>
          <AnimatePresence mode="popLayout">
            <div className="grid gap-3">
              {pending_actions.slice(0, 3).map(action => (
                <ProposedActionCard
                  key={action.id}
                  action={action}
                  onApprove={handleApproveAction}
                  onReject={handleRejectAction}
                />
              ))}
            </div>
          </AnimatePresence>
        </div>
      )}

      {/* Skill Intelligence */}
      {skill_intelligence.total > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Skill Intelligence
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => navigate(`/workspace/${workspaceId}/skills`)}
            >
              View All
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* Active Skills */}
            <div className="p-4 rounded-xl border bg-card">
              <p className="text-xs text-muted-foreground mb-2">Active Skills</p>
              <div className="space-y-2">
                {skill_intelligence.active.slice(0, 3).map(skill => (
                  <div 
                    key={skill.id}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors"
                    onClick={() => navigate(`/workspace/${workspaceId}/skills`)}
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="truncate">{skill.name}</span>
                  </div>
                ))}
                {skill_intelligence.active.length === 0 && (
                  <p className="text-xs text-muted-foreground">No active skills</p>
                )}
              </div>
            </div>

            {/* Skills Needing Attention */}
            <div className="p-4 rounded-xl border bg-card">
              <p className="text-xs text-muted-foreground mb-2">Needs Attention</p>
              <div className="space-y-2">
                {skill_intelligence.needs_attention.slice(0, 3).map(skill => (
                  <div 
                    key={skill.id}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors"
                    onClick={() => navigate(`/workspace/${workspaceId}/skills`)}
                  >
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="truncate">{skill.name}</span>
                  </div>
                ))}
                {skill_intelligence.needs_attention.length === 0 && (
                  <p className="text-xs text-muted-foreground">All skills progressing</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
