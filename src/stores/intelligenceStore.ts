import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { api } from '@/lib/api';

export interface Insight {
  id: string;
  workspace_id: string;
  insight_type: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  suggested_actions: Array<{
    type: string;
    label?: string;
    [key: string]: any;
  }>;
  dismissed: boolean;
  acted_upon: boolean;
  created_at: string;
}

export interface ProposedAction {
  id: string;
  workspace_id: string;
  action_type: string;
  target_type: string;
  target_id?: string;
  payload: Record<string, any>;
  reason: string;
  expected_impact: string;
  reversible: boolean;
  trust_level_required: number;
  executed: boolean;
  created_at: string;
}

export interface Pattern {
  type: string;
  severity: string;
  data: Record<string, any>;
}

export interface RankedTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date?: string;
  linked_skill_id?: string;
  linked_page_id?: string;
  calculated_priority: {
    score: number;
    factors: {
      base: number;
      urgency: number;
      goal_alignment: number;
      skill_bottleneck: number;
      calendar_pressure: number;
    };
    recommendation: string;
  };
}

export interface HomeIntelligence {
  high_impact_tasks: RankedTask[];
  active_contexts: Array<{
    id: string;
    title: string;
    icon: string;
    updated_at: string;
    tags: string[];
  }>;
  skill_intelligence: {
    active: any[];
    needs_attention: any[];
    total: number;
  };
  insights: Insight[];
  pending_actions: ProposedAction[];
  patterns: Pattern[];
  stats: {
    total_active_tasks: number;
    completed_today: number;
    overdue: number;
  };
}

interface IntelligenceState {
  // Data
  insights: Insight[];
  proposedActions: ProposedAction[];
  patterns: Pattern[];
  homeIntelligence: HomeIntelligence | null;
  rankedTasks: RankedTask[];
  
  // Loading states
  loading: boolean;
  loadingHome: boolean;
  
  // Actions
  fetchInsights: (workspaceId: string) => Promise<void>;
  dismissInsight: (insightId: string) => Promise<void>;
  actOnInsight: (insightId: string, actionIndex: number) => Promise<any>;
  
  fetchProposedActions: (workspaceId: string) => Promise<void>;
  approveAction: (actionId: string) => Promise<any>;
  rejectAction: (actionId: string) => Promise<void>;
  
  fetchPatterns: (workspaceId: string) => Promise<void>;
  fetchHomeIntelligence: (workspaceId: string) => Promise<void>;
  fetchRankedTasks: (workspaceId: string, limit?: number) => Promise<void>;
  
  emitSignal: (workspaceId: string, signal: {
    signal_type: string;
    source_id: string;
    source_type: string;
    data?: Record<string, any>;
    priority?: number;
  }) => Promise<void>;
  
  clearState: () => void;
}

export const useIntelligenceStore = create<IntelligenceState>()(
  devtools(
    (set, get) => ({
      // Initial state
      insights: [],
      proposedActions: [],
      patterns: [],
      homeIntelligence: null,
      rankedTasks: [],
      loading: false,
      loadingHome: false,
      
      // Fetch insights
      fetchInsights: async (workspaceId: string) => {
        set({ loading: true });
        try {
          const data = await api.getInsights(workspaceId);
          set({ insights: data, loading: false });
        } catch (error) {
          console.error('Failed to fetch insights:', error);
          set({ loading: false });
        }
      },
      
      // Dismiss insight
      dismissInsight: async (insightId: string) => {
        try {
          await api.dismissInsight(insightId);
          set(state => ({
            insights: state.insights.filter(i => i.id !== insightId)
          }));
        } catch (error) {
          console.error('Failed to dismiss insight:', error);
        }
      },
      
      // Act on insight
      actOnInsight: async (insightId: string, actionIndex: number) => {
        try {
          const result = await api.actOnInsight(insightId, actionIndex);
          set(state => ({
            insights: state.insights.map(i => 
              i.id === insightId ? { ...i, acted_upon: true } : i
            )
          }));
          return result;
        } catch (error) {
          console.error('Failed to act on insight:', error);
          throw error;
        }
      },
      
      // Fetch proposed actions
      fetchProposedActions: async (workspaceId: string) => {
        set({ loading: true });
        try {
          const data = await api.getProposedActions(workspaceId);
          set({ proposedActions: data, loading: false });
        } catch (error) {
          console.error('Failed to fetch proposed actions:', error);
          set({ loading: false });
        }
      },
      
      // Approve action
      approveAction: async (actionId: string) => {
        try {
          const result = await api.approveAction(actionId);
          set(state => ({
            proposedActions: state.proposedActions.filter(a => a.id !== actionId)
          }));
          return result;
        } catch (error) {
          console.error('Failed to approve action:', error);
          throw error;
        }
      },
      
      // Reject action
      rejectAction: async (actionId: string) => {
        try {
          await api.rejectAction(actionId);
          set(state => ({
            proposedActions: state.proposedActions.filter(a => a.id !== actionId)
          }));
        } catch (error) {
          console.error('Failed to reject action:', error);
        }
      },
      
      // Fetch patterns
      fetchPatterns: async (workspaceId: string) => {
        try {
          const data = await api.analyzePatterns(workspaceId);
          set({ patterns: data.patterns || [] });
        } catch (error) {
          console.error('Failed to fetch patterns:', error);
        }
      },
      
      // Fetch home intelligence
      fetchHomeIntelligence: async (workspaceId: string) => {
        set({ loadingHome: true });
        try {
          const data = await api.getHomeIntelligence(workspaceId);
          set({ homeIntelligence: data, loadingHome: false });
        } catch (error) {
          console.error('Failed to fetch home intelligence:', error);
          set({ loadingHome: false });
        }
      },
      
      // Fetch ranked tasks
      fetchRankedTasks: async (workspaceId: string, limit = 20) => {
        try {
          const data = await api.getRankedTasks(workspaceId, limit);
          set({ rankedTasks: data });
        } catch (error) {
          console.error('Failed to fetch ranked tasks:', error);
        }
      },
      
      // Emit signal
      emitSignal: async (workspaceId: string, signal) => {
        try {
          await api.emitSignal(workspaceId, signal);
        } catch (error) {
          console.error('Failed to emit signal:', error);
        }
      },
      
      // Clear state
      clearState: () => {
        set({
          insights: [],
          proposedActions: [],
          patterns: [],
          homeIntelligence: null,
          rankedTasks: [],
          loading: false,
          loadingHome: false
        });
      }
    }),
    { name: 'intelligence-store' }
  )
);
