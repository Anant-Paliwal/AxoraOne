import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, GripVertical, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetConfig, WidgetType } from './WidgetTypes';
import { WidgetSettings } from './WidgetSettings';

// Widget content components
import { PinnedPagesWidget } from './widgets/PinnedPagesWidget';
import { SkillProgressWidget } from './widgets/SkillProgressWidget';
import { UpcomingDeadlinesWidget } from './widgets/UpcomingDeadlinesWidget';
import { QuickPagesWidget } from './widgets/QuickPagesWidget';
import { CalendarInsightWidget } from './widgets/CalendarInsightWidget';
import { NextBestActionWidget } from './widgets/NextBestActionWidget';
import { ActiveTasksWidget } from './widgets/ActiveTasksWidget';

interface DashboardWidgetProps {
  widget: WidgetConfig;
  isEditMode: boolean;
  onRemove: (id: string) => void;
  onUpdate?: (widget: WidgetConfig) => void;
  isDragging?: boolean;
  dragHandleProps?: any;
}

const WIDGET_COMPONENTS: Record<WidgetType, React.ComponentType<{ settings?: Record<string, any> }>> = {
  'pinned-pages': PinnedPagesWidget,
  'skill-progress': SkillProgressWidget,
  'upcoming-deadlines': UpcomingDeadlinesWidget,
  'quick-pages': QuickPagesWidget,
  'calendar-insight': CalendarInsightWidget,
  'next-best-action': NextBestActionWidget,
  'active-tasks': ActiveTasksWidget,
};

export function DashboardWidget({ 
  widget, 
  isEditMode, 
  onRemove,
  onUpdate,
  isDragging,
  dragHandleProps 
}: DashboardWidgetProps) {
  const [showSettings, setShowSettings] = useState(false);
  const WidgetComponent = WIDGET_COMPONENTS[widget.type];

  // Page-related widgets that should not have borders
  const pageWidgets = ['pinned-pages', 'recent-pages', 'quick-pages'];
  const shouldShowBorder = !pageWidgets.includes(widget.type);

  if (!WidgetComponent) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Unknown widget type: {widget.type}
      </div>
    );
  }

  return (
    <motion.div
      layout
      className={cn(
        "h-full overflow-hidden transition-all",
        // Transparent background, no borders in normal mode
        "bg-transparent border-0",
        isEditMode && "ring-2 ring-primary/20 ring-offset-2 ring-offset-background border border-border bg-card rounded-xl",
        isDragging && "shadow-2xl scale-105 z-50 bg-card rounded-xl"
      )}
    >
      {/* Edit Mode Header */}
      {isEditMode && (
        <div className="flex items-center justify-between px-3 py-2 bg-secondary/50 border-b border-border">
          <div 
            {...dragHandleProps}
            className="flex items-center gap-2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="w-4 h-4" />
            <span className="text-xs font-medium capitalize">
              {widget.type.replace(/-/g, ' ')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button 
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button 
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              onClick={() => onRemove(widget.id)}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
      
      {/* Widget Content */}
      <div className={cn("h-full overflow-auto", isEditMode && "pointer-events-none opacity-80")}>
        <WidgetComponent settings={widget.settings} />
      </div>

      {/* Widget Settings Dialog */}
      {onUpdate && (
        <WidgetSettings
          widget={widget}
          open={showSettings}
          onClose={() => setShowSettings(false)}
          onUpdate={onUpdate}
        />
      )}
    </motion.div>
  );
}
