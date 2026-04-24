import { useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { 
  ArrowRight, 
  Palette
} from 'lucide-react';
import { toast } from 'sonner';
import { IconPicker } from '@/components/ui/IconPicker';

interface CreateWorkspaceFormProps {
  workspace?: any; // For editing existing workspace
  onSuccess?: () => void;
  onCancel?: () => void;
}

const WORKSPACE_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'
];

export function CreateWorkspaceForm({ workspace, onSuccess, onCancel }: CreateWorkspaceFormProps) {
  const { createWorkspace, updateWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(false);
  
  // Form state - initialize with workspace data if editing
  const [name, setName] = useState(workspace?.name || '');
  const [selectedColor, setSelectedColor] = useState(workspace?.color || WORKSPACE_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(workspace?.icon || 'Target');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Please enter a workspace name');
      return;
    }

    setLoading(true);
    try {
      const workspaceData = {
        name: name.trim(),
        description: 'My Workspace',
        icon: selectedIcon,
        color: selectedColor,
      };

      if (workspace) {
        // Update existing workspace
        await updateWorkspace(workspace.id, workspaceData);
        toast.success('Workspace updated successfully!');
      } else {
        // Create new workspace
        await createWorkspace(workspaceData);
        toast.success('Workspace created successfully!');
      }
      
      onSuccess?.();
    } catch (error) {
      console.error(`Failed to ${workspace ? 'update' : 'create'} workspace:`, error);
      toast.error(`Failed to ${workspace ? 'update' : 'create'} workspace`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto p-4 sm:p-6 md:p-8 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 border-0 shadow-xl max-h-[90vh] overflow-y-auto rounded-2xl">
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="text-center mb-4 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {workspace ? 'Edit Workspace' : 'Create Your Workspace'}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Choose a name, icon, and color for your workspace
          </p>
        </div>

        {/* Workspace Name & Icon */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm sm:text-base font-semibold">
            <Palette className="w-5 h-5 text-purple-600" />
            Workspace Name & Icon
          </Label>
          <div className="flex items-center gap-3">
            <IconPicker
              value={selectedIcon}
              onChange={setSelectedIcon}
              size="lg"
            />
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your workspace name..."
              className="h-10 sm:h-12 text-sm sm:text-base flex-1"
              required
            />
          </div>
        </div>

        {/* Color Selection */}
        <div className="space-y-3">
          <Label className="text-sm sm:text-base font-semibold">Workspace Color</Label>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {WORKSPACE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all ${
                  selectedColor === color ? 'ring-2 sm:ring-4 ring-offset-2 ring-purple-400' : ''
                }`}
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="w-full sm:flex-1 h-12 sm:h-14 text-sm sm:text-base"
              disabled={loading}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full sm:flex-1 h-12 sm:h-14 text-sm sm:text-base bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl"
          >
            {loading ? (workspace ? 'Updating...' : 'Creating...') : (workspace ? 'Update Workspace' : 'Create Workspace')}
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
          </Button>
        </div>
      </form>
    </Card>
  );
}
