-- ============================================
-- WORKSPACE ISOLATION MIGRATION
-- Add workspace_id to all tables for complete workspace isolation
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
-- 3. Add workspace_id to calendar_events table
-- ============================================
ALTER TABLE public.calendar_events 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_workspace_id ON public.calendar_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_workspace ON public.calendar_events(user_id, workspace_id);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can manage their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can view calendar events in their workspaces" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can insert calendar events in their workspaces" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can update calendar events in their workspaces" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can delete calendar events in their workspaces" ON public.calendar_events;

-- Create new RLS policies for workspace isolation
CREATE POLICY "Users can view calendar events in their workspaces" ON public.calendar_events
  FOR SELECT USING (
    auth.uid() = user_id AND 
    (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can insert calendar events in their workspaces" ON public.calendar_events
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can update calendar events in their workspaces" ON public.calendar_events
  FOR UPDATE USING (
    auth.uid() = user_id AND 
    (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can delete calendar events in their workspaces" ON public.calendar_events
  FOR DELETE USING (
    auth.uid() = user_id AND 
    (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
  );

-- ============================================
-- 4. Add workspace_id to knowledge_items table
-- ============================================
ALTER TABLE public.knowledge_items 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_knowledge_items_workspace_id ON public.knowledge_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_user_workspace ON public.knowledge_items(user_id, workspace_id);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can manage their own knowledge items" ON public.knowledge_items;
DROP POLICY IF EXISTS "Users can view knowledge items in their workspaces" ON public.knowledge_items;
DROP POLICY IF EXISTS "Users can insert knowledge items in their workspaces" ON public.knowledge_items;
DROP POLICY IF EXISTS "Users can update knowledge items in their workspaces" ON public.knowledge_items;
DROP POLICY IF EXISTS "Users can delete knowledge items in their workspaces" ON public.knowledge_items;

-- Create new RLS policies for workspace isolation
CREATE POLICY "Users can view knowledge items in their workspaces" ON public.knowledge_items
  FOR SELECT USING (
    auth.uid() = user_id AND 
    (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can insert knowledge items in their workspaces" ON public.knowledge_items
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can update knowledge items in their workspaces" ON public.knowledge_items
  FOR UPDATE USING (
    auth.uid() = user_id AND 
    (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can delete knowledge items in their workspaces" ON public.knowledge_items
  FOR DELETE USING (
    auth.uid() = user_id AND 
    (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
  );

-- ============================================
-- 5. Add workspace_id to chat_messages table (Ask Anything)
-- ============================================
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_workspace_id ON public.chat_messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_workspace ON public.chat_messages(user_id, workspace_id);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can manage their own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view chat messages in their workspaces" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert chat messages in their workspaces" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update chat messages in their workspaces" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete chat messages in their workspaces" ON public.chat_messages;

-- Create new RLS policies for workspace isolation
CREATE POLICY "Users can view chat messages in their workspaces" ON public.chat_messages
  FOR SELECT USING (
    auth.uid() = user_id AND 
    (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can insert chat messages in their workspaces" ON public.chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can update chat messages in their workspaces" ON public.chat_messages
  FOR UPDATE USING (
    auth.uid() = user_id AND 
    (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can delete chat messages in their workspaces" ON public.chat_messages
  FOR DELETE USING (
    auth.uid() = user_id AND 
    (workspace_id IS NULL OR workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()))
  );

-- ============================================
-- 6. Add workspace_id to skill_evidence table
-- ============================================
ALTER TABLE public.skill_evidence 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_skill_evidence_workspace_id ON public.skill_evidence(workspace_id);
CREATE INDEX IF NOT EXISTS idx_skill_evidence_user_workspace ON public.skill_evidence(user_id, workspace_id);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can manage their own skill evidence" ON public.skill_evidence;
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
  AND table_name IN ('skills', 'tasks', 'calendar_events', 'knowledge_items', 'chat_messages', 'skill_evidence', 'pages')
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
  AND tablename IN ('skills', 'tasks', 'calendar_events', 'knowledge_items', 'chat_messages', 'skill_evidence', 'pages')
ORDER BY tablename, policyname;

-- ============================================
-- NOTES
-- ============================================
-- 1. This migration adds workspace_id to all major tables
-- 2. All existing data will have NULL workspace_id (backward compatible)
-- 3. New data should always include workspace_id
-- 4. RLS policies ensure users can only access data in their workspaces
-- 5. The pages table already has workspace isolation (see fix-pages-rls.sql)
-- 6. After running this, update your backend API to always include workspace_id when creating/updating records
