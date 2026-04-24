import { useState } from 'react';
import { 
  Table as TableIcon, 
  LayoutGrid, 
  List, 
  Calendar as CalendarIcon,
  BarChart3,
  Map as MapIcon,
  FileText,
  Plus,
  MoreHorizontal,
  Trash2,
  Copy,
  Link2,
  Edit,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface View {
  id: string;
  name: string;
  type: 'table' | 'board' | 'gallery' | 'list' | 'timeline' | 'calendar' | 'chart' | 'feed' | 'map' | 'form';
  icon: any;
}

interface DatabaseViewProps {
  databaseId?: string;
  title?: string;
}

export function DatabaseView({ databaseId, title = 'New database' }: DatabaseViewProps) {
  const [views, setViews] = useState<View[]>([
    { id: '1', name: 'Table', type: 'table', icon: TableIcon },
  ]);
  const [activeViewId, setActiveViewId] = useState('1');
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showViewOptions, setShowViewOptions] = useState<string | null>(null);

  const viewTypes = [
    { type: 'table', name: 'Table', icon: TableIcon },
    { type: 'board', name: 'Board', icon: LayoutGrid },
    { type: 'gallery', name: 'Gallery', icon: LayoutGrid },
    { type: 'list', name: 'List', icon: List },
    { type: 'timeline', name: 'Timeline', icon: CalendarIcon },
    { type: 'calendar', name: 'Calendar', icon: CalendarIcon },
    { type: 'chart', name: 'Chart', icon: BarChart3 },
    { type: 'feed', name: 'Feed', icon: FileText },
    { type: 'map', name: 'Map', icon: MapIcon },
    { type: 'form', name: 'Form', icon: FileText },
  ];

  const addView = (type: any) => {
    const viewType = viewTypes.find(v => v.type === type);
    if (!viewType) return;

    const newView: View = {
      id: Date.now().toString(),
      name: viewType.name,
      type: type as any,
      icon: viewType.icon,
    };
    setViews([...views, newView]);
    setActiveViewId(newView.id);
    setShowViewMenu(false);
  };

  const duplicateView = (viewId: string) => {
    const view = views.find(v => v.id === viewId);
    if (!view) return;

    const newView: View = {
      ...view,
      id: Date.now().toString(),
      name: `${view.name} (copy)`,
    };
    setViews([...views, newView]);
    setShowViewOptions(null);
  };

  const deleteView = (viewId: string) => {
    if (views.length === 1) return; // Keep at least one view
    setViews(views.filter(v => v.id !== viewId));
    if (activeViewId === viewId) {
      setActiveViewId(views[0].id);
    }
    setShowViewOptions(null);
  };

  const activeView = views.find(v => v.id === activeViewId);

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card my-4">
      {/* Header with tabs */}
      <div className="border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 px-4 py-2">
          {/* View tabs */}
          <div className="flex items-center gap-1">
            {views.map((view) => {
              const Icon = view.icon;
              return (
                <div key={view.id} className="relative group">
                  <button
                    onClick={() => setActiveViewId(view.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded transition-colors text-sm",
                      activeViewId === view.id
                        ? "bg-background text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{view.name}</span>
                  </button>
                  
                  {/* View options */}
                  {activeViewId === view.id && (
                    <button
                      onClick={() => setShowViewOptions(showViewOptions === view.id ? null : view.id)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  )}

                  {showViewOptions === view.id && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg z-50">
                      <div className="p-1">
                        <button
                          onClick={() => {/* Rename */}}
                          className="w-full text-left px-3 py-2 rounded hover:bg-accent transition-colors flex items-center gap-2 text-sm"
                        >
                          <Edit className="w-4 h-4" />
                          Rename
                        </button>
                        <button
                          onClick={() => duplicateView(view.id)}
                          className="w-full text-left px-3 py-2 rounded hover:bg-accent transition-colors flex items-center gap-2 text-sm"
                        >
                          <Copy className="w-4 h-4" />
                          Duplicate
                        </button>
                        <button
                          onClick={() => {/* Connect source */}}
                          className="w-full text-left px-3 py-2 rounded hover:bg-accent transition-colors flex items-center gap-2 text-sm"
                        >
                          <Link2 className="w-4 h-4" />
                          Connect source
                        </button>
                        <div className="h-px bg-border my-1" />
                        <button
                          onClick={() => deleteView(view.id)}
                          disabled={views.length === 1}
                          className="w-full text-left px-3 py-2 rounded hover:bg-accent transition-colors flex items-center gap-2 text-sm text-destructive disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add view button */}
          <div className="relative">
            <button
              onClick={() => setShowViewMenu(!showViewMenu)}
              className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-4 h-4" />
            </button>

            {showViewMenu && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-popover border border-border rounded-lg shadow-lg z-50">
                <div className="p-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 mb-1">
                    Add a view
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {viewTypes.map((viewType) => {
                      const Icon = viewType.icon;
                      return (
                        <button
                          key={viewType.type}
                          onClick={() => addView(viewType.type)}
                          className="flex items-center gap-2 px-3 py-2 rounded hover:bg-accent transition-colors text-sm text-left"
                        >
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span>{viewType.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="h-px bg-border my-2" />
                  <button
                    onClick={() => {/* New data source */}}
                    className="w-full text-left px-3 py-2 rounded hover:bg-accent transition-colors flex items-center gap-2 text-sm"
                  >
                    <Link2 className="w-4 h-4 text-muted-foreground" />
                    <span>New data source</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* View actions */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* View content */}
      <div className="p-4">
        {activeView?.type === 'table' && (
          <div className="space-y-2">
            <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground border-b border-border pb-2">
              <div className="flex-1">Name</div>
              <button className="text-muted-foreground hover:text-foreground">
                + Add property
              </button>
            </div>
            <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New page
            </button>
          </div>
        )}

        {activeView?.type === 'board' && (
          <div className="flex gap-4">
            <div className="flex-1 bg-muted/30 rounded-lg p-4">
              <div className="text-sm font-medium mb-2">To Do</div>
              <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New
              </button>
            </div>
            <div className="flex-1 bg-muted/30 rounded-lg p-4">
              <div className="text-sm font-medium mb-2">In Progress</div>
              <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New
              </button>
            </div>
            <div className="flex-1 bg-muted/30 rounded-lg p-4">
              <div className="text-sm font-medium mb-2">Done</div>
              <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New
              </button>
            </div>
          </div>
        )}

        {activeView?.type === 'gallery' && (
          <div className="grid grid-cols-3 gap-4">
            <button className="aspect-video bg-muted/30 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground">
              <Plus className="w-6 h-6" />
            </button>
          </div>
        )}

        {activeView?.type === 'list' && (
          <div className="space-y-2">
            <button className="w-full text-left px-3 py-2 rounded hover:bg-accent transition-colors flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" />
              New item
            </button>
          </div>
        )}

        {['timeline', 'calendar', 'chart', 'feed', 'map', 'form'].includes(activeView?.type || '') && (
          <div className="text-center py-12 text-muted-foreground">
            <div className="text-sm">
              {activeView?.name} view - Coming soon
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
