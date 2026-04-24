-- ============================================
-- WORKSPACE ISOLATION MIGRATION - FIXED VERSION
-- Add workspace_id to existing tables only
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Add workspace_id to skills table
ALTER TABLE public.skills 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_skills_workspace_id ON public.skills(workspace_id);
CREATE INDEX IF NOT EXISTS idx_skills_user_workspace ON public.skills(user_id, workspace_id);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can manage their own skills" ON public.skills;
DROP POLICY IF EXISTS "Users can view skills in their workspaces" ON public.skills;
DROP POLICY IF EXISTS "Users can insert skills in their workspaces" ON public.skills;
DROP POLICY IF EXISTS "Users can update skills in their workspaces" ON public.skills;
DROP POLICY IF EXISTS "Users can delete skills in their workspaces" ON public.skills;

-- Create new RLS policies for workspace isolation
CREATE POLICY "Users can view skills in their workspaces" ON public.skills
  FOR SELECT USING (
    auth.uid() = user_id AND 
    (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can insert skills in their workspaces" ON public.skills
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can update skills in their workspaces" ON public.skills
  FOR UPDATE USING (
    auth.uid() = user_id AND 
    (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can delete skills in their workspaces" ON public.skills
  FOR DELETE USING (
    auth.uid() = user_id AND 
    (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
  );

-- ============================================
-- 2. Add workspace_id to tasks table
-- ============================================
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON public.tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_workspace ON public.tasks(user_id, workspace_id);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can manage their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks in their workspaces" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert tasks in their workspaces" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks in their workspaces" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks in their workspaces" ON public.tasks;

-- Create new RLS policies for workspace isolation
CREATE POLICY "Users can view tasks in their workspaces" ON public.tasks
  FOR SELECT USING (
    auth.uid() = user_id AND 
    (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can insert tasks in their workspaces" ON public.tasks
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can update tasks in their workspaces" ON public.tasks
  FOR UPDATE USING (
    auth.uid() = user_id AND 
    (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can delete tasks in their workspaces" ON public.tasks
  FOR DELETE USING (
    auth.uid() = user_id AND 
    (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
  );

-- ============================================
-- 3. Add workspace_id to graph_edges table
-- ============================================
ALTER TABLE public.graph_edges 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_graph_edges_workspace_id ON public.graph_edges(workspace_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_user_workspace ON public.graph_edges(user_id, workspace_id);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can manage their own graph edges" ON public.graph_edges;
DROP POLICY IF EXISTS "Users can view graph edges in their workspaces" ON public.graph_edges;
DROP POLICY IF EXISTS "Users can insert graph edges in their workspaces" ON public.graph_edges;
DROP POLICY IF EXISTS "Users can update graph edges in their workspaces" ON public.graph_edges;
DROP POLICY IF EXISTS "Users can delete graph edges in their workspaces" ON public.graph_edges;

-- Create new RLS policies for workspace isolation
CREATE POLICY "Users can view graph edges in their workspaces" ON public.graph_edges
  FOR SELECT USING (
    auth.uid() = user_id AND 
    (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can insert graph edges in their workspaces" ON public.graph_edges
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can update graph edges in their workspaces" ON public.graph_edges
  FOR UPDATE USING (
    auth.uid() = user_id AND 
    (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can delete graph edges in their workspaces" ON public.graph_edges
  FOR DELETE USING (
    auth.uid() = user_id AND 
    (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
  );

-- ============================================
-- 4. Add workspace_id to chat_sessions table
-- ============================================
ALTER TABLE public.chat_sessions 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_workspace_id ON public.chat_sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_workspace ON public.chat_sessions(user_id, workspace_id);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can manage their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can view chat sessions in their workspaces" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can insert chat sessions in their workspaces" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can update chat sessions in their workspaces" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can delete chat sessions in their workspaces" ON public.chat_sessions;

-- Create new RLS policies for workspace isolation
CREATE POLICY "Users can view chat sessions in their workspaces" ON public.chat_sessions
  FOR SELECT USING (
    auth.uid() = user_id AND 
    (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can insert chat sessions in their workspaces" ON public.chat_sessions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can update chat sessions in their workspaces" ON public.chat_sessions
  FOR UPDATE USING (
    auth.uid() = user_id AND 
    (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can delete chat sessions in their workspaces" ON public.chat_sessions
  FOR DELETE USING (
    auth.uid() = user_id AND 
    (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
  );

-- ============================================
-- 5. Add workspace_id to skill_evidence table (if it exists)
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'skill_evidence') THEN
    ALTER TABLE public.skill_evidence 
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

    -- Create index for better query performance
    CREATE INDEX IF NOT EXISTS idx_skill_evidence_workspace_id ON public.skill_evidence(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_skill_evidence_user_workspace ON public.skill_evidence(user_id, workspace_id);

    -- Drop old RLS policies
    DROP POLICY IF EXISTS "Users can view their own skill evidence" ON public.skill_evidence;
    DROP POLICY IF EXISTS "Users can insert their own skill evidence" ON public.skill_evidence;
    DROP POLICY IF EXISTS "Users can update their own skill evidence" ON public.skill_evidence;
    DROP POLICY IF EXISTS "Users can delete their own skill evidence" ON public.skill_evidence;
    DROP POLICY IF EXISTS "Users can view skill evidence in their workspaces" ON public.skill_evidence;
    DROP POLICY IF EXISTS "Users can insert skill evidence in their workspaces" ON public.skill_evidence;
    DROP POLICY IF EXISTS "Users can update skill evidence in their workspaces" ON public.skill_evidence;
    DROP POLICY IF EXISTS "Users can delete skill evidence in their workspaces" ON public.skill_evidence;

    -- Create new RLS policies for workspace isolation
    CREATE POLICY "Users can view skill evidence in their workspaces" ON public.skill_evidence
      FOR SELECT USING (
        auth.uid() = user_id AND 
        (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
      );

    CREATE POLICY "Users can insert skill evidence in their workspaces" ON public.skill_evidence
      FOR INSERT WITH CHECK (
        auth.uid() = user_id AND 
        (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
      );

    CREATE POLICY "Users can update skill evidence in their workspaces" ON public.skill_evidence
      FOR UPDATE USING (
        auth.uid() = user_id AND 
        (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
      );

    CREATE POLICY "Users can delete skill evidence in their workspaces" ON public.skill_evidence
      FOR DELETE USING (
        auth.uid() = user_id AND 
        (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
      );
  END IF;
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- Run these to verify the migration was successful
-- ============================================

-- Check that all tables have workspace_id column
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'workspace_id'
  AND table_name IN ('skills', 'tasks', 'graph_edges', 'chat_sessions', 'pages')
ORDER BY table_name;

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('skills', 'tasks', 'graph_edges', 'chat_sessions', 'pages')
ORDER BY tablename, policyname;

-- ============================================
-- NOTES
-- ============================================
-- 1. This migration adds workspace_id to all existing tables
-- 2. All existing data will have NULL workspace_id (backward compatible)
-- 3. New data should always include workspace_id
-- 4. RLS policies ensure users can only access data in their workspaces
-- 5. The pages table already has workspace isolation (see fix-pages-rls.sql)
-- 6. After running this, update your backend API to always include workspace_id when creating/updating records
-- 7. This only updates tables that exist in data.sql (skills, tasks, graph_edges, chat_sessions)
