import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Star,
  Users,
  Plus,
  Sparkles,
  TrendingUp,
  Filter,
  X,
  Check,
  Loader2,
  Package,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface MarketplaceSkill {
  id: string;
  name: string;
  category: string;
  level: string;
  description: string;
  icon: string;
  tags: string[];
  rating: number;
  users: number;
  purpose: string;
  goal_type: string[];
  activation_signals: string[];
  planner_type: string;
}

interface SkillBundle {
  id: string;
  name: string;
  description: string;
  icon: string;
  skills: string[];
  rating: number;
  users: number;
  skill_details?: MarketplaceSkill[];
}

interface Category {
  value: string;
  label: string;
  count: number;
}

interface SkillMarketplaceProps {
  open: boolean;
  onClose: () => void;
  workspaceId?: string;
  onSkillInstalled: () => void;
}

export function SkillMarketplace({ open, onClose, workspaceId, onSkillInstalled }: SkillMarketplaceProps) {
  const [skills, setSkills] = useState<MarketplaceSkill[]>([]);
  const [bundles, setBundles] = useState<SkillBundle[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recommended, setRecommended] = useState<MarketplaceSkill[]>([]);
  const [topRated, setTopRated] = useState<MarketplaceSkill[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'name'>('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<MarketplaceSkill | null>(null);

  useEffect(() => {
    if (open) {
      loadMarketplace();
    }
  }, [open, selectedCategory, sortBy]);

  const loadMarketplace = async () => {
    try {
      setLoading(true);
      
      // Load marketplace skills
      const marketplaceData = await api.getMarketplaceSkills(selectedCategory, sortBy);
      setSkills(marketplaceData.skills || []);
      setBundles(marketplaceData.bundles || []);
      setCategories(marketplaceData.categories || []);
      
      // Load recommendations
      const recommendedData = await api.getRecommendedSkills(workspaceId);
      setRecommended(recommendedData || []);
      
      // Load top rated
      const topRatedData = await api.getTopRatedSkills(5);
      setTopRated(topRatedData || []);
    } catch (error) {
      console.error('Error loading marketplace:', error);
      toast.error('Failed to load marketplace');
    } finally {
      setLoading(false);
    }
  };

  const handleInstallSkill = async (skillId: string) => {
    try {
      setInstalling(skillId);
      await api.installMarketplaceSkill(skillId, workspaceId);
      toast.success('Skill installed successfully!');
      onSkillInstalled();
      setSelectedSkill(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to install skill');
    } finally {
      setInstalling(null);
    }
  };

  const filteredSkills = skills.filter(skill =>
    skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    skill.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    skill.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden bg-card p-0">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl font-display flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-primary" />
                    Skill Marketplace
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    Explore and add skills to improve your planning, focus, execution, and decision-making.
                  </DialogDescription>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </DialogHeader>

            {/* Search and Filters */}
            <div className="flex items-center gap-3 mt-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search skills..."
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 bg-background border border-border rounded-lg text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="popular">Popular</option>
                <option value="rating">Top Rated</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>

          {/* Content */}
          <div className="flex h-[calc(90vh-200px)]">
            {/* Sidebar - Categories */}
            <div className="w-64 border-r border-border p-4 overflow-y-auto">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Categories</p>
                {categories.map((category) => (
                  <button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                      selectedCategory === category.value
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-secondary text-foreground"
                    )}
                  >
                    <span>{category.label}</span>
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded",
                      selectedCategory === category.value
                        ? "bg-primary-foreground/20"
                        : "bg-secondary"
                    )}>
                      {category.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Top Rated */}
              <div className="mt-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Top Rated</p>
                <div className="space-y-2">
                  {topRated.map((skill) => (
                    <button
                      key={skill.id}
                      onClick={() => setSelectedSkill(skill)}
                      className="w-full flex items-center gap-2 p-2 hover:bg-secondary rounded-lg transition-colors text-left"
                    >
                      <span className="text-lg">{skill.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{skill.name}</p>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-warning fill-warning" />
                          <span className="text-xs text-muted-foreground">{skill.rating}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Skill Bundles */}
              {bundles.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Skill Bundles</p>
                  <div className="space-y-2">
                    {bundles.map((bundle) => (
                      <div
                        key={bundle.id}
                        className="p-2 bg-secondary/50 rounded-lg"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{bundle.icon}</span>
                          <p className="text-xs font-medium text-foreground">{bundle.name}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-2">{bundle.description}</p>
                        <button className="w-full px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
                          View All
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Recommended for you */}
                  {recommended.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Recommended for you
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {recommended.map((skill) => (
                          <SkillCard
                            key={skill.id}
                            skill={skill}
                            onInstall={handleInstallSkill}
                            onViewDetails={() => setSelectedSkill(skill)}
                            installing={installing === skill.id}
                            reason={(skill as any).reason}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All Skills */}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">
                      {selectedCategory === 'all' ? 'All Skills' : `${categories.find(c => c.value === selectedCategory)?.label} Skills`}
                    </h3>
                    {filteredSkills.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-muted-foreground">No skills found</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredSkills.map((skill) => (
                          <SkillCard
                            key={skill.id}
                            skill={skill}
                            onInstall={handleInstallSkill}
                            onViewDetails={() => setSelectedSkill(skill)}
                            installing={installing === skill.id}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Skill Details Dialog */}
      <SkillDetailsDialog
        skill={selectedSkill}
        onClose={() => setSelectedSkill(null)}
        onInstall={handleInstallSkill}
        installing={installing === selectedSkill?.id}
      />
    </>
  );
}

interface SkillCardProps {
  skill: MarketplaceSkill;
  onInstall: (skillId: string) => void;
  onViewDetails: () => void;
  installing: boolean;
  reason?: string;
}

function SkillCard({ skill, onInstall, onViewDetails, installing, reason }: SkillCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/50 border border-border rounded-xl p-4 hover:border-primary/50 transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">
            {skill.icon}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">{skill.name}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground capitalize">{skill.category}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{skill.level}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{skill.description}</p>

      {/* Reason (if recommended) */}
      {reason && (
        <div className="mb-3 px-2 py-1 bg-primary/10 rounded text-xs text-primary">
          {reason}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 text-warning fill-warning" />
          <span className="text-xs font-medium text-foreground">{skill.rating}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{skill.users.toLocaleString()}</span>
        </div>
        <span className="text-xs px-2 py-0.5 bg-secondary rounded">{skill.planner_type}</span>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {skill.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-secondary text-muted-foreground rounded">
            {tag}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          onClick={() => onInstall(skill.id)}
          disabled={installing}
          size="sm"
          className="flex-1 rounded-lg"
        >
          {installing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <>
              <Plus className="w-3 h-3 mr-1" />
              Add Skill
            </>
          )}
        </Button>
        <button
          onClick={onViewDetails}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </motion.div>
  );
}

interface SkillDetailsDialogProps {
  skill: MarketplaceSkill | null;
  onClose: () => void;
  onInstall: (skillId: string) => void;
  installing: boolean;
}

function SkillDetailsDialog({ skill, onClose, onInstall, installing }: SkillDetailsDialogProps) {
  if (!skill) return null;

  return (
    <Dialog open={!!skill} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-4xl">
              {skill.icon}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl font-display">{skill.name}</DialogTitle>
              <DialogDescription className="mt-1">
                {skill.category} • {skill.level}
              </DialogDescription>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-warning fill-warning" />
                  <span className="text-sm font-medium">{skill.rating}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{skill.users.toLocaleString()} users</span>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Description */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Description</h4>
            <p className="text-sm text-muted-foreground">{skill.description}</p>
          </div>

          {/* Purpose */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Purpose</h4>
            <p className="text-sm text-muted-foreground">{skill.purpose}</p>
          </div>

          {/* Goal Types */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Goal Types</h4>
            <div className="flex flex-wrap gap-2">
              {skill.goal_type.map((goal) => (
                <span key={goal} className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm capitalize">
                  {goal}
                </span>
              ))}
            </div>
          </div>

          {/* Activation Signals */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Activates When</h4>
            <div className="flex flex-wrap gap-2">
              {skill.activation_signals.map((signal) => (
                <span key={signal} className="px-3 py-1 bg-secondary text-foreground rounded-lg text-sm">
                  {signal.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {skill.tags.map((tag) => (
                <span key={tag} className="px-2 py-1 bg-secondary text-muted-foreground rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => onInstall(skill.id)} disabled={installing}>
            {installing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Add to Workspace
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
