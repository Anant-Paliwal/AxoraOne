-- Add description and is_recurring fields to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;

-- Add workspace_id if it doesn't exist
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Update RLS policy to include workspace isolation
DROP POLICY IF EXISTS "Users can manage their own tasks" ON public.tasks;

CREATE POLICY "Users can manage their own tasks" ON public.tasks
  FOR ALL 
  USING (
    auth.uid() = user_id 
    AND (
      workspace_id IS NULL 
      OR workspace_id IN (
        SELECT id FROM public.workspaces WHERE user_id = auth.uid()
      )
    )
  );
