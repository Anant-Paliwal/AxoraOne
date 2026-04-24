import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Brain, 
  Plus, 
  TrendingUp,
  Star,
  Target,
  MoreHorizontal,
  Sparkles,
  Edit,
  Trash2,
  Loader2,
  Link2,
  ChevronRight,
  Zap,
  BookOpen,
  Store
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/contexts/WorkspaceContext';

import { ConnectedItems } from '@/components/graph/ConnectedItems';
import { SkillMarketplace } from '@/components/skills/SkillMarketplace';

const levelColors = {
  Beginner: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  Intermediate: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  Advanced: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
  Expert: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
};

const skillTypeColors = {
  learning: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  research: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  creation: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  analysis: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  practice: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
};

interface Skill {
  id: string;
  name: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  description: string;
  evidence: string[];
  goals: string[];
  workspace_id?: string;
  skill_type?: 'learning' | 'research' | 'creation' | 'analysis' | 'practice';
  linked_skills?: string[];
  prerequisite_skills?: string[];
  linked_evidence?: Array<{
    id: string;
    page_id: string;
    evidence_type: string;
    notes: string;
    pages: {
      id: string;
      title: string;
      icon: string;
    };
  }>;
  created_at: string;
  updated_at: string;
}

interface SuggestedSkill {
  id: string;
  name: string;
  level: string;
  description?: string;
  skill_type?: string;
  reason: string;
  priority?: number;
}

export function SkillsPage() {
  const navigate = useNavigate();
  const { currentWorkspace, canEdit, canAdmin, getUserRole } = useWorkspace();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [showChainDialog, setShowChainDialog] = useState(false);
  const [selectedSkillForChain, setSelectedSkillForChain] = useState<Skill | null>(null);
  const [suggestedSkills, setSuggestedSkills] = useState<SuggestedSkill[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  
  // Permission checks
  const userCanEdit = canEdit();
  const userCanAdmin = canAdmin();
  const userRole = getUserRole();

  useEffect(() => {
    loadSkills();
  }, [currentWorkspace]);

  const loadSkills = async () => {
    try {
      setLoading(true);
      const workspaceId = currentWorkspace?.id;
      console.log('Loading skills for workspace:', workspaceId);
      const data = await api.getSkills(workspaceId);
      console.log('Loaded skills:', data);
      setSkills(data);
    } catch (error) {
      toast.error('Failed to load skills');
      console.error('Error loading skills:', error);
      setSkills([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (skillId: string, skillName: string) => {
    // Only admins and owners can delete
    if (!userCanAdmin) {
      toast.error('You don\'t have permission to delete skills');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete "${skillName}"?`)) return;

    try {
      await api.deleteSkill(skillId);
      toast.success('Skill deleted');
      loadSkills();
    } catch (error) {
      toast.error('Failed to delete skill');
      console.error(error);
    }
  };

  const handleRunSkill = async (skill: Skill) => {
    setSelectedSkillForChain(skill);
    setLoadingSuggestions(true);
    setShowChainDialog(true);
    
    try {
      // Execute the skill and get suggestions
      const result = await api.executeSkill(skill.id, {
        trigger_source: 'manual',
        input_context: { from_skills_page: true }
      }, currentWorkspace?.id);
      
      setSuggestedSkills(result.suggested_next || []);
      toast.success(`Skill "${skill.name}" executed!`);
    } catch (error) {
      console.error('Error executing skill:', error);
      // Fallback: just get suggestions without logging execution
      try {
        const suggestions = await api.getSuggestedNextSkills(skill.id, currentWorkspace?.id);
        setSuggestedSkills(suggestions.suggested_next || []);
      } catch (e) {
        setSuggestedSkills([]);
      }
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleLinkSkill = async (sourceSkillId: string, targetSkillId: string) => {
    try {
      await api.linkSkills(sourceSkillId, targetSkillId);
      toast.success('Skills linked!');
      loadSkills();
    } catch (error) {
      toast.error('Failed to link skills');
      console.error(error);
    }
  };

  const advancedSkills = skills.filter(s => s.level === 'Advanced' || s.level === 'Expert').length;
  const totalGoals = skills.reduce((acc, skill) => acc + skill.goals.length, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Skills</h1>
          <p className="text-muted-foreground mt-1">Track your expertise and learning goals</p>
        </div>
        <div className="flex items-center gap-3">
          {userRole === 'viewer' && (
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
              View Only
            </span>
          )}
          {userCanEdit && (
            <>
              <Button 
                onClick={() => setShowMarketplace(true)} 
                variant="outline" 
                className="rounded-xl"
              >
                <Store className="w-4 h-4 mr-2" />
                Marketplace
              </Button>
              <Button onClick={() => setShowCreateDialog(true)} className="rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Add Skill
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats - No borders */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-card/50 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <span className="text-2xl font-bold text-foreground">{skills.length}</span>
          </div>
          <p className="text-sm text-muted-foreground">Total Skills</p>
        </div>
        <div className="bg-card/50 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
            <span className="text-2xl font-bold text-foreground">{advancedSkills}</span>
          </div>
          <p className="text-sm text-muted-foreground">Advanced Level</p>
        </div>
        <div className="bg-card/50 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
              <Target className="w-4 h-4 text-warning" />
            </div>
            <span className="text-2xl font-bold text-foreground">{totalGoals}</span>
          </div>
          <p className="text-sm text-muted-foreground">Active Goals</p>
        </div>
      </div>

      {/* Skills Grid */}
      {skills.length === 0 ? (
        <div className="text-center py-12">
          <Brain className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No skills yet</h3>
          <p className="text-muted-foreground mb-4">
            {userCanEdit 
              ? 'Start tracking your expertise and learning goals'
              : 'No skills have been added to this workspace yet'}
          </p>
          {userCanEdit && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Skill
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill, index) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              index={index}
              allSkills={skills}
              onEdit={() => setEditingSkill(skill)}
              onDelete={() => handleDelete(skill.id, skill.name)}
              onRun={() => handleRunSkill(skill)}
              onLink={handleLinkSkill}
              onReload={loadSkills}
              canEdit={userCanEdit}
              canAdmin={userCanAdmin}
              workspaceId={currentWorkspace?.id}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <SkillDialog
        open={showCreateDialog || !!editingSkill}
        onClose={() => {
          setShowCreateDialog(false);
          setEditingSkill(null);
        }}
        skill={editingSkill}
        allSkills={skills}
        onSuccess={() => {
          loadSkills();
          setShowCreateDialog(false);
          setEditingSkill(null);
        }}
      />

      {/* Skill Chain Dialog */}
      <Dialog open={showChainDialog} onOpenChange={setShowChainDialog}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Skill Executed!
            </DialogTitle>
            <DialogDescription>
              {selectedSkillForChain && `You've completed "${selectedSkillForChain.name}". What's next?`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {loadingSuggestions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : suggestedSkills.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-3">Suggested next skills:</p>
                {suggestedSkills.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => {
                      const nextSkill = skills.find(s => s.id === suggestion.id);
                      if (nextSkill) {
                        setShowChainDialog(false);
                        handleRunSkill(nextSkill);
                      }
                    }}
                    className="w-full flex items-center justify-between p-3 bg-secondary/50 hover:bg-secondary rounded-lg transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Brain className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{suggestion.name}</p>
                        <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">No suggested skills yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Link skills together to enable chaining!</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowChainDialog(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Skill Marketplace */}
      <SkillMarketplace
        open={showMarketplace}
        onClose={() => setShowMarketplace(false)}
        workspaceId={currentWorkspace?.id}
        onSkillInstalled={loadSkills}
      />
    </div>
  );
}

interface SkillCardProps {
  skill: Skill;
  index: number;
  allSkills: Skill[];
  onEdit: () => void;
  onDelete: () => void;
  onRun: () => void;
  onLink: (sourceId: string, targetId: string) => void;
  onReload: () => void;
  canEdit: boolean;
  canAdmin: boolean;
  workspaceId?: string;
}

function SkillCard({ skill, index, allSkills, onEdit, onDelete, onRun, onLink, onReload, canEdit, canAdmin, workspaceId }: SkillCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const linkedSkillNames = (skill.linked_skills || [])
    .map(id => allSkills.find(s => s.id === id)?.name)
    .filter(Boolean);

  // Calculate basic metrics
  const pagesCount = skill.linked_evidence?.length || 0;
  const goalsCount = skill.goals?.length || 0;
  const linkedSkillsCount = linkedSkillNames.length;
  const confidenceScore = (skill as any).confidence_score || 0;

  // Get REAL progress from backend (based on actual contributions)
  const [realProgress, setRealProgress] = useState<any>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);
  
  useEffect(() => {
    loadRealProgress();
  }, [skill.id]);
  
  const loadRealProgress = async () => {
    try {
      setLoadingProgress(true);
      const progress = await api.getSkillRealProgress(skill.id);
      setRealProgress(progress);
    } catch (error) {
      console.error('Error loading real progress:', error);
      // Fallback to basic calculation with partial credit
      const baseProgress = Math.min(100, Math.round(
        (pagesCount * 15) + 
        (goalsCount * 10) + 
        (linkedSkillsCount * 8) + 
        (confidenceScore * 100)
      ) / 1.8);
      
      setRealProgress({
        progress: baseProgress,
        can_evolve: baseProgress >= 100 && skill.level !== 'Expert',
        breakdown: {
          impact: Math.min(100, pagesCount * 20),
          count: Math.min(100, goalsCount * 15),
          diversity: Math.min(100, linkedSkillsCount * 12)
        }
      });
    } finally {
      setLoadingProgress(false);
    }
  };
  
  const progressValue = realProgress?.progress || 0;
  const canEvolve = realProgress?.can_evolve || false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-card/50 rounded-xl p-3 hover:bg-card transition-all"
    >
      {/* Compact Header */}
      <div className="flex items-center gap-3">
        {/* Round progress indicator - no extra colors */}
        <div className="relative w-9 h-9 flex-shrink-0">
          <svg className="w-9 h-9 transform -rotate-90">
            <circle
              cx="18"
              cy="18"
              r="16"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              className="text-secondary"
            />
            <circle
              cx="18"
              cy="18"
              r="16"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 16}`}
              strokeDashoffset={`${2 * Math.PI * 16 * (1 - progressValue / 100)}`}
              className="text-primary transition-all duration-500"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground truncate">{skill.name}</h3>
            <span className={cn(
              "inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded",
              levelColors[skill.level]
            )}>
              {skill.level}
            </span>
          </div>
          {/* Progress percentage inline */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{progressValue}% complete</span>
            {(skill as any).activation_count > 0 && (
              <span className="text-[10px] text-muted-foreground">
                • {(skill as any).activation_count} activations
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
          >
            <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", expanded && "rotate-90")} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-secondary transition-all">
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRun}>
                <Sparkles className="w-4 h-4 mr-2" />
                Get Suggestions
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem onClick={() => { setExpanded(true); setShowLinkMenu(true); }}>
                  <Link2 className="w-4 h-4 mr-2" />
                  Link Skill
                </DropdownMenuItem>
              )}
              {canEdit && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                </>
              )}
              {canAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-3 pt-3 border-t border-border/30 space-y-3"
        >
          {/* Description */}
          {skill.description && (
            <p className="text-xs text-muted-foreground">{skill.description}</p>
          )}

          {/* What AI Learned - Real Data */}
          <div className="p-2 bg-primary/5 rounded-lg">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-1.5">
              <Sparkles className="w-3 h-3 text-primary" />
              Intelligence Status
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              {realProgress?.total_impact > 0 && (
                <p className="text-primary font-medium">
                  💪 {realProgress.total_impact.toFixed(1)} impact score from {realProgress.contribution_count} contributions
                </p>
              )}
              {pagesCount > 0 && <p>📚 {pagesCount} page{pagesCount > 1 ? 's' : ''} linked</p>}
              {linkedSkillNames.length > 0 && <p>🔗 {linkedSkillNames.length} connected skill{linkedSkillNames.length > 1 ? 's' : ''}</p>}
              {goalsCount > 0 && <p>🎯 {goalsCount} goal{goalsCount > 1 ? 's' : ''} tracked</p>}
              {confidenceScore > 0 && (
                <p>✅ {Math.round(confidenceScore * 100)}% confidence from completed tasks</p>
              )}
              {!realProgress?.total_impact && pagesCount === 0 && linkedSkillNames.length === 0 && goalsCount === 0 && confidenceScore === 0 && (
                <p className="italic">Complete tasks and link pages to build intelligence</p>
              )}
            </div>
            
            {/* Evolve Button - Show at 80%+ with progress indicator */}
            {progressValue >= 80 && skill.level !== 'Expert' && (
              <button
                onClick={async () => {
                  if (progressValue < 100) {
                    toast.info(`${100 - progressValue}% more progress needed to evolve`);
                    return;
                  }
                  try {
                    const result = await api.evolveSkill(skill.id, workspaceId || '');
                    if (result.success) {
                      toast.success(`🎉 Skill evolved to ${result.new_level}!`);
                      onReload();
                    } else {
                      toast.error(result.message);
                    }
                  } catch (error) {
                    toast.error('Failed to evolve skill');
                  }
                }}
                disabled={progressValue < 100}
                className={cn(
                  "w-full mt-2 px-3 py-2 rounded-lg font-medium text-xs transition-all flex items-center justify-center gap-2",
                  progressValue >= 100
                    ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                )}
              >
                <Zap className="w-4 h-4" />
                {progressValue >= 100 
                  ? `Evolve to ${skill.level === 'Beginner' ? 'Intermediate' : skill.level === 'Intermediate' ? 'Advanced' : 'Expert'}`
                  : `${Math.round(100 - progressValue)}% to evolve`
                }
              </button>
            )}
            
            {/* Progress breakdown */}
            {realProgress?.breakdown && !canEvolve && (
              <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
                <p className="text-[10px] text-muted-foreground">Progress to next level:</p>
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span>Impact</span>
                    <span className="font-medium">{realProgress.breakdown.impact}%</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span>Contributions</span>
                    <span className="font-medium">{realProgress.breakdown.count}%</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span>Diversity</span>
                    <span className="font-medium">{realProgress.breakdown.diversity}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Connected Items */}
          <ConnectedItems 
            itemId={skill.id}
            itemType="skill"
            showAddButton={false}
            compact={true}
          />

          {/* Chains to */}
          {linkedSkillNames.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Chains to:</p>
              <div className="flex flex-wrap gap-1">
                {linkedSkillNames.map((name, i) => (
                  <span key={i} className="px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Goals */}
          {skill.goals && skill.goals.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Goals:</p>
              <ul className="space-y-0.5">
                {skill.goals.map((goal, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                    <Star className="w-3 h-3 text-warning mt-0.5 flex-shrink-0" />
                    <span>{goal}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Link Menu */}
          {showLinkMenu && canEdit && (
            <div className="p-2 bg-secondary/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Link to skill:</p>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {allSkills
                  .filter(s => s.id !== skill.id && !(skill.linked_skills || []).includes(s.id))
                  .map(s => (
                    <button
                      key={s.id}
                      onClick={() => {
                        onLink(skill.id, s.id);
                        setShowLinkMenu(false);
                      }}
                      className="w-full text-left px-2 py-1 text-xs hover:bg-secondary rounded"
                    >
                      {s.name}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Always learning
            </div>
            <button 
              onClick={onRun}
              className="text-xs text-primary hover:underline font-medium"
            >
              Get Suggestions
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

interface SkillDialogProps {
  open: boolean;
  onClose: () => void;
  skill: Skill | null;
  allSkills?: Skill[];
  onSuccess: () => void;
}

function SkillDialog({ open, onClose, skill, allSkills = [], onSuccess }: SkillDialogProps) {
  const { currentWorkspace } = useWorkspace();
  const [name, setName] = useState('');
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'>('Intermediate');
  const [skillType, setSkillType] = useState<'learning' | 'research' | 'creation' | 'analysis' | 'practice'>('learning');
  const [category, setCategory] = useState<'planning' | 'execution' | 'learning' | 'decision' | 'research' | 'startup'>('learning');
  const [goalTypes, setGoalTypes] = useState<string[]>(['clarity']);
  const [purpose, setPurpose] = useState('');
  const [longTermGoals, setLongTermGoals] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [linkedSkillIds, setLinkedSkillIds] = useState<string[]>([]);
  const [prerequisiteSkillIds, setPrerequisiteSkillIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showPageSelector, setShowPageSelector] = useState(false);
  const [pages, setPages] = useState<any[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [linkedEvidence, setLinkedEvidence] = useState<any[]>([]);
  
  // Helper function to get activation signals based on category
  const getActivationSignals = (cat: string): string[] => {
    const signalMap: Record<string, string[]> = {
      planning: ['oversized_task', 'no_subtasks', 'task_blocked'],
      execution: ['task_delayed', 'deadline_pressure', 'task_blocked'],
      learning: ['page_created', 'page_edited', 'page_neglected'],
      decision: ['task_blocked', 'deadline_pressure'],
      research: ['page_created', 'page_neglected'],
      startup: ['task_delayed', 'oversized_task', 'deadline_pressure']
    };
    return signalMap[cat] || ['page_created', 'task_completed'];
  };

  useEffect(() => {
    if (skill) {
      setName(skill.name);
      setLevel(skill.level);
      setSkillType(skill.skill_type || 'learning');
      setCategory((skill as any).category || skill.skill_type || 'learning');
      setGoalTypes((skill as any).goal_type || ['clarity']);
      setPurpose(skill.description);
      setLongTermGoals(skill.goals?.[0] || '');
      setKeywords(skill.evidence || []);
      setLinkedSkillIds(skill.linked_skills || []);
      setPrerequisiteSkillIds(skill.prerequisite_skills || []);
      setLinkedEvidence(skill.linked_evidence || []);
    } else {
      setName('');
      setLevel('Intermediate');
      setSkillType('learning');
      setCategory('learning');
      setGoalTypes(['clarity']);
      setPurpose('');
      setLongTermGoals('');
      setKeywords([]);
      setLinkedSkillIds([]);
      setPrerequisiteSkillIds([]);
      setLinkedEvidence([]);
    }
  }, [skill]);

  const loadPages = async () => {
    setLoadingPages(true);
    try {
      const data = currentWorkspace?.id 
        ? await api.getPagesByWorkspace(currentWorkspace.id)
        : await api.getPages();
      setPages(data);
    } catch (error) {
      toast.error('Failed to load pages');
      console.error(error);
    } finally {
      setLoadingPages(false);
    }
  };

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const handleAddPage = async (pageId: string) => {
    if (!skill) {
      toast.error('Please save the skill first before adding evidence');
      return;
    }

    try {
      await api.addSkillEvidence(skill.id, { page_id: pageId });
      toast.success('Page linked successfully');
      setShowPageSelector(false);
      // Reload skill data
      const updatedSkills = await api.getSkills(currentWorkspace?.id);
      const updatedSkill = updatedSkills.find((s: Skill) => s.id === skill.id);
      if (updatedSkill) {
        setLinkedEvidence(updatedSkill.linked_evidence || []);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to link page');
      console.error(error);
    }
  };

  const handleRemovePage = async (evidenceId: string) => {
    if (!skill) return;

    try {
      await api.removeSkillEvidence(skill.id, evidenceId);
      toast.success('Page unlinked');
      setLinkedEvidence(linkedEvidence.filter(e => e.id !== evidenceId));
    } catch (error) {
      toast.error('Failed to unlink page');
      console.error(error);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a skill name');
      return;
    }

    setSaving(true);
    try {
      const data: any = {
        name,
        level,
        skill_type: category, // Use category as skill_type for backward compatibility
        description: purpose,
        goals: longTermGoals ? [longTermGoals] : [],
        evidence: keywords,
        linked_skills: linkedSkillIds,
        prerequisite_skills: prerequisiteSkillIds,
        // Advanced Intelligence OS fields
        category: category,
        purpose: purpose,
        goal_type: goalTypes,
        scope: "workspace",
      };

      // Only add workspace_id when creating a new skill
      if (!skill && currentWorkspace?.id) {
        data.workspace_id = currentWorkspace.id;
      }

      console.log('Saving skill with data:', data);

      if (skill) {
        await api.updateSkill(skill.id, data);
        toast.success('Skill updated');
      } else {
        const result = await api.createSkill(data);
        console.log('Skill created:', result);
        toast.success('Skill created');
      }
      onSuccess();
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to save skill';
      toast.error(errorMessage);
      console.error('Error saving skill:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader className="pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-display flex items-center gap-2">
                {skill ? 'Edit Skill' : 'Create New Skill'}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Track your expertise and set learning goals
              </DialogDescription>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-6 py-6">
          {/* Skill Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
              <Brain className="w-4 h-4 text-primary" />
              Skill Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter skill name..."
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Purpose & Goals Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Purpose & Goals</h3>
            
            {/* Level */}
            <div className="flex items-center gap-4">
              <label className="text-sm text-muted-foreground min-w-[120px]">Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as any)}
                className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </select>
            </div>

            {/* Category (Intelligence OS) */}
            <div className="flex items-center gap-4">
              <label className="text-sm text-muted-foreground min-w-[120px]">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="planning">📋 Planning - Break down projects</option>
                <option value="execution">⚡ Execution - Get things done</option>
                <option value="learning">📚 Learning - Build knowledge</option>
                <option value="decision">🎯 Decision - Make choices</option>
                <option value="research">🔍 Research - Gather info</option>
                <option value="startup">🚀 Startup - Move fast</option>
              </select>
            </div>
            
            {/* Auto-Generated Signals Info */}
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
              <div className="flex items-start gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground mb-1">
                    Intelligence Signals (Auto-Generated)
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Based on "{category}" category, this skill will automatically activate when:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {getActivationSignals(category).map(signal => (
                      <span key={signal} className="px-2 py-0.5 text-[10px] bg-primary/10 text-primary rounded font-medium">
                        {signal.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Purpose */}
            <div className="flex items-start gap-4">
              <label className="text-sm text-muted-foreground min-w-[120px] pt-2">Purpose</label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Become proficient in SQL data analysis"
                className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            
            {/* Goal Types (Intelligence OS) */}
            <div className="flex items-start gap-4">
              <label className="text-sm text-muted-foreground min-w-[120px] pt-2">Goal Types</label>
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'speed', label: '⚡ Speed', desc: 'Get things done faster' },
                    { value: 'clarity', label: '💡 Clarity', desc: 'Understand better' },
                    { value: 'quality', label: '✨ Quality', desc: 'Improve output' },
                    { value: 'focus', label: '🎯 Focus', desc: 'Stay on track' },
                    { value: 'execution', label: '🚀 Execution', desc: 'Ship consistently' }
                  ].map(({ value, label, desc }) => (
                    <label
                      key={value}
                      className={cn(
                        "flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all",
                        goalTypes.includes(value)
                          ? "bg-primary/10 border-primary"
                          : "bg-secondary/30 border-border hover:border-primary/50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={goalTypes.includes(value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setGoalTypes([...goalTypes, value]);
                          } else {
                            setGoalTypes(goalTypes.filter(t => t !== value));
                          }
                        }}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{label}</p>
                        <p className="text-[10px] text-muted-foreground">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select what you want to achieve with this skill
                </p>
              </div>
            </div>

            {/* Long-Term Goals */}
            <div className="flex items-start gap-4">
              <label className="text-sm text-muted-foreground min-w-[120px] pt-2">Long-Term Goals</label>
              <input
                type="text"
                value={longTermGoals}
                onChange={(e) => setLongTermGoals(e.target.value)}
                placeholder="E.g. Become a data analyst, work at Google"
                className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          {/* Skill Chaining Section */}
          {allSkills.length > 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" />
                Skill Chaining
              </h3>
              
              {/* Prerequisite Skills */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Prerequisites (skills to learn first)
                </label>
                <div className="flex flex-wrap gap-2">
                  {allSkills
                    .filter(s => s.id !== skill?.id)
                    .map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          if (prerequisiteSkillIds.includes(s.id)) {
                            setPrerequisiteSkillIds(prerequisiteSkillIds.filter(id => id !== s.id));
                          } else {
                            setPrerequisiteSkillIds([...prerequisiteSkillIds, s.id]);
                          }
                        }}
                        className={cn(
                          "px-2 py-1 text-xs rounded-lg border transition-colors",
                          prerequisiteSkillIds.includes(s.id)
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-secondary border-border text-muted-foreground hover:border-primary/50"
                        )}
                      >
                        {s.name}
                      </button>
                    ))}
                </div>
              </div>

              {/* Linked Skills (chains to) */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Chains to (suggested next skills)
                </label>
                <div className="flex flex-wrap gap-2">
                  {allSkills
                    .filter(s => s.id !== skill?.id)
                    .map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          if (linkedSkillIds.includes(s.id)) {
                            setLinkedSkillIds(linkedSkillIds.filter(id => id !== s.id));
                          } else {
                            setLinkedSkillIds([...linkedSkillIds, s.id]);
                          }
                        }}
                        className={cn(
                          "px-2 py-1 text-xs rounded-lg border transition-colors",
                          linkedSkillIds.includes(s.id)
                            ? "bg-green-100 border-green-500 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-secondary border-border text-muted-foreground hover:border-green-500/50"
                        )}
                      >
                        → {s.name}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Keywords */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-foreground">
                Add Keywords <span className="text-muted-foreground font-normal">(Optional)</span>
              </label>
              <button
                onClick={handleAddKeyword}
                disabled={!newKeyword.trim()}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-3 h-3" />
                Add Keyword
              </button>
            </div>
            
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddKeyword();
                }
              }}
              placeholder="Type a keyword and press Enter"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all mb-3"
            />

            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-sm group hover:bg-secondary/80 transition-colors"
                  >
                    {keyword}
                    <button
                      onClick={() => handleRemoveKeyword(keyword)}
                      className="opacity-60 hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Evidence Section */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-foreground">Evidence</label>
              <button 
                onClick={() => {
                  if (!skill) {
                    toast.error('Please save the skill first before adding evidence');
                    return;
                  }
                  setShowPageSelector(!showPageSelector);
                  if (!showPageSelector) loadPages();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
              >
                <BookOpen className="w-3 h-3" />
                Add Page
              </button>
            </div>

            {/* Linked Evidence */}
            {linkedEvidence.length > 0 && (
              <div className="space-y-2 mb-3">
                {linkedEvidence.map((evidence) => (
                  <div
                    key={evidence.id}
                    className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg group hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-lg">{evidence.pages.icon}</span>
                      <span className="text-sm text-foreground truncate">{evidence.pages.title}</span>
                    </div>
                    <button
                      onClick={() => handleRemovePage(evidence.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Page Selector */}
            {showPageSelector && (
              <div className="border border-border rounded-lg p-3 max-h-60 overflow-y-auto">
                {loadingPages ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                ) : pages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No pages available. Create some pages first!
                  </p>
                ) : (
                  <div className="space-y-1">
                    {pages.map((page) => {
                      const isLinked = linkedEvidence.some(e => e.page_id === page.id);
                      return (
                        <button
                          key={page.id}
                          onClick={() => !isLinked && handleAddPage(page.id)}
                          disabled={isLinked}
                          className={cn(
                            "w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors",
                            isLinked 
                              ? "opacity-50 cursor-not-allowed" 
                              : "hover:bg-secondary cursor-pointer"
                          )}
                        >
                          <span className="text-base">{page.icon}</span>
                          <span className="text-sm text-foreground truncate flex-1">{page.title}</span>
                          {isLinked && (
                            <span className="text-xs text-muted-foreground">Linked</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {!skill && (
              <p className="text-sm text-muted-foreground">
                Save the skill first to link pages as evidence
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={saving} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="rounded-xl px-6">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {skill ? 'Update Skill' : 'Create Skill'}
                <span className="ml-2">→</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
