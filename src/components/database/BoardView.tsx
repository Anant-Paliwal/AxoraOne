import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, MoreHorizontal, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';

interface Property {
  id: string;
  name: string;
  property_type: string;
  config: any;
  property_order: number;
}

interface Row {
  id: string;
  properties: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface BoardViewProps {
  pageId: string;
  properties: Property[];
  rows: Row[];
  groupByProperty: Property | null;
  onAddRow: (columnValue?: string) => void;
  onUpdateRow: (rowId: string, properties: Record<string, any>) => void;
  onDeleteRow: (rowId: string) => void;
  onChangeGroupBy: (propertyId: string) => void;
}

export function BoardView({
  pageId,
  properties,
  rows,
  groupByProperty,
  onAddRow,
  onUpdateRow,
  onDeleteRow,
  onChangeGroupBy,
}: BoardViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [columns, setColumns] = useState<{ value: string; label: string }[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Get select properties for grouping
  const selectProperties = properties.filter(p => p.property_type === 'select');

  // Set default group by if not set
  useEffect(() => {
    if (!groupByProperty && selectProperties.length > 0) {
      onChangeGroupBy(selectProperties[0].id);
    }
  }, [selectProperties, groupByProperty]);

  // Generate columns from group by property options
  useEffect(() => {
    if (groupByProperty && groupByProperty.config.options) {
      setColumns(
        groupByProperty.config.options.map((opt: string) => ({
          value: opt,
          label: opt
        }))
      );
    }
  }, [groupByProperty]);

  const getRowsByColumn = (columnValue: string) => {
    if (!groupByProperty) return [];
    return rows.filter(row => row.properties[groupByProperty.id] === columnValue);
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (!over || !groupByProperty) {
      setActiveId(null);
      return;
    }

    const activeRow = rows.find(r => r.id === active.id);
    if (!activeRow) {
      setActiveId(null);
      return;
    }

    // Check if dropped on a column
    const targetColumn = columns.find(col => over.id === `column-${col.value}`);
    if (targetColumn) {
      onUpdateRow(activeRow.id, {
        ...activeRow.properties,
        [groupByProperty.id]: targetColumn.value
      });
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  if (!groupByProperty) {
    return (
      <div className="flex items-center justify-center h-64 text-center">
        <div>
          <p className="text-muted-foreground mb-4">
            No select property available for board view
          </p>
          <p className="text-sm text-muted-foreground">
            Add a select property to use board view
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border flex-shrink-0">
        <span className="text-sm text-muted-foreground">Group by:</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-lg">
              {groupByProperty.name}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {selectProperties.map((property) => (
              <DropdownMenuItem
                key={property.id}
                onClick={() => onChangeGroupBy(property.id)}
              >
                {property.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {columns.map((column) => (
            <BoardColumn
              key={column.value}
              column={column}
              rows={getRowsByColumn(column.value)}
              properties={properties}
              groupByProperty={groupByProperty}
              onAddRow={() => onAddRow(column.value)}
              onUpdateRow={onUpdateRow}
              onDeleteRow={onDeleteRow}
            />
          ))}
        </div>

        <DragOverlay>
          {activeId ? (
            <CardOverlay
              row={rows.find(r => r.id === activeId)!}
              properties={properties}
              groupByProperty={groupByProperty}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

interface BoardColumnProps {
  column: { value: string; label: string };
  rows: Row[];
  properties: Property[];
  groupByProperty: Property;
  onAddRow: () => void;
  onUpdateRow: (rowId: string, properties: Record<string, any>) => void;
  onDeleteRow: (rowId: string) => void;
}

function BoardColumn({
  column,
  rows,
  properties,
  groupByProperty,
  onAddRow,
  onUpdateRow,
  onDeleteRow,
}: BoardColumnProps) {
  const { setNodeRef } = useSortable({
    id: `column-${column.value}`,
    data: { type: 'column', column }
  });

  return (
    <div
      ref={setNodeRef}
      className="flex-shrink-0 w-80 bg-secondary/20 rounded-xl p-4 flex flex-col max-h-full"
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground">{column.label}</h3>
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
            {rows.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddRow}
          className="h-8 w-8 p-0"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Cards */}
      <SortableContext items={rows.map(r => r.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto space-y-2 min-h-[100px]">
          <AnimatePresence>
            {rows.map((row) => (
              <BoardCard
                key={row.id}
                row={row}
                properties={properties}
                groupByProperty={groupByProperty}
                onUpdateRow={onUpdateRow}
                onDeleteRow={onDeleteRow}
              />
            ))}
          </AnimatePresence>
        </div>
      </SortableContext>

      {rows.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Drop cards here
        </div>
      )}
    </div>
  );
}

interface BoardCardProps {
  row: Row;
  properties: Property[];
  groupByProperty: Property;
  onUpdateRow: (rowId: string, properties: Record<string, any>) => void;
  onDeleteRow: (rowId: string) => void;
}

function BoardCard({ row, properties, groupByProperty, onUpdateRow, onDeleteRow }: BoardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Get title property (first title or text property)
  const titleProperty = properties.find(p => p.property_type === 'title') || 
                       properties.find(p => p.property_type === 'text');
  const title = titleProperty ? row.properties[titleProperty.id] : 'Untitled';

  // Get other visible properties (exclude group by property)
  const visibleProperties = properties
    .filter(p => p.id !== groupByProperty.id && p.property_type !== 'title')
    .slice(0, 3);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing group hover:border-primary/30 transition-colors",
        isDragging && "opacity-50"
      )}
    >
      {/* Drag Handle & Actions */}
      <div className="flex items-start justify-between mb-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded hover:bg-secondary opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onDeleteRow(row.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Card
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Title */}
      <h4 className="font-medium text-foreground mb-3 line-clamp-2">
        {title || 'Untitled'}
      </h4>

      {/* Properties */}
      <div className="space-y-2">
        {visibleProperties.map((property) => {
          const value = row.properties[property.id];
          if (!value) return null;

          return (
            <div key={property.id} className="text-xs">
              <span className="text-muted-foreground">{property.name}: </span>
              <span className="text-foreground">
                {property.property_type === 'checkbox' ? (
                  value ? '✓' : '✗'
                ) : property.property_type === 'select' ? (
                  <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary">
                    {value}
                  </span>
                ) : (
                  value
                )}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function CardOverlay({ row, properties, groupByProperty }: { row: Row; properties: Property[]; groupByProperty: Property }) {
  const titleProperty = properties.find(p => p.property_type === 'title') || 
                       properties.find(p => p.property_type === 'text');
  const title = titleProperty ? row.properties[titleProperty.id] : 'Untitled';

  return (
    <div className="bg-card border-2 border-primary rounded-lg p-3 w-80 shadow-xl">
      <div className="flex items-start justify-between mb-2">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      <h4 className="font-medium text-foreground">
        {title || 'Untitled'}
      </h4>
    </div>
  );
}
