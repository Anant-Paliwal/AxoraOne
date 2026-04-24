-- Add missing columns to workspaces table
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6366f1';

-- Update existing workspaces to have default values
UPDATE public.workspaces 
SET description = COALESCE(description, ''),
    color = COALESCE(color, '#6366f1')
WHERE description IS NULL OR color IS NULL;

-- Drop the old RLS policy
DROP POLICY IF EXISTS "Users can manage their own workspaces" ON public.workspaces;

-- Create separate RLS policies for better control
CREATE POLICY "Users can view their own workspaces" ON public.workspaces
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workspaces" ON public.workspaces
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workspaces" ON public.workspaces
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workspaces" ON public.workspaces
  FOR DELETE USING (auth.uid() = user_id);
