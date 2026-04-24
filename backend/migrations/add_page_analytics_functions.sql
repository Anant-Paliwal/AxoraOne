-- Add analytics functions for pages

-- Function to increment page view count
CREATE OR REPLACE FUNCTION increment_page_view(page_id_param UUID, user_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.pages
  SET 
    view_count = COALESCE(view_count, 0) + 1,
    last_viewed_at = NOW()
  WHERE id = page_id_param AND user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_page_view(UUID, UUID) TO authenticated;
