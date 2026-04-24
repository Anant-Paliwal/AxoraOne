import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  MoreHorizontal, 
  Trash2, 
  Edit, 
  ChevronDown,
  ChevronRight,
  Filter,
  SortAsc,
  SortDesc,
  Eye,
  EyeOff,
  X,
  Search,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from '@/components/ui/input';
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

// Filter types
type FilterOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty' | 'greater_than' | 'less_than';

interface FilterRule {
  id: string;
  propertyId: string;
  operator: FilterOperator;
  value: string;
}

interface SortRule {
  propertyId: string;
  direction: 'asc' | 'desc';
}

interface TableViewProps {
  pageId: string;
  properties: Property[];
  rows: Row[];
  onAddRow: () => void;
  onUpdateRow: (rowId: string, properties: Record<string, any>) => void;
  onDeleteRow: (rowId: string) => void;
  onAddProperty: () => void;
  onUpdateProperty: (propertyId: string, updates: Partial<Property>) => void;
  onDeleteProperty: (propertyId: string) => void;
}

// Filter operators by property type
const operatorsByType: Record<string, { value: FilterOperator; label: string }[]> = {
  text: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Does not equal' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does not contain' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Does not equal' },
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  select: [
    { value: 'equals', label: 'Is' },
    { value: 'not_equals', label: 'Is not' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  checkbox: [
    { value: 'equals', label: 'Is' },
  ],
  date: [
    { value: 'equals', label: 'Is' },
    { value: 'not_equals', label: 'Is not' },
    { value: 'greater_than', label: 'Is after' },
    { value: 'less_than', label: 'Is before' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
};

export function TableView({
  pageId,
  properties,
  rows,
  onAddRow,
  onUpdateRow,
  onDeleteRow,
  onAddProperty,
  onUpdateProperty,
  onDeleteProperty,
}: TableViewProps) {
  const [editingCell, setEditingCell] = useState<{ rowId: string; propertyId: string } | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [sorts, setSorts] = useState<SortRule[]>([]);
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [groupBy, setGroupBy] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const sortedProperties = [...properties].sort((a, b) => a.property_order - b.property_order);
  const visibleProperties = sortedProperties.filter(p => !hiddenColumns.has(p.id));

  // Apply filters
  const filteredRows = useMemo(() => {
    let result = [...rows];
    
    // Apply search query (searches all text fields)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(row => {
        return Object.values(row.properties).some(val => 
          String(val || '').toLowerCase().includes(query)
        );
      });
    }
    
    // Apply filter rules
    for (const filter of filters) {
      const property = properties.find(p => p.id === filter.propertyId);
      if (!property) continue;
      
      result = result.filter(row => {
        const value = row.properties[filter.propertyId];
        const filterValue = filter.value;
        
        switch (filter.operator) {
          case 'equals':
            if (property.property_type === 'checkbox') {
              return (value === true) === (filterValue === 'true');
            }
            return String(value || '').toLowerCase() === filterValue.toLowerCase();
          case 'not_equals':
            return String(value || '').toLowerCase() !== filterValue.toLowerCase();
          case 'contains':
            return String(value || '').toLowerCase().includes(filterValue.toLowerCase());
          case 'not_contains':
            return !String(value || '').toLowerCase().includes(filterValue.toLowerCase());
          case 'is_empty':
            return !value || value === '';
          case 'is_not_empty':
            return value && value !== '';
          case 'greater_than':
            return Number(value) > Number(filterValue);
          case 'less_than':
            return Number(value) < Number(filterValue);
          default:
            return true;
        }
      });
    }
    
    return result;
  }, [rows, filters, searchQuery, properties]);

  // Apply sorting
  const sortedRows = useMemo(() => {
    if (sorts.length === 0) return filteredRows;
    
    return [...filteredRows].sort((a, b) => {
      for (const sort of sorts) {
        const aVal = a.properties[sort.propertyId] || '';
        const bVal = b.properties[sort.propertyId] || '';
        
        let comparison = 0;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }
        
        if (comparison !== 0) {
          return sort.direction === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
  }, [filteredRows, sorts]);

  // Group rows if groupBy is set
  const groupedRows = useMemo(() => {
    if (!groupBy) return null;
    
    const groups: Record<string, Row[]> = {};
    for (const row of sortedRows) {
      const groupValue = String(row.properties[groupBy] || 'No value');
      if (!groups[groupValue]) {
        groups[groupValue] = [];
      }
      groups[groupValue].push(row);
    }
    return groups;
  }, [sortedRows, groupBy]);

  const toggleColumnVisibility = (propertyId: string) => {
    const newHidden = new Set(hiddenColumns);
    if (newHidden.has(propertyId)) {
      newHidden.delete(propertyId);
    } else {
      newHidden.add(propertyId);
    }
    setHiddenColumns(newHidden);
  };

  const addSort = (propertyId: string, direction: 'asc' | 'desc' = 'asc') => {
    // Remove existing sort for this property
    const newSorts = sorts.filter(s => s.propertyId !== propertyId);
    newSorts.push({ propertyId, direction });
    setSorts(newSorts);
  };

  const removeSort = (propertyId: string) => {
    setSorts(sorts.filter(s => s.propertyId !== propertyId));
  };

  const toggleSortDirection = (propertyId: string) => {
    setSorts(sorts.map(s => 
      s.propertyId === propertyId 
        ? { ...s, direction: s.direction === 'asc' ? 'desc' : 'asc' }
        : s
    ));
  };

  const addFilter = () => {
    if (properties.length === 0) return;
    const newFilter: FilterRule = {
      id: `filter_${Date.now()}`,
      propertyId: properties[0].id,
      operator: 'contains',
      value: ''
    };
    setFilters([...filters, newFilter]);
    setShowFilterPanel(true);
  };

  const updateFilter = (filterId: string, updates: Partial<FilterRule>) => {
    setFilters(filters.map(f => f.id === filterId ? { ...f, ...updates } : f));
  };

  const removeFilter = (filterId: string) => {
    setFilters(filters.filter(f => f.id !== filterId));
  };

  const toggleGroupCollapse = (groupValue: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(groupValue)) {
      newCollapsed.delete(groupValue);
    } else {
      newCollapsed.add(groupValue);
    }
    setCollapsedGroups(newCollapsed);
  };

  const handleSort = (propertyId: string) => {
    const existingSort = sorts.find(s => s.propertyId === propertyId);
    if (existingSort) {
      if (existingSort.direction === 'asc') {
        toggleSortDirection(propertyId);
      } else {
        removeSort(propertyId);
      }
    } else {
      addSort(propertyId, 'asc');
    }
  };

  const getPropertySort = (propertyId: string) => {
    return sorts.find(s => s.propertyId === propertyId);
  };

  // Render grouped or ungrouped table
  const renderTable = (rowsToRender: Row[], groupLabel?: string) => (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-border">
          {visibleProperties.map((property) => {
            const sort = getPropertySort(property.id);
            return (
              <th
                key={property.id}
                className="text-left p-3 bg-secondary/30 font-semibold text-sm text-foreground min-w-[150px] group relative"
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleSort(property.id)}
                    className="flex items-center gap-2 hover:text-primary transition-colors flex-1"
                  >
                    <span>{property.name}</span>
                    {sort && (
                      sort.direction === 'asc' 
                        ? <SortAsc className="w-4 h-4 text-primary" />
                        : <SortDesc className="w-4 h-4 text-primary" />
                    )}
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 rounded hover:bg-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <ArrowUpDown className="w-4 h-4 mr-2" />
                          Sort
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem onClick={() => addSort(property.id, 'asc')}>
                            <SortAsc className="w-4 h-4 mr-2" />
                            Ascending
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => addSort(property.id, 'desc')}>
                            <SortDesc className="w-4 h-4 mr-2" />
                            Descending
                          </DropdownMenuItem>
                          {sort && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => removeSort(property.id)}>
                                <X className="w-4 h-4 mr-2" />
                                Remove sort
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuItem onClick={() => {
                        const newFilter: FilterRule = {
                          id: `filter_${Date.now()}`,
                          propertyId: property.id,
                          operator: 'contains',
                          value: ''
                        };
                        setFilters([...filters, newFilter]);
                        setShowFilterPanel(true);
                      }}>
                        <Filter className="w-4 h-4 mr-2" />
                        Filter by this property
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setGroupBy(groupBy === property.id ? null : property.id)}>
                        <Layers className="w-4 h-4 mr-2" />
                        {groupBy === property.id ? 'Remove grouping' : 'Group by this property'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => toggleColumnVisibility(property.id)}>
                        <EyeOff className="w-4 h-4 mr-2" />
                        Hide Column
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDeleteProperty(property.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Property
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="text-xs text-muted-foreground font-normal mt-1">
                  {property.property_type}
                </div>
              </th>
            );
          })}
          <th className="w-12 p-3 bg-secondary/30"></th>
        </tr>
      </thead>
      <tbody>
        {rowsToRender.map((row, rowIndex) => (
          <motion.tr
            key={row.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: rowIndex * 0.02 }}
            className="border-b border-border hover:bg-secondary/20 transition-colors group"
          >
            {visibleProperties.map((property) => (
              <td
                key={`${row.id}-${property.id}`}
                className="p-3 relative"
              >
                <CellEditor
                  value={row.properties[property.id]}
                  property={property}
                  isEditing={editingCell?.rowId === row.id && editingCell?.propertyId === property.id}
                  onStartEdit={() => setEditingCell({ rowId: row.id, propertyId: property.id })}
                  onSave={(value) => {
                    onUpdateRow(row.id, {
                      ...row.properties,
                      [property.id]: value
                    });
                    setEditingCell(null);
                  }}
                  onCancel={() => setEditingCell(null)}
                />
              </td>
            ))}
            <td className="p-3">
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
                    Delete Row
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </td>
          </motion.tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="w-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={onAddRow}
          className="rounded-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Row
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onAddProperty}
          className="rounded-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Property
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 w-48"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-secondary"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        
        {/* Filter Button */}
        <Popover open={showFilterPanel} onOpenChange={setShowFilterPanel}>
          <PopoverTrigger asChild>
            <Button 
              variant={filters.length > 0 ? "default" : "outline"} 
              size="sm" 
              className="rounded-lg"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filter
              {filters.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-background/20 rounded">
                  {filters.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-4" align="start">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filters</h4>
                {filters.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setFilters([])}
                    className="h-7 text-xs"
                  >
                    Clear all
                  </Button>
                )}
              </div>
              
              <AnimatePresence>
                {filters.map((filter) => {
                  const property = properties.find(p => p.id === filter.propertyId);
                  const operators = operatorsByType[property?.property_type || 'text'] || operatorsByType.text;
                  
                  return (
                    <motion.div
                      key={filter.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2"
                    >
                      <select
                        value={filter.propertyId}
                        onChange={(e) => updateFilter(filter.id, { propertyId: e.target.value })}
                        className="h-8 px-2 rounded border border-border bg-background text-sm flex-1"
                      >
                        {properties.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      
                      <select
                        value={filter.operator}
                        onChange={(e) => updateFilter(filter.id, { operator: e.target.value as FilterOperator })}
                        className="h-8 px-2 rounded border border-border bg-background text-sm"
                      >
                        {operators.map(op => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </select>
                      
                      {!['is_empty', 'is_not_empty'].includes(filter.operator) && (
                        property?.property_type === 'select' ? (
                          <select
                            value={filter.value}
                            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                            className="h-8 px-2 rounded border border-border bg-background text-sm flex-1"
                          >
                            <option value="">Select...</option>
                            {property.config?.options?.map((opt: string) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : property?.property_type === 'checkbox' ? (
                          <select
                            value={filter.value}
                            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                            className="h-8 px-2 rounded border border-border bg-background text-sm flex-1"
                          >
                            <option value="true">Checked</option>
                            <option value="false">Unchecked</option>
                          </select>
                        ) : (
                          <Input
                            value={filter.value}
                            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                            placeholder="Value..."
                            className="h-8 flex-1"
                          />
                        )
                      )}
                      
                      <button
                        onClick={() => removeFilter(filter.id)}
                        className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              
              <Button
                variant="outline"
                size="sm"
                onClick={addFilter}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add filter
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        
        {/* Sort indicator */}
        {sorts.length > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-secondary/50 rounded-lg text-sm">
            <SortAsc className="w-4 h-4" />
            <span>Sorted by {sorts.length}</span>
            <button
              onClick={() => setSorts([])}
              className="ml-1 p-0.5 rounded hover:bg-secondary"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        
        {/* Group by */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant={groupBy ? "default" : "outline"} 
              size="sm" 
              className="rounded-lg"
            >
              <Layers className="w-4 h-4 mr-2" />
              {groupBy ? `Grouped by ${properties.find(p => p.id === groupBy)?.name}` : 'Group'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {groupBy && (
              <>
                <DropdownMenuItem onClick={() => setGroupBy(null)}>
                  <X className="w-4 h-4 mr-2" />
                  Remove grouping
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {properties.filter(p => ['select', 'checkbox', 'text'].includes(p.property_type)).map(property => (
              <DropdownMenuItem 
                key={property.id}
                onClick={() => setGroupBy(property.id)}
              >
                {property.name}
                {groupBy === property.id && <span className="ml-auto">✓</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <div className="flex-1" />
        
        {/* Column Visibility */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-lg">
              <Eye className="w-4 h-4 mr-2" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {sortedProperties.map((property) => (
              <DropdownMenuItem
                key={property.id}
                onClick={() => toggleColumnVisibility(property.id)}
                className="flex items-center justify-between"
              >
                <span>{property.name}</span>
                {hiddenColumns.has(property.id) ? (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Eye className="w-4 h-4 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Row count */}
        <span className="text-sm text-muted-foreground">
          {filteredRows.length} of {rows.length} rows
        </span>
      </div>

      {/* Active filters display */}
      {filters.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {filters.map(filter => {
            const property = properties.find(p => p.id === filter.propertyId);
            return (
              <div
                key={filter.id}
                className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-lg text-sm"
              >
                <span className="font-medium">{property?.name}</span>
                <span className="text-primary/70">{filter.operator.replace('_', ' ')}</span>
                {filter.value && <span>"{filter.value}"</span>}
                <button
                  onClick={() => removeFilter(filter.id)}
                  className="ml-1 p-0.5 rounded hover:bg-primary/20"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        {groupedRows ? (
          // Grouped view
          <div className="space-y-4">
            {Object.entries(groupedRows).map(([groupValue, groupRows]) => (
              <div key={groupValue} className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleGroupCollapse(groupValue)}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  {collapsedGroups.has(groupValue) ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  <span className="font-medium">{groupValue}</span>
                  <span className="text-sm text-muted-foreground">({groupRows.length})</span>
                </button>
                {!collapsedGroups.has(groupValue) && renderTable(groupRows, groupValue)}
              </div>
            ))}
          </div>
        ) : (
          // Ungrouped view
          renderTable(sortedRows)
        )}

        {filteredRows.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {rows.length === 0 ? (
              <>
                <p className="mb-4">No rows yet</p>
                <Button onClick={onAddRow} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Row
                </Button>
              </>
            ) : (
              <>
                <p className="mb-2">No rows match your filters</p>
                <Button onClick={() => { setFilters([]); setSearchQuery(''); }} variant="outline" size="sm">
                  Clear filters
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface CellEditorProps {
  value: any;
  property: Property;
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: (value: any) => void;
  onCancel: () => void;
}

function CellEditor({ value, property, isEditing, onStartEdit, onSave, onCancel }: CellEditorProps) {
  const [editValue, setEditValue] = useState(value);

  useEffect(() => {
    setEditValue(value);
  }, [value, isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave(editValue);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (isEditing) {
    switch (property.property_type) {
      case 'text':
      case 'title':
      case 'url':
      case 'email':
      case 'phone':
        return (
          <Input
            value={editValue || ''}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => onSave(editValue)}
            autoFocus
            className="h-8"
          />
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={editValue || ''}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => onSave(editValue)}
            autoFocus
            className="h-8"
          />
        );
      
      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={editValue || false}
            onChange={(e) => {
              setEditValue(e.target.checked);
              onSave(e.target.checked);
            }}
            className="w-4 h-4"
          />
        );
      
      case 'select':
        return (
          <select
            value={editValue || ''}
            onChange={(e) => {
              setEditValue(e.target.value);
              onSave(e.target.value);
            }}
            onBlur={() => onSave(editValue)}
            autoFocus
            className="w-full h-8 px-2 rounded border border-border bg-background"
          >
            <option value="">Select...</option>
            {property.config.options?.map((option: string) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      
      case 'date':
        return (
          <Input
            type="date"
            value={editValue || ''}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => onSave(editValue)}
            autoFocus
            className="h-8"
          />
        );
      
      default:
        return (
          <Input
            value={editValue || ''}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => onSave(editValue)}
            autoFocus
            className="h-8"
          />
        );
    }
  }

  // Display mode
  return (
    <div
      onClick={onStartEdit}
      className="min-h-[32px] px-2 py-1 rounded hover:bg-secondary/50 cursor-pointer transition-colors"
    >
      {property.property_type === 'checkbox' ? (
        <input
          type="checkbox"
          checked={value || false}
          readOnly
          className="w-4 h-4 pointer-events-none"
        />
      ) : property.property_type === 'select' ? (
        <span className={cn(
          "inline-block px-2 py-1 rounded text-xs font-medium",
          value ? "bg-primary/10 text-primary" : "text-muted-foreground"
        )}>
          {value || 'Empty'}
        </span>
      ) : (
        <span className={cn(
          "text-sm",
          !value && "text-muted-foreground italic"
        )}>
          {value || 'Empty'}
        </span>
      )}
    </div>
  );
}
