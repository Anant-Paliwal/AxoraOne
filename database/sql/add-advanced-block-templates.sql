-- Advanced Block Templates with ALL Block Types
-- This migration adds professional templates using all available blocks

-- First, ensure template columns exist
ALTER TABLE pages ADD COLUMN IF NOT EXISTS template_category VARCHAR(50);
ALTER TABLE pages ADD COLUMN IF NOT EXISTS is_public_template BOOLEAN DEFAULT FALSE;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS template_description TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS template_preview_image TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0;

-- Create function to add templates for a user
CREATE OR REPLACE FUNCTION create_advanced_templates_for_user(user_id UUID)
RETURNS void AS $$
DECLARE
  workspace_id_var UUID;
BEGIN
  -- Get user's first workspace
  SELECT id INTO workspace_id_var 
  FROM workspaces 
  WHERE created_by = user_id 
  ORDER BY created_at 
  LIMIT 1;

  IF workspace_id_var IS NULL THEN
    RAISE EXCEPTION 'No workspace found for user';
  END IF;

  -- Delete existing templates for this user to avoid duplicates
  DELETE FROM pages 
  WHERE is_template = TRUE 
  AND created_by = user_id;

  -- Insert advanced templates
  -- Template 1: Complete Notes Template
  INSERT INTO pages (
    title, icon, content, blocks, is_template, template_category,
    is_public_template, template_description, workspace_id, created_by, tags
  ) VALUES (
    'Complete Notes Template',
    'FileText',
    '',
    jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 1, 'content', '📝 Complete Notes Template')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'text', 'data', jsonb_build_object('content', 'This template showcases all available block types for comprehensive note-taking.')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'divider', 'data', jsonb_build_object()),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 2, 'content', '📋 Task Lists')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'checkbox', 'data', jsonb_build_object('content', 'Review meeting notes', 'checked', false)),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'checkbox', 'data', jsonb_build_object('content', 'Update project timeline', 'checked', false)),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'checkbox', 'data', jsonb_build_object('content', 'Send follow-up emails', 'checked', false)),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 2, 'content', '💡 Key Points')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'callout', 'data', jsonb_build_object('content', 'Important: This is a callout block for highlighting critical information', 'type', 'info')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'quote', 'data', jsonb_build_object('content', 'Success is not final, failure is not fatal: it is the courage to continue that counts.')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 2, 'content', '📊 Data & Tables')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'table', 'data', jsonb_build_object('rows', 3, 'cols', 3, 'content', jsonb_build_array(
        jsonb_build_array('Header 1', 'Header 2', 'Header 3'),
        jsonb_build_array('Row 1 Col 1', 'Row 1 Col 2', 'Row 1 Col 3'),
        jsonb_build_array('Row 2 Col 1', 'Row 2 Col 2', 'Row 2 Col 3')
      ))),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 2, 'content', '💻 Code Examples')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'code', 'data', jsonb_build_object('language', 'javascript', 'content', 'const greeting = "Hello World";\nconsole.log(greeting);')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 2, 'content', '🔗 Links & References')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'link', 'data', jsonb_build_object('url', 'https://example.com', 'text', 'External Resource Link')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 2, 'content', '📁 Tabs & Organization')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'tabs', 'data', jsonb_build_object('tabs', jsonb_build_array(
        jsonb_build_object('id', 'tab1', 'label', 'Overview', 'content', 'Overview content goes here'),
        jsonb_build_object('id', 'tab2', 'label', 'Details', 'content', 'Detailed information'),
        jsonb_build_object('id', 'tab3', 'label', 'Notes', 'content', 'Additional notes')
      )))
    ),
    TRUE,
    'notes',
    TRUE,
    'Comprehensive note-taking template with all block types including headings, checklists, callouts, tables, code blocks, and tabs',
    workspace_id_var,
    user_id,
    ARRAY['notes', 'complete', 'advanced']
  );

  -- Template 2: Book Notes Template
  INSERT INTO pages (
    title, icon, content, blocks, is_template, template_category,
    is_public_template, template_description, workspace_id, created_by, tags
  ) VALUES (
    'Book Notes Template',
    'BookOpen',
    '',
    jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 1, 'content', '📚 Book Title')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'text', 'data', jsonb_build_object('content', 'Author: [Author Name]')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'text', 'data', jsonb_build_object('content', 'Genre: [Genre]')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'text', 'data', jsonb_build_object('content', 'Published: [Year]')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'divider', 'data', jsonb_build_object()),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 2, 'content', '⭐ Rating')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'text', 'data', jsonb_build_object('content', '★★★★★ (5/5)')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 2, 'content', '📝 Summary')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'text', 'data', jsonb_build_object('content', 'Write a brief summary of the book here...')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 2, 'content', '💡 Key Takeaways')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'checkbox', 'data', jsonb_build_object('content', 'Key insight #1', 'checked', false)),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'checkbox', 'data', jsonb_build_object('content', 'Key insight #2', 'checked', false)),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'checkbox', 'data', jsonb_build_object('content', 'Key insight #3', 'checked', false)),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 2, 'content', '💭 Favorite Quotes')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'quote', 'data', jsonb_build_object('content', 'Add your favorite quotes from the book here...')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 2, 'content', '🎯 Action Items')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'checkbox', 'data', jsonb_build_object('content', 'Apply concept from chapter 1', 'checked', false)),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'checkbox', 'data', jsonb_build_object('content', 'Research related topics', 'checked', false)),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 2, 'content', '🔗 Related Resources')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'link', 'data', jsonb_build_object('url', 'https://example.com', 'text', 'Author website')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'link', 'data', jsonb_build_object('url', 'https://example.com', 'text', 'Book discussion forum'))
    ),
    TRUE,
    'notes',
    TRUE,
    'Perfect for tracking book reading with summaries, quotes, ratings, and action items',
    workspace_id_var,
    user_id,
    ARRAY['books', 'reading', 'notes']
  );

  -- Template 3: Meeting Notes Template
  INSERT INTO pages (
    title, icon, content, blocks, is_template, template_category,
    is_public_template, template_description, workspace_id, created_by, tags
  ) VALUES (
    'Meeting Notes Template',
    'Users',
    '',
    jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 1, 'content', '🤝 Meeting Notes')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'text', 'data', jsonb_build_object('content', '📅 Date: [Date]')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'text', 'data', jsonb_build_object('content', '⏰ Time: [Time]')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'text', 'data', jsonb_build_object('content', '👥 Attendees: [Names]')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'divider', 'data', jsonb_build_object()),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 2, 'content', '🎯 Agenda')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'checkbox', 'data', jsonb_build_object('content', 'Topic 1', 'checked', false)),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'checkbox', 'data', jsonb_build_object('content', 'Topic 2', 'checked', false)),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'checkbox', 'data', jsonb_build_object('content', 'Topic 3', 'checked', false)),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 2, 'content', '📝 Discussion Notes')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'text', 'data', jsonb_build_object('content', 'Key discussion points...')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 2, 'content', '✅ Decisions Made')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'callout', 'data', jsonb_build_object('content', 'Important decision: [Decision details]', 'type', 'success')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 2, 'content', '🎯 Action Items')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'table', 'data', jsonb_build_object('rows', 4, 'cols', 3, 'content', jsonb_build_array(
        jsonb_build_array('Action Item', 'Owner', 'Due Date'),
        jsonb_build_array('Task 1', 'Person A', 'Date'),
        jsonb_build_array('Task 2', 'Person B', 'Date'),
        jsonb_build_array('Task 3', 'Person C', 'Date')
      ))),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 2, 'content', '📌 Next Steps')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'checkbox', 'data', jsonb_build_object('content', 'Schedule follow-up meeting', 'checked', false)),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'checkbox', 'data', jsonb_build_object('content', 'Send meeting summary', 'checked', false))
    ),
    TRUE,
    'productivity',
    TRUE,
    'Professional meeting notes with agenda, decisions, action items table, and next steps',
    workspace_id_var,
    user_id,
    ARRAY['meetings', 'productivity', 'collaboration']
  );

  -- Template 4: Project Documentation Template
  INSERT INTO pages (
    title, icon, content, blocks, is_template, template_category,
    is_public_template, template_description, workspace_id, created_by, tags
  ) VALUES (
    'Project Documentation',
    'FolderKanban',
    '',
    jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 1, 'content', '📁 Project Name')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'callout', 'data', jsonb_build_object('content', 'Project Status: In Progress | Priority: High', 'type', 'info')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'divider', 'data', jsonb_build_object()),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'tabs', 'data', jsonb_build_object('tabs', jsonb_build_array(
        jsonb_build_object('id', 'overview', 'label', 'Overview', 'content', 'Project overview and goals'),
        jsonb_build_object('id', 'technical', 'label', 'Technical', 'content', 'Technical specifications'),
        jsonb_build_object('id', 'timeline', 'label', 'Timeline', 'content', 'Project timeline and milestones'),
        jsonb_build_object('id', 'resources', 'label', 'Resources', 'content', 'Team and resources')
      ))),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 2, 'content', '🎯 Project Goals')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'checkbox', 'data', jsonb_build_object('content', 'Goal 1: [Description]', 'checked', false)),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'checkbox', 'data', jsonb_build_object('content', 'Goal 2: [Description]', 'checked', false)),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'checkbox', 'data', jsonb_build_object('content', 'Goal 3: [Description]', 'checked', false)),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 2, 'content', '👥 Team Members')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'table', 'data', jsonb_build_object('rows', 4, 'cols', 3, 'content', jsonb_build_array(
        jsonb_build_array('Name', 'Role', 'Responsibilities'),
        jsonb_build_array('Team Member 1', 'Lead', 'Overall coordination'),
        jsonb_build_array('Team Member 2', 'Developer', 'Implementation'),
        jsonb_build_array('Team Member 3', 'Designer', 'UI/UX Design')
      ))),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 2, 'content', '💻 Technical Stack')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'code', 'data', jsonb_build_object('language', 'json', 'content', '{\n  "frontend": "React + TypeScript",\n  "backend": "Python FastAPI",\n  "database": "PostgreSQL",\n  "deployment": "Docker"\n}')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 2, 'content', '📊 Progress Tracking')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'text', 'data', jsonb_build_object('content', 'Overall Progress: 45%')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 2, 'content', '🔗 Important Links')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'link', 'data', jsonb_build_object('url', 'https://github.com/project', 'text', 'GitHub Repository')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'link', 'data', jsonb_build_object('url', 'https://docs.project.com', 'text', 'Documentation')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'link', 'data', jsonb_build_object('url', 'https://project.com', 'text', 'Live Demo'))
    ),
    TRUE,
    'productivity',
    TRUE,
    'Complete project documentation with tabs, team table, technical specs, and progress tracking',
    workspace_id_var,
    user_id,
    ARRAY['project', 'documentation', 'technical']
  );

  -- Template 5: Learning Notes Template
  INSERT INTO pages (
    title, icon, content, blocks, is_template, template_category,
    is_public_template, template_description, workspace_id, created_by, tags
  ) VALUES (
    'Learning Notes',
    'GraduationCap',
    '',
    jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 1, 'content', '🎓 [Topic Name]')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'text', 'data', jsonb_build_object('content', '📚 Course/Source: [Name]')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'text', 'data', jsonb_build_object('content', '📅 Date: [Date]')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'divider', 'data', jsonb_build_object()),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'callout', 'data', jsonb_build_object('content', '🎯 Learning Objective: What you want to achieve from this topic', 'type', 'info')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 2, 'content', '📝 Main Concepts')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'tabs', 'data', jsonb_build_object('tabs', jsonb_build_array(
        jsonb_build_object('id', 'concept1', 'label', 'Concept 1', 'content', 'Explanation of first concept'),
        jsonb_build_object('id', 'concept2', 'label', 'Concept 2', 'content', 'Explanation of second concept'),
        jsonb_build_object('id', 'concept3', 'label', 'Concept 3', 'content', 'Explanation of third concept')
      ))),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 2, 'content', '💡 Key Points')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'checkbox', 'data', jsonb_build_object('content', 'Key point #1', 'checked', false)),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'checkbox', 'data', jsonb_build_object('content', 'Key point #2', 'checked', false)),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'checkbox', 'data', jsonb_build_object('content', 'Key point #3', 'checked', false)),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 2, 'content', '💻 Code Examples')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'code', 'data', jsonb_build_object('language', 'python', 'content', '# Example code\ndef example_function():\n    print("Hello, World!")\n    return True')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 2, 'content', '📊 Summary Table')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'table', 'data', jsonb_build_object('rows', 4, 'cols', 2, 'content', jsonb_build_array(
        jsonb_build_array('Term', 'Definition'),
        jsonb_build_array('Term 1', 'Definition 1'),
        jsonb_build_array('Term 2', 'Definition 2'),
        jsonb_build_array('Term 3', 'Definition 3')
      ))),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 2, 'content', '❓ Questions to Review')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'checkbox', 'data', jsonb_build_object('content', 'Question 1: [Your question]', 'checked', false)),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'checkbox', 'data', jsonb_build_object('content', 'Question 2: [Your question]', 'checked', false)),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'heading', 'data', jsonb_build_object('level', 2, 'content', '🔗 Resources')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'link', 'data', jsonb_build_object('url', 'https://example.com', 'text', 'Official Documentation')),
      jsonb_build_object('id', gen_random_uuid(), 'type', 'link', 'data', jsonb_build_object('url', 'https://example.com', 'text', 'Tutorial Video'))
    ),
    TRUE,
    'education',
    TRUE,
    'Structured learning notes with concepts tabs, code examples, summary tables, and review questions',
    workspace_id_var,
    user_id,
    ARRAY['learning', 'education', 'study']
  );

END;
$$ LANGUAGE plpgsql;

-- Instructions for use:
-- Replace YOUR_USER_ID with your actual user ID
-- SELECT create_advanced_templates_for_user('YOUR_USER_ID'::UUID);

-- Or use the first user automatically:
-- SELECT create_advanced_templates_for_user((SELECT id FROM auth.users ORDER BY created_at LIMIT 1));
