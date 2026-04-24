-- Enhanced Pages Table Migration
-- Adds missing fields, indexes, and full-text search capabilities

-- Add missing columns to pages table
ALTER TABLE public.pages 
ADD COLUMN IF NOT EXISTS parent_page_id UUID REFERENCES public.pages(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS page_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS blocks JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS estimated_reading_time INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cover_image TEXT,
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pages_workspace_id ON public.pages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pages_parent_page_id ON public.pages(parent_page_id);
CREATE INDEX IF NOT EXISTS idx_pages_user_workspace ON public.pages(user_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_pages_tags ON public.pages USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_pages_updated_at ON public.pages(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pages_created_at ON public.pages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pages_is_archived ON public.pages(is_archived) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_pages_is_favorite ON public.pages(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_pages_search ON public.pages USING GIN(search_vector);

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_pages_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update search vector
DROP TRIGGER IF EXISTS pages_search_vector_update ON public.pages;
CREATE TRIGGER pages_search_vector_update
  BEFORE INSERT OR UPDATE OF title, content, tags
  ON public.pages
  FOR EACH ROW
  EXECUTE FUNCTION update_pages_search_vector();

-- Function to calculate word count and reading time
CREATE OR REPLACE FUNCTION update_page_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate word count (approximate)
  NEW.word_count := array_length(regexp_split_to_array(COALESCE(NEW.content, ''), '\s+'), 1);
  
  -- Calculate estimated reading time (assuming 200 words per minute)
  NEW.estimated_reading_time := GREATEST(1, CEIL(NEW.word_count::float / 200));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update stats
DROP TRIGGER IF EXISTS pages_stats_update ON public.pages;
CREATE TRIGGER pages_stats_update
  BEFORE INSERT OR UPDATE OF content
  ON public.pages
  FOR EACH ROW
  EXECUTE FUNCTION update_page_stats();

-- Update existing rows to populate search vectors and stats
UPDATE public.pages SET content = content WHERE content IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.pages.parent_page_id IS 'Reference to parent page for sub-pages';
COMMENT ON COLUMN public.pages.page_order IS 'Order of page within parent (for sub-pages)';
COMMENT ON COLUMN public.pages.blocks IS 'JSON array of block content';
COMMENT ON COLUMN public.pages.metadata IS 'Additional metadata for the page';
COMMENT ON COLUMN public.pages.is_archived IS 'Soft delete flag';
COMMENT ON COLUMN public.pages.is_template IS 'Whether this page is a template';
COMMENT ON COLUMN public.pages.view_count IS 'Number of times page has been viewed';
COMMENT ON COLUMN public.pages.last_viewed_at IS 'Last time page was viewed';
COMMENT ON COLUMN public.pages.estimated_reading_time IS 'Estimated reading time in minutes';
COMMENT ON COLUMN public.pages.word_count IS 'Number of words in content';
COMMENT ON COLUMN public.pages.cover_image IS 'URL to cover image';
COMMENT ON COLUMN public.pages.search_vector IS 'Full-text search vector';
