import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Folder, FileText, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MovePageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPageId: string;
  currentPageTitle: string;
  availablePages: Array<{ id: string; title: string; icon?: string; parent_page_id?: string }>;
  onMove: (targetPageId: string | null) => void;
}

export function MovePageDialog({
  open,
  onOpenChange,
  currentPageId,
  currentPageTitle,
  availablePages,
  onMove
}: MovePageDialogProps) {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  const handleMove = () => {
    onMove(selectedPageId);
    onOpenChange(false);
  };

  // Filter out current page and its descendants
  const validPages = availablePages.filter(p => p.id !== currentPageId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move Page</DialogTitle>
          <DialogDescription>
            Move "{currentPageTitle}" to another page or to root level
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Move to Root Option */}
          <button
            onClick={() => setSelectedPageId(null)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg border transition-all",
              selectedPageId === null
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/30 hover:bg-secondary/30"
            )}
          >
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
              <Folder className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-foreground">Root Level</div>
              <div className="text-xs text-muted-foreground">Move to workspace root</div>
            </div>
            {selectedPageId === null && (
              <ChevronRight className="w-4 h-4 text-primary" />
            )}
          </button>

          {/* Available Pages */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Move to Page:</div>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {validPages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => setSelectedPageId(page.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border transition-all",
                      selectedPageId === page.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30 hover:bg-secondary/30"
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-lg">
                      {page.icon || '📄'}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-foreground line-clamp-1">
                        {page.title}
                      </div>
                    </div>
                    {selectedPageId === page.id && (
                      <ChevronRight className="w-4 h-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMove}
              className="flex-1"
            >
              Move Page
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
