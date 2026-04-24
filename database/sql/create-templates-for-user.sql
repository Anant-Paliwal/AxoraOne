-- Create Templates for Specific User
-- Replace YOUR_USER_ID with your actual user ID from auth.users

-- First, add the template columns if not already added
ALTER TABLE pages ADD COLUMN IF NOT EXISTS template_category VARCHAR(50);
ALTER TABLE pages ADD COLUMN IF NOT EXISTS is_public_template BOOLEAN DEFAULT FALSE;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS template_description TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS template_preview_image TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pages_templates ON pages(is_template, template_category) WHERE is_template = TRUE;
CREATE INDEX IF NOT EXISTS idx_pages_public_templates ON pages(is_public_template) WHERE is_public_template = TRUE;

-- Get your user ID (run this first to find your ID)
-- SELECT id, email FROM auth.users;

-- Then run this with your actual user ID:
-- Replace 'YOUR_USER_ID_HERE' with the UUID from the query above

SELECT create_builtin_templates_for_user('YOUR_USER_ID_HERE'::UUID);

-- Or if you want to use the first user automatically:
-- SELECT create_builtin_templates_for_user((SELECT id FROM auth.users ORDER BY created_at LIMIT 1));
