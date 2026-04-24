import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Plus, Settings, RotateCcw, Check, Maximize2, LayoutGrid, Columns, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DashboardWidget } from './DashboardWidget';
import { WidgetLibrary } from './WidgetLibrary';
import { WidgetConfig, WidgetType, WIDGET_DEFINITIONS, DEFAULT_LAYOUT } from './WidgetTypes';
import { cn } from '@/lib/utils';

interface DashboardGridProps {
  layout: WidgetConfig[];
  gridColumns: 1 | 2 | 3;
  spacing: 'none' | 'compact' | 'comfortable';
  onLayoutChange: (layout: WidgetConfig[]) => void;
  onGridColumnsChange: (columns: 1 | 2 | 3) => void;
  onSpacingChange: (spacing: 'none' | 'compact' | 'comfortable') => void;
  isEditMode: boolean;
  onEditModeChange: (editing: boolean) => void;
}

function SortableWidget({ 
  widget, 
  isEditMode, 
  onRemove,
  onUpdate 
}: { 
  widget: WidgetConfig; 
  isEditMode: boolean; 
  onRemove: (id: string) => void;
  onUpdate: (widget: WidgetConfig) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "min-h-[200px]",
        // Mobile: full width, Tablet: respect widget width, Desktop: respect widget width
        "col-span-1",
        `md:col-span-${Math.min(widget.w, 2)}`,
        `lg:col-span-${widget.w}`,
        // Row span only on larger screens
        `md:row-span-${widget.h}`,
        isDragging && "opacity-50"
      )}
    >
      <DashboardWidget
        widget={widget}
        isEditMode={isEditMode}
        onRemove={onRemove}
        onUpdate={onUpdate}
        isDragging={isDragging}
        dragHandleProps={isEditMode ? { ...attributes, ...listeners } : undefined}
      />
    </div>
  );
}

export function DashboardGrid({ 
  layout,
  gridColumns,
  spacing,
  onLayoutChange,
  onGridColumnsChange,
  onSpacingChange,
  isEditMode, 
  onEditModeChange 
}: DashboardGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = layout.findIndex((w) => w.id === active.id);
      const newIndex = layout.findIndex((w) => w.id === over.id);
      const newLayout = arrayMove(layout, oldIndex, newIndex);
      onLayoutChange(newLayout);
    }
  };

  const handleUpdateWidget = useCallback((updatedWidget: WidgetConfig) => {
    const newLayout = layout.map(w => w.id === updatedWidget.id ? updatedWidget : w);
    onLayoutChange(newLayout);
  }, [layout, onLayoutChange]);

  const handleRemoveWidget = useCallback((id: string) => {
    onLayoutChange(layout.filter(w => w.id !== id));
  }, [layout, onLayoutChange]);

  const handleAddWidget = useCallback((type: WidgetType) => {
    const definition = WIDGET_DEFINITIONS.find(w => w.type === type);
    if (!definition) return;

    const newWidget: WidgetConfig = {
      id: `widget-${type}-${Date.now()}`,
      type,
      x: 0,
      y: 0,
      w: definition.defaultSize.w,
      h: definition.defaultSize.h,
      settings: {}
    };

    onLayoutChange([...layout, newWidget]);
  }, [layout, onLayoutChange]);

  const handleResetLayout = useCallback(() => {
    onLayoutChange(DEFAULT_LAYOUT);
  }, [onLayoutChange]);

  const activeWidget = activeId ? layout.find(w => w.id === activeId) : null;

  // Get gap class based on spacing setting
  const getGapClass = () => {
    switch (spacing) {
      case 'none': return 'gap-0';
      case 'compact': return 'gap-2';
      case 'comfortable': return 'gap-4';
      default: return 'gap-0';
    }
  };

  // Get grid columns class based on layout setting
  const getGridColumnsClass = () => {
    switch (gridColumns) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-1 md:grid-cols-2';
      case 3: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      default: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    }
  };

  return (
    <div className="space-y-4">
      {/* Widget Grid - Notion-style centered with max-width */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={layout.map(w => w.id)} strategy={rectSortingStrategy}>
          <div className={cn(
            "grid transition-all",
            // Notion-style: centered with max-width and EVEN MORE horizontal padding
            "max-w-5xl mx-auto px-12 sm:px-16 lg:px-24",
            // Gap between widgets
            "gap-6",
            getGridColumnsClass(),
            // Auto rows for flexible height
            "auto-rows-min",
            isEditMode && "bg-secondary/20 p-4 rounded-2xl border-2 border-dashed border-border"
          )}>
            {layout.map((widget) => (
              <SortableWidget
                key={widget.id}
                widget={widget}
                isEditMode={isEditMode}
                onRemove={handleRemoveWidget}
                onUpdate={handleUpdateWidget}
              />
            ))}

            {/* Add Widget Placeholder (in edit mode) */}
            {isEditMode && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="min-h-[200px] border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/30 hover:bg-secondary/30 transition-all"
                onClick={() => setShowLibrary(true)}
              >
                <Plus className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Add Widget</span>
              </motion.div>
            )}
          </div>
        </SortableContext>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeWidget && (
            <div className="opacity-80 shadow-2xl">
              <DashboardWidget
                widget={activeWidget}
                isEditMode={true}
                onRemove={() => {}}
                onUpdate={() => {}}
                isDragging={true}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Widget Library Dialog */}
      <WidgetLibrary
        open={showLibrary}
        onClose={() => setShowLibrary(false)}
        onAddWidget={handleAddWidget}
        existingWidgets={layout}
      />
    </div>
  );
}
