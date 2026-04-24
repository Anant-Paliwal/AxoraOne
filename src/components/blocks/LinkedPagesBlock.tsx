import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Trash2, 
  LayoutGrid,
  FileText,
  ExternalLink,
  Search,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import { Block } from './types';

interface LinkedPage {
  id: string;
  pageId: string;
  title: string;
  icon?: string;
  description?: string;
}

interface LinkedPagesBlockProps {
  block: Block;
  editable: boolean;
  onUpdate: (data: any) => void;
  onDelete?: () => void;
}

export function LinkedPagesBlockComponent({ block, editable, onUpdate, onDelete }: LinkedPagesBlockProps) {
  const [linkedPages, setLinkedPages] = useState<LinkedPage[]>(block.data?.linkedPages || []);
  const [showPagePicker, setShowPagePicker] = useState(false);
  const [availablePages, setAvailablePages] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();

  const saveData = useCallback((newLinkedPages: LinkedPage[]) => {
    onUpdate({ linkedPages: newLinkedPages });
  }, [onUpdate]);

  // Load available pages when picker opens
  useEffect(() => {
    if (showPagePicker && currentWorkspace) {
      loadPages();
    }
  }, [showPagePicker, currentWorkspace]);

  const loadPages = async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    try {
      const pages = await api.getPagesByWorkspace(currentWorkspace.id);
      // Filter out already linked pages
      const linkedIds = linkedPages.map(lp => lp.pageId);
      setAvailablePages(pages.filter((p: any) => !linkedIds.includes(p.id)));
    } catch (error) {
      console.error('Failed to load pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const addLinkedPage = (page: any) => {
    const newLinkedPage: LinkedPage = {
      id: Date.now().toString(),
      pageId: page.id,
      title: page.title,
      icon: page.icon,
      description: page.content?.substring(0, 100) || ''
    };
    const newLinkedPages = [...linkedPages, newLinkedPage];
    setLinkedPages(newLinkedPages);
    saveData(newLinkedPages);
    setShowPagePicker(false);
  };

  const removeLinkedPage = (id: string) => {
    const newLinkedPages = linkedPages.filter(lp => lp.id !== id);
    setLinkedPages(newLinkedPages);
    saveData(newLinkedPages);
  };

  const openPage = (pageId: string) => {
    if (currentWorkspace) {
      navigate(`/workspace/${currentWorkspace.id}/pages/${pageId}`);
    }
  };

  const filteredPages = availablePages.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="my-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <LayoutGrid className="w-4 h-4" />
          <span className="text-sm font-medium">Linked Pages</span>
        </div>
        <div className="flex items-center gap-1">
          {editable && (
            <Button variant="ghost" size="sm" onClick={() => setShowPagePicker(true)} className="h-7">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          )}
          {onDelete && editable && (
            <Button variant="ghost" size="sm" onClick={onDelete} className="h-7 w-7 p-0 text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Pages Grid */}
      {linkedPages.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
          <LayoutGrid className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground mb-2">No linked pages</p>
          {editable && (
            <Button variant="outline" size="sm" onClick={() => setShowPagePicker(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Link a page
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {linkedPages.map(linkedPage => (
            <div
              key={linkedPage.id}
              className="group relative p-4 border border-border rounded-lg hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer bg-card"
              onClick={() => openPage(linkedPage.pageId)}
            >
              {/* Remove button */}
              {editable && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeLinkedPage(linkedPage.id);
                  }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}

              {/* Icon */}
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3">
                {linkedPage.icon ? (
                  <span className="text-2xl">{linkedPage.icon}</span>
                ) : (
                  <FileText className="w-5 h-5 text-muted-foreground" />
                )}
              </div>

              {/* Title */}
              <h4 className="font-medium text-sm text-foreground line-clamp-2 mb-1">
                {linkedPage.title}
              </h4>

              {/* Description */}
              {linkedPage.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {linkedPage.description}
                </p>
              )}

              {/* Open indicator */}
              <ExternalLink className="absolute bottom-2 right-2 w-3 h-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}

          {/* Add Card */}
          {editable && (
            <button
              onClick={() => setShowPagePicker(true)}
              className="p-4 border-2 border-dashed border-border rounded-lg hover:border-primary/50 transition-colors flex flex-col items-center justify-center min-h-[120px] text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-6 h-6 mb-2" />
              <span className="text-sm">Add page</span>
            </button>
          )}
        </div>
      )}

      {/* Page Picker Dialog */}
      <Dialog open={showPagePicker} onOpenChange={setShowPagePicker}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link a Page</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search pages..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Pages List */}
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading pages...
                </div>
              ) : filteredPages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No pages found' : 'No pages available'}
                </div>
              ) : (
                filteredPages.map(page => (
                  <button
                    key={page.id}
                    onClick={() => addLinkedPage(page)}
                    className="w-full p-3 text-left rounded-lg hover:bg-accent flex items-center gap-3 transition-colors"
                  >
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      {page.icon ? (
                        <span className="text-lg">{page.icon}</span>
                      ) : (
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{page.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {page.updated_at ? new Date(page.updated_at).toLocaleDateString() : ''}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
