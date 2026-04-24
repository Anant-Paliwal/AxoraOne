import { useState } from 'react';
import { X, FileSpreadsheet, FileText, Database, Link2, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (data: { headers: string[]; rows: any[]; column_types: any }) => void;
}

export function ImportDialog({ isOpen, onClose, onImportComplete }: ImportDialogProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File, type: 'csv' | 'json') => {
    setUploading(true);
    setUploadProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 10, 90));
    }, 100);

    try {
      const result = type === 'csv' 
        ? await api.uploadCSV(file)
        : await api.uploadJSON(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      setTimeout(() => {
        onImportComplete({
          headers: result.headers,
          rows: result.rows,
          column_types: result.column_types
        });
        toast.success(`Imported ${result.row_count} rows from ${result.filename}`);
        onClose();
      }, 300);
    } catch (error: any) {
      clearInterval(progressInterval);
      toast.error(error.message || 'Failed to import file');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, 'csv');
  };

  const handleJSONUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, 'json');
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-lg max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <h2 className="text-base font-semibold text-foreground">Import CSV into Database</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Create a new database with your CSV
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-accent rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {uploading ? (
              /* Upload Progress */
              <div className="py-8 text-center">
                <div className="w-12 h-12 mx-auto mb-3 relative">
                  <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                  <div 
                    className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"
                    style={{ animationDuration: '1s' }}
                  />
                </div>
                <p className="text-base font-medium text-foreground mb-2">Uploading...</p>
                <div className="w-48 h-1.5 mx-auto bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">{uploadProgress}%</p>
              </div>
            ) : (
              <>
                {/* Upload CSV */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Upload CSV
                  </label>
                  <label className="block cursor-pointer">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCSVUpload}
                      className="hidden"
                    />
                    <div className="border-2 border-dashed border-border rounded-lg p-6 hover:border-primary/50 hover:bg-accent/50 transition-colors">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <FileSpreadsheet className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-medium text-foreground">
                            Click to upload CSV file
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            or drag and drop
                          </p>
                        </div>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Import Location */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Import Location
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="flex items-center gap-2 p-2.5 border-2 border-primary bg-primary/5 rounded-lg text-left">
                      <Database className="w-4 h-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">New database</p>
                        <p className="text-[10px] text-muted-foreground truncate">Create new</p>
                      </div>
                    </button>
                    <button className="flex items-center gap-2 p-2.5 border border-border hover:bg-accent rounded-lg text-left transition-colors">
                      <Database className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">Merge</p>
                        <p className="text-[10px] text-muted-foreground truncate">With existing</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                {/* Other Options */}
                <div className="space-y-1.5">
                  <label className="block cursor-pointer">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleJSONUpload}
                      className="hidden"
                    />
                    <button className="w-full flex items-center gap-2.5 p-2.5 border border-border hover:bg-accent rounded-lg text-left transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-foreground">Import JSON</p>
                        <p className="text-[10px] text-muted-foreground">Upload JSON data file</p>
                      </div>
                    </button>
                  </label>

                  <button className="w-full flex items-center gap-2.5 p-2.5 border border-border hover:bg-accent rounded-lg text-left transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                      <Link2 className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-foreground">Link Data Source</p>
                      <p className="text-[10px] text-muted-foreground">Connect external database</p>
                    </div>
                  </button>

                  <button className="w-full flex items-center gap-2.5 p-2.5 border border-primary/50 bg-primary/5 hover:bg-primary/10 rounded-lg text-left transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-primary">Build with AI</p>
                      <p className="text-[10px] text-muted-foreground">Generate from description</p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {!uploading && (
            <div className="px-4 py-2.5 bg-accent/30 border-t border-border flex items-center justify-between">
              <button className="text-xs text-primary hover:underline flex items-center gap-1">
                <span>📖</span>
                <span>Learn about imports</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
