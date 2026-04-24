-- Add workspace_id to skills table
ALTER TABLE public.skills 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_skills_workspace_id ON public.skills(workspace_id);
CREATE INDEX IF NOT EXISTS idx_skills_user_workspace ON public.skills(user_id, workspace_id);

-- Add workspace_id to tasks table (if not already added)
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Create index for better query performance (if not already exists)
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON public.tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_workspace ON public.tasks(user_id, workspace_id);

-- Update RLS policies for skills to include workspace isolation
DROP POLICY IF EXISTS "Users can manage their own skills" ON public.skills;

CREATE POLICY "Users can manage their own skills" ON public.skills
  FOR ALL USING (auth.uid() = user_id);

-- Note: Tasks RLS policies should already be updated from previous migrations
-- If not, uncomment below:
-- DROP POLICY IF EXISTS "Users can manage their own tasks" ON public.tasks;
-- CREATE POLICY "Users can manage their own tasks" ON public.tasks
--   FOR ALL USING (auth.uid() = user_id);
