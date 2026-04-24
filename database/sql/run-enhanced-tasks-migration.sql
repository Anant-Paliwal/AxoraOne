-- =====================================================
-- ENHANCED TASKS MIGRATION
-- Run this in your Supabase SQL Editor
-- =====================================================
-- This migration adds support for:
-- - Subtasks (parent_task_id)
-- - Event types (task, event, birthday, reminder, milestone)
-- - Blocked status
-- - Calendar sync fields (start_date, end_date, all_day, color, location)
-- - Created from tracking (page, skill, ask, manual, calendar)
-- =====================================================

-- Add new columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'task';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_from TEXT DEFAULT 'manual';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS all_day BOOLEAN DEFAULT true;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Add check constraints (drop first if exists to avoid conflicts)
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_event_type_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_event_type_check 
  CHECK (event_type IN ('task', 'event', 'birthday', 'reminder', 'milestone'));

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_created_from_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_created_from_check 
  CHECK (created_from IN ('page', 'skill', 'ask', 'manual', 'calendar'));

-- Update status check constraint to include 'blocked'
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('todo', 'in-progress', 'done', 'blocked'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_event_type ON tasks(event_type);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Function to get subtasks count for a task
CREATE OR REPLACE FUNCTION get_subtasks_count(task_uuid UUID)
RETURNS TABLE(total INTEGER, completed INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total,
    COUNT(*) FILTER (WHERE status = 'done')::INTEGER as completed
  FROM tasks
  WHERE parent_task_id = task_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-complete parent task when all subtasks are done
CREATE OR REPLACE FUNCTION check_parent_task_completion()
RETURNS TRIGGER AS $$
DECLARE
  parent_id UUID;
  total_subtasks INTEGER;
  completed_subtasks INTEGER;
BEGIN
  parent_id := NEW.parent_task_id;
  
  IF parent_id IS NOT NULL THEN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'done')
    INTO total_subtasks, completed_subtasks
    FROM tasks
    WHERE parent_task_id = parent_id;
    
    -- If all subtasks are done, mark parent as done
    IF total_subtasks > 0 AND total_subtasks = completed_subtasks THEN
      UPDATE tasks SET status = 'done', completed_at = NOW() WHERE id = parent_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-completion (drop first if exists)
DROP TRIGGER IF EXISTS trigger_check_parent_completion ON tasks;
CREATE TRIGGER trigger_check_parent_completion
AFTER UPDATE OF status ON tasks
FOR EACH ROW
WHEN (NEW.status = 'done')
EXECUTE FUNCTION check_parent_task_completion();

-- Function to update completed_at timestamp
CREATE OR REPLACE FUNCTION update_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done') THEN
    NEW.completed_at := NOW();
  ELSIF NEW.status != 'done' AND OLD.status = 'done' THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for completed_at (drop first if exists)
DROP TRIGGER IF EXISTS trigger_update_completed_at ON tasks;
CREATE TRIGGER trigger_update_completed_at
BEFORE UPDATE OF status ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_completed_at();

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run this to verify the migration worked:
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
ORDER BY ordinal_position;
