# Templates Quick Start Guide 🚀

## Installation (2 minutes)

### Step 1: Run Migration
```bash
psql -d your_database_name -f add-advanced-block-templates.sql
```

### Step 2: Create Templates
```sql
-- Option A: For specific user
SELECT create_advanced_templates_for_user('YOUR_USER_ID'::UUID);

-- Option B: For first user (automatic)
SELECT create_advanced_templates_for_user((SELECT id FROM auth.users ORDER BY created_at LIMIT 1));
```

### Step 3: Verify
```sql
SELECT title, template_category FROM pages WHERE is_template = TRUE;
```

You should see 5 templates!

---

## Using Templates

### Method 1: Templates Page
1. Click **Templates** in sidebar
2. Browse by category
3. Click **Use Template**
4. Start editing!

### Method 2: New Page Button
1. Click **+ New Page**
2. Select **From Template**
3. Choose template
4. Done!

---

## Available Templates

| Template | Category | Blocks | Best For |
|----------|----------|--------|----------|
| 📝 Complete Notes | Notes | 19 | General notes, documentation |
| 📚 Book Notes | Notes | 21 | Reading tracking, summaries |
| 🤝 Meeting Notes | Productivity | 17 | Meetings, action items |
| 📁 Project Docs | Productivity | 17 | Project documentation |
| 🎓 Learning Notes | Education | 19 | Study notes, courses |

---

## Block Types Included

✅ Headings (H1, H2, H3)  
✅ Text paragraphs  
✅ Checkboxes (tasks)  
✅ Tables (data)  
✅ Code blocks (syntax highlighting)  
✅ Tabs (organization)  
✅ Callouts (highlights)  
✅ Quotes (citations)  
✅ Links (resources)  
✅ Dividers (sections)  

---

## Quick Examples

### Create Meeting Notes
```typescript
// Navigate to templates
navigate('/workspace/123/templates');

// Or use API
const page = await api.useTemplate(
  'meeting-notes-template-id',
  workspaceId,
  'Team Standup - Jan 17'
);
```

### Customize Template
1. Use template to create page
2. Edit blocks as needed
3. Save as new template (optional)

---

## Tips

💡 **Search by tags**: Use tags like 'notes', 'productivity', 'learning'  
💡 **Customize freely**: Templates are starting points  
💡 **Create your own**: Save any page as template  
💡 **Share templates**: Make public for team use  

---

## Need Help?

- See `ADVANCED_TEMPLATES_COMPLETE.md` for full documentation
- Check block type reference for customization
- Review troubleshooting section if issues occur

---

**That's it! You're ready to use advanced templates! 🎉**
