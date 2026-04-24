import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, TrendingUp, Target, AlertCircle, Link2, 
  ChevronDown, ChevronUp, ArrowRight, Lightbulb 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface GraphInsightsPanelProps {
  workspaceId?: string;
  onNodeFocus?: (nodeId: string) => void;
}

export function GraphInsightsPanel({ workspaceId, onNodeFocus }: GraphInsightsPanelProps) {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    recommendations: true,
    gaps: true,
    central: false,
    isolated: false
  });

  useEffect(() => {
    loadInsights();
  }, [workspaceId]);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const data = await api.getGraphInsights(workspaceId);
      setInsights(data);
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleRecommendationClick = (recommendation: any) => {
    if (recommendation.action?.route) {
      navigate(recommendation.action.route);
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No insights available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="text-2xl font-bold text-primary">{insights.total_nodes || 0}</div>
          <div className="text-xs text-muted-foreground">Total Nodes</div>
        </div>
        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
          <div className="text-2xl font-bold text-emerald-600">{insights.total_edges || 0}</div>
          <div className="text-xs text-muted-foreground">Connections</div>
        </div>
      </div>

      {/* AI Recommendations */}
      {insights.recommendations && insights.recommendations.length > 0 && (
        <div className="border-t border-border pt-4">
          <button
            onClick={() => toggleSection('recommendations')}
            className="w-full flex items-center justify-between mb-3 group"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <h3 className="text-sm font-semibold">AI Recommendations</h3>
              <span className="px-1.5 py-0.5 text-xs bg-purple-500/10 text-purple-600 rounded-full">
                {insights.recommendations.length}
              </span>
            </div>
            {expandedSections.recommendations ? 
              <ChevronUp className="w-4 h-4 text-muted-foreground" /> : 
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            }
          </button>

          <AnimatePresence>
            {expandedSections.recommendations && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2 overflow-hidden"
              >
                {insights.recommendations.map((rec: any, i: number) => (
                  <motion.button
                    key={i}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => handleRecommendationClick(rec)}
                    className="w-full p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-secondary/50 transition-all text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        rec.priority === 'high' ? 'bg-rose-500/10' :
                        rec.priority === 'medium' ? 'bg-amber-500/10' :
                        'bg-blue-500/10'
                      }`}>
                        {rec.type === 'skill_gap' && <TrendingUp className="w-4 h-4 text-rose-500" />}
                        {rec.type === 'isolated_content' && <AlertCircle className="w-4 h-4 text-amber-500" />}
                        {rec.type === 'learning_path' && <Target className="w-4 h-4 text-blue-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium">{rec.title}</h4>
                          <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{rec.description}</p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Skill Gaps */}
      {insights.skill_gaps && insights.skill_gaps.length > 0 && (
        <div className="border-t border-border pt-4">
          <button
            onClick={() => toggleSection('gaps')}
            className="w-full flex items-center justify-between mb-3"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold">Skill Gaps</h3>
            </div>
            {expandedSections.gaps ? 
              <ChevronUp className="w-4 h-4 text-muted-foreground" /> : 
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            }
          </button>

          <AnimatePresence>
            {expandedSections.gaps && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2 overflow-hidden"
              >
                {insights.skill_gaps.map((gap: any, i: number) => (
                  <div key={i} className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{gap.skill_name}</span>
                      <span className="text-xs text-muted-foreground capitalize">{gap.level}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link2 className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {gap.connection_count} connections
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700">
                        {gap.gap_type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Central Nodes */}
      {insights.central_nodes && insights.central_nodes.length > 0 && (
        <div className="border-t border-border pt-4">
          <button
            onClick={() => toggleSection('central')}
            className="w-full flex items-center justify-between mb-3"
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-semibold">Most Connected</h3>
            </div>
            {expandedSections.central ? 
              <ChevronUp className="w-4 h-4 text-muted-foreground" /> : 
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            }
          </button>

          <AnimatePresence>
            {expandedSections.central && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-1.5 overflow-hidden"
              >
                {insights.central_nodes.map((node: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => onNodeFocus?.(node.node_id)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <span className="text-sm capitalize">{node.node_type}</span>
                    <div className="flex items-center gap-1.5">
                      <Link2 className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm font-medium">{node.connection_count}</span>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Refresh Button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={loadInsights}
      >
        <Sparkles className="w-3.5 h-3.5 mr-2" />
        Refresh Insights
      </Button>
    </div>
  );
}
