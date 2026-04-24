import { useNavigate } from 'react-router-dom';
import { CreateWorkspaceForm } from '@/components/workspace/CreateWorkspaceForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function CreateWorkspacePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col p-8 bg-gradient-to-br from-purple-100 via-blue-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/home')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Workspaces</span>
        </Button>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <CreateWorkspaceForm 
          onSuccess={() => navigate('/home')}
          onCancel={() => navigate('/home')}
        />
      </div>
    </div>
  );
}
