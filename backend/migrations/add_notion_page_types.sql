-- Add Notion-like page types and database system
-- This migration adds support for different page types similar to Notion

-- Add page_type column to pages table
ALTER TABLE pages 
ADD COLUMN IF NOT EXISTS page_type VARCHAR(50) DEFAULT 'blank',
ADD COLUMN IF NOT EXISTS database_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS view_type VARCHAR(50) DEFAULT 'page';

-- Page types: 'blank', 'database', 'board', 'list', 'gallery', 'calendar', 'timeline', 'form'
-- View types: 'page', 'table', 'board', 'list', 'gallery', 'calendar', 'timeline'

-- Create page_templates table for pre-built templates
CREATE TABLE IF NOT EXISTS page_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT '📄',
  page_type VARCHAR(50) NOT NULL,
  view_type VARCHAR(50) DEFAULT 'page',
  template_content JSONB NOT NULL,
  category VARCHAR(100),
  is_system BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  workspace_id UUID REFERENCES workspaces(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create database_properties table for database pages
CREATE TABLE IF NOT EXISTS database_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  property_type VARCHAR(50) NOT NULL, -- text, number, select, multi_select, date, person, files, checkbox, url, email, phone, formula, relation, rollup
  config JSONB DEFAULT '{}', -- Options for select, formula definition, etc.
  property_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create database_rows table for database entries
CREATE TABLE IF NOT EXISTS database_rows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  properties JSONB NOT NULL DEFAULT '{}',
  row_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pages_page_type ON pages(page_type);
CREATE INDEX IF NOT EXISTS idx_pages_view_type ON pages(view_type);
CREATE INDEX IF NOT EXISTS idx_database_properties_page_id ON database_properties(page_id);
CREATE INDEX IF NOT EXISTS idx_database_rows_database_page_id ON database_rows(database_page_id);
CREATE INDEX IF NOT EXISTS idx_page_templates_category ON page_templates(category);
CREATE INDEX IF NOT EXISTS idx_page_templates_workspace ON page_templates(workspace_id);

-- Enable RLS
ALTER TABLE page_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_rows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for page_templates
CREATE POLICY "Users can view system templates"
  ON page_templates FOR SELECT
  USING (is_system = true OR created_by = auth.uid());

CREATE POLICY "Users can create their own templates"
  ON page_templates FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own templates"
  ON page_templates FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own templates"
  ON page_templates FOR DELETE
  USING (created_by = auth.uid());

-- RLS Policies for database_properties
CREATE POLICY "Users can view database properties"
  ON database_properties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pages 
      WHERE pages.id = database_properties.page_id 
      AND pages.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create database properties"
  ON database_properties FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pages 
      WHERE pages.id = database_properties.page_id 
      AND pages.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update database properties"
  ON database_properties FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pages 
      WHERE pages.id = database_properties.page_id 
      AND pages.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete database properties"
  ON database_properties FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pages 
      WHERE pages.id = database_properties.page_id 
      AND pages.user_id = auth.uid()
    )
  );

-- RLS Policies for database_rows
CREATE POLICY "Users can view database rows"
  ON database_rows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pages 
      WHERE pages.id = database_rows.database_page_id 
      AND pages.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create database rows"
  ON database_rows FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pages 
      WHERE pages.id = database_rows.database_page_id 
      AND pages.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update database rows"
  ON database_rows FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pages 
      WHERE pages.id = database_rows.database_page_id 
      AND pages.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete database rows"
  ON database_rows FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pages 
      WHERE pages.id = database_rows.database_page_id 
      AND pages.user_id = auth.uid()
    )
  );

-- Insert system templates
INSERT INTO page_templates (name, description, icon, page_type, view_type, template_content, category, is_system) VALUES
('Blank Page', 'Start with an empty page', '📄', 'blank', 'page', '{"blocks": []}', 'Basic', true),
('Meeting Notes', 'Template for meeting notes', '📝', 'blank', 'page', '{"blocks": [{"type": "heading", "content": "Meeting Notes"}, {"type": "text", "content": "Date: "}, {"type": "text", "content": "Attendees: "}, {"type": "heading", "content": "Agenda"}, {"type": "text", "content": ""}, {"type": "heading", "content": "Notes"}, {"type": "text", "content": ""}, {"type": "heading", "content": "Action Items"}]}', 'Productivity', true),
('Project Plan', 'Plan and track projects', '📊', 'blank', 'page', '{"blocks": [{"type": "heading", "content": "Project Overview"}, {"type": "text", "content": ""}, {"type": "heading", "content": "Goals"}, {"type": "text", "content": ""}, {"type": "heading", "content": "Timeline"}, {"type": "text", "content": ""}, {"type": "heading", "content": "Resources"}]}', 'Productivity', true),
('Task Database', 'Manage tasks in a database', '✅', 'database', 'table', '{"properties": [{"name": "Task", "type": "title"}, {"name": "Status", "type": "select", "options": ["To Do", "In Progress", "Done"]}, {"name": "Priority", "type": "select", "options": ["High", "Medium", "Low"]}, {"name": "Due Date", "type": "date"}, {"name": "Assignee", "type": "person"}]}', 'Databases', true),
('Project Board', 'Kanban board for projects', '📋', 'database', 'board', '{"properties": [{"name": "Task", "type": "title"}, {"name": "Status", "type": "select", "options": ["Backlog", "To Do", "In Progress", "Review", "Done"]}, {"name": "Priority", "type": "select", "options": ["High", "Medium", "Low"]}, {"name": "Assignee", "type": "person"}], "groupBy": "Status"}', 'Databases', true),
('Content Calendar', 'Plan content with calendar view', '📅', 'database', 'calendar', '{"properties": [{"name": "Title", "type": "title"}, {"name": "Date", "type": "date"}, {"name": "Status", "type": "select", "options": ["Draft", "Review", "Published"]}, {"name": "Type", "type": "select", "options": ["Blog", "Social", "Video"]}]}', 'Databases', true),
('Reading List', 'Track books and articles', '📚', 'database', 'gallery', '{"properties": [{"name": "Title", "type": "title"}, {"name": "Author", "type": "text"}, {"name": "Status", "type": "select", "options": ["Want to Read", "Reading", "Completed"]}, {"name": "Rating", "type": "number"}, {"name": "Cover", "type": "files"}]}', 'Databases', true),
('Product Roadmap', 'Timeline view for roadmap', '🗺️', 'database', 'timeline', '{"properties": [{"name": "Feature", "type": "title"}, {"name": "Start Date", "type": "date"}, {"name": "End Date", "type": "date"}, {"name": "Status", "type": "select", "options": ["Planning", "In Progress", "Completed"]}, {"name": "Team", "type": "select", "options": ["Engineering", "Design", "Product"]}]}', 'Databases', true),
('Contact Form', 'Collect information with forms', '📋', 'form', 'page', '{"fields": [{"name": "Name", "type": "text", "required": true}, {"name": "Email", "type": "email", "required": true}, {"name": "Message", "type": "textarea", "required": true}]}', 'Forms', true),
('Simple List', 'Basic list view', '📝', 'database', 'list', '{"properties": [{"name": "Item", "type": "title"}, {"name": "Status", "type": "checkbox"}, {"name": "Notes", "type": "text"}]}', 'Databases', true);

-- Function to create database from template
CREATE OR REPLACE FUNCTION create_page_from_template(
  template_id UUID,
  page_title VARCHAR,
  workspace_id UUID,
  user_id UUID
) RETURNS UUID AS $$
DECLARE
  new_page_id UUID;
  template_data RECORD;
  property JSONB;
BEGIN
  -- Get template data
  SELECT * INTO template_data FROM page_templates WHERE id = template_id;
  
  -- Create the page
  INSERT INTO pages (title, icon, page_type, view_type, database_config, workspace_id, user_id)
  VALUES (
    page_title,
    template_data.icon,
    template_data.page_type,
    template_data.view_type,
    template_data.template_content,
    workspace_id,
    user_id
  )
  RETURNING id INTO new_page_id;
  
  -- If it's a database page, create properties
  IF template_data.page_type = 'database' THEN
    FOR property IN SELECT * FROM jsonb_array_elements(template_data.template_content->'properties')
    LOOP
      INSERT INTO database_properties (page_id, name, property_type, config, property_order)
      VALUES (
        new_page_id,
        property->>'name',
        property->>'type',
        COALESCE(property->'options', '{}'::jsonb),
        (property->>'order')::INTEGER
      );
    END LOOP;
  END IF;
  
  RETURN new_page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;