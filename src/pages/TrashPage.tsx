import { useState, useEffect } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, RotateCcw, X, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TrashItem {
  id: string;
  title: string;
  icon: string;
  page_type: string;
  deleted_at: string;
  deleted_by: string;
  parent_page_id: string | null;
  created_at: string;
}

export default function TrashPage() {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<TrashItem | null>(null);
  const [showEmptyDialog, setShowEmptyDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadTrashItems();
    }
  }, [currentWorkspace?.id]);

  const loadTrashItems = async () => {
    if (!currentWorkspace?.id) return;

    try {
      setLoading(true);
      
      // Use REST API instead of Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(
        `${apiUrl}/trash?workspace_id=${currentWorkspace.id}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTrashItems(data?.items || []);
    } catch (error: any) {
      console.error("Error loading trash:", error);
      toast({
        title: "Error",
        description: "Failed to load trash items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (item: TrashItem) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(
        `${apiUrl}/trash/restore/${item.id}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: "Restored",
        description: `"${item.title}" has been restored`,
      });

      loadTrashItems();
    } catch (error: any) {
      console.error("Error restoring item:", error);
      toast({
        title: "Error",
        description: "Failed to restore item",
        variant: "destructive",
      });
    }
  };

  const handlePermanentDelete = async () => {
    if (!selectedItem) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(
        `${apiUrl}/trash/permanent/${selectedItem.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: "Deleted Permanently",
        description: `"${selectedItem.title}" has been permanently deleted`,
      });

      setShowDeleteDialog(false);
      setSelectedItem(null);
      loadTrashItems();
    } catch (error: any) {
      console.error("Error deleting item:", error);
      toast({
        title: "Error",
        description: "Failed to delete item permanently",
        variant: "destructive",
      });
    }
  };

  const handleEmptyTrash = async () => {
    if (!currentWorkspace?.id) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(
        `${apiUrl}/trash/empty?workspace_id=${currentWorkspace.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: "Trash Emptied",
        description: "All items have been permanently deleted",
      });

      setShowEmptyDialog(false);
      loadTrashItems();
    } catch (error: any) {
      console.error("Error emptying trash:", error);
      toast({
        title: "Error",
        description: "Failed to empty trash",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trash2 className="h-8 w-8" />
            Trash
          </h1>
          <p className="text-muted-foreground mt-1">
            Items in trash will be automatically deleted after 30 days
          </p>
        </div>

        {trashItems.length > 0 && (
          <Button
            variant="destructive"
            onClick={() => setShowEmptyDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Empty Trash
          </Button>
        )}
      </div>

      {/* Trash Items */}
      {trashItems.length === 0 ? (
        <Card className="p-12 text-center">
          <Trash2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Trash is empty</h3>
          <p className="text-muted-foreground">
            Deleted pages will appear here
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {trashItems.map((item) => (
            <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-2xl">{item.icon || "📄"}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Deleted {formatDistanceToNow(new Date(item.deleted_at), { addSuffix: true })}
                      {item.parent_page_id && " • Subpage"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(item)}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restore
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedItem(item);
                      setShowDeleteDialog(true);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty Trash Confirmation Dialog */}
      <AlertDialog open={showEmptyDialog} onOpenChange={setShowEmptyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Empty Trash?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {trashItems.length} items in trash.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEmptyTrash}
              className="bg-destructive hover:bg-destructive/90"
            >
              Empty Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Single Item Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Permanently?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedItem?.title}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
