-- Add workspace_id to chat_sessions table
ALTER TABLE public.chat_sessions 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_workspace_id ON public.chat_sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_workspace ON public.chat_sessions(user_id, workspace_id);
