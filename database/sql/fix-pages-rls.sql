-- Drop existing policy
DROP POLICY IF EXISTS "Users can manage their own pages" ON public.pages;

-- Create explicit policies for pages
CREATE POLICY "Users can view their own pages" ON public.pages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pages" ON public.pages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pages" ON public.pages
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pages" ON public.pages
  FOR DELETE USING (auth.uid() = user_id);
