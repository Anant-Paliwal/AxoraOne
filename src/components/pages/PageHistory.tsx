import { useState, useEffect } from "react";
import { Clock, RotateCcw, Trash2, Camera, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface HistoryEntry {
  id: string;
  version_number: number;
  user_id: string;
  user_email?: string;
  user_name?: string;
  change_type: string;
  change_summary?: string;
  snapshot_type?: string;
  blocks_changed?: number;
  chars_added?: number;
  chars_removed?: number;
  created_at: string;
  expires_at: string;
  is_current: boolean;
  days_until_expiry: number;
}

interface PageHistoryProps {
  pageId: string;
  onRestore?: () => void;
}

export function PageHistory({ pageId, onRestore }: PageHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<HistoryEntry | null>(null);
  const [previewContent, setPreviewContent] = useState<any>(null);
  const { toast } = useToast();

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/page-history/${pageId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch history");
      }

      const result = await response.json();
      setHistory(result.history || []);
    } catch (error: any) {
      console.error("Error fetching history:", error);
      toast({
        title: "Error",
        description: "Failed to load page history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchVersionContent = async (versionNumber: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/page-history/${pageId}/version/${versionNumber}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        setPreviewContent(result.version);
      }
    } catch (error) {
      console.error("Error fetching version:", error);
    }
  };

  const handleRestore = async (historyId: string, versionNumber: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/page-history/${pageId}/restore`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ history_id: historyId }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to restore version");
      }

      toast({
        title: "Success",
        description: `Page restored to version ${versionNumber}`,
      });

      onRestore?.();
      fetchHistory();
    } catch (error: any) {
      console.error("Error restoring version:", error);
      toast({
        title: "Error",
        description: "Failed to restore page version",
        variant: "destructive",
      });
    }
  };

  const createSnapshot = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/page-history/${pageId}/snapshot`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create snapshot");
      }

      toast({
        title: "Success",
        description: "Manual snapshot created",
      });

      fetchHistory();
    } catch (error: any) {
      console.error("Error creating snapshot:", error);
      toast({
        title: "Error",
        description: "Failed to create snapshot",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (pageId) {
      fetchHistory();
    }
  }, [pageId]);

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case "create":
        return "bg-green-500/10 text-green-500";
      case "edit":
        return "bg-blue-500/10 text-blue-500";
      case "restore":
        return "bg-purple-500/10 text-purple-500";
      case "pre_restore":
        return "bg-orange-500/10 text-orange-500";
      case "snapshot":
        return "bg-yellow-500/10 text-yellow-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  const getSnapshotTypeLabel = (type?: string) => {
    switch (type) {
      case "auto":
        return "Auto";
      case "manual":
        return "Manual";
      case "pre_restore":
        return "Pre-restore";
      default:
        return "Manual";
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex items-center w-full px-2 py-1.5 text-sm hover:bg-accent rounded-sm cursor-pointer">
          <Clock className="w-4 h-4 mr-2" />
          Version History
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle>Page Version History</DialogTitle>
            <DialogDescription>
              View and restore previous versions. History is kept for 7 days.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 mt-4">
            <Button onClick={createSnapshot} variant="outline" size="sm">
              <Camera className="w-4 h-4 mr-2" />
              Create Snapshot
            </Button>
            <Button onClick={fetchHistory} variant="outline" size="sm">
              Refresh
            </Button>
            {history.length > 0 && history[0] && (
              <Button 
                onClick={() => handleRestore(history[0].id, history[0].version_number)}
                variant="default" 
                size="sm"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Undo to Last Version
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 px-6 pb-6 pt-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No version history available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
              {/* History List */}
              <div className="flex flex-col min-h-0">
                <h3 className="font-semibold mb-3 text-sm">Version History</h3>
                <ScrollArea className="flex-1 pr-2">
                  <div className="space-y-2 pb-4">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedVersion?.id === entry.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => {
                      setSelectedVersion(entry);
                      fetchVersionContent(entry.version_number);
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          Version {entry.version_number}
                        </span>
                        <Badge
                          variant="secondary"
                          className={getChangeTypeColor(entry.change_type)}
                        >
                          {entry.change_type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getSnapshotTypeLabel(entry.snapshot_type)}
                        </Badge>
                      </div>
                      {entry.is_current && (
                        <Badge variant="default" className="text-xs">Current</Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {entry.change_summary || "No description"}
                    </p>

                    {/* Change Stats */}
                    {(entry.blocks_changed || entry.chars_added || entry.chars_removed) ? (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                        {entry.blocks_changed > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="font-medium">{entry.blocks_changed}</span> blocks
                          </span>
                        )}
                        {entry.chars_added > 0 && (
                          <span className="text-green-600 dark:text-green-400">
                            +{entry.chars_added}
                          </span>
                        )}
                        {entry.chars_removed > 0 && (
                          <span className="text-red-600 dark:text-red-400">
                            -{entry.chars_removed}
                          </span>
                        )}
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-1">
                      <span>
                        {formatDistanceToNow(new Date(entry.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                      <span>
                        Expires in {entry.days_until_expiry} days
                      </span>
                    </div>

                    {(entry.user_name || entry.user_email) && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        by {entry.user_name || entry.user_email}
                      </p>
                    )}

                    {/* Always show restore button except for truly current version */}
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(entry.id, entry.version_number);
                      }}
                      variant={entry.is_current ? "secondary" : "outline"}
                      size="sm"
                      className="w-full mt-2"
                      disabled={entry.is_current}
                    >
                      <RotateCcw className="w-3 h-3 mr-2" />
                      {entry.is_current ? "Current Version" : "Restore"}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Preview Panel */}
          <div className="border rounded-lg p-4 flex flex-col min-h-0">
            <h3 className="font-semibold mb-3 text-sm">Preview</h3>
            {selectedVersion ? (
              <ScrollArea className="flex-1">
                {previewContent ? (
                  <div className="space-y-4 pb-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Title
                      </p>
                      <p className="font-semibold break-words">{previewContent.title}</p>
                    </div>

                    {previewContent.icon && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Icon
                        </p>
                        <span className="text-2xl">{previewContent.icon}</span>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Content
                      </p>
                      <div className="text-sm bg-muted/50 p-3 rounded max-h-[300px] overflow-auto">
                        {previewContent.blocks?.length > 0 ? (
                          <p>{previewContent.blocks.length} blocks</p>
                        ) : previewContent.content ? (
                          <div
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{
                              __html: previewContent.content,
                            }}
                          />
                        ) : (
                          <p className="text-muted-foreground">No content</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                )}
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
                Select a version to preview
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  </DialogContent>
</Dialog>
  );
}
