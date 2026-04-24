import { useState, useRef } from 'react';
import { 
  Database, 
  Upload, 
  Link2, 
  Sparkles, 
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BlockSidebarProps {
  onImportCSV: (file: File) => void;
  onImportJSON: (file: File) => void;
  onLinkDataSource: () => void;
  onBuildWithAI: () => void;
}

export function BlockSidebar({ 
  onImportCSV, 
  onImportJSON, 
  onLinkDataSource, 
  onBuildWithAI 
}: BlockSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImportCSV(file);
  };

  const handleJSONUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImportJSON(file);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground p-2 rounded-l-lg shadow-lg z-50"
      >
        <Database className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="w-80 border-l border-border bg-card/50 overflow-y-auto flex-shrink-0">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Data Sources</h3>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Import Options */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Import Data</h4>
          
          {/* CSV Import */}
          <button
            onClick={() => csvInputRef.current?.click()}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Import CSV</p>
              <p className="text-xs text-muted-foreground">Upload spreadsheet data</p>
            </div>
          </button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="hidden"
          />

          {/* JSON Import */}
          <button
            onClick={() => jsonInputRef.current?.click()}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Import JSON</p>
              <p className="text-xs text-muted-foreground">Upload JSON data</p>
            </div>
          </button>
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json"
            onChange={handleJSONUpload}
            className="hidden"
          />

          {/* Link Data Source */}
          <button
            onClick={onLinkDataSource}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-purple-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Link Data Source</p>
              <p className="text-xs text-muted-foreground">Connect external data</p>
            </div>
          </button>

          {/* Build with AI */}
          <button
            onClick={onBuildWithAI}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-primary/50 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-primary">Build with AI</p>
              <p className="text-xs text-muted-foreground">Generate from description</p>
            </div>
          </button>
        </div>

        {/* Suggested Templates */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Suggested</h4>
          
          <div className="space-y-2">
            <div className="p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors">
              <div className="flex items-start gap-2">
                <span className="text-lg">✅</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Tasks Tracker</p>
                  <p className="text-xs text-muted-foreground">Stay organized with tasks</p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors">
              <div className="flex items-start gap-2">
                <span className="text-lg">📊</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Projects</p>
                  <p className="text-xs text-muted-foreground">Manage projects start to finish</p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors">
              <div className="flex items-start gap-2">
                <span className="text-lg">📝</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Document Hub</p>
                  <p className="text-xs text-muted-foreground">Collaborate on docs</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* More Templates */}
        <Button variant="outline" className="w-full">
          More templates
        </Button>
      </div>
    </div>
  );
}
