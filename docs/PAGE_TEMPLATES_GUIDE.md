# Page Templates System - Complete Guide

## Overview

The Page Templates system provides professionally designed templates to help users quickly create structured pages. Templates are categorized, searchable, and can be customized.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Template System Flow                      │
└─────────────────────────────────────────────────────────────┘

User Action → Template Library UI → Backend API → Database
                                                      ↓
                                            Create Page from Template
                                                      ↓
                                            Return New Page → Navigate
```

## Database Schema

### Pages Table Extensions

```sql
-- Template-specific columns
template_category VARCHAR(50)        -- Category: work, education, personal, etc.
is_public_template BOOLEAN           -- Available to all users
template_description TEXT            -- What the template is for
template_preview_image TEXT          -- Optional preview image
use_count INTEGER                    -- Popularity tracking
```

## Built-in Template Categories

### 1. Work & Business
- **Meeting Notes** - Structured meeting documentation
- **Project Brief** - Comprehensive project planning
- **Weekly Report** - Progress tracking and reporting

### 2. Education & Learning
- **Study Notes** - Organized learning and revision
- **Course Outline** - Complete course planning
- **Research Paper** - Academic paper structure

### 3. Personal
- **Daily Journal** - Reflective journaling
- **Goal Setting** - Goal planning framework
- **Recipe** - Cooking recipe documentation

### 4. Writing & Content
- **Blog Post** - Blog content structure
- **Article Outline** - Article planning template

### 5. Technical & Development
- **Technical Documentation** - Software documentation
- **Bug Report** - Structured bug reporting

### 6. Business & Strategy
- **Business Plan** - Business planning template
- **Marketing Campaign** - Campaign planning

## Backend API Endpoints

### GET /api/v1/templates/categories
Get all available template categories.

**Response:**
```json
{
  "categories": [
    {
      "id": "work",
      "name": "Work & Business",
      "icon": "Briefcase",
      "description": "Templates for professional work"
    }
  ]
}
```

### GET /api/v1/templates
Get all templates (public + user's custom).

**Query Parameters:**
- `category` (optional) - Filter by category
- `search` (optional) - Search templates

**Response:**
```json
{
  "templates": [...],
  "grouped": {
    "work": [...],
    "education": [...]
  },
  "total": 15
}
```

### GET /api/v1/templates/{template_id}
Get a specific template.

### POST /api/v1/templates/{template_id}/use
Create a new page from a template.

**Request Body:**
```json
{
  "workspace_id": "workspace_123",
  "title": "My New Page"  // Optional, defaults to template title
}
```

**Response:**
```json
{
  "page": {
    "id": "page_456",
    "title": "My New Page",
    "content": "...",
    "metadata": {
      "created_from_template": "template_123",
      "template_name": "Meeting Notes"
    }
  },
  "template_id": "template_123",
  "message": "Page created from template successfully"
}
```

### POST /api/v1/templates/create
Convert an existing page into a custom template.

**Request Body:**
```json
{
  "page_id": "page_789",
  "template_category": "work",
  "template_description": "My custom template",
  "is_public": false
}
```

### GET /api/v1/templates/popular
Get most popular templates (by use_count).

### GET /api/v1/templates/recent
Get recently added templates.

## Frontend Components

### EnhancedTemplateLibrary.tsx

Main template browser component with two modes:

**Mode: 'select'** - Apply template content to current page
```tsx
<EnhancedTemplateLibrary
  onSelect={(content, template) => {
    setContent(content);
    // Optionally add suggested tags
  }}
  onClose={() => setShowTemplateLibrary(false)}
  mode="select"
/>
```

**Mode: 'create'** - Create new page from template
```tsx
<EnhancedTemplateLibrary
  onSelect={() => {}}
  onClose={handleClose}
  mode="create"
/>
```

### Features:
- ✅ Category filtering
- ✅ Search functionality
- ✅ View modes (Popular, Recent, All)
- ✅ Template preview
- ✅ Usage statistics
- ✅ Responsive grid layout

### TemplatesPage.tsx

Dedicated page for browsing and creating pages from templates.

**Route:** `/workspace/:workspaceId/templates`

## Usage Examples

### 1. Apply Template to Existing Page

In PageEditor.tsx:
```tsx
const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);

<EnhancedTemplateLibrary
  onSelect={(templateContent, template) => {
    setContent(templateContent);
    if (template.metadata?.suggested_skills) {
      setTags([...tags, ...template.metadata.suggested_skills]);
    }
    toast.success('Template applied!');
  }}
  onClose={() => setShowTemplateLibrary(false)}
  mode="select"
/>
```

### 2. Create New Page from Template

Navigate to templates page:
```tsx
navigate(`/workspace/${workspaceId}/templates`);
```

Or use API directly:
```tsx
const response = await api.useTemplate(
  templateId,
  workspaceId,
  'My Custom Title'
);
navigate(`/workspace/${workspaceId}/pages/${response.data.page.id}/edit`);
```

### 3. Create Custom Template

```tsx
await api.createCustomTemplate(
  pageId,
  'work',
  'My team meeting template',
  false  // Not public
);
```

## Template Structure

Each template includes:

```typescript
{
  id: string;
  title: string;
  content: string;              // HTML content
  icon: string;                 // Lucide icon name
  tags: string[];               // Suggested tags
  template_category: string;    // Category ID
  template_description: string; // User-facing description
  use_count: number;            // Popularity metric
  metadata: {
    suggested_skills?: string[];  // Auto-add these skills
    blocks?: any[];               // Pre-configured blocks
  }
}
```

## Template Content Format

Templates use HTML with semantic structure:

```html
<h1>Template Title</h1>
<p><strong>Field:</strong> </p>

<h2>Section Heading</h2>
<p>Description or instructions...</p>

<ul>
  <li>List item</li>
</ul>

<h2>Another Section</h2>
<p></p>
```

## Best Practices

### Creating Templates

1. **Clear Structure** - Use headings (h1, h2, h3) for organization
2. **Placeholders** - Leave empty fields for user input
3. **Instructions** - Add helpful prompts in italic or muted text
4. **Suggested Tags** - Include relevant tags in metadata
5. **Skill Linking** - Add suggested_skills in metadata

### Using Templates

1. **Customize Immediately** - Templates are starting points
2. **Add Context** - Fill in all placeholder fields
3. **Link Skills** - Connect to relevant skills for tracking
4. **Save Often** - Auto-save is enabled after first save

## Integration Points

### 1. Page Editor
- Template button in toolbar
- Opens EnhancedTemplateLibrary in 'select' mode
- Applies content to current page

### 2. Pages List
- "Templates" button in header
- Navigates to TemplatesPage
- Creates new page from template

### 3. Workspace Context
- All templates are workspace-scoped when used
- Custom templates belong to user
- Public templates available to all

### 4. Subscription System
- Template usage counts toward page limits
- Premium templates (future feature)

## Migration

Run the migration to set up templates:

```bash
# Apply migration
psql -d your_database -f backend/migrations/add_page_templates.sql
```

This will:
- Add template columns to pages table
- Create indexes for performance
- Insert 15 built-in templates
- Create usage tracking function

## API Client Methods

```typescript
// Get categories
await api.getTemplateCategories();

// Get all templates
await api.getTemplates(category?, search?);

// Get specific template
await api.getTemplate(templateId);

// Use template
await api.useTemplate(templateId, workspaceId, title?);

// Create custom template
await api.createCustomTemplate(pageId, category, description, isPublic);

// Delete custom template
await api.deleteCustomTemplate(templateId);

// Get popular templates
await api.getPopularTemplates(limit);

// Get recent templates
await api.getRecentTemplates(limit);
```

## Future Enhancements

### Planned Features
- [ ] Template preview images
- [ ] Template versioning
- [ ] Community template sharing
- [ ] Template marketplace
- [ ] AI-generated templates
- [ ] Template customization wizard
- [ ] Template analytics dashboard
- [ ] Collaborative template editing

### Premium Features
- [ ] Advanced templates (Pro plan)
- [ ] Custom template branding
- [ ] Template import/export
- [ ] Template collections

## Troubleshooting

### Templates Not Showing
1. Check migration was applied
2. Verify backend API is running
3. Check browser console for errors
4. Ensure workspace is selected

### Template Creation Fails
1. Verify page exists and belongs to user
2. Check category is valid
3. Ensure description is provided
4. Check subscription limits

### Template Content Not Applying
1. Verify content is valid HTML
2. Check TipTap editor compatibility
3. Clear browser cache
4. Check for JavaScript errors

## Performance Considerations

- Templates are cached on frontend
- Popular templates loaded first
- Lazy loading for template content
- Indexed database queries
- Minimal template metadata in list views

## Security

- User authentication required
- Workspace isolation enforced
- Custom templates private by default
- Public templates read-only
- XSS protection on template content

## Testing

Test template functionality:

```bash
# Backend tests
pytest backend/tests/test_templates.py

# Frontend tests
npm test -- templates
```

## Summary

The Page Templates system provides:
- ✅ 15+ built-in professional templates
- ✅ 6 organized categories
- ✅ Custom template creation
- ✅ Search and filtering
- ✅ Usage tracking
- ✅ Workspace integration
- ✅ Beautiful UI with EnhancedTemplateLibrary
- ✅ Two usage modes (select/create)
- ✅ Full API support

Templates help users create structured, professional pages quickly while maintaining consistency across their workspace.
