import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Table, 
  LayoutGrid, 
  List, 
  Calendar, 
  GitBranch,
  Image
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { TableView } from '@/components/database/TableView';
import { BoardView } from '@/components/database/BoardView';
import { GalleryView } from '@/components/database/GalleryView';
import { cn } from '@/lib/utils';
import { AppSidebar } from '@/components/layout/AppSidebar';

type ViewType = 'table' | 'board' | 'list' | 'gallery' | 'calendar' | 'timeline';

const viewIcons: Record<ViewType, any> = {
  table: Table,
  board: LayoutGrid,
  list: List,
  gallery: Image,
  calendar: Calendar,
  timeline: GitBranch,
};

export function DatabasePage() {
  const { pageId, workspaceId } = useParams();
  const navigate = useNavigate();
  const { currentWorkspace, canEdit, canAdmin, getUserRole } = useWorkspace();
  
  // Permission checks
  const userCanEdit = canEdit();
  const userCanAdmin = canAdmin();
  const userRole = getUserRole();
  
  const [page, setPage] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('table');
  const [groupByProperty, setGroupByProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (pageId) {
      loadDatabase();
    }
  }, [pageId]);

  const loadDatabase = async () => {
    if (!pageId) return;
    
    try {
      setLoading(true);
      
      // Load page
      const pageData = await api.getPage(pageId);
      setPage(pageData);
      setCurrentView(pageData.view_type || 'table');
      
      // Load properties
      const propsData = await api.getDatabaseProperties(pageId);
      setProperties(propsData);
      
      // Set default group by for board view
      if (pageData.view_type === 'board') {
        const selectProp = propsData.find((p: any) => p.property_type === 'select');
        if (selectProp) {
          setGroupByProperty(selectProp);
        }
      }
      
      // Load rows
      const rowsData = await api.getDatabaseRows(pageId);
      setRows(rowsData);
      
    } catch (error) {
      toast.error('Failed to load database');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRow = async (initialProperties?: Record<string, any>) => {
    if (!pageId) return;
    
    try {
      const newRow = await api.createDatabaseRow(pageId, {
        properties: initialProperties || {}
      });
      setRows([...rows, newRow]);
      toast.success('Row added');
    } catch (error) {
      toast.error('Failed to add row');
      console.error(error);
    }
  };

  const handleUpdateRow = async (rowId: string, properties: Record<string, any>) => {
    try {
      await api.updateDatabaseRow(rowId, { properties });
      setRows(rows.map(r => r.id === rowId ? { ...r, properties } : r));
    } catch (error) {
      toast.error('Failed to update row');
      console.error(error);
    }
  };

  const handleDeleteRow = async (rowId: string) => {
    // Permission check - only admins and owners can delete
    if (!userCanAdmin) {
      toast.error('You don\'t have permission to delete rows');
      return;
    }
    
    if (!confirm('Delete this row?')) return;
    
    try {
      await api.deleteDatabaseRow(rowId);
      setRows(rows.filter(r => r.id !== rowId));
      toast.success('Row deleted');
    } catch (error) {
      toast.error('Failed to delete row');
      console.error(error);
    }
  };

  const handleAddProperty = async () => {
    if (!pageId) return;
    
    // Permission check
    if (!userCanEdit) {
      toast.error('You don\'t have permission to add properties');
      return;
    }
    
    const name = prompt('Property name:');
    if (!name) return;
    
    const type = prompt('Property type (text, number, select, checkbox, date):') || 'text';
    
    try {
      const newProperty = await api.createDatabaseProperty(pageId, {
        name,
        property_type: type,
        config: type === 'select' ? { options: [] } : {},
        property_order: properties.length
      });
      setProperties([...properties, newProperty]);
      toast.success('Property added');
    } catch (error) {
      toast.error('Failed to add property');
      console.error(error);
    }
  };

  const handleUpdateProperty = async (propertyId: string, updates: any) => {
    // Permission check
    if (!userCanEdit) {
      toast.error('You don\'t have permission to update properties');
      return;
    }
    
    try {
      await api.updateDatabaseProperty(propertyId, updates);
      setProperties(properties.map(p => p.id === propertyId ? { ...p, ...updates } : p));
      toast.success('Property updated');
    } catch (error) {
      toast.error('Failed to update property');
      console.error(error);
    }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    // Permission check - only admins and owners can delete
    if (!userCanAdmin) {
      toast.error('You don\'t have permission to delete properties');
      return;
    }
    
    if (!confirm('Delete this property? All data in this column will be lost.')) return;
    
    try {
      await api.deleteDatabaseProperty(propertyId);
      setProperties(properties.filter(p => p.id !== propertyId));
      toast.success('Property deleted');
    } catch (error) {
      toast.error('Failed to delete property');
      console.error(error);
    }
  };

  const handleChangeView = async (view: ViewType) => {
    setCurrentView(view);
    
    // Update page view type
    if (pageId) {
      try {
        await api.updatePage(pageId, { view_type: view });
      } catch (error) {
        console.error('Failed to update view type:', error);
      }
    }
  };

  const handleChangeGroupBy = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    setGroupByProperty(property);
  };

  const handleBack = () => {
    const workspace = currentWorkspace || (workspaceId ? { id: workspaceId } : null);
    if (workspace) {
      navigate(`/workspace/${workspace.id}/pages`);
    } else {
      navigate('/pages');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Database not found</p>
          <Button onClick={handleBack} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-auto md:overflow-hidden bg-background">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-auto md:overflow-hidden">
        {/* Header */}
        <div className="bg-background border-b border-border px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="rounded-lg"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <span className="text-3xl">{page.icon || '📊'}</span>
                  {page.title}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {rows.length} {rows.length === 1 ? 'row' : 'rows'}
                </p>
              </div>
            </div>
          </div>

          {/* View Switcher */}
          <div className="flex items-center gap-2">
            {Object.entries(viewIcons).map(([view, Icon]) => (
              <button
                key={view}
                onClick={() => handleChangeView(view as ViewType)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  currentView === view
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="capitalize">{view}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Database View */}
        <div className="flex-1 overflow-hidden p-6">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full"
          >
            {currentView === 'table' && (
              <TableView
                pageId={pageId!}
                properties={properties}
                rows={rows}
                onAddRow={handleAddRow}
                onUpdateRow={handleUpdateRow}
                onDeleteRow={handleDeleteRow}
                onAddProperty={handleAddProperty}
                onUpdateProperty={handleUpdateProperty}
                onDeleteProperty={handleDeleteProperty}
              />
            )}

            {currentView === 'board' && (
              <BoardView
                pageId={pageId!}
                properties={properties}
                rows={rows}
                groupByProperty={groupByProperty}
                onAddRow={(columnValue) => {
                  if (groupByProperty && columnValue) {
                    handleAddRow({ [groupByProperty.id]: columnValue });
                  } else {
                    handleAddRow();
                  }
                }}
                onUpdateRow={handleUpdateRow}
                onDeleteRow={handleDeleteRow}
                onChangeGroupBy={handleChangeGroupBy}
              />
            )}

            {currentView === 'gallery' && (
              <GalleryView
                properties={properties}
                rows={rows.map(r => ({ id: r.id, data: r.properties || {} }))}
                onAddRow={handleAddRow}
                onUpdateRow={(rowId, data) => handleUpdateRow(rowId, data)}
                onDeleteRow={handleDeleteRow}
              />
            )}

            {['list', 'calendar', 'timeline'].includes(currentView) && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-6xl mb-4">🚧</div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {currentView.charAt(0).toUpperCase() + currentView.slice(1)} View Coming Soon
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    This view is under development
                  </p>
                  <Button onClick={() => handleChangeView('table')} variant="outline">
                    Switch to Table View
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
