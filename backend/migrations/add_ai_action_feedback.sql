-- AI Action Feedback Table with RLS
-- Run this in Supabase SQL Editor

-- Drop existing policies first (if they exist)
DROP POLICY IF EXISTS "Users can view own feedback" ON ai_action_feedback;
DROP POLICY IF EXISTS "Users can insert own feedback" ON ai_action_feedback;
DROP POLICY IF EXISTS "Service role full access" ON ai_action_feedback;

-- Drop and recreate table
DROP TABLE IF EXISTS ai_action_feedback;

-- Create the table
CREATE TABLE public.ai_action_feedback (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    workspace_id uuid NULL,
    preview_id text NOT NULL,
    query text NULL,
    mode text NULL,
    rating text NOT NULL,
    comment text NULL,
    executed_actions jsonb NULL DEFAULT '[]'::jsonb,
    created_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT ai_action_feedback_pkey PRIMARY KEY (id),
    CONSTRAINT ai_action_feedback_rating_check CHECK ((rating = ANY (ARRAY['helpful'::text, 'not_helpful'::text])))
);

-- Create indexes
CREATE INDEX idx_ai_action_feedback_user ON public.ai_action_feedback USING btree (user_id);
CREATE INDEX idx_ai_action_feedback_workspace ON public.ai_action_feedback USING btree (workspace_id);
CREATE INDEX idx_ai_action_feedback_rating ON public.ai_action_feedback USING btree (rating);
CREATE INDEX idx_ai_action_feedback_created ON public.ai_action_feedback USING btree (created_at DESC);

-- Enable RLS
ALTER TABLE ai_action_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback" ON ai_action_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON ai_action_feedback
    FOR SELECT USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON ai_action_feedback TO authenticated;
GRANT ALL ON ai_action_feedback TO service_role;
GRANT ALL ON ai_action_feedback TO anon;
