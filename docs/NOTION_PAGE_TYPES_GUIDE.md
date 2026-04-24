# Notion-Style Page Types Implementation Guide

## Overview

Your platform now supports **Notion-like page types** where users can create different types of pages with specialized views and functionality.

## What's Been Implemented

### 1. Database Schema ✅

**New Tables:**
- `page_templates` - Pre-built page templates
- `database_properties` - Column definitions for database pages
- `database_rows` - Data rows for database pages

**Enhanced Pages Table:**
- `page_type` - Type of page (blank, database, board, etc.)
- `view_type` - How the page is displayed
- `database_config` - Configuration for database pages

### 2. Page Types Available

| Type | Icon | Description | Use Case |
|------|------|-------------|----------|
| **Blank Page** | 📄 | Empty page with rich text editor | Notes, documentation, articles |
| **Database** | ✅ | Table view with properties | Task lists, CRM, inventory |
| **Board** | 📋 | Kanban board view | Project management, workflows |
| **List** | 📝 | Simple list view | To-do lists, checklists |
| **Gallery** | 📚 | Card/gallery view | Reading lists, portfolios |
| **Calendar** | 📅 | Calendar view | Content planning, events |
| **Timeline** | 🗺️ | Gantt chart view | Roadmaps, project timelines |
| **Form** | 📋 | Data collection form | Surveys, contact forms |

### 3. Pre-Built Templates

**Basic:**
- Blank Page

**Productivity:**
- Meeting Notes
- Project Plan

**Databases:**
- Task Database (table view)
- Project Board (kanban view)
- Content Calendar (calendar view)
- Reading List (gallery view)
- Product Roadmap (timeline view)
- Simple List (list view)

**Forms:**
- Contact Form

## How It Works

### User Flow

```
1. User clicks "New Page"
   ↓
2. Page Type Selector Modal Opens
   ↓
3. User browses templates by category
   ↓
4. User selects a template
   ↓
5. Page is created with template structure
   ↓
6. User is redirected to edit the page
```

### Architecture

```
PageTypeSelector Component
  ├── Search & Filter
  ├── Category Tabs
  └── Template Grid
      └── Template Cards
          ├── Icon
          ├── Name
          ├── Description
          └── View Type Badge

When Selected:
  ├── Blank → Navigate to editor
  └── Database → Create with properties → Navigate to editor
```

## Database Page Properties

Database pages support various property types:

### Property Types

1. **Title** - Main identifier (required)
2. **Text** - Single line text
3. **Number** - Numeric values
4. **Select** - Single choice from options
5. **Multi-select** - Multiple choices
6. **Date** - Date/datetime picker
7. **Person** - User assignment
8. **Files** - File attachments
9. **Checkbox** - Boolean value
10. **URL** - Web links
11. **Email** - Email addresses
12. **Phone** - Phone numbers
13. **Formula** - Calculated values
14. **Relation** - Link to other database
15. **Rollup** - Aggregate from relations

### Example: Task Database

```json
{
  "properties": [
    {
      "name": "Task",
      "type": "title"
    },
    {
      "name": "Status",
      "type": "select",
      "options": ["To Do", "In Progress", "Done"]
    },
    {
      "name": "Priority",
      "type": "select",
      "options": ["High", "Medium", "Low"]
    },
    {
      "name": "Due Date",
      "type": "date"
    },
    {
      "name": "Assignee",
      "type": "person"
    }
  ]
}
```

## View Types

Each database can be displayed in different views:

### Table View
- Spreadsheet-like interface
- Sort, filter, group
- Inline editing

### Board View (Kanban)
- Cards grouped by property
- Drag & drop between columns
- Visual workflow management

### Gallery View
- Card-based layout
- Image previews
- Compact information display

### Calendar View
- Month/week/day views
- Date-based organization
- Drag to reschedule

### Timeline View
- Gantt chart style
- Start/end dates
- Dependencies visualization

### List View
- Compact list format
- Quick scanning
- Minimal interface

## Usage Examples

### Creating a Task Management System

```typescript
// 1. User clicks "New Page"
// 2. Selects "Task Database" template
// 3. System creates:

const taskDatabase = {
  title: "Task Database",
  page_type: "database",
  view_type: "table",
  database_config: {
    properties: [
      { name: "Task", type: "title" },
      { name: "Status", type: "select", options: ["To Do", "In Progress", "Done"] },
      { name: "Priority", type: "select", options: ["High", "Medium", "Low"] },
      { name: "Due Date", type: "date" },
      { name: "Assignee", type: "person" }
    ]
  }
};

// 4. User can switch views:
// - Table view for detailed editing
// - Board view for workflow management
// - Calendar view for deadline tracking
```

### Creating a Content Calendar

```typescript
const contentCalendar = {
  title: "Content Calendar",
  page_type: "database",
  view_type: "calendar",
  database_config: {
    properties: [
      { name: "Title", type: "title" },
      { name: "Date", type: "date" },
      { name: "Status", type: "select", options: ["Draft", "Review", "Published"] },
      { name: "Type", type: "select", options: ["Blog", "Social", "Video"] }
    ]
  }
};
```

## API Endpoints

### Get Templates
```typescript
GET /api/v1/templates
GET /api/v1/templates?category=Databases
```

### Create Page from Template
```typescript
POST /api/v1/pages
{
  "title": "My Tasks",
  "page_type": "database",
  "view_type": "table",
  "database_config": {...},
  "workspace_id": "uuid"
}
```

### Get Database Properties
```typescript
GET /api/v1/pages/{page_id}/properties
```

### Add Database Row
```typescript
POST /api/v1/pages/{page_id}/rows
{
  "properties": {
    "Task": "Complete documentation",
    "Status": "In Progress",
    "Priority": "High"
  }
}
```

## Frontend Components

### PageTypeSelector
- Modal dialog for template selection
- Search and filter functionality
- Category navigation
- Template preview cards

### DatabaseView
- Renders database pages
- Supports multiple view types
- Property editing
- Row management

### PropertyEditor
- Edit database properties
- Configure property types
- Set options for select fields
- Formula builder

## Next Steps

### Phase 1: Core Views (Current)
- ✅ Page type selector
- ✅ Template system
- ✅ Database schema
- 🔄 Table view implementation
- 🔄 Board view implementation

### Phase 2: Advanced Features
- [ ] Formula properties
- [ ] Relations between databases
- [ ] Rollup properties
- [ ] Linked databases
- [ ] Database filters
- [ ] Sorting and grouping

### Phase 3: Collaboration
- [ ] Real-time editing
- [ ] Comments on rows
- [ ] @mentions in databases
- [ ] Activity log
- [ ] Version history

### Phase 4: Automation
- [ ] Database templates
- [ ] Automated workflows
- [ ] Recurring tasks
- [ ] Notifications
- [ ] Integrations

## Migration Instructions

### Run the Migration

```bash
# Connect to your Supabase database
psql -h your-db-host -U postgres -d your-database

# Run the migration
\i backend/migrations/add_notion_page_types.sql
```

### Verify Installation

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('page_templates', 'database_properties', 'database_rows');

-- Check templates were created
SELECT name, page_type, view_type, category FROM page_templates;

-- Check pages table has new columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'pages' 
AND column_name IN ('page_type', 'view_type', 'database_config');
```

## Customization

### Adding Custom Templates

```sql
INSERT INTO page_templates (
  name, 
  description, 
  icon, 
  page_type, 
  view_type, 
  template_content, 
  category, 
  is_system
) VALUES (
  'Custom Template',
  'Your description',
  '🎯',
  'database',
  'table',
  '{"properties": [...]}'::jsonb,
  'Custom',
  false
);
```

### Creating Template Categories

```typescript
const categories = [
  'Basic',
  'Productivity',
  'Databases',
  'Forms',
  'Custom',
  'Team',
  'Personal'
];
```

## Best Practices

1. **Start Simple**: Begin with blank pages and basic databases
2. **Use Templates**: Leverage pre-built templates for common use cases
3. **Organize**: Use categories and tags to organize pages
4. **Link Pages**: Create connections between related pages
5. **Choose Right View**: Select the view that best fits your data
6. **Iterate**: Start with basic properties, add more as needed

## Troubleshooting

### Templates Not Showing
- Check database migration ran successfully
- Verify RLS policies are correct
- Check user authentication

### Database Properties Not Saving
- Verify foreign key constraints
- Check RLS policies on database_properties table
- Ensure page exists before adding properties

### View Not Rendering
- Check page_type and view_type are set correctly
- Verify database_config JSON is valid
- Check component imports

## Resources

- [Notion Database Documentation](https://www.notion.so/help/intro-to-databases)
- [Your Platform Architecture](./ARCHITECTURE.md)
- [API Documentation](http://localhost:8000/docs)

---

**Status**: ✅ Core Implementation Complete
**Next**: Implement table and board views
**Updated**: January 2026
