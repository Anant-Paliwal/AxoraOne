-- Page Templates System
-- Adds built-in templates and custom template management

-- Add template category and visibility fields
ALTER TABLE pages ADD COLUMN IF NOT EXISTS template_category VARCHAR(50);
ALTER TABLE pages ADD COLUMN IF NOT EXISTS is_public_template BOOLEAN DEFAULT FALSE;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS template_description TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS template_preview_image TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0;

-- Create index for template queries
CREATE INDEX IF NOT EXISTS idx_pages_templates ON pages(is_template, template_category) WHERE is_template = TRUE;
CREATE INDEX IF NOT EXISTS idx_pages_public_templates ON pages(is_public_template) WHERE is_public_template = TRUE;

-- Function to track template usage
CREATE OR REPLACE FUNCTION increment_template_usage(template_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE pages
  SET use_count = COALESCE(use_count, 0) + 1
  WHERE id = template_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION increment_template_usage TO authenticated;

-- Function to insert built-in templates for a user
CREATE OR REPLACE FUNCTION create_builtin_templates_for_user(target_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Check if templates already exist for this user
  IF EXISTS (SELECT 1 FROM pages WHERE user_id = target_user_id AND is_public_template = TRUE LIMIT 1) THEN
    RAISE NOTICE 'Templates already exist for user %', target_user_id;
    RETURN;
  END IF;

  -- Insert built-in templates
  INSERT INTO pages (
    user_id,
    title,
    content,
    icon,
    tags,
    is_template,
    is_public_template,
    template_category,
    template_description,
    metadata
  ) VALUES
  -- Work Templates
  (
    target_user_id,
    'Meeting Notes',
    '<h1>Meeting Notes</h1><p><strong>Date:</strong> </p><p><strong>Attendees:</strong> </p><h2>Agenda</h2><ul><li></li></ul><h2>Discussion Points</h2><p></p><h2>Action Items</h2><ul><li>[ ] </li></ul><h2>Next Steps</h2><p></p>',
    'FileText',
    ARRAY['work', 'meetings', 'notes'],
    TRUE,
    TRUE,
    'work',
    'Structured template for meeting documentation with agenda, discussion points, and action items',
    '{"blocks": [], "suggested_skills": ["Communication", "Project Management"]}'
  ),
  (
    target_user_id,
    'Project Brief',
    '<h1>Project Brief</h1><h2>Overview</h2><p></p><h2>Objectives</h2><ul><li></li></ul><h2>Scope</h2><h3>In Scope</h3><ul><li></li></ul><h3>Out of Scope</h3><ul><li></li></ul><h2>Timeline</h2><p></p><h2>Resources</h2><p></p><h2>Success Metrics</h2><ul><li></li></ul><h2>Risks & Mitigation</h2><p></p>',
    'Briefcase',
    ARRAY['work', 'project', 'planning'],
    TRUE,
    TRUE,
    'work',
    'Comprehensive project planning template with objectives, scope, timeline, and success metrics',
    '{"blocks": [], "suggested_skills": ["Project Management", "Strategic Planning"]}'
  ),
  (
    target_user_id,
    'Weekly Report',
    '<h1>Weekly Report</h1><p><strong>Week of:</strong> </p><h2>Accomplishments</h2><ul><li></li></ul><h2>Challenges</h2><ul><li></li></ul><h2>Next Week Goals</h2><ul><li></li></ul><h2>Metrics</h2><p></p><h2>Notes</h2><p></p>',
    'Calendar',
    ARRAY['work', 'reporting', 'productivity'],
    TRUE,
    TRUE,
    'work',
    'Weekly progress report template for tracking accomplishments and goals',
    '{"blocks": [], "suggested_skills": ["Communication", "Time Management"]}'
  ),
  -- Education Templates
  (
    target_user_id,
    'Study Notes',
    '<h1>Study Notes</h1><p><strong>Subject:</strong> </p><p><strong>Topic:</strong> </p><p><strong>Date:</strong> </p><h2>Key Concepts</h2><ul><li></li></ul><h2>Detailed Notes</h2><p></p><h2>Examples</h2><p></p><h2>Practice Questions</h2><ul><li></li></ul><h2>Summary</h2><p></p><h2>Related Topics</h2><ul><li></li></ul>',
    'BookOpen',
    ARRAY['education', 'study', 'notes'],
    TRUE,
    TRUE,
    'education',
    'Organized learning and revision template with key concepts, examples, and practice questions',
    '{"blocks": [], "suggested_skills": ["Learning", "Note-taking"]}'
  ),
  (
    target_user_id,
    'Course Outline',
    '<h1>Course Outline</h1><p><strong>Course Name:</strong> </p><p><strong>Duration:</strong> </p><h2>Learning Objectives</h2><ul><li></li></ul><h2>Prerequisites</h2><ul><li></li></ul><h2>Course Structure</h2><h3>Module 1:</h3><ul><li></li></ul><h3>Module 2:</h3><ul><li></li></ul><h2>Assessment Methods</h2><p></p><h2>Resources</h2><ul><li></li></ul>',
    'GraduationCap',
    ARRAY['education', 'course', 'planning'],
    TRUE,
    TRUE,
    'education',
    'Complete course planning template with modules, objectives, and assessment methods',
    '{"blocks": [], "suggested_skills": ["Teaching", "Curriculum Design"]}'
  ),
  (
    target_user_id,
    'Research Paper',
    '<h1>Research Paper</h1><p><strong>Title:</strong> </p><p><strong>Author:</strong> </p><p><strong>Date:</strong> </p><h2>Abstract</h2><p></p><h2>Introduction</h2><p></p><h2>Literature Review</h2><p></p><h2>Methodology</h2><p></p><h2>Results</h2><p></p><h2>Discussion</h2><p></p><h2>Conclusion</h2><p></p><h2>References</h2><ul><li></li></ul>',
    'FileSearch',
    ARRAY['education', 'research', 'academic'],
    TRUE,
    TRUE,
    'education',
    'Academic research paper structure with all standard sections',
    '{"blocks": [], "suggested_skills": ["Research", "Academic Writing"]}'
  ),
  -- Personal Templates
  (
    target_user_id,
    'Daily Journal',
    '<h1>Daily Journal</h1><p><strong>Date:</strong> </p><h2>Morning Reflection</h2><p>How do I feel today?</p><p></p><h2>Today''s Highlights</h2><ul><li></li></ul><h2>Gratitude</h2><p>I''m grateful for...</p><ul><li></li></ul><h2>Challenges</h2><p></p><h2>Evening Reflection</h2><p>What did I learn today?</p><p></p><h2>Tomorrow''s Goals</h2><ul><li></li></ul>',
    'BookHeart',
    ARRAY['personal', 'journal', 'reflection'],
    TRUE,
    TRUE,
    'personal',
    'Reflective daily journaling template with morning and evening sections',
    '{"blocks": [], "suggested_skills": ["Self-Reflection", "Mindfulness"]}'
  ),
  (
    target_user_id,
    'Goal Setting',
    '<h1>Goal Setting</h1><p><strong>Date:</strong> </p><h2>Vision</h2><p>Where do I want to be?</p><p></p><h2>Long-term Goals (1 Year)</h2><ul><li></li></ul><h2>Short-term Goals (3 Months)</h2><ul><li></li></ul><h2>Action Steps</h2><ul><li>[ ] </li></ul><h2>Success Metrics</h2><p>How will I measure progress?</p><ul><li></li></ul><h2>Obstacles & Solutions</h2><p></p>',
    'Target',
    ARRAY['personal', 'goals', 'planning'],
    TRUE,
    TRUE,
    'personal',
    'Comprehensive goal-setting framework with vision, action steps, and metrics',
    '{"blocks": [], "suggested_skills": ["Goal Setting", "Planning"]}'
  ),
  (
    target_user_id,
    'Recipe',
    '<h1>Recipe Name</h1><p><strong>Prep Time:</strong> </p><p><strong>Cook Time:</strong> </p><p><strong>Servings:</strong> </p><p><strong>Difficulty:</strong> </p><h2>Ingredients</h2><ul><li></li></ul><h2>Instructions</h2><ol><li></li></ol><h2>Tips & Variations</h2><p></p><h2>Nutritional Info</h2><p></p><h2>Notes</h2><p></p>',
    'ChefHat',
    ARRAY['personal', 'cooking', 'recipe'],
    TRUE,
    TRUE,
    'personal',
    'Cooking recipe documentation with ingredients, instructions, and tips',
    '{"blocks": [], "suggested_skills": ["Cooking"]}'
  ),
  -- Writing Templates
  (
    target_user_id,
    'Blog Post',
    '<h1>Blog Post Title</h1><p><em>Compelling introduction hook...</em></p><h2>Section 1: Main Point</h2><p></p><h2>Section 2: Supporting Details</h2><p></p><h2>Section 3: Examples</h2><p></p><h2>Conclusion</h2><p></p><p><strong>Call to Action:</strong> </p><hr><p><em>Tags: </em></p>',
    'PenTool',
    ARRAY['writing', 'blog', 'content'],
    TRUE,
    TRUE,
    'writing',
    'Structure for writing engaging blog content with clear sections and CTA',
    '{"blocks": [], "suggested_skills": ["Writing", "Content Creation"]}'
  ),
  (
    target_user_id,
    'Article Outline',
    '<h1>Article Title</h1><p><strong>Target Audience:</strong> </p><p><strong>Key Message:</strong> </p><h2>Hook</h2><p></p><h2>Main Points</h2><ul><li></li></ul><h2>Supporting Evidence</h2><ul><li></li></ul><h2>Counterarguments</h2><p></p><h2>Conclusion</h2><p></p><h2>Sources</h2><ul><li></li></ul>',
    'FileEdit',
    ARRAY['writing', 'article', 'outline'],
    TRUE,
    TRUE,
    'writing',
    'Comprehensive article planning template with structure and research sections',
    '{"blocks": [], "suggested_skills": ["Writing", "Research"]}'
  ),
  -- Technical Templates
  (
    target_user_id,
    'Technical Documentation',
    '<h1>Technical Documentation</h1><h2>Overview</h2><p></p><h2>Prerequisites</h2><ul><li></li></ul><h2>Installation</h2><pre><code></code></pre><h2>Configuration</h2><p></p><h2>Usage</h2><h3>Basic Example</h3><pre><code></code></pre><h2>API Reference</h2><p></p><h2>Troubleshooting</h2><ul><li></li></ul><h2>FAQ</h2><p></p>',
    'Code',
    ARRAY['technical', 'documentation', 'development'],
    TRUE,
    TRUE,
    'technical',
    'Software documentation template with installation, usage, and API reference',
    '{"blocks": [], "suggested_skills": ["Technical Writing", "Documentation"]}'
  ),
  (
    target_user_id,
    'Bug Report',
    '<h1>Bug Report</h1><p><strong>Date:</strong> </p><p><strong>Reporter:</strong> </p><p><strong>Priority:</strong> </p><h2>Description</h2><p></p><h2>Steps to Reproduce</h2><ol><li></li></ol><h2>Expected Behavior</h2><p></p><h2>Actual Behavior</h2><p></p><h2>Environment</h2><ul><li>OS: </li><li>Browser: </li><li>Version: </li></ul><h2>Screenshots</h2><p></p><h2>Additional Notes</h2><p></p>',
    'Bug',
    ARRAY['technical', 'bug', 'development'],
    TRUE,
    TRUE,
    'technical',
    'Structured bug report template for software development',
    '{"blocks": [], "suggested_skills": ["Testing", "Problem Solving"]}'
  ),
  -- Business Templates
  (
    target_user_id,
    'Business Plan',
    '<h1>Business Plan</h1><h2>Executive Summary</h2><p></p><h2>Company Description</h2><p></p><h2>Market Analysis</h2><p></p><h2>Products & Services</h2><p></p><h2>Marketing Strategy</h2><p></p><h2>Financial Projections</h2><p></p><h2>Team</h2><p></p><h2>Milestones</h2><ul><li></li></ul>',
    'Building',
    ARRAY['business', 'planning', 'strategy'],
    TRUE,
    TRUE,
    'business',
    'Comprehensive business plan template for startups and ventures',
    '{"blocks": [], "suggested_skills": ["Business Planning", "Strategy"]}'
  ),
  (
    target_user_id,
    'Marketing Campaign',
    '<h1>Marketing Campaign</h1><p><strong>Campaign Name:</strong> </p><p><strong>Duration:</strong> </p><h2>Objectives</h2><ul><li></li></ul><h2>Target Audience</h2><p></p><h2>Key Messages</h2><ul><li></li></ul><h2>Channels</h2><ul><li></li></ul><h2>Budget</h2><p></p><h2>Timeline</h2><p></p><h2>Success Metrics</h2><ul><li></li></ul><h2>Creative Assets</h2><p></p>',
    'Megaphone',
    ARRAY['business', 'marketing', 'campaign'],
    TRUE,
    TRUE,
    'business',
    'Marketing campaign planning template with objectives, channels, and metrics',
    '{"blocks": [], "suggested_skills": ["Marketing", "Campaign Management"]}'
  );

  RAISE NOTICE 'Created % built-in templates for user %', 15, target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Try to create templates for the first user if one exists
DO $$
DECLARE
  first_user_id UUID;
BEGIN
  SELECT id INTO first_user_id FROM auth.users ORDER BY created_at LIMIT 1;
  
  IF first_user_id IS NOT NULL THEN
    PERFORM create_builtin_templates_for_user(first_user_id);
  ELSE
    RAISE NOTICE 'No users found. Templates will be created when users sign up.';
  END IF;
END $$;

COMMENT ON COLUMN pages.template_category IS 'Category for template organization (work, education, personal, writing, technical, business)';
COMMENT ON COLUMN pages.is_public_template IS 'Whether this template is available to all users';
COMMENT ON COLUMN pages.template_description IS 'Description of what the template is for';
COMMENT ON COLUMN pages.use_count IS 'Number of times this template has been used';
COMMENT ON FUNCTION create_builtin_templates_for_user IS 'Creates built-in templates for a specific user';
