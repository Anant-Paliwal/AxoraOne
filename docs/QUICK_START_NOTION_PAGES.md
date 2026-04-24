# 🚀 Quick Start: Notion-Style Pages

## What You Get

Your platform now has **Notion-like page types** - users can create different types of pages (databases, boards, calendars, etc.) just like Notion!

## 3-Step Setup

### Step 1: Run the Migration (2 minutes)

```bash
# Connect to your Supabase database
psql -h your-supabase-host -U postgres -d your-database -f backend/migrations/add_notion_page_types.sql
```

Or via Supabase Dashboard:
1. Go to SQL Editor
2. Copy contents of `backend/migrations/add_notion_page_types.sql`
3. Click "Run"

### Step 2: Restart Your Servers

```bash
# Backend
cd backend
python main.py

# Frontend (new terminal)
npm run dev
```

### Step 3: Test It!

1. Open your app: `http://localhost:5173`
2. Go to any workspace
3. Click "Pages"
4. Click "New Page" button
5. **🎉 See the template selector!**

## What Users See

### Before
- Click "New Page" → Goes directly to blank editor

### After
- Click "New Page" → Beautiful modal with templates:
  - 📄 Blank Page
  - 📝 Meeting Notes
  - ✅ Task Database
  - 📋 Project Board (Kanban)
  - 📅 Content Calendar
  - 📚 Reading List
  - 🗺️ Product Roadmap
  - And more!

## How It Works

```
User clicks "New Page"
    ↓
Modal opens with templates
    ↓
User selects "Task Database"
    ↓
Page created with:
    - Title: "Task Database"
    - Type: database
    - View: table
    - Properties: Task, Status, Priority, Due Date
    ↓
User redirected to edit page
```

## Available Templates

### Basic
- **Blank Page** - Start from scratch

### Productivity
- **Meeting Notes** - Pre-formatted meeting template
- **Project Plan** - Project planning structure

### Databases
- **Task Database** - Table view for tasks
- **Project Board** - Kanban board
- **Content Calendar** - Calendar view
- **Reading List** - Gallery view
- **Product Roadmap** - Timeline view
- **Simple List** - Basic list

### Forms
- **Contact Form** - Data collection

## Verify Installation

### Check Database

```sql
-- Should return 10 templates
SELECT COUNT(*) FROM page_templates;

-- Should show new columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'pages' 
AND column_name IN ('page_type', 'view_type', 'database_config');
```

### Check Frontend

1. Open browser console (F12)
2. Go to Pages
3. Click "New Page"
4. Should see no errors
5. Modal should open with templates

## Troubleshooting

### Modal Doesn't Open
**Check**: Is `PageTypeSelector` imported in `PagesPage.tsx`?
```typescript
import { PageTypeSelector } from '@/components/pages/PageTypeSelector';
```

### No Templates Showing
**Check**: Did migration run?
```sql
SELECT * FROM page_templates;
```

### TypeScript Errors
**Fix**: Restart TypeScript server
- VS Code: Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

### Page Creation Fails
**Check**: Backend logs for errors
```bash
# In backend terminal, look for errors when creating page
```

## What's Next?

### Immediate (You can use now)
- ✅ Template selector
- ✅ Page types stored in database
- ✅ Different page types created

### Coming Soon (Need implementation)
- 🔄 Table view for databases
- 🔄 Board view (Kanban)
- 🔄 Calendar view
- 🔄 Gallery view
- 🔄 Timeline view

### Future Features
- Formula properties
- Relations between databases
- Rollup properties
- Real-time collaboration

## Customization

### Add Your Own Template

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
  'My Custom Template',
  'Description here',
  '🎯',
  'database',
  'table',
  '{"properties": [{"name": "Title", "type": "title"}]}'::jsonb,
  'Custom',
  false
);
```

### Modify Existing Template

```sql
UPDATE page_templates 
SET template_content = '{"properties": [...]}'::jsonb
WHERE name = 'Task Database';
```

## Files to Know

### Frontend
- `src/components/pages/PageTypeSelector.tsx` - Template selector modal
- `src/pages/PagesPage.tsx` - Pages list with "New Page" button
- `src/lib/api.ts` - API client with createPage

### Backend
- `backend/migrations/add_notion_page_types.sql` - Database schema
- `backend/app/api/endpoints/pages.py` - Pages API

### Documentation
- `NOTION_PAGE_TYPES_GUIDE.md` - Complete guide
- `NOTION_STYLE_PAGES_COMPLETE.md` - Implementation details
- `QUICK_START_NOTION_PAGES.md` - This file

## Support

### Check Logs
```bash
# Backend logs
cd backend
python main.py

# Frontend console
Open browser DevTools (F12) → Console tab
```

### Common Issues

1. **"Failed to create page"**
   - Check workspace_id is provided
   - Verify user is authenticated
   - Check backend logs

2. **"Templates not loading"**
   - Verify migration ran
   - Check RLS policies
   - Ensure user is logged in

3. **TypeScript errors**
   - Restart TS server
   - Check imports
   - Verify types in api.ts

## Demo Video Script

1. "Let me show you the new page types feature"
2. Click "New Page"
3. "Now you get this beautiful template selector"
4. "You can search for templates"
5. "Filter by category"
6. "Let's create a Task Database"
7. Click "Task Database"
8. "And it creates a page with the right structure"
9. "Ready to add your tasks!"

## Success Metrics

- ✅ Migration runs without errors
- ✅ 10 templates appear in selector
- ✅ Clicking template creates page
- ✅ Page has correct page_type
- ✅ User is redirected to editor
- ✅ No console errors

---

**Time to Complete**: ~5 minutes
**Difficulty**: Easy
**Status**: Ready to use!

🎉 **Congratulations!** Your platform now has Notion-style page types!
