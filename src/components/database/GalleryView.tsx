import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  MoreHorizontal, 
  Trash2, 
  Image,
  FileText,
  Settings,
  Eye,
  EyeOff,
  Search,
  Filter,
  X,
  ChevronDown,
  Maximize2,
  Edit,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Property {
  id: string;
  name: string;
  property_type: string;
  config?: any;
}

interface Row {
  id: string;
  data: Record<string, any>;
}

interface GalleryViewProps {
  properties: Property[];
  rows: Row[];
  onAddRow: () => void;
  onUpdateRow: (rowId: string, data: Record<string, any>) => void;
  onDeleteRow: (rowId: string) => void;
  coverProperty?: string;
  titleProperty?: string;
}

type CardSize = 'small' | 'medium' | 'large';

export function GalleryView({
  properties,
  rows,
  onAddRow,
  onUpdateRow,
  onDeleteRow,
  coverProperty,
  titleProperty
}: GalleryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [cardSize, setCardSize] = useState<CardSize>('medium');
  const [showCover, setShowCover] = useState(true);
  const [visibleProperties, setVisibleProperties] = useState<Set<string>>(
    new Set(properties.slice(0, 3).map(p => p.id))
  );
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);
  const [editingRow, setEditingRow] = useState<Row | null>(null);

  // Find title and cover properties
  const titleProp = titleProperty 
    ? properties.find(p => p.id === titleProperty)
    : properties.find(p => p.property_type === 'text' || p.name.toLowerCase() === 'name' || p.name.toLowerCase() === 'title');
  
  const coverProp = coverProperty
    ? properties.find(p => p.id === coverProperty)
    : properties.find(p => p.property_type === 'url' && (p.name.toLowerCase().includes('image') || p.name.toLowerCase().includes('cover')));

  // Filter rows based on search
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    
    const query = searchQuery.toLowerCase();
    return rows.filter(row => {
      return Object.values(row.data).some(value => 
        String(value).toLowerCase().includes(query)
      );
    });
  }, [rows, searchQuery]);

  // Card size configurations
  const sizeConfig = {
    small: { grid: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6', coverHeight: 'h-24', padding: 'p-2' },
    medium: { grid: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4', coverHeight: 'h-36', padding: 'p-3' },
    large: { grid: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', coverHeight: 'h-48', padding: 'p-4' }
  };

  const togglePropertyVisibility = (propId: string) => {
    setVisibleProperties(prev => {
      const next = new Set(prev);
      if (next.has(propId)) {
        next.delete(propId);
      } else {
        next.add(propId);
      }
      return next;
    });
  };

  const renderPropertyValue = (prop: Property, value: any) => {
    if (value === null || value === undefined) return <span className="text-muted-foreground">-</span>;

    switch (prop.property_type) {
      case 'checkbox':
        return value ? '✓' : '✗';
      case 'select':
        const options = prop.config?.options || [];
        const option = options.find((o: any) => o.value === value);
        return option ? (
          <span 
            className="px-2 py-0.5 rounded-full text-xs"
            style={{ backgroundColor: option.color + '20', color: option.color }}
          >
            {option.label}
          </span>
        ) : value;
      case 'multi_select':
        const multiOptions = prop.config?.options || [];
        const values = Array.isArray(value) ? value : [value];
        return (
          <div className="flex flex-wrap gap-1">
            {values.map((v: string, i: number) => {
              const opt = multiOptions.find((o: any) => o.value === v);
              return (
                <span 
                  key={i}
                  className="px-1.5 py-0.5 rounded text-xs"
                  style={{ backgroundColor: opt?.color + '20' || '#e5e5e5', color: opt?.color || '#666' }}
                >
                  {opt?.label || v}
                </span>
              );
            })}
          </div>
        );
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value;
      case 'url':
        return (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs truncate block">
            {value}
          </a>
        );
      default:
        return String(value).substring(0, 50) + (String(value).length > 50 ? '...' : '');
    }
  };

  const getCardTitle = (row: Row) => {
    if (titleProp) {
      return row.data[titleProp.name] || 'Untitled';
    }
    // Fallback to first text property
    const firstTextProp = properties.find(p => p.property_type === 'text');
    return firstTextProp ? row.data[firstTextProp.name] || 'Untitled' : 'Untitled';
  };

  const getCardCover = (row: Row) => {
    if (!showCover) return null;
    if (coverProp) {
      return row.data[coverProp.name];
    }
    // Look for any URL that looks like an image
    for (const prop of properties) {
      if (prop.property_type === 'url') {
        const url = row.data[prop.name];
        if (url && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)) {
          return url;
        }
      }
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 p-4 border-b border-border">
        <div className="flex items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          {/* Results count */}
          <span className="text-sm text-muted-foreground">
            {filteredRows.length} {filteredRows.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Card Size */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Maximize2 className="w-4 h-4 mr-2" />
                {cardSize.charAt(0).toUpperCase() + cardSize.slice(1)}
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setCardSize('small')}>
                Small
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCardSize('medium')}>
                Medium
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCardSize('large')}>
                Large
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Properties visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Settings className="w-4 h-4 mr-2" />
                Properties
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuCheckboxItem
                checked={showCover}
                onCheckedChange={setShowCover}
              >
                <Image className="w-4 h-4 mr-2" />
                Show cover image
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {properties.filter(p => p.id !== titleProp?.id && p.id !== coverProp?.id).map(prop => (
                <DropdownMenuCheckboxItem
                  key={prop.id}
                  checked={visibleProperties.has(prop.id)}
                  onCheckedChange={() => togglePropertyVisibility(prop.id)}
                >
                  {prop.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Add new */}
          <Button size="sm" onClick={onAddRow} className="h-8">
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="flex-1 overflow-auto p-4">
        {filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Image className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground mb-2">
              {searchQuery ? 'No items match your search' : 'No items yet'}
            </p>
            {!searchQuery && (
              <Button variant="outline" size="sm" onClick={onAddRow}>
                <Plus className="w-4 h-4 mr-2" />
                Add first item
              </Button>
            )}
          </div>
        ) : (
          <div className={cn("grid gap-4", sizeConfig[cardSize].grid)}>
            <AnimatePresence>
              {filteredRows.map((row) => {
                const cover = getCardCover(row);
                const title = getCardTitle(row);

                return (
                  <motion.div
                    key={row.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="group relative bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedRow(row)}
                  >
                    {/* Cover Image */}
                    {showCover && (
                      <div className={cn("bg-muted relative", sizeConfig[cardSize].coverHeight)}>
                        {cover ? (
                          <img 
                            src={cover} 
                            alt={title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText className="w-8 h-8 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Card Content */}
                    <div className={sizeConfig[cardSize].padding}>
                      {/* Title */}
                      <h3 className="font-medium text-foreground truncate mb-2">
                        {title}
                      </h3>

                      {/* Visible Properties */}
                      <div className="space-y-1.5">
                        {properties
                          .filter(p => visibleProperties.has(p.id) && p.id !== titleProp?.id && p.id !== coverProp?.id)
                          .map(prop => (
                            <div key={prop.id} className="flex items-start gap-2 text-xs">
                              <span className="text-muted-foreground shrink-0 w-20 truncate">
                                {prop.name}
                              </span>
                              <span className="text-foreground flex-1 truncate">
                                {renderPropertyValue(prop, row.data[prop.name])}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Hover Actions */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="secondary" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setEditingRow(row);
                          }}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            // Duplicate row
                            onAddRow();
                          }}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteRow(row.id);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Add New Card */}
            <motion.button
              layout
              onClick={onAddRow}
              className={cn(
                "border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors",
                showCover ? sizeConfig[cardSize].coverHeight : "h-32"
              )}
            >
              <Plus className="w-6 h-6" />
              <span className="text-sm">New</span>
            </motion.button>
          </div>
        )}
      </div>

      {/* Row Detail Dialog */}
      <Dialog open={!!selectedRow} onOpenChange={() => setSelectedRow(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{selectedRow ? getCardTitle(selectedRow) : 'Item Details'}</DialogTitle>
          </DialogHeader>
          
          {selectedRow && (
            <div className="space-y-4 mt-4">
              {/* Cover Image */}
              {getCardCover(selectedRow) && (
                <div className="rounded-lg overflow-hidden">
                  <img 
                    src={getCardCover(selectedRow)!} 
                    alt={getCardTitle(selectedRow)}
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}

              {/* All Properties */}
              <div className="space-y-3">
                {properties.map(prop => (
                  <div key={prop.id} className="flex items-start gap-4">
                    <span className="text-sm text-muted-foreground w-32 shrink-0">
                      {prop.name}
                    </span>
                    <div className="flex-1">
                      {renderPropertyValue(prop, selectedRow.data[prop.name])}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedRow(null)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setEditingRow(selectedRow);
                  setSelectedRow(null);
                }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Row Dialog */}
      <Dialog open={!!editingRow} onOpenChange={() => setEditingRow(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          
          {editingRow && (
            <div className="space-y-4 mt-4">
              {properties.map(prop => (
                <div key={prop.id} className="space-y-1.5">
                  <label className="text-sm font-medium">{prop.name}</label>
                  {prop.property_type === 'checkbox' ? (
                    <input
                      type="checkbox"
                      checked={editingRow.data[prop.name] || false}
                      onChange={(e) => setEditingRow({
                        ...editingRow,
                        data: { ...editingRow.data, [prop.name]: e.target.checked }
                      })}
                      className="h-4 w-4"
                    />
                  ) : prop.property_type === 'select' ? (
                    <select
                      value={editingRow.data[prop.name] || ''}
                      onChange={(e) => setEditingRow({
                        ...editingRow,
                        data: { ...editingRow.data, [prop.name]: e.target.value }
                      })}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background"
                    >
                      <option value="">Select...</option>
                      {(prop.config?.options || []).map((opt: any) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : prop.property_type === 'number' ? (
                    <Input
                      type="number"
                      value={editingRow.data[prop.name] || ''}
                      onChange={(e) => setEditingRow({
                        ...editingRow,
                        data: { ...editingRow.data, [prop.name]: parseFloat(e.target.value) || 0 }
                      })}
                    />
                  ) : prop.property_type === 'date' ? (
                    <Input
                      type="date"
                      value={editingRow.data[prop.name] || ''}
                      onChange={(e) => setEditingRow({
                        ...editingRow,
                        data: { ...editingRow.data, [prop.name]: e.target.value }
                      })}
                    />
                  ) : (
                    <Input
                      value={editingRow.data[prop.name] || ''}
                      onChange={(e) => setEditingRow({
                        ...editingRow,
                        data: { ...editingRow.data, [prop.name]: e.target.value }
                      })}
                    />
                  )}
                </div>
              ))}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setEditingRow(null)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  onUpdateRow(editingRow.id, editingRow.data);
                  setEditingRow(null);
                }}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}