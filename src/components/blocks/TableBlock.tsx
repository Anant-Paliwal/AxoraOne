import { useState, useCallback } from 'react';
import { Table, Plus, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { Block } from './types';

interface TableBlockProps {
  block: Block;
  editable: boolean;
  onUpdate: (data: any) => void;
  onDelete?: () => void;
}

export function TableBlockComponent({ block, editable, onUpdate, onDelete }: TableBlockProps) {
  const [headers, setHeaders] = useState<string[]>(block.data?.headers || ['Column 1', 'Column 2', 'Column 3']);
  const [rows, setRows] = useState<string[][]>(block.data?.rows || [['', '', ''], ['', '', '']]);
  const [headerBg, setHeaderBg] = useState(block.data?.headerBg || true);

  const saveData = useCallback((newHeaders: string[], newRows: string[][]) => {
    onUpdate({ headers: newHeaders, rows: newRows, headerBg });
  }, [onUpdate, headerBg]);

  const updateHeader = (index: number, value: string) => {
    const newHeaders = [...headers];
    newHeaders[index] = value;
    setHeaders(newHeaders);
    saveData(newHeaders, rows);
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = rows.map((row, ri) => 
      ri === rowIndex 
        ? row.map((cell, ci) => ci === colIndex ? value : cell)
        : row
    );
    setRows(newRows);
    saveData(headers, newRows);
  };

  const addColumn = () => {
    const newHeaders = [...headers, `Column ${headers.length + 1}`];
    const newRows = rows.map(row => [...row, '']);
    setHeaders(newHeaders);
    setRows(newRows);
    saveData(newHeaders, newRows);
  };

  const deleteColumn = (index: number) => {
    if (headers.length <= 1) return;
    const newHeaders = headers.filter((_, i) => i !== index);
    const newRows = rows.map(row => row.filter((_, i) => i !== index));
    setHeaders(newHeaders);
    setRows(newRows);
    saveData(newHeaders, newRows);
  };

  const addRow = () => {
    const newRow = headers.map(() => '');
    const newRows = [...rows, newRow];
    setRows(newRows);
    saveData(headers, newRows);
  };

  const deleteRow = (index: number) => {
    if (rows.length <= 1) return;
    const newRows = rows.filter((_, i) => i !== index);
    setRows(newRows);
    saveData(headers, newRows);
  };

  const duplicateRow = (index: number) => {
    const newRows = [...rows];
    newRows.splice(index + 1, 0, [...rows[index]]);
    setRows(newRows);
    saveData(headers, newRows);
  };

  return (
    <div className="my-2 group">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Table className="w-4 h-4" />
          <span className="text-xs font-medium">Table</span>
        </div>
        <div className="flex items-center gap-1">
          {editable && (
            <>
              <Button variant="ghost" size="sm" onClick={addColumn} className="h-6 px-2 text-xs">
                + Column
              </Button>
              <Button variant="ghost" size="sm" onClick={addRow} className="h-6 px-2 text-xs">
                + Row
              </Button>
            </>
          )}
          {onDelete && editable && (
            <Button variant="ghost" size="sm" onClick={onDelete} className="h-6 w-6 p-0 text-destructive">
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg">
        <table className="w-full border-collapse">
          <thead>
            <tr className={cn(headerBg && "bg-muted/50")}>
              {headers.map((header, colIndex) => (
                <th key={colIndex} className="border-b border-border/30 p-0">
                  <div className="flex items-center">
                    {editable ? (
                      <input
                        type="text"
                        value={header}
                        onChange={e => updateHeader(colIndex, e.target.value)}
                        className="w-full px-3 py-2 bg-transparent font-semibold text-sm outline-none"
                        placeholder="Header"
                      />
                    ) : (
                      <span className="px-3 py-2 font-semibold text-sm">{header}</span>
                    )}
                    {editable && headers.length > 1 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 opacity-0 group-hover:opacity-100 hover:bg-accent rounded">
                            <MoreHorizontal className="w-3 h-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => deleteColumn(colIndex)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete column
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </th>
              ))}
              {editable && <th className="w-8 border-b border-border/30"></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="group/row hover:bg-muted/30">
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="border-b border-border/20 p-0">
                    {editable ? (
                      <input
                        type="text"
                        value={cell}
                        onChange={e => updateCell(rowIndex, colIndex, e.target.value)}
                        className="w-full px-3 py-2 bg-transparent text-sm outline-none"
                        placeholder=""
                      />
                    ) : (
                      <span className="px-3 py-2 text-sm block">{cell || <span className="text-muted-foreground/30">-</span>}</span>
                    )}
                  </td>
                ))}
                {editable && (
                  <td className="border-b border-border/20 p-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 opacity-0 group-hover/row:opacity-100 hover:bg-accent rounded">
                          <MoreHorizontal className="w-3 h-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => duplicateRow(rowIndex)}>
                          Duplicate row
                        </DropdownMenuItem>
                        {rows.length > 1 && (
                          <DropdownMenuItem onClick={() => deleteRow(rowIndex)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete row
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add row button at bottom */}
      {editable && (
        <button
          onClick={addRow}
          className="w-full mt-1 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100"
        >
          <Plus className="w-3 h-3" />
          New row
        </button>
      )}
    </div>
  );
}
