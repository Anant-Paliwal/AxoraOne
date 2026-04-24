import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { WidgetConfig, DEFAULT_LAYOUT, WIDGET_DEFINITIONS } from '@/components/dashboard/WidgetTypes';
import { toast } from 'sonner';

export interface DashboardPreferences {
  layout: WidgetConfig[];
  gridColumns: 1 | 2 | 3;
  spacing: 'none' | 'compact' | 'comfortable';
}

export function useDashboardLayout(workspaceId: string | undefined) {
  const [layout, setLayout] = useState<WidgetConfig[]>(DEFAULT_LAYOUT);
  const [gridColumns, setGridColumns] = useState<1 | 2 | 3>(3);
  const [spacing, setSpacing] = useState<'none' | 'compact' | 'comfortable'>('none');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load layout and preferences from API
  useEffect(() => {
    if (workspaceId) {
      loadLayout();
    }
  }, [workspaceId]);

  const loadLayout = async () => {
    if (!workspaceId) return;
    
    try {
      setLoading(true);
      const data = await api.getDashboardLayout(workspaceId);
      if (data?.layout && Array.isArray(data.layout)) {
        // Filter out unknown widget types
        const validWidgetTypes = new Set(WIDGET_DEFINITIONS.map(w => w.type));
        const validatedLayout = data.layout.filter((widget: WidgetConfig) => {
          const isValid = validWidgetTypes.has(widget.type);
          if (!isValid) {
            console.warn(`Removing unknown widget type: ${widget.type}`);
          }
          return isValid;
        });
        
        // If we filtered out widgets, save the cleaned layout
        if (validatedLayout.length !== data.layout.length) {
          setLayout(validatedLayout);
          // Save cleaned layout back to database
          await api.updateDashboardLayout(workspaceId, validatedLayout, data.gridColumns, data.spacing);
        } else {
          setLayout(validatedLayout);
        }
      } else {
        setLayout(DEFAULT_LAYOUT);
      }
      
      // Load preferences
      if (data?.gridColumns) {
        setGridColumns(data.gridColumns);
      }
      if (data?.spacing) {
        setSpacing(data.spacing);
      }
    } catch (error) {
      console.error('Failed to load dashboard layout:', error);
      // Use default layout on error
      setLayout(DEFAULT_LAYOUT);
      setGridColumns(3);
      setSpacing('none');
    } finally {
      setLoading(false);
    }
  };

  // Save layout and preferences to API (debounced)
  const savePreferences = useCallback(async (
    newLayout?: WidgetConfig[],
    newGridColumns?: 1 | 2 | 3,
    newSpacing?: 'none' | 'compact' | 'comfortable'
  ) => {
    if (!workspaceId) return;
    
    try {
      setSaving(true);
      const preferences: DashboardPreferences = {
        layout: newLayout || layout,
        gridColumns: newGridColumns || gridColumns,
        spacing: newSpacing || spacing
      };
      await api.updateDashboardLayout(workspaceId, preferences.layout, preferences.gridColumns, preferences.spacing);
    } catch (error) {
      console.error('Failed to save dashboard preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  }, [workspaceId, layout, gridColumns, spacing]);

  // Update layout locally and save to API
  const updateLayout = useCallback((newLayout: WidgetConfig[]) => {
    setLayout(newLayout);
    savePreferences(newLayout, undefined, undefined);
  }, [savePreferences]);

  // Update grid columns
  const updateGridColumns = useCallback((newGridColumns: 1 | 2 | 3) => {
    setGridColumns(newGridColumns);
    savePreferences(undefined, newGridColumns, undefined);
  }, [savePreferences]);

  // Update spacing
  const updateSpacing = useCallback((newSpacing: 'none' | 'compact' | 'comfortable') => {
    setSpacing(newSpacing);
    savePreferences(undefined, undefined, newSpacing);
  }, [savePreferences]);

  // Reset to default layout
  const resetLayout = useCallback(async () => {
    if (!workspaceId) return;
    
    try {
      setSaving(true);
      await api.resetDashboardLayout(workspaceId);
      setLayout(DEFAULT_LAYOUT);
      setGridColumns(3);
      setSpacing('none');
      toast.success('Dashboard reset to default');
    } catch (error) {
      console.error('Failed to reset dashboard layout:', error);
      toast.error('Failed to reset layout');
    } finally {
      setSaving(false);
    }
  }, [workspaceId]);

  return {
    layout,
    gridColumns,
    spacing,
    loading,
    saving,
    updateLayout,
    updateGridColumns,
    updateSpacing,
    resetLayout,
    reloadLayout: loadLayout
  };
}
