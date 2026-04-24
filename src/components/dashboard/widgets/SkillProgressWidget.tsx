import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, Loader2, Zap, AlertTriangle, ArrowRight, CheckCircle2, TrendingUp, TrendingDown, Plus, Filter, MoreHorizontal } from 'lucide-react';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { differenceInDays } from 'date-fns';
import { useCacheFirstSkills, useCacheFirstTasks } from '@/hooks/useCacheFirst';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Skill {
  id: string;
  name: string;
  level: string;
  confidence_score?: number;
  activation_count?: number;
  last_activated_at?: string;
  success_rate?: number;
}

// Convert technical skill names to human-friendly descriptions
function humanizeSkillName(technicalName: string): { display: string; subtitle?: string } {
  const name = technicalName.toLowerCase().trim();
  
  // Common patterns
  const patterns: Record<string, { display: string; subtitle?: string }> = {
    // Programming Languages
    'python': { display: 'Python Development', subtitle: 'Programming' },
    'realted python': { display: 'Python Development', subtitle: 'Programming' },
    'javascript': { display: 'Web Development', subtitle: 'JavaScript' },
    'typescript': { display: 'Web Development', subtitle: 'TypeScript' },
    'java': { display: 'Software Development', subtitle: 'Java' },
    'c++': { display: 'Systems Programming', subtitle: 'C++' },
    'rust': { display: 'Systems Programming', subtitle: 'Rust' },
    'go': { display: 'Backend Development', subtitle: 'Go' },
    
    // Data & Analytics
    'pyspark': { display: 'Big Data Processing', subtitle: 'PySpark' },
    'spark': { display: 'Big Data Processing', subtitle: 'Apache Spark' },
    'sql': { display: 'Database Querying', subtitle: 'SQL' },
    'pandas': { display: 'Data Analysis', subtitle: 'Python' },
    'numpy': { display: 'Numerical Computing', subtitle: 'Python' },
    'data analytics': { display: 'Data Analytics', subtitle: 'Analysis & Insights' },
    'data science': { display: 'Data Science', subtitle: 'ML & Analytics' },
    'machine learning': { display: 'Machine Learning', subtitle: 'AI Development' },
    'deep learning': { display: 'Deep Learning', subtitle: 'Neural Networks' },
    
    // Web Development
    'react': { display: 'Frontend Development', subtitle: 'React' },
    'vue': { display: 'Frontend Development', subtitle: 'Vue.js' },
    'angular': { display: 'Frontend Development', subtitle: 'Angular' },
    'node': { display: 'Backend Development', subtitle: 'Node.js' },
    'nodejs': { display: 'Backend Development', subtitle: 'Node.js' },
    'express': { display: 'API Development', subtitle: 'Express.js' },
    'django': { display: 'Web Development', subtitle: 'Django' },
    'flask': { display: 'Web Development', subtitle: 'Flask' },
    
    // Cloud & DevOps
    'aws': { display: 'Cloud Infrastructure', subtitle: 'AWS' },
    'azure': { display: 'Cloud Infrastructure', subtitle: 'Azure' },
    'gcp': { display: 'Cloud Infrastructure', subtitle: 'Google Cloud' },
    'docker': { display: 'Containerization', subtitle: 'Docker' },
    'kubernetes': { display: 'Container Orchestration', subtitle: 'Kubernetes' },
    'terraform': { display: 'Infrastructure as Code', subtitle: 'Terraform' },
    
    // Databases
    'mongodb': { display: 'NoSQL Databases', subtitle: 'MongoDB' },
    'postgresql': { display: 'Relational Databases', subtitle: 'PostgreSQL' },
    'mysql': { display: 'Relational Databases', subtitle: 'MySQL' },
    'redis': { display: 'Caching & Data Stores', subtitle: 'Redis' },
    
    // Other
    'git': { display: 'Version Control', subtitle: 'Git' },
    'testing': { display: 'Quality Assurance', subtitle: 'Testing' },
    'api': { display: 'API Development', subtitle: 'REST & GraphQL' },
  };
  
  // Check exact match
  if (patterns[name]) {
    return patterns[name];
  }
  
  // Check partial matches
  for (const [key, value] of Object.entries(patterns)) {
    if (name.includes(key) || key.includes(name)) {
      return value;
    }
  }
  
  // Fallback: capitalize and add "Development" if it's a single word
  const words = technicalName.split(' ');
  if (words.length === 1) {
    return {
      display: `${technicalName} Development`,
      subtitle: technicalName
    };
  }
  
  // Otherwise return as-is
  return { display: technicalName };
}

interface Task {
  id: string;
  title: string;
  status: string;
  linked_skill_id?: string;
  due_date?: string;
  completed_at?: string;
  updated_at?: string;
}

type SkillStatus = 'actively_helping' | 'needs_attention' | 'stalled' | 'progressing';

interface SkillWithStatus extends Skill {
  status: SkillStatus;
  statusReason: string;
  impact: string; // What the skill is actually DOING
  linkedTaskCount: number;
  completedThisWeek: number;
  overdueTaskCount: number;
  trend: 'up' | 'down' | 'stable';
}

export function SkillProgressWidget() {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  
  // ✅ CACHE-FIRST LOADING - Instant load from IndexedDB
  const { skills: cachedSkills, loading: skillsLoading } = useCacheFirstSkills(
    currentWorkspace?.id,
    () => currentWorkspace?.id ? api.getSkills(currentWorkspace.id) : Promise.resolve([])
  );
  
  const { tasks: cachedTasks, loading: tasksLoading } = useCacheFirstTasks(
    currentWorkspace?.id,
    () => currentWorkspace?.id ? api.getTasks(currentWorkspace.id) : Promise.resolve([])
  );
  
  const [skills, setSkills] = useState<Skill[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  useEffect(() => {
    if (cachedSkills.length > 0) {
      setSkills(cachedSkills);
    }
  }, [cachedSkills]);
  
  useEffect(() => {
    if (cachedTasks.length > 0) {
      setTasks(cachedTasks);
    }
  }, [cachedTasks]);
  
  const loading = skillsLoading && skills.length === 0;
  
  const [skillProgress, setSkillProgress] = useState<Record<string, any>>({});
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Create skill form state
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState('beginner');
  const [creating, setCreating] = useState(false);

  // Load skill progress in background
  useEffect(() => {
    if (currentWorkspace && skills.length > 0) {
      loadSkillProgress();
    }
  }, [currentWorkspace, skills]);

  const loadSkillProgress = async () => {
    if (!currentWorkspace || skills.length === 0) return;
    const progressData: Record<string, any> = {};
    await Promise.all(
      skills.map(async (skill: Skill) => {
        try {
          const progress = await api.getSkillRealProgress(skill.id);
          progressData[skill.id] = progress;
        } catch (error) {
          console.error(`Failed to load progress for skill ${skill.id}:`, error);
        }
      })
    );
    setSkillProgress(progressData);
  };

  const loadData = async () => {
    if (!currentWorkspace) return;
    try {
      const [skillsData, tasksData] = await Promise.all([
        api.getSkills(currentWorkspace.id),
        api.getTasks(currentWorkspace.id)
      ]);
      setSkills(skillsData || []);
      setTasks(tasksData || []);
      
      // Load real progress for each skill
      const progressData: Record<string, any> = {};
      await Promise.all(
        (skillsData || []).map(async (skill: Skill) => {
          try {
            const progress = await api.getSkillRealProgress(skill.id);
            progressData[skill.id] = progress;
          } catch (error) {
            console.error(`Failed to load progress for skill ${skill.id}:`, error);
          }
        })
      );
      setSkillProgress(progressData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleCreateSkill = async () => {
    if (!currentWorkspace || !newSkillName.trim()) return;
    
    try {
      setCreating(true);
      await api.createSkill({
        workspace_id: currentWorkspace.id,
        name: newSkillName,
        level: newSkillLevel,
      });
      
      // Reset form
      setNewSkillName('');
      setNewSkillLevel('beginner');
      setShowCreateDialog(false);
      
      // Reload skills
      await loadData();
    } catch (error) {
      console.error('Failed to create skill:', error);
    } finally {
      setCreating(false);
    }
  };

  // REAL INTELLIGENCE: Determine skill status based on ACTUAL IMPACT
  const skillsWithStatus = useMemo((): SkillWithStatus[] => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return skills.map(skill => {
      const linkedTasks = tasks.filter(t => t.linked_skill_id === skill.id);
      const activeTasks = linkedTasks.filter(t => t.status !== 'done' && t.status !== 'completed');
      const overdueTasks = activeTasks.filter(t => t.due_date && new Date(t.due_date) < now);
      const inProgressTasks = activeTasks.filter(t => t.status === 'in-progress' || t.status === 'in_progress');
      
      // Get real progress data from backend
      const progress = skillProgress[skill.id];
      const contributionCount = progress?.contribution_count || 0;
      const totalImpact = progress?.total_impact || 0;
      const pagesLinked = progress?.pages_linked || 0;
      
      // Tasks completed this week linked to this skill
      const completedThisWeek = linkedTasks.filter(t => {
        const isDone = t.status === 'done' || t.status === 'completed';
        const completedDate = t.completed_at || t.updated_at;
        return isDone && completedDate && new Date(completedDate) > weekAgo;
      }).length;

      // Tasks completed last week (for trend)
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const completedLastWeek = linkedTasks.filter(t => {
        const isDone = t.status === 'done' || t.status === 'completed';
        const completedDate = t.completed_at || t.updated_at;
        return isDone && completedDate && 
          new Date(completedDate) > twoWeeksAgo && 
          new Date(completedDate) <= weekAgo;
      }).length;

      // Determine trend
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (completedThisWeek > completedLastWeek) trend = 'up';
      else if (completedThisWeek < completedLastWeek && completedLastWeek > 0) trend = 'down';

      let status: SkillStatus;
      let statusReason: string;
      let impact: string;

      // REAL STATUS based on ACTUAL CONTRIBUTIONS + TASKS
      if (overdueTasks.length > 0) {
        status = 'needs_attention';
        statusReason = `${overdueTasks.length} overdue`;
        impact = `Blocking ${overdueTasks.length} task${overdueTasks.length > 1 ? 's' : ''}`;
      } else if (contributionCount > 0 || completedThisWeek > 0) {
        status = 'actively_helping';
        statusReason = contributionCount > 0 ? `${contributionCount} contributions` : `${completedThisWeek} done this week`;
        if (totalImpact > 0) {
          impact = `${totalImpact.toFixed(1)} impact • ${pagesLinked} pages linked`;
        } else if (completedThisWeek > 0) {
          impact = `Completed ${completedThisWeek} task${completedThisWeek > 1 ? 's' : ''}`;
        } else {
          impact = `${contributionCount} contribution${contributionCount > 1 ? 's' : ''}`;
        }
      } else if (inProgressTasks.length > 0) {
        status = 'progressing';
        statusReason = `${inProgressTasks.length} in progress`;
        impact = `Working on ${inProgressTasks.length} task${inProgressTasks.length > 1 ? 's' : ''}`;
      } else if (activeTasks.length > 0) {
        status = 'progressing';
        statusReason = `${activeTasks.length} planned`;
        impact = `${activeTasks.length} task${activeTasks.length > 1 ? 's' : ''} queued`;
      } else if (linkedTasks.length > 0 && completedThisWeek === 0) {
        status = 'stalled';
        statusReason = 'No recent activity';
        impact = 'No tasks completed recently';
      } else {
        status = 'stalled';
        statusReason = 'No tasks linked';
        impact = 'Not contributing to any work';
      }

      return {
        ...skill,
        status,
        statusReason,
        impact,
        linkedTaskCount: linkedTasks.length,
        completedThisWeek,
        overdueTaskCount: overdueTasks.length,
        trend
      };
    });
  }, [skills, tasks, skillProgress]);

  // Sort: needs_attention first, then actively_helping, then stalled
  const sortedSkills = useMemo(() => {
    const statusOrder: Record<SkillStatus, number> = {
      'needs_attention': 0,
      'actively_helping': 1,
      'progressing': 2,
      'stalled': 3
    };
    return [...skillsWithStatus]
      .filter(s => filterStatus === 'all' || s.status === filterStatus)
      .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  }, [skillsWithStatus, filterStatus]);

  const topSkills = sortedSkills.slice(0, 4);
  const activelyHelpingCount = skillsWithStatus.filter(s => s.status === 'actively_helping').length;
  const needsAttentionCount = skillsWithStatus.filter(s => s.status === 'needs_attention' || s.status === 'stalled').length;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getStatusIcon = (status: SkillStatus) => {
    switch (status) {
      case 'actively_helping':
        return <Zap className="w-3.5 h-3.5 text-green-500" />;
      case 'needs_attention':
        return <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />;
      case 'stalled':
        return <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />;
      case 'progressing':
        return <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />;
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="w-3 h-3 text-red-500" />;
    return null;
  };

  return (
    <div className="h-full flex flex-col group">
      {/* Header - Outside border */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="font-medium text-sm text-foreground flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          Skill Impact
        </h3>
        <div className="flex items-center gap-1">
          {/* Add Skill Button - Shows on hover */}
          <button 
            onClick={() => setShowCreateDialog(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-secondary rounded"
            title="Add skill"
          >
            <Plus className="w-4 h-4 text-muted-foreground hover:text-primary" />
          </button>
          
          {/* Filter Button - Shows on hover */}
          <button 
            onClick={() => setShowFilterDialog(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-secondary rounded"
            title="Filter skills"
          >
            <Filter className="w-4 h-4 text-muted-foreground hover:text-primary" />
          </button>
          
          {/* More Options Dropdown - Shows on hover */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-secondary rounded"
                title="More options"
              >
                <MoreHorizontal className="w-4 h-4 text-muted-foreground hover:text-primary" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/skills')}>
                <Brain className="w-4 h-4 mr-2" />
                View all skills
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add skill
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowFilterDialog(true)}>
                <Filter className="w-4 h-4 mr-2" />
                Sort & filter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content - Inside border */}
      <div className="flex-1 flex flex-col bg-card border border-border/50 rounded-xl overflow-hidden">
        <div className="p-4 flex-1 flex flex-col">
          {/* Compact Status Summary - Shows REAL numbers */}
          <div className="flex items-center gap-4 text-sm mb-4 pb-3 border-b border-border">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-green-500" />
              <span className="font-semibold text-foreground">{activelyHelpingCount}</span>
              <span className="text-muted-foreground text-xs">Contributing</span>
            </div>
            {needsAttentionCount > 0 && (
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                <span className="font-semibold text-foreground">{needsAttentionCount}</span>
                <span className="text-muted-foreground text-xs">Need Work</span>
              </div>
            )}
          </div>

          {topSkills.length > 0 ? (
            <div className="flex-1 space-y-2 overflow-y-auto">
              {topSkills.map((skill) => {
                const friendlyName = humanizeSkillName(skill.name);
                return (
                  <button
                    key={skill.id}
                    onClick={() => navigate(`/skills?highlight=${skill.id}`)}
                    className="w-full flex items-start gap-3 p-2.5 rounded-lg hover:bg-secondary/50 transition-colors text-left group"
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                      skill.status === 'actively_helping' ? "bg-green-500/10" :
                      skill.status === 'needs_attention' ? "bg-orange-500/10" :
                      "bg-secondary"
                    )}>
                      {getStatusIcon(skill.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-foreground truncate">
                          {friendlyName.display}
                        </p>
                        {getTrendIcon(skill.trend)}
                      </div>
                      {friendlyName.subtitle && (
                        <p className="text-[10px] text-muted-foreground/70 truncate">
                          {friendlyName.subtitle}
                        </p>
                      )}
                      {/* THE IMPACT LINE - What the skill is ACTUALLY doing */}
                      <p className={cn(
                        "text-xs mt-0.5 font-medium",
                        skill.status === 'actively_helping' ? "text-green-600 dark:text-green-400" :
                        skill.status === 'needs_attention' ? "text-orange-600 dark:text-orange-400" :
                        "text-muted-foreground"
                      )}>
                        {skill.impact}
                      </p>
                      {/* NEXT ACTION LINE */}
                      <p className="text-xs text-muted-foreground mt-1">
                        Next: {skill.status === 'needs_attention' ? `Fix ${skill.overdueTaskCount} overdue` :
                                skill.status === 'actively_helping' ? 'Keep momentum' :
                                skill.status === 'progressing' ? `Complete ${skill.linkedTaskCount} task${skill.linkedTaskCount > 1 ? 's' : ''}` :
                                'Link a task to start'}
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
              <Brain className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No skills tracked yet</p>
            </div>
          )}
        </div>

       
      </div>

      {/* Create Skill Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Skill</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="skill-name">Skill Name</Label>
              <Input
                id="skill-name"
                placeholder="e.g., Python, Data Analysis, Machine Learning..."
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSkill()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-level">Current Level</Label>
              <Select value={newSkillLevel} onValueChange={setNewSkillLevel}>
                <SelectTrigger id="skill-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSkill} disabled={!newSkillName.trim() || creating}>
              {creating ? 'Adding...' : 'Add Skill'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter Dialog */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filter Skills</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filter-status">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="filter-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Skills</SelectItem>
                  <SelectItem value="actively_helping">Contributing</SelectItem>
                  <SelectItem value="needs_attention">Need Work</SelectItem>
                  <SelectItem value="stalled">Stalled</SelectItem>
                  <SelectItem value="progressing">Progressing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setFilterStatus('all')}
            >
              Clear Filter
            </Button>
            <Button onClick={() => setShowFilterDialog(false)}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
