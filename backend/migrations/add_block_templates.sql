-- Block Templates for CSV Import and Data Blocks
-- Populates the block_templates table with useful templates

-- Function to create block templates for a user
CREATE OR REPLACE FUNCTION create_block_templates_for_user(target_user_id UUID, target_workspace_id UUID DEFAULT NULL)
RETURNS void AS $$
BEGIN
  -- Check if templates already exist for this user
  IF EXISTS (SELECT 1 FROM block_templates WHERE user_id = target_user_id AND is_public = TRUE LIMIT 1) THEN
    RAISE NOTICE 'Block templates already exist for user %', target_user_id;
    RETURN;
  END IF;

  -- Insert block templates
  INSERT INTO block_templates (
    user_id,
    workspace_id,
    name,
    description,
    block_type,
    template_data,
    is_public,
    usage_count
  ) VALUES
  -- Table Templates
  (
    target_user_id,
    target_workspace_id,
    'Simple Data Table',
    'Basic table for displaying structured data with sortable columns',
    'table',
    '{
      "columns": [
        {"id": "col1", "name": "Column 1", "type": "text", "sortable": true},
        {"id": "col2", "name": "Column 2", "type": "text", "sortable": true},
        {"id": "col3", "name": "Column 3", "type": "number", "sortable": true}
      ],
      "rows": [],
      "settings": {
        "showHeader": true,
        "striped": true,
        "bordered": true,
        "hoverable": true,
        "compact": false
      }
    }'::jsonb,
    TRUE,
    0
  ),
  (
    target_user_id,
    target_workspace_id,
    'Contact List',
    'Table template for managing contacts with name, email, phone, and company',
    'table',
    '{
      "columns": [
        {"id": "name", "name": "Name", "type": "text", "sortable": true},
        {"id": "email", "name": "Email", "type": "email", "sortable": true},
        {"id": "phone", "name": "Phone", "type": "text", "sortable": false},
        {"id": "company", "name": "Company", "type": "text", "sortable": true},
        {"id": "status", "name": "Status", "type": "select", "sortable": true, "options": ["Active", "Inactive", "Pending"]}
      ],
      "rows": [],
      "settings": {
        "showHeader": true,
        "striped": true,
        "bordered": true,
        "hoverable": true,
        "compact": false
      }
    }'::jsonb,
    TRUE,
    0
  ),
  (
    target_user_id,
    target_workspace_id,
    'Product Inventory',
    'Track products with SKU, name, quantity, price, and status',
    'table',
    '{
      "columns": [
        {"id": "sku", "name": "SKU", "type": "text", "sortable": true},
        {"id": "product", "name": "Product Name", "type": "text", "sortable": true},
        {"id": "quantity", "name": "Quantity", "type": "number", "sortable": true},
        {"id": "price", "name": "Price", "type": "currency", "sortable": true},
        {"id": "status", "name": "Status", "type": "select", "sortable": true, "options": ["In Stock", "Low Stock", "Out of Stock"]}
      ],
      "rows": [],
      "settings": {
        "showHeader": true,
        "striped": true,
        "bordered": true,
        "hoverable": true,
        "compact": false
      }
    }'::jsonb,
    TRUE,
    0
  ),
  (
    target_user_id,
    target_workspace_id,
    'Task Tracker',
    'Simple task list with priority, status, and due dates',
    'table',
    '{
      "columns": [
        {"id": "task", "name": "Task", "type": "text", "sortable": true},
        {"id": "assignee", "name": "Assignee", "type": "text", "sortable": true},
        {"id": "priority", "name": "Priority", "type": "select", "sortable": true, "options": ["High", "Medium", "Low"]},
        {"id": "status", "name": "Status", "type": "select", "sortable": true, "options": ["To Do", "In Progress", "Done"]},
        {"id": "due_date", "name": "Due Date", "type": "date", "sortable": true}
      ],
      "rows": [],
      "settings": {
        "showHeader": true,
        "striped": true,
        "bordered": true,
        "hoverable": true,
        "compact": false
      }
    }'::jsonb,
    TRUE,
    0
  ),
  (
    target_user_id,
    target_workspace_id,
    'Financial Ledger',
    'Track income and expenses with dates, categories, and amounts',
    'table',
    '{
      "columns": [
        {"id": "date", "name": "Date", "type": "date", "sortable": true},
        {"id": "description", "name": "Description", "type": "text", "sortable": false},
        {"id": "category", "name": "Category", "type": "select", "sortable": true, "options": ["Income", "Expense", "Transfer"]},
        {"id": "amount", "name": "Amount", "type": "currency", "sortable": true},
        {"id": "balance", "name": "Balance", "type": "currency", "sortable": false}
      ],
      "rows": [],
      "settings": {
        "showHeader": true,
        "striped": true,
        "bordered": true,
        "hoverable": true,
        "compact": false
      }
    }'::jsonb,
    TRUE,
    0
  ),
  -- Database Templates
  (
    target_user_id,
    target_workspace_id,
    'Customer Database',
    'Full database view for customer relationship management',
    'database',
    '{
      "schema": {
        "name": {"type": "text", "required": true, "label": "Customer Name"},
        "email": {"type": "email", "required": true, "label": "Email"},
        "phone": {"type": "text", "required": false, "label": "Phone"},
        "company": {"type": "text", "required": false, "label": "Company"},
        "industry": {"type": "select", "required": false, "label": "Industry", "options": ["Technology", "Finance", "Healthcare", "Retail", "Other"]},
        "status": {"type": "select", "required": true, "label": "Status", "options": ["Lead", "Prospect", "Customer", "Inactive"]},
        "lifetime_value": {"type": "currency", "required": false, "label": "Lifetime Value"},
        "notes": {"type": "textarea", "required": false, "label": "Notes"}
      },
      "views": [
        {"name": "All Customers", "filter": {}, "sort": {"field": "name", "order": "asc"}},
        {"name": "Active Customers", "filter": {"status": "Customer"}, "sort": {"field": "lifetime_value", "order": "desc"}},
        {"name": "Leads", "filter": {"status": "Lead"}, "sort": {"field": "created_at", "order": "desc"}}
      ],
      "settings": {
        "allowExport": true,
        "allowImport": true,
        "showFilters": true,
        "showSearch": true
      }
    }'::jsonb,
    TRUE,
    0
  ),
  (
    target_user_id,
    target_workspace_id,
    'Project Database',
    'Manage projects with timelines, budgets, and team members',
    'database',
    '{
      "schema": {
        "project_name": {"type": "text", "required": true, "label": "Project Name"},
        "client": {"type": "text", "required": false, "label": "Client"},
        "status": {"type": "select", "required": true, "label": "Status", "options": ["Planning", "In Progress", "On Hold", "Completed", "Cancelled"]},
        "priority": {"type": "select", "required": true, "label": "Priority", "options": ["High", "Medium", "Low"]},
        "start_date": {"type": "date", "required": false, "label": "Start Date"},
        "end_date": {"type": "date", "required": false, "label": "End Date"},
        "budget": {"type": "currency", "required": false, "label": "Budget"},
        "team_members": {"type": "text", "required": false, "label": "Team Members"},
        "description": {"type": "textarea", "required": false, "label": "Description"}
      },
      "views": [
        {"name": "All Projects", "filter": {}, "sort": {"field": "start_date", "order": "desc"}},
        {"name": "Active Projects", "filter": {"status": "In Progress"}, "sort": {"field": "priority", "order": "asc"}},
        {"name": "Completed", "filter": {"status": "Completed"}, "sort": {"field": "end_date", "order": "desc"}}
      ],
      "settings": {
        "allowExport": true,
        "allowImport": true,
        "showFilters": true,
        "showSearch": true
      }
    }'::jsonb,
    TRUE,
    0
  ),
  -- Form Templates
  (
    target_user_id,
    target_workspace_id,
    'Contact Form',
    'Simple contact form with name, email, and message',
    'form',
    '{
      "fields": [
        {"id": "name", "type": "text", "label": "Name", "required": true, "placeholder": "Your name"},
        {"id": "email", "type": "email", "label": "Email", "required": true, "placeholder": "your@email.com"},
        {"id": "subject", "type": "text", "label": "Subject", "required": false, "placeholder": "What is this about?"},
        {"id": "message", "type": "textarea", "label": "Message", "required": true, "placeholder": "Your message here..."}
      ],
      "settings": {
        "submitButtonText": "Send Message",
        "successMessage": "Thank you! We will get back to you soon.",
        "showLabels": true,
        "layout": "vertical"
      }
    }'::jsonb,
    TRUE,
    0
  ),
  (
    target_user_id,
    target_workspace_id,
    'Survey Form',
    'Multi-question survey with various input types',
    'form',
    '{
      "fields": [
        {"id": "q1", "type": "radio", "label": "How satisfied are you?", "required": true, "options": ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very Dissatisfied"]},
        {"id": "q2", "type": "checkbox", "label": "Which features do you use?", "required": false, "options": ["Feature A", "Feature B", "Feature C", "Feature D"]},
        {"id": "q3", "type": "select", "label": "How often do you use our product?", "required": true, "options": ["Daily", "Weekly", "Monthly", "Rarely"]},
        {"id": "q4", "type": "textarea", "label": "Additional feedback", "required": false, "placeholder": "Tell us more..."}
      ],
      "settings": {
        "submitButtonText": "Submit Survey",
        "successMessage": "Thank you for your feedback!",
        "showLabels": true,
        "layout": "vertical"
      }
    }'::jsonb,
    TRUE,
    0
  ),
  (
    target_user_id,
    target_workspace_id,
    'Registration Form',
    'User registration with personal and account details',
    'form',
    '{
      "fields": [
        {"id": "first_name", "type": "text", "label": "First Name", "required": true},
        {"id": "last_name", "type": "text", "label": "Last Name", "required": true},
        {"id": "email", "type": "email", "label": "Email", "required": true},
        {"id": "phone", "type": "tel", "label": "Phone", "required": false},
        {"id": "company", "type": "text", "label": "Company", "required": false},
        {"id": "role", "type": "select", "label": "Role", "required": true, "options": ["Developer", "Designer", "Manager", "Other"]},
        {"id": "terms", "type": "checkbox", "label": "I agree to the terms and conditions", "required": true, "options": ["I agree"]}
      ],
      "settings": {
        "submitButtonText": "Register",
        "successMessage": "Registration successful!",
        "showLabels": true,
        "layout": "vertical"
      }
    }'::jsonb,
    TRUE,
    0
  );

  RAISE NOTICE 'Created % block templates for user %', 10, target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Try to create block templates for the first user if one exists
DO $$
DECLARE
  first_user_id UUID;
  first_workspace_id UUID;
BEGIN
  -- Get first user
  SELECT id INTO first_user_id FROM auth.users ORDER BY created_at LIMIT 1;
  
  IF first_user_id IS NOT NULL THEN
    -- Get first workspace for that user (optional)
    SELECT id INTO first_workspace_id FROM workspaces WHERE user_id = first_user_id ORDER BY created_at LIMIT 1;
    
    PERFORM create_block_templates_for_user(first_user_id, first_workspace_id);
  ELSE
    RAISE NOTICE 'No users found. Block templates will be created when users sign up.';
  END IF;
END $$;

COMMENT ON FUNCTION create_block_templates_for_user IS 'Creates built-in block templates for CSV import and data management';
