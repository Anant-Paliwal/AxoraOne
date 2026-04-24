import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Database, 
  LayoutGrid, 
  List, 
  Calendar, 
  GitBranch, 
  ClipboardList,
  Image,
  X,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  page_type: 'blank' | 'database' | 'board' | 'list' | 'gallery' | 'calendar' | 'timeline' | 'form';
  view_type: string;
  template_content: any;
  category: string;
}

interface PageTypeSelectorProps {
  onSelect: (template: PageTemplate) => void;
  onClose: () => void;
}

const iconMap: Record<string, any> = {
  blank: FileText,
  database: Database,
  board: LayoutGrid,
  list: List,
  gallery: Image,
  calendar: Calendar,
  timeline: GitBranch,
  form: ClipboardList,
};

export function PageTypeSelector({ onSelect, onClose }: PageTypeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Mock templates - in production, fetch from API
  const templates: PageTemplate[] = [
    {
      id: '1',
      name: 'Blank Page',
      description: 'Start with an empty page',
      icon: '📄',
      page_type: 'blank',
      view_type: 'page',
      template_content: { blocks: [] },
      category: 'Basic'
    },
    {
      id: '2',
      name: 'Meeting Notes',
      description: 'Template for meeting notes',
      icon: '📝',
      page_type: 'blank',
      view_type: 'page',
      template_content: {},
      category: 'Productivity'
    },
    {
      id: '3',
      name: 'Task Database',
      description: 'Manage tasks in a database',
      icon: '✅',
      page_type: 'database',
      view_type: 'table',
      template_content: {},
      category: 'Databases'
    },
    {
      id: '4',
      name: 'Project Board',
      description: 'Kanban board for projects',
      icon: '📋',
      page_type: 'board',
      view_type: 'board',
      template_content: {},
      category: 'Databases'
    },
    {
      id: '5',
      name: 'Content Calendar',
      description: 'Plan content with calendar view',
      icon: '📅',
      page_type: 'calendar',
      view_type: 'calendar',
      template_content: {},
      category: 'Databases'
    },
    {
      id: '6',
      name: 'Reading List',
      description: 'Track books and articles',
      icon: '📚',
      page_type: 'gallery',
      view_type: 'gallery',
      template_content: {},
      category: 'Databases'
    },
    {
      id: '7',
      name: 'Product Roadmap',
      description: 'Timeline view for roadmap',
      icon: '🗺️',
      page_type: 'timeline',
      view_type: 'timeline',
      template_content: {},
      category: 'Databases'
    },
    {
      id: '8',
      name: 'Simple List',
      description: 'Basic list view',
      icon: '📝',
      page_type: 'list',
      view_type: 'list',
      template_content: {},
      category: 'Databases'
    },
  ];

  const categories = ['All', 'Basic', 'Productivity', 'Databases', 'Forms'];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Create New Page</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a template to get started
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="rounded-lg"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="px-6 py-4 border-b border-border overflow-x-auto">
          <div className="flex gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => {
              const Icon = iconMap[template.page_type] || FileText;
              
              return (
                <motion.button
                  key={template.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect(template)}
                  className="group relative p-6 bg-card border-2 border-border hover:border-primary rounded-xl text-left transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-2xl">
                      {template.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground capitalize">
                          {template.view_type}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground">No templates found</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
