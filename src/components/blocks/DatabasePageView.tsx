import { useState } from 'react';
import { Database, Plus, LayoutGrid, List, ChevronDown, Upload, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatabaseBlock } from './DatabaseBlock';
import { ImportDialog } from './ImportDialog';

interface DatabasePageViewProps {
  pageId: string;
  onAddPage?: () => void;
}

export function DatabasePageView({ pageId, onAddPage }: DatabasePageViewProps) {
  const [viewMode, setViewMode] = useState<'table' | 'gallery' | 'list'>('table');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [databaseData, setDatabaseData] = useState<any>(null);

  const handleImportComplete = (data: { headers: string[]; rows: any[]; column_types: any }) => {
    setDatabaseData(data);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Database Header */}
      <div className="border-b border-border bg-card/50 px-6 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Database View</h1>
              <p className="text-sm text-muted-foreground">
                {databaseData ? `${databaseData.rows?.length || 0} items` : 'No data yet'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImportDialog(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={onAddPage}
            >
              <Plus className="w-4 h-4 mr-2" />
              New
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            }`}
          >
            <List className="w-4 h-4" />
            Table
          </button>
          <button
            onClick={() => setViewMode('gallery')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'gallery'
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Gallery
          </button>
        </div>
      </div>

      {/* Database Content */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'table' && (
          <div className="p-6">
            {databaseData ? (
              <DatabaseBlock
                id={pageId}
                initialData={{
                  columns: databaseData.headers?.map((h: string, i: number) => ({
                    id: String(i + 1),
                    name: h,
                    type: databaseData.column_types?.[h] === 'number' ? 'number' : 'text'
                  })) || [],
                  rows: databaseData.rows?.map((r: any, i: number) => ({
                    id: String(i + 1),
                    ...r
                  })) || []
                }}
                onDataChange={(data) => {
                  // Save to backend
                  console.log('Data changed:', data);
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Database className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No database yet</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                  Import a CSV file or create a new database to get started
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => setShowImportDialog(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Import CSV
                  </Button>
                  <Button variant="outline" onClick={onAddPage}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Entry
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {viewMode === 'gallery' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {databaseData?.rows?.map((row: any, index: number) => (
                <div
                  key={index}
                  className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center">
                    <Database className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h4 className="font-medium text-foreground mb-1">
                    {row[databaseData.headers[0]] || 'Untitled'}
                  </h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {row[databaseData.headers[1]] || 'No description'}
                  </p>
                </div>
              )) || (
                <div className="col-span-full text-center py-16">
                  <p className="text-muted-foreground">No items to display</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Import Dialog */}
      <ImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}
