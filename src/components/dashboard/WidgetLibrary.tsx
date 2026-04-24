import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Sparkles, CheckSquare, Compass, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WIDGET_DEFINITIONS, WIDGET_CATEGORIES, WidgetType, WidgetConfig } from './WidgetTypes';
import { cn } from '@/lib/utils';

interface WidgetLibraryProps {
  open: boolean;
  onClose: () => void;
  onAddWidget: (type: WidgetType) => void;
  existingWidgets: WidgetConfig[];
}

const CATEGORY_ICONS = {
  insights: Sparkles,
  productivity: CheckSquare,
  navigation: Compass,
  learning: BookOpen
};

export function WidgetLibrary({ open, onClose, onAddWidget, existingWidgets }: WidgetLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredWidgets = selectedCategory
    ? WIDGET_DEFINITIONS.filter(w => w.category === selectedCategory)
    : WIDGET_DEFINITIONS;

  const isWidgetAdded = (type: WidgetType) => 
    existingWidgets.some(w => w.type === type);

  const handleAddWidget = (type: WidgetType) => {
    onAddWidget(type);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <DialogTitle className="text-lg font-semibold">Add Widget</DialogTitle>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories */}
        <div className="flex gap-2 p-4 border-b border-border overflow-x-auto">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap",
              !selectedCategory 
                ? "bg-primary text-primary-foreground" 
                : "bg-secondary hover:bg-secondary/80"
            )}
          >
            All
          </button>
          {WIDGET_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.id as keyof typeof CATEGORY_ICONS];
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap",
                  selectedCategory === cat.id 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-secondary hover:bg-secondary/80"
                )}
              >
                <Icon className="w-4 h-4" />
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Widget Grid */}
        <div className="p-4 max-h-[400px] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence mode="popLayout">
              {filteredWidgets.map((widget, index) => {
                const added = isWidgetAdded(widget.type);
                return (
                  <motion.div
                    key={widget.type}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "relative p-4 border rounded-xl transition-all",
                      added 
                        ? "border-primary/30 bg-primary/5 opacity-60" 
                        : "border-border hover:border-primary/30 hover:bg-secondary/30 cursor-pointer"
                    )}
                    onClick={() => !added && handleAddWidget(widget.type)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        <WidgetIcon icon={widget.icon} />
                      </div>
                      {added ? (
                        <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                          Added
                        </span>
                      ) : (
                        <Plus className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <h4 className="font-medium text-sm text-foreground mb-1">{widget.name}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{widget.description}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded capitalize">
                        {widget.category}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {widget.defaultSize.w}x{widget.defaultSize.h}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        <div className="p-4 border-t border-border bg-secondary/30">
          <p className="text-xs text-muted-foreground text-center">
            Drag widgets to rearrange them on your dashboard
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WidgetIcon({ icon }: { icon: string }) {
  const icons: Record<string, React.ReactNode> = {
    'sparkles': <Sparkles className="w-5 h-5 text-primary" />,
    'check-square': <CheckSquare className="w-5 h-5 text-green-500" />,
    'pin': <span className="text-lg">📌</span>,
    'clock': <span className="text-lg">🕐</span>,
    'zap': <span className="text-lg">⚡</span>,
    'trending-up': <span className="text-lg">📈</span>,
    'flame': <span className="text-lg">🔥</span>,
    'calendar': <span className="text-lg">📅</span>,
    'file-text': <span className="text-lg">📄</span>,
    'git-branch': <span className="text-lg">🔗</span>,
  };
  return icons[icon] || <span className="text-lg">📦</span>;
}
