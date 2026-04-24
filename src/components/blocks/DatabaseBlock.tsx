import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Database,
  Plus,
  Trash2,
  MoreHorizontal,
  X,
  Check,
  ChevronDown,
  ChevronUp,
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
  SigmaSquare
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

interface DatabaseBlockProps {
  block: Block;
  editable: boolean;
  onUpdate: (data: any) => void;
  onDelete?: () => void;
}

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

export function DatabaseBlockComponent({ block, editable, onUpdate, onDelete }: DatabaseBlockProps) {
  const [columns, setColumns] = useState<Column[]>(block.data?.columns || [
    { id: '1', name: 'Name', type: 'text' },
    { id: '2', name: 'Status', type: 'select', config: { options: [
      { value: 'todo', label: 'To Do', color: '#6b7280' },
      { value: 'in_progress', label: 'In Progress', color: '#f59e0b' },
      { value: 'done', label: 'Done', color: '#10b981' },
    ]}},
    { id: '3', name: 'Date', type: 'date' },
  ]);
  
  const [rows, setRows] = useState<Row[]>(block.data?.rows || []);
  const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterColumn, setFilterColumn] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState('');
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const saveData = useCallback((newColumns: Column[], newRows: Row[]) => {
    onUpdate({ columns: newColumns, rows: newRows });
  }, [onUpdate]);

  // CSV/Excel Import
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await api.uploadCSV(file);
      
      if (!result.headers || !result.rows) {
        toast.error('Invalid file format');
        return;
      }

      const newColumns: Column[] = result.headers.map((name: string, idx: number) => ({
        id: `col_${idx}`,
        name,
        type: result.column_types?.[name] || 'text'
      }));

      const newRows: Row[] = result.rows.map((row: any, rowIdx: number) => {
        const newRow: Row = { id: `row_${rowIdx}` };
        result.headers.forEach((header: string, colIdx: number) => {
          newRow[`col_${colIdx}`] = row[header] || '';
        });
        return newRow;
      });

      setColumns(newColumns);
      setRows(newRows);
      saveData(newColumns, newRows);
      toast.success(`Imported ${newRows.length} rows from ${file.name}`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Row operations
  const addRow = () => {
    const newRow: Row = { id: Date.now().toString() };
    columns.forEach(col => { newRow[col.id] = ''; });
    const newRows = [...rows, newRow];
    setRows(newRows);
    saveData(columns, newRows);
  };

  const deleteRow = (rowId: string) => {
    const newRows = rows.filter(r => r.id !== rowId);
    setRows(newRows);
    saveData(columns, newRows);
  };

  const duplicateRow = (rowId: string) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    const newRow = { ...row, id: Date.now().toString() };
    const idx = rows.findIndex(r => r.id === rowId);
    const newRows = [...rows.slice(0, idx + 1), newRow, ...rows.slice(idx + 1)];
    setRows(newRows);
    saveData(columns, newRows);
  };

  // Cell operations
  const updateCell = (rowId: string, colId: string, value: any) => {
    const newRows = rows.map(r => r.id === rowId ? { ...r, [colId]: value } : r);
    setRows(newRows);
    saveData(columns, newRows);
  };

  // Column operations
  const addColumn = (afterColId?: string) => {
    const newCol: Column = {
      id: Date.now().toString(),
      name: `Column ${columns.length + 1}`,
      type: 'text'
    };
    
    let newColumns: Column[];
    if (afterColId) {
      const idx = columns.findIndex(c => c.id === afterColId);
      newColumns = [...columns.slice(0, idx + 1), newCol, ...columns.slice(idx + 1)];
    } else {
      newColumns = [...columns, newCol];
    }
    
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

  const duplicateColumn = (colId: string) => {
    const col = columns.find(c => c.id === colId);
    if (!col) return;
    const newCol = { ...col, id: Date.now().toString(), name: `${col.name} (copy)` };
    const idx = columns.findIndex(c => c.id === colId);
    const newColumns = [...columns.slice(0, idx + 1), newCol, ...columns.slice(idx + 1)];
    
    // Copy column data to new column
    const newRows = rows.map(r => ({ ...r, [newCol.id]: r[colId] }));
    
    setColumns(newColumns);
    setRows(newRows);
    saveData(newColumns, newRows);
  };

  const renameColumn = (colId: string, newName: string) => {
    const newColumns = columns.map(c => c.id === colId ? { ...c, name: newName } : c);
    setColumns(newColumns);
    saveData(newColumns, rows);
    setEditingColumnId(null);
  };

  const changeColumnType = (colId: string, newType: Column['type']) => {
    const newColumns = columns.map(c => {
      if (c.id === colId) {
        const updated: Column = { ...c, type: newType };
        if (newType === 'select' && !c.config?.options) {
          updated.config = { options: [
            { value: 'option1', label: 'Option 1', color: '#6b7280' },
            { value: 'option2', label: 'Option 2', color: '#10b981' },
          ]};
        }
        return updated;
      }
      return c;
    });
    setColumns(newColumns);
    saveData(newColumns, rows);
  };

  const toggleColumnVisibility = (colId: string) => {
    const newColumns = columns.map(c => c.id === colId ? { ...c, hidden: !c.hidden } : c);
    setColumns(newColumns);
    saveData(newColumns, rows);
  };

  // Sort & filter
  const filteredRows = useMemo(() => {
    let result = [...rows];
    
    // Search filter
    if (searchQuery) {
      result = result.filter(row => 
        Object.values(row).some(v => 
          String(v).toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
    
    // Column filter
    if (filterColumn && filterValue) {
      result = result.filter(row => 
        String(row[filterColumn] || '').toLowerCase().includes(filterValue.toLowerCase())
      );
    }
    
    // Sort
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

  const handleSort = (colId: string) => {
    if (sortColumn === colId) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(colId);
      setSortDirection('asc');
    }
  };

  // Calculate column summary
  const getColumnSummary = (colId: string) => {
    const col = columns.find(c => c.id === colId);
    if (!col) return null;
    
    const values = rows.map(r => r[colId]).filter(v => v !== null && v !== undefined && v !== '');
    
    if (col.type === 'number') {
      const nums = values.map(Number).filter(n => !isNaN(n));
      if (nums.length === 0) return null;
      const sum = nums.reduce((a, b) => a + b, 0);
      return { sum, avg: sum / nums.length, count: nums.length };
    }
    
    return { count: values.length };
  };

  const visibleColumns = columns.filter(c => !c.hidden);

  const renderCellValue = (col: Column, value: any) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-muted-foreground/50">Empty</span>;
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
        return <a href={value} target="_blank" rel="noopener" className="text-primary hover:underline text-sm">{value}</a>;
      case 'email':
        return <a href={`mailto:${value}`} className="text-primary hover:underline text-sm">{value}</a>;
      case 'number':
        return <span className="font-mono text-sm">{value}</span>;
      default:
        return <span className="text-sm">{String(value)}</span>;
    }
  };

  return (
    <div className="my-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 h-8 border-0 bg-muted/50"
          />
        </div>
        
        {/* Filter dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className={cn("h-8", filterColumn && "text-primary")}>
              <Filter className="w-4 h-4 mr-1" />
              Filter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <div className="p-2 space-y-2">
              <select
                value={filterColumn || ''}
                onChange={e => setFilterColumn(e.target.value || null)}
                className="w-full h-8 px-2 rounded border border-input bg-background text-sm"
              >
                <option value="">Select column...</option>
                {columns.map(col => (
                  <option key={col.id} value={col.id}>{col.name}</option>
                ))}
              </select>
              {filterColumn && (
                <Input
                  placeholder="Filter value..."
                  value={filterValue}
                  onChange={e => setFilterValue(e.target.value)}
                  className="h-8"
                />
              )}
              {filterColumn && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full"
                  onClick={() => { setFilterColumn(null); setFilterValue(''); }}
                >
                  Clear filter
                </Button>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="text-sm text-muted-foreground">
          {filteredRows.length} {filteredRows.length === 1 ? 'row' : 'rows'}
        </span>
        
        {editable && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileImport}
              className="hidden"
            />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="h-8"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => addColumn()} className="h-8">
              <Columns className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={addRow} className="h-8">
              <Plus className="w-4 h-4 mr-1" />
              New
            </Button>
          </>
        )}
        
        {onDelete && editable && (
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Table - Notion style (borderless) */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/30">
              {visibleColumns.map(col => (
                <th key={col.id} className="text-left p-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 flex items-center justify-between group">
                        <span className="flex items-center gap-2">
                          {COLUMN_TYPES.find(t => t.type === col.type)?.icon && (
                            <span className="text-muted-foreground/50">
                              {(() => {
                                const Icon = COLUMN_TYPES.find(t => t.type === col.type)?.icon;
                                return Icon ? <Icon className="w-3.5 h-3.5" /> : null;
                              })()}
                            </span>
                          )}
                          {editingColumnId === col.id ? (
                            <Input
                              value={editingColumnName}
                              onChange={e => setEditingColumnName(e.target.value)}
                              onBlur={() => renameColumn(col.id, editingColumnName)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') renameColumn(col.id, editingColumnName);
                                if (e.key === 'Escape') setEditingColumnId(null);
                              }}
                              className="h-6 w-24 text-sm"
                              autoFocus
                              onClick={e => e.stopPropagation()}
                            />
                          ) : (
                            col.name
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          {sortColumn === col.id && (
                            sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          )}
                          <MoreHorizontal className="w-4 h-4 opacity-0 group-hover:opacity-100" />
                        </span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuItem onClick={() => {
                        setEditingColumnId(col.id);
                        setEditingColumnName(col.name);
                      }}>
                        <Type className="w-4 h-4 mr-2" />
                        Edit property
                      </DropdownMenuItem>
                      
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <Hash className="w-4 h-4 mr-2" />
                          Change type
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          {COLUMN_TYPES.map(type => (
                            <DropdownMenuItem 
                              key={type.type} 
                              onClick={() => changeColumnType(col.id, type.type as Column['type'])}
                            >
                              <type.icon className="w-4 h-4 mr-2" />
                              {type.label}
                              {col.type === type.type && <Check className="w-4 h-4 ml-auto" />}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem onClick={() => handleSort(col.id)}>
                        <ArrowUpDown className="w-4 h-4 mr-2" />
                        Sort {sortColumn === col.id && sortDirection === 'asc' ? 'descending' : 'ascending'}
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem onClick={() => {
                        setFilterColumn(col.id);
                        setFilterValue('');
                      }}>
                        <Filter className="w-4 h-4 mr-2" />
                        Filter
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem onClick={() => toggleColumnVisibility(col.id)}>
                        <EyeOff className="w-4 h-4 mr-2" />
                        Hide column
                      </DropdownMenuItem>
                      
                      {editable && (
                        <>
                          <DropdownMenuItem onClick={() => addColumn(col.id)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Insert right
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem onClick={() => duplicateColumn(col.id)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem 
                            onClick={() => deleteColumn(col.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </th>
              ))}
              {editable && <th className="w-10"></th>}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map(row => (
              <tr key={row.id} className="group border-b border-border/20 hover:bg-muted/30">
                {visibleColumns.map(col => (
                  <td key={col.id} className="p-0">
                    {editingCell?.rowId === row.id && editingCell?.colId === col.id ? (
                      <div className="flex items-center px-3 py-1.5">
                        {col.type === 'select' ? (
                          <select
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="h-7 px-2 rounded border border-input bg-background text-sm flex-1"
                            autoFocus
                          >
                            <option value="">Select...</option>
                            {col.config?.options?.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : col.type === 'checkbox' ? (
                          <input
                            type="checkbox"
                            checked={editValue === 'true'}
                            onChange={e => setEditValue(String(e.target.checked))}
                            className="h-4 w-4"
                          />
                        ) : (
                          <Input
                            type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="h-7 flex-1"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                updateCell(row.id, col.id, col.type === 'checkbox' ? editValue === 'true' : editValue);
                                setEditingCell(null);
                              }
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                          />
                        )}
                        <button 
                          onClick={() => {
                            updateCell(row.id, col.id, col.type === 'checkbox' ? editValue === 'true' : editValue);
                            setEditingCell(null);
                          }}
                          className="ml-1 p-1"
                        >
                          <Check className="w-4 h-4 text-green-500" />
                        </button>
                        <button onClick={() => setEditingCell(null)} className="p-1">
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          if (editable) {
                            setEditingCell({ rowId: row.id, colId: col.id });
                            setEditValue(col.type === 'checkbox' ? String(!!row[col.id]) : (row[col.id] || ''));
                          }
                        }}
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => duplicateRow(row.id)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteRow(row.id)} className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {/* Summary row */}
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-border/20">
                {visibleColumns.map(col => {
                  const summary = getColumnSummary(col.id);
                  return (
                    <td key={col.id} className="px-3 py-2 text-xs text-muted-foreground">
                      {summary && col.type === 'number' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-1 hover:text-foreground">
                              <SigmaSquare className="w-3 h-3" />
                              Sum: {summary.sum?.toFixed(2)}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <div className="px-3 py-2 text-sm space-y-1">
                              <p>Sum: {summary.sum?.toFixed(2)}</p>
                              <p>Average: {summary.avg?.toFixed(2)}</p>
                              <p>Count: {summary.count}</p>
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      {summary && col.type !== 'number' && (
                        <span>{summary.count} values</span>
                      )}
                    </td>
                  );
                })}
                {editable && <td></td>}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Hidden columns indicator */}
      {columns.some(c => c.hidden) && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <EyeOff className="w-3 h-3" />
          <span>{columns.filter(c => c.hidden).length} hidden columns</span>
          <button 
            onClick={() => {
              const newColumns = columns.map(c => ({ ...c, hidden: false }));
              setColumns(newColumns);
              saveData(newColumns, rows);
            }}
            className="text-primary hover:underline"
          >
            Show all
          </button>
        </div>
      )}

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No data yet</p>
          {editable && (
            <Button variant="outline" size="sm" className="mt-2" onClick={addRow}>
              <Plus className="w-4 h-4 mr-1" />
              Add first row
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
