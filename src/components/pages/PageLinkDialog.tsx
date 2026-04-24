import { useState, useEffect } from 'react';
import { Link2, Search, Plus, X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface Page {
  id: string;
  title: string;
  icon: string;
}

interface PageLinkDialogProps {
  open: boolean;
  onClose: () => void;
  pageId: string;
  onLinkCreated?: () => void;
}

const relationTypes = [
  { value: 'references', label: 'References', description: 'Generic link to another page' },
  { value: 'explains', label: 'Explains', description: 'This page explains the linked concept' },
  { value: 'example_of', label: 'Example of', description: 'This page is an example of the linked concept' },
  { value: 'depends_on', label: 'Depends on', description: 'This page requires understanding the linked page' },
  { value: 'related_to', label: 'Related to', description: 'Loosely related content' },
  { value: 'extends', label: 'Extends', description: 'This page builds upon the linked page' },
  { value: 'summarizes', label: 'Summarizes', description: 'This page summarizes the linked page' },
];

export function PageLinkDialog({ open, onClose, pageId, onLinkCreated }: PageLinkDialogProps) {
  const { currentWorkspace } = useWorkspace();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [relationType, setRelationType] = useState('references');
  const [context, setContext] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadPages();
    }
  }, [open, currentWorkspace]);

  const loadPages = async () => {
    setLoading(true);
    try {
      const data = currentWorkspace?.id
        ? await api.getPagesByWorkspace(currentWorkspace.id)
        : await api.getPages();
      // Filter out current page
      setPages((data || []).filter((p: Page) => p.id !== pageId));
    } catch (error) {
      console.error('Failed to load pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPages = pages.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateLink = async () => {
    if (!selectedPage) {
      toast.error('Please select a page to link');
      return;
    }

    setSaving(true);
    try {
      await api.createPageLink(pageId, {
        target_page_id: selectedPage.id,
        relation_type: relationType,
        context: context || undefined,
        workspace_id: currentWorkspace?.id
      });
      toast.success(`Linked to "${selectedPage.title}"`);
      onLinkCreated?.();
      onClose();
      // Reset state
      setSelectedPage(null);
      setRelationType('references');
      setContext('');
      setSearch('');
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        toast.error('Link already exists');
      } else {
        toast.error('Failed to create link');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Link to Page
          </DialogTitle>
          <DialogDescription>
            Create a connection to another page in your workspace
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pages..."
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
            />
          </div>

          {/* Selected Page */}
          {selectedPage && (
            <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
              <span className="text-lg">{selectedPage.icon || '📄'}</span>
              <span className="flex-1 text-sm font-medium">{selectedPage.title}</span>
              <button
                onClick={() => setSelectedPage(null)}
                className="p-1 hover:bg-primary/20 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Page List */}
          {!selectedPage && (
            <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredPages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {search ? 'No pages found' : 'No other pages in workspace'}
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {filteredPages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => setSelectedPage(page)}
                      className="w-full flex items-center gap-2 p-3 hover:bg-secondary/50 transition-colors text-left"
                    >
                      <span className="text-lg">{page.icon || '📄'}</span>
                      <span className="text-sm text-foreground truncate">{page.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Relation Type */}
          {selectedPage && (
            <>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Relation Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {relationTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setRelationType(type.value)}
                      className={cn(
                        "p-2 text-left rounded-lg border transition-colors",
                        relationType === type.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <p className="text-sm font-medium">{type.label}</p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Context */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Context (optional)
                </label>
                <input
                  type="text"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Why are these pages related?"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreateLink} disabled={!selectedPage || saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Link
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
