import { useState, useCallback, useMemo, useRef } from 'react';
import { api } from '@/lib/api';
import {
  Database,
  Plus,
  Trash2,
  MoreHorizontal,
  X,
  Check,
  ChevronDown,
  ChevronRight,
  Upload,
  Filter,
  Search,
  Eye,
  EyeOff,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Columns,
  Type,
  Hash,
  Calendar,
  CheckSquare,
  Link,
  Mail,
  ListFilter,
  SigmaSquare,
  Table,
  LayoutGrid,
  List,
  CalendarDays,
  GanttChart,
  Image,
  GripVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Block, Column, Row } from './types';

// View types for the database
type ViewType = 'table' | 'board' | 'list' | 'calendar' | 'timeline' | 'gallery';

interface DatabaseViewsBlockProps {
  block: Block;
  editable: boolean;
  onUpdate: (data: any) => void;
  onDelete?: () => void;
}

const VIEW_OPTIONS = [
  { type: 'table', label: 'Table', icon: Table, description: 'Spreadsheet view' },
  { type: 'board', label: 'Board', icon: LayoutGrid, description: 'Kanban board' },
  { type: 'list', label: 'List', icon: List, description: 'Simple list' },
  { type: 'calendar', label: 'Calendar', icon: CalendarDays, description: 'Calendar view' },
  { type: 'timeline', label: 'Timeline', icon: GanttChart, description: 'Gantt chart' },
  { type: 'gallery', label: 'Gallery', icon: Image, description: 'Card grid' },
] as const;

const COLUMN_TYPES = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'select', label: 'Select', icon: ChevronDown },
  { type: 'multi_select', label: 'Multi-select', icon: ListFilter },
  { type: 'date', label: 'Date', icon: Calendar },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { type: 'url', label: 'URL', icon: Link },
  { type: 'email', label: 'Email', icon: Mail },
];

const DEFAULT_COLUMNS: Column[] = [
  { id: '1', name: 'Name', type: 'text' },
  { id: '2', name: 'Status', type: 'select', config: { options: [
    { value: 'todo', label: 'To Do', color: '#6b7280' },
    { value: 'in_progress', label: 'In Progress', color: '#f59e0b' },
    { value: 'done', label: 'Done', color: '#10b981' },
  ]}},
  { id: '3', name: 'Date', type: 'date' },
];

export function DatabaseViewsBlockComponent({ block, editable, onUpdate, onDelete }: DatabaseViewsBlockProps) {
  const [currentView, setCurrentView] = useState<ViewType>(block.data?.currentView || 'table');
  const [columns, setColumns] = useState<Column[]>(block.data?.columns || DEFAULT_COLUMNS);
  const [rows, setRows] = useState<Row[]>(block.data?.rows || []);
  const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterColumn, setFilterColumn] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState('');
  const [groupByColumn, setGroupByColumn] = useState<string | null>(block.data?.groupByColumn || '2');
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Check if view is locked (single view mode)
  const isLockedView = block.data?.lockedView === true;

  const saveData = useCallback((newColumns: Column[], newRows: Row[], view?: ViewType, groupBy?: string | null) => {
    onUpdate({ 
      columns: newColumns, 
      rows: newRows, 
      currentView: view || currentView,
      groupByColumn: groupBy !== undefined ? groupBy : groupByColumn
    });
  }, [onUpdate, currentView, groupByColumn]);

  // Row operations
  const addRow = (initialData?: Partial<Row>) => {
    const newRow: Row = { id: Date.now().toString(), ...initialData };
    columns.forEach(col => { 
      if (newRow[col.id] === undefined) newRow[col.id] = ''; 
    });
    const newRows = [...rows, newRow];
    setRows(newRows);
    saveData(columns, newRows);
  };

  const deleteRow = (rowId: string) => {
    const newRows = rows.filter(r => r.id !== rowId);
    setRows(newRows);
    saveData(columns, newRows);
  };

  const updateCell = (rowId: string, colId: string, value: any) => {
    const newRows = rows.map(r => r.id === rowId ? { ...r, [colId]: value } : r);
    setRows(newRows);
    saveData(columns, newRows);
  };

  // Column operations
  const addColumn = () => {
    const newCol: Column = {
      id: Date.now().toString(),
      name: `Column ${columns.length + 1}`,
      type: 'text'
    };
    const newColumns = [...columns, newCol];
    setColumns(newColumns);
    saveData(newColumns, rows);
  };

  const deleteColumn = (colId: string) => {
    const newColumns = columns.filter(c => c.id !== colId);
    const newRows = rows.map(r => {
      const { [colId]: _, ...rest } = r;
      return rest as Row;
    });
    setColumns(newColumns);
    setRows(newRows);
    saveData(newColumns, newRows);
  };

  // Filter and sort
  const filteredRows = useMemo(() => {
    let result = [...rows];
    
    if (searchQuery) {
      result = result.filter(row => 
        Object.values(row).some(v => 
          String(v).toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
    
    if (filterColumn && filterValue) {
      result = result.filter(row => 
        String(row[filterColumn] || '').toLowerCase().includes(filterValue.toLowerCase())
      );
    }
    
    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = a[sortColumn] || '';
        const bVal = b[sortColumn] || '';
        const col = columns.find(c => c.id === sortColumn);
        
        if (col?.type === 'number') {
          return sortDirection === 'asc' 
            ? Number(aVal) - Number(bVal) 
            : Number(bVal) - Number(aVal);
        }
        
        const cmp = String(aVal).localeCompare(String(bVal));
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }
    
    return result;
  }, [rows, searchQuery, sortColumn, sortDirection, filterColumn, filterValue, columns]);

  // Group rows by column (for Board view)
  const groupedRows = useMemo(() => {
    if (!groupByColumn) return { ungrouped: filteredRows };
    
    const col = columns.find(c => c.id === groupByColumn);
    if (!col || col.type !== 'select') return { ungrouped: filteredRows };
    
    const groups: Record<string, Row[]> = {};
    col.config?.options?.forEach(opt => {
      groups[opt.value] = [];
    });
    groups[''] = []; // For items without a value
    
    filteredRows.forEach(row => {
      const val = row[groupByColumn] || '';
      if (!groups[val]) groups[val] = [];
      groups[val].push(row);
    });
    
    return groups;
  }, [filteredRows, groupByColumn, columns]);

  const renderCellValue = (col: Column, value: any, compact = false) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-muted-foreground/50">{compact ? '-' : 'Empty'}</span>;
    }

    switch (col.type) {
      case 'checkbox':
        return <input type="checkbox" checked={!!value} readOnly className="h-4 w-4 pointer-events-none" />;
      case 'select':
        const opt = col.config?.options?.find(o => o.value === value);
        return opt ? (
          <span 
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: opt.color + '20', color: opt.color }}
          >
            {opt.label}
          </span>
        ) : <span className="text-muted-foreground">{value}</span>;
      case 'date':
        return <span className="text-sm">{new Date(value).toLocaleDateString()}</span>;
      case 'url':
        return <a href={value} target="_blank" rel="noopener" className="text-primary hover:underline text-sm truncate">{value}</a>;
      case 'email':
        return <a href={`mailto:${value}`} className="text-primary hover:underline text-sm">{value}</a>;
      case 'number':
        return <span className="font-mono text-sm">{value}</span>;
      default:
        return <span className={cn("text-sm", compact && "truncate")}>{String(value)}</span>;
    }
  };

  const changeView = (view: ViewType) => {
    setCurrentView(view);
    saveData(columns, rows, view);
  };

  const visibleColumns = columns.filter(c => !c.hidden);
  const nameColumn = columns.find(c => c.name.toLowerCase() === 'name') || columns[0];
  const statusColumn = columns.find(c => c.type === 'select');
  const dateColumn = columns.find(c => c.type === 'date');

  return (
    <div className="my-4">
      {/* Header with View Tabs */}
      <div className="flex items-center justify-between px-0 py-2 mb-4">
        {/* View Tabs - Only show if not locked */}
        {!isLockedView ? (
          <div className="flex items-center gap-1">
            {VIEW_OPTIONS.map(view => {
              const Icon = view.icon;
              return (
                <button
                  key={view.type}
                  onClick={() => changeView(view.type as ViewType)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
                    currentView === view.type
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{view.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {(() => {
              const viewInfo = VIEW_OPTIONS.find(v => v.type === currentView);
              const Icon = viewInfo?.icon || Table;
              return (
                <>
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{viewInfo?.label || 'Database'}</span>
                </>
              );
            })()}
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-8 w-40 border-0 bg-background/50"
            />
          </div>
          
          {editable && (
            <Button size="sm" onClick={() => addRow()} className="h-8">
              <Plus className="w-4 h-4 mr-1" />
              New
            </Button>
          )}
          
          {onDelete && editable && (
            <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* View Content */}
      <div className="p-0">
        {currentView === 'table' && (
          <TableView
            columns={visibleColumns}
            rows={filteredRows}
            editable={editable}
            editingCell={editingCell}
            editValue={editValue}
            onEditCell={(rowId, colId) => {
              setEditingCell({ rowId, colId });
              const row = rows.find(r => r.id === rowId);
              const col = columns.find(c => c.id === colId);
              setEditValue(col?.type === 'checkbox' ? String(!!row?.[colId]) : (row?.[colId] || ''));
            }}
            onEditValueChange={setEditValue}
            onSaveCell={(rowId, colId, value) => {
              const col = columns.find(c => c.id === colId);
              updateCell(rowId, colId, col?.type === 'checkbox' ? value === 'true' : value);
              setEditingCell(null);
            }}
            onCancelEdit={() => setEditingCell(null)}
            onDeleteRow={deleteRow}
            onAddRow={addRow}
            onAddColumn={addColumn}
            renderCellValue={renderCellValue}
          />
        )}

        {currentView === 'board' && (
          <BoardView
            columns={columns}
            groupedRows={groupedRows}
            groupByColumn={groupByColumn}
            editable={editable}
            nameColumn={nameColumn}
            onUpdateCell={updateCell}
            onDeleteRow={deleteRow}
            onAddRow={addRow}
            renderCellValue={renderCellValue}
          />
        )}

        {currentView === 'list' && (
          <ListView
            columns={columns}
            rows={filteredRows}
            editable={editable}
            nameColumn={nameColumn}
            expandedRows={expandedRows}
            onToggleExpand={(id) => {
              const newExpanded = new Set(expandedRows);
              if (newExpanded.has(id)) newExpanded.delete(id);
              else newExpanded.add(id);
              setExpandedRows(newExpanded);
            }}
            onDeleteRow={deleteRow}
            onAddRow={addRow}
            renderCellValue={renderCellValue}
          />
        )}

        {currentView === 'calendar' && (
          <CalendarView
            columns={columns}
            rows={filteredRows}
            dateColumn={dateColumn}
            nameColumn={nameColumn}
            editable={editable}
            onAddRow={addRow}
            renderCellValue={renderCellValue}
          />
        )}

        {currentView === 'timeline' && (
          <TimelineView
            columns={columns}
            rows={filteredRows}
            dateColumn={dateColumn}
            nameColumn={nameColumn}
            statusColumn={statusColumn}
            editable={editable}
            renderCellValue={renderCellValue}
          />
        )}

        {currentView === 'gallery' && (
          <GalleryView
            columns={columns}
            rows={filteredRows}
            nameColumn={nameColumn}
            statusColumn={statusColumn}
            editable={editable}
            onDeleteRow={deleteRow}
            onAddRow={addRow}
            renderCellValue={renderCellValue}
          />
        )}
      </div>

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No data yet</p>
          {editable && (
            <Button variant="outline" size="sm" className="mt-2" onClick={() => addRow()}>
              <Plus className="w-4 h-4 mr-1" />
              Add first row
            </Button>
          )}
        </div>
      )}
    </div>
  );
}


// ============================================
// TABLE VIEW
// ============================================
interface TableViewProps {
  columns: Column[];
  rows: Row[];
  editable: boolean;
  editingCell: { rowId: string; colId: string } | null;
  editValue: string;
  onEditCell: (rowId: string, colId: string) => void;
  onEditValueChange: (value: string) => void;
  onSaveCell: (rowId: string, colId: string, value: string) => void;
  onCancelEdit: () => void;
  onDeleteRow: (rowId: string) => void;
  onAddRow: () => void;
  onAddColumn: () => void;
  renderCellValue: (col: Column, value: any) => React.ReactNode;
}

function TableView({
  columns, rows, editable, editingCell, editValue,
  onEditCell, onEditValueChange, onSaveCell, onCancelEdit,
  onDeleteRow, onAddRow, onAddColumn, renderCellValue
}: TableViewProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/30">
            {columns.map(col => (
              <th key={col.id} className="text-left px-3 py-2 text-sm font-medium text-muted-foreground">
                {col.name}
              </th>
            ))}
            {editable && <th className="w-10"></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="group border-b border-border/20 hover:bg-muted/30">
              {columns.map(col => (
                <td key={col.id} className="p-0">
                  {editingCell?.rowId === row.id && editingCell?.colId === col.id ? (
                    <div className="flex items-center px-3 py-1.5">
                      {col.type === 'select' ? (
                        <select
                          value={editValue}
                          onChange={e => onEditValueChange(e.target.value)}
                          className="h-7 px-2 rounded border border-input bg-background text-sm flex-1"
                          autoFocus
                        >
                          <option value="">Select...</option>
                          {col.config?.options?.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                          value={editValue}
                          onChange={e => onEditValueChange(e.target.value)}
                          className="h-7 flex-1"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') onSaveCell(row.id, col.id, editValue);
                            if (e.key === 'Escape') onCancelEdit();
                          }}
                        />
                      )}
                      <button onClick={() => onSaveCell(row.id, col.id, editValue)} className="ml-1 p-1">
                        <Check className="w-4 h-4 text-green-500" />
                      </button>
                      <button onClick={onCancelEdit} className="p-1">
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => editable && onEditCell(row.id, col.id)}
                      className={cn(
                        "px-3 py-2 min-h-[40px] flex items-center",
                        editable && "cursor-pointer hover:bg-muted/50"
                      )}
                    >
                      {renderCellValue(col, row[col.id])}
                    </div>
                  )}
                </td>
              ))}
              {editable && (
                <td className="p-1">
                  <button 
                    onClick={() => onDeleteRow(row.id)}
                    className="p-1 opacity-0 group-hover:opacity-100 text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      
      {editable && (
        <button
          onClick={onAddRow}
          className="w-full mt-1 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors flex items-center justify-center gap-1"
        >
          <Plus className="w-4 h-4" />
          New row
        </button>
      )}
    </div>
  );
}

// ============================================
// BOARD VIEW (Kanban)
// ============================================
interface BoardViewProps {
  columns: Column[];
  groupedRows: Record<string, Row[]>;
  groupByColumn: string | null;
  editable: boolean;
  nameColumn: Column | undefined;
  onUpdateCell: (rowId: string, colId: string, value: any) => void;
  onDeleteRow: (rowId: string) => void;
  onAddRow: (initialData?: Partial<Row>) => void;
  renderCellValue: (col: Column, value: any, compact?: boolean) => React.ReactNode;
}

function BoardView({
  columns, groupedRows, groupByColumn, editable, nameColumn,
  onUpdateCell, onDeleteRow, onAddRow, renderCellValue
}: BoardViewProps) {
  const groupCol = columns.find(c => c.id === groupByColumn);
  const options = groupCol?.config?.options || [];

  const handleDragStart = (e: React.DragEvent, rowId: string) => {
    e.dataTransfer.setData('rowId', rowId);
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const rowId = e.dataTransfer.getData('rowId');
    if (rowId && groupByColumn) {
      onUpdateCell(rowId, groupByColumn, newStatus);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {options.map(opt => (
        <div
          key={opt.value}
          className="flex-shrink-0 w-72 bg-muted/30 rounded-xl"
          onDragOver={e => e.preventDefault()}
          onDrop={e => handleDrop(e, opt.value)}
        >
          {/* Column Header */}
          <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: opt.color }}
              />
              <span className="font-medium text-sm">{opt.label}</span>
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {groupedRows[opt.value]?.length || 0}
              </span>
            </div>
          </div>

          {/* Cards */}
          <div className="p-2 space-y-2 min-h-[100px]">
            {groupedRows[opt.value]?.map(row => (
              <div
                key={row.id}
                draggable={editable}
                onDragStart={e => handleDragStart(e, row.id)}
                className={cn(
                  "bg-card border border-border/50 rounded-lg p-3 shadow-sm",
                  editable && "cursor-grab active:cursor-grabbing hover:border-primary/50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm flex-1">
                    {nameColumn ? row[nameColumn.id] || 'Untitled' : 'Untitled'}
                  </p>
                  {editable && (
                    <button 
                      onClick={() => onDeleteRow(row.id)}
                      className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {/* Show other fields */}
                <div className="mt-2 space-y-1">
                  {columns.filter(c => c.id !== nameColumn?.id && c.id !== groupByColumn && row[c.id]).slice(0, 2).map(col => (
                    <div key={col.id} className="text-xs text-muted-foreground">
                      {renderCellValue(col, row[col.id], true)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {editable && (
              <button
                onClick={() => onAddRow(groupByColumn ? { [groupByColumn]: opt.value } : {})}
                className="w-full py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Ungrouped items */}
      {groupedRows['']?.length > 0 && (
        <div className="flex-shrink-0 w-72 bg-muted/30 rounded-xl">
          <div className="px-3 py-2 border-b border-border/30">
            <span className="font-medium text-sm text-muted-foreground">No Status</span>
          </div>
          <div className="p-2 space-y-2">
            {groupedRows[''].map(row => (
              <div key={row.id} className="bg-card border border-border/50 rounded-lg p-3">
                <p className="font-medium text-sm">
                  {nameColumn ? row[nameColumn.id] || 'Untitled' : 'Untitled'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ============================================
// LIST VIEW
// ============================================
interface ListViewProps {
  columns: Column[];
  rows: Row[];
  editable: boolean;
  nameColumn: Column | undefined;
  expandedRows: Set<string>;
  onToggleExpand: (id: string) => void;
  onDeleteRow: (rowId: string) => void;
  onAddRow: () => void;
  renderCellValue: (col: Column, value: any, compact?: boolean) => React.ReactNode;
}

function ListView({
  columns, rows, editable, nameColumn, expandedRows,
  onToggleExpand, onDeleteRow, onAddRow, renderCellValue
}: ListViewProps) {
  return (
    <div className="space-y-1">
      {rows.map(row => {
        const isExpanded = expandedRows.has(row.id);
        return (
          <div key={row.id} className="border border-border/30 rounded-lg overflow-hidden">
            <div 
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer"
              onClick={() => onToggleExpand(row.id)}
            >
              <button className="text-muted-foreground">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              <div className="flex-1">
                <p className="font-medium">
                  {nameColumn ? row[nameColumn.id] || 'Untitled' : 'Untitled'}
                </p>
              </div>
              {/* Quick preview of other columns */}
              <div className="flex items-center gap-3">
                {columns.filter(c => c.id !== nameColumn?.id && row[c.id]).slice(0, 3).map(col => (
                  <div key={col.id} className="text-sm">
                    {renderCellValue(col, row[col.id], true)}
                  </div>
                ))}
              </div>
              {editable && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteRow(row.id); }}
                  className="p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {isExpanded && (
              <div className="px-4 py-3 bg-muted/20 border-t border-border/30 grid grid-cols-2 gap-3">
                {columns.filter(c => c.id !== nameColumn?.id).map(col => (
                  <div key={col.id}>
                    <p className="text-xs text-muted-foreground mb-1">{col.name}</p>
                    <div className="text-sm">{renderCellValue(col, row[col.id])}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      
      {editable && (
        <button
          onClick={onAddRow}
          className="w-full py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-lg border border-dashed border-border/50 transition-colors flex items-center justify-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Add item
        </button>
      )}
    </div>
  );
}

// ============================================
// CALENDAR VIEW
// ============================================
interface CalendarViewProps {
  columns: Column[];
  rows: Row[];
  dateColumn: Column | undefined;
  nameColumn: Column | undefined;
  editable: boolean;
  onAddRow: (initialData?: Partial<Row>) => void;
  renderCellValue: (col: Column, value: any, compact?: boolean) => React.ReactNode;
}

function CalendarView({
  columns, rows, dateColumn, nameColumn, editable, onAddRow, renderCellValue
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  
  const days = [];
  for (let i = 0; i < startPadding; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const getEventsForDay = (day: number) => {
    if (!dateColumn) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return rows.filter(row => {
      const rowDate = row[dateColumn.id];
      if (!rowDate) return false;
      return rowDate.startsWith(dateStr);
    });
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={() => setCurrentDate(new Date(year, month - 1))}
          className="p-2 hover:bg-muted rounded-lg"
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
        <h3 className="font-semibold text-lg">
          {monthNames[month]} {year}
        </h3>
        <button 
          onClick={() => setCurrentDate(new Date(year, month + 1))}
          className="p-2 hover:bg-muted rounded-lg"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          const events = day ? getEventsForDay(day) : [];
          const isToday = day && new Date().toDateString() === new Date(year, month, day).toDateString();
          
          return (
            <div
              key={idx}
              className={cn(
                "min-h-[80px] p-1 border border-border/30 rounded-lg",
                day ? "bg-card/50" : "bg-muted/20",
                isToday && "ring-2 ring-primary"
              )}
            >
              {day && (
                <>
                  <div className={cn(
                    "text-sm font-medium mb-1",
                    isToday && "text-primary"
                  )}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {events.slice(0, 2).map(event => (
                      <div 
                        key={event.id}
                        className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded truncate"
                      >
                        {nameColumn ? event[nameColumn.id] : 'Event'}
                      </div>
                    ))}
                    {events.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{events.length - 2} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {!dateColumn && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          Add a Date column to see events on the calendar
        </div>
      )}
    </div>
  );
}


// ============================================
// TIMELINE VIEW (Gantt-like)
// ============================================
interface TimelineViewProps {
  columns: Column[];
  rows: Row[];
  dateColumn: Column | undefined;
  nameColumn: Column | undefined;
  statusColumn: Column | undefined;
  editable: boolean;
  renderCellValue: (col: Column, value: any, compact?: boolean) => React.ReactNode;
}

function TimelineView({
  columns, rows, dateColumn, nameColumn, statusColumn, editable, renderCellValue
}: TimelineViewProps) {
  // Sort rows by date
  const sortedRows = useMemo(() => {
    if (!dateColumn) return rows;
    return [...rows].sort((a, b) => {
      const dateA = a[dateColumn.id] || '';
      const dateB = b[dateColumn.id] || '';
      return dateA.localeCompare(dateB);
    });
  }, [rows, dateColumn]);

  // Get date range
  const dateRange = useMemo(() => {
    if (!dateColumn || rows.length === 0) return { start: new Date(), end: new Date() };
    
    const dates = rows
      .map(r => r[dateColumn.id])
      .filter(d => d)
      .map(d => new Date(d));
    
    if (dates.length === 0) return { start: new Date(), end: new Date() };
    
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Add padding
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);
    
    return { start: minDate, end: maxDate };
  }, [rows, dateColumn]);

  const totalDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));

  const getPositionForDate = (dateStr: string) => {
    if (!dateStr) return 0;
    const date = new Date(dateStr);
    const daysDiff = Math.ceil((date.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    return (daysDiff / totalDays) * 100;
  };

  const getStatusColor = (row: Row) => {
    if (!statusColumn) return '#6b7280';
    const value = row[statusColumn.id];
    const opt = statusColumn.config?.options?.find(o => o.value === value);
    return opt?.color || '#6b7280';
  };

  // Generate month markers
  const monthMarkers = useMemo(() => {
    const markers = [];
    const current = new Date(dateRange.start);
    current.setDate(1);
    
    while (current <= dateRange.end) {
      const position = getPositionForDate(current.toISOString().split('T')[0]);
      markers.push({
        label: current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        position
      });
      current.setMonth(current.getMonth() + 1);
    }
    return markers;
  }, [dateRange]);

  return (
    <div className="overflow-x-auto">
      {/* Timeline Header */}
      <div className="relative h-8 border-b border-border/30 mb-2">
        {monthMarkers.map((marker, idx) => (
          <div
            key={idx}
            className="absolute text-xs text-muted-foreground"
            style={{ left: `${marker.position}%` }}
          >
            {marker.label}
          </div>
        ))}
      </div>

      {/* Timeline Rows */}
      <div className="space-y-2">
        {sortedRows.map(row => {
          const position = dateColumn ? getPositionForDate(row[dateColumn.id]) : 0;
          const color = getStatusColor(row);
          
          return (
            <div key={row.id} className="flex items-center gap-4">
              {/* Row Label */}
              <div className="w-48 flex-shrink-0">
                <p className="text-sm font-medium truncate">
                  {nameColumn ? row[nameColumn.id] || 'Untitled' : 'Untitled'}
                </p>
                {dateColumn && row[dateColumn.id] && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(row[dateColumn.id]).toLocaleDateString()}
                  </p>
                )}
              </div>
              
              {/* Timeline Bar */}
              <div className="flex-1 relative h-8 bg-muted/30 rounded-lg">
                <div
                  className="absolute h-6 top-1 rounded-md flex items-center px-2"
                  style={{
                    left: `${Math.max(0, Math.min(position, 95))}%`,
                    width: '80px',
                    backgroundColor: color + '30',
                    borderLeft: `3px solid ${color}`
                  }}
                >
                  <span className="text-xs truncate" style={{ color }}>
                    {statusColumn && renderCellValue(statusColumn, row[statusColumn.id], true)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!dateColumn && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Add a Date column to see items on the timeline
        </div>
      )}
    </div>
  );
}

// ============================================
// GALLERY VIEW (Card Grid)
// ============================================
interface GalleryViewProps {
  columns: Column[];
  rows: Row[];
  nameColumn: Column | undefined;
  statusColumn: Column | undefined;
  editable: boolean;
  onDeleteRow: (rowId: string) => void;
  onAddRow: () => void;
  renderCellValue: (col: Column, value: any, compact?: boolean) => React.ReactNode;
}

function GalleryView({
  columns, rows, nameColumn, statusColumn, editable, onDeleteRow, onAddRow, renderCellValue
}: GalleryViewProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {rows.map(row => (
        <div
          key={row.id}
          className="group bg-card border border-border/50 rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all"
        >
          {/* Card Image/Cover */}
          <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <span className="text-4xl opacity-50">📄</span>
          </div>
          
          {/* Card Content */}
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-sm line-clamp-2">
                {nameColumn ? row[nameColumn.id] || 'Untitled' : 'Untitled'}
              </h4>
              {editable && (
                <button 
                  onClick={() => onDeleteRow(row.id)}
                  className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* Status Badge */}
            {statusColumn && row[statusColumn.id] && (
              <div className="mt-2">
                {renderCellValue(statusColumn, row[statusColumn.id], true)}
              </div>
            )}
            
            {/* Other Fields Preview */}
            <div className="mt-3 space-y-1">
              {columns
                .filter(c => c.id !== nameColumn?.id && c.id !== statusColumn?.id && row[c.id])
                .slice(0, 2)
                .map(col => (
                  <div key={col.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">{col.name}:</span>
                    <span className="truncate">{renderCellValue(col, row[col.id], true)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ))}
      
      {/* Add Card */}
      {editable && (
        <button
          onClick={onAddRow}
          className="h-full min-h-[200px] border-2 border-dashed border-border/50 rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
        >
          <Plus className="w-8 h-8" />
          <span className="text-sm">Add new</span>
        </button>
      )}
    </div>
  );
}

export default DatabaseViewsBlockComponent;
