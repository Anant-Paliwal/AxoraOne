import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, Activity, Zap, TrendingUp, Clock, 
  CheckCircle2, AlertTriangle, RefreshCw, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface SkillAgentStatusProps {
  workspaceId: string;
}

interface SkillSummary {
  id: string;
  name: string;
  level: string;
  confidence_score: number;
  activation_count: number;
  last_activated_at: string | null;
  success_rate: number;
  is_bottleneck: boolean;
  learning_progress: {
    successes: number;
    failures: number;
    last_evolved: string | null;
  };
}

interface LifecycleSummary {
  skills: SkillSummary[];
  summary: {
    total_skills: number;
    total_activations: number;
    average_confidence: number;
    bottleneck_skills: number;
    skills_by_level: {
      Beginner: number;
      Intermediate: number;
      Advanced: number;
      Expert: number;
    };
  };
}

const levelColors = {
  Beginner: 'bg-emerald-500',
  Intermediate: 'bg-blue-500',
  Advanced: 'bg-purple-500',
  Expert: 'bg-amber-500'
};

export function SkillAgentStatus({ workspaceId }: SkillAgentStatusProps) {
  const [data, setData] = useState<LifecycleSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activatingSkill, setActivatingSkill] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await api.getSkillsLifecycleSummary(workspaceId);
      setData(response);
    } catch (error) {
      console.error('Failed to load skill lifecycle data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateSkill = async (skillId: string) => {
    try {
      setActivatingSkill(skillId);
      const result = await api.activateSkill(skillId, workspaceId);
      
      if (result.activated) {
        toast.success(`Skill activated! ${result.actions_proposed?.length || 0} actions proposed`);
      } else {
        toast.info('Skill observed but no patterns detected');
      }
      
      // Reload data
      await loadData();
    } catch (error) {
      toast.error('Failed to activate skill');
    } finally {
      setActivatingSkill(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.skills.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Brain className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p>No skills found</p>
        <p className="text-sm">Create skills to enable autonomous agents</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-muted-foreground">Total Skills</span>
          </div>
          <p className="text-2xl font-bold">{data.summary.total_skills}</p>
        </div>
        
        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Activations</span>
          </div>
          <p className="text-2xl font-bold">{data.summary.total_activations}</p>
        </div>
        
        <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Avg Confidence</span>
          </div>
          <p className="text-2xl font-bold">{(data.summary.average_confidence * 100).toFixed(0)}%</p>
        </div>
        
        <div className={cn(
          "p-4 rounded-xl border",
          data.summary.bottleneck_skills > 0 
            ? "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800"
            : "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/30 dark:to-gray-900/20 border-gray-200 dark:border-gray-800"
        )}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className={cn("w-4 h-4", data.summary.bottleneck_skills > 0 ? "text-red-500" : "text-muted-foreground")} />
            <span className="text-xs text-muted-foreground">Bottlenecks</span>
          </div>
          <p className="text-2xl font-bold">{data.summary.bottleneck_skills}</p>
        </div>
      </div>

      {/* Level Distribution */}
      <div className="p-4 rounded-xl border bg-card">
        <h4 className="text-sm font-medium mb-3">Skill Level Distribution</h4>
        <div className="flex gap-2 h-4">
          {Object.entries(data.summary.skills_by_level).map(([level, count]) => {
            const percentage = (count / data.summary.total_skills) * 100;
            if (percentage === 0) return null;
            return (
              <div
                key={level}
                className={cn("rounded-full", levelColors[level as keyof typeof levelColors])}
                style={{ width: `${percentage}%` }}
                title={`${level}: ${count}`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          {Object.entries(data.summary.skills_by_level).map(([level, count]) => (
            <span key={level}>{level}: {count}</span>
          ))}
        </div>
      </div>

      {/* Skill Agents List */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Autonomous Skill Agents
        </h4>
        
        {data.skills.map((skill, index) => (
          <motion.div
            key={skill.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    skill.activation_count > 0 ? "bg-green-500 animate-pulse" : "bg-gray-400"
                  )} />
                  <h5 className="font-medium">{skill.name}</h5>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    levelColors[skill.level as keyof typeof levelColors],
                    "text-white"
                  )}>
                    {skill.level}
                  </span>
                  {skill.is_bottleneck && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      Bottleneck
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-4 gap-4 mt-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Confidence</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${skill.confidence_score * 100}%` }}
                        />
                      </div>
                      <span className="font-medium">{(skill.confidence_score * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-muted-foreground">Activations</span>
                    <p className="font-medium mt-1">{skill.activation_count}</p>
                  </div>
                  
                  <div>
                    <span className="text-muted-foreground">Success Rate</span>
                    <p className="font-medium mt-1">{(skill.success_rate * 100).toFixed(0)}%</p>
                  </div>
                  
                  <div>
                    <span className="text-muted-foreground">Learning</span>
                    <p className="font-medium mt-1 text-green-600">
                      +{skill.learning_progress.successes}
                      <span className="text-red-500 ml-1">-{skill.learning_progress.failures}</span>
                    </p>
                  </div>
                </div>
                
                {skill.last_activated_at && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    Last active: {new Date(skill.last_activated_at).toLocaleDateString()}
                  </div>
                )}
              </div>
              
              <Button
                size="sm"
                variant="outline"
                className="ml-4"
                disabled={activatingSkill === skill.id}
                onClick={() => handleActivateSkill(skill.id)}
              >
                {activatingSkill === skill.id ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-1" />
                    Activate
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Background Runner Status */}
      <div className="p-4 rounded-xl border bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/50 dark:bg-black/20">
            <Activity className="w-5 h-5 text-purple-500 animate-pulse" />
          </div>
          <div>
            <h4 className="font-medium">Background Runner Active</h4>
            <p className="text-sm text-muted-foreground">
              Skills are continuously observing, learning, and evolving
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Running
          </div>
        </div>
      </div>
    </div>
  );
}
