-- Create skill_evidence table to link pages to skills
CREATE TABLE IF NOT EXISTS public.skill_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL DEFAULT 'page' CHECK (evidence_type IN ('page', 'quiz')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(skill_id, page_id)
);

-- Enable RLS
ALTER TABLE public.skill_evidence ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own skill evidence" ON public.skill_evidence
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own skill evidence" ON public.skill_evidence
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own skill evidence" ON public.skill_evidence
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own skill evidence" ON public.skill_evidence
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_skill_evidence_skill_id ON public.skill_evidence(skill_id);
CREATE INDEX idx_skill_evidence_page_id ON public.skill_evidence(page_id);
CREATE INDEX idx_skill_evidence_user_id ON public.skill_evidence(user_id);
