-- Notifications System Migration
-- Run this in Supabase SQL Editor

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'info', -- info, success, warning, error, task, page, skill, quiz, reminder
    title TEXT NOT NULL,
    message TEXT,
    icon TEXT,
    link TEXT, -- Optional navigation link
    link_label TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_workspace_id ON notifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications" ON notifications
    FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT DEFAULT NULL,
    p_type TEXT DEFAULT 'info',
    p_workspace_id UUID DEFAULT NULL,
    p_link TEXT DEFAULT NULL,
    p_link_label TEXT DEFAULT NULL,
    p_icon TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, workspace_id, type, title, message, icon, link, link_label, metadata)
    VALUES (p_user_id, p_workspace_id, p_type, p_title, p_message, p_icon, p_link, p_link_label, p_metadata)
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create notification when task is assigned/due
CREATE OR REPLACE FUNCTION notify_task_due() RETURNS TRIGGER AS $$
BEGIN
    -- Notify when task is due today
    IF NEW.due_date IS NOT NULL AND DATE(NEW.due_date) = CURRENT_DATE AND OLD.due_date IS DISTINCT FROM NEW.due_date THEN
        PERFORM create_notification(
            NEW.user_id,
            'Task Due Today',
            NEW.title,
            'task',
            NEW.workspace_id,
            '/tasks/' || NEW.id,
            'View Task',
            '📋',
            jsonb_build_object('task_id', NEW.id)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for task notifications (optional)
-- DROP TRIGGER IF EXISTS task_due_notification ON tasks;
-- CREATE TRIGGER task_due_notification
--     AFTER UPDATE ON tasks
--     FOR EACH ROW
--     EXECUTE FUNCTION notify_task_due();

SELECT 'Notifications table created successfully' as status;
