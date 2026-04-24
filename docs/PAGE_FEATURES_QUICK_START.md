# Page Features Quick Start Guide

## 🚀 Setup (One-Time)

### 1. Run Database Migration
Open your Supabase SQL Editor and run:
```sql
-- File: add-page-sharing-column.sql
ALTER TABLE pages ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_pages_public ON pages(is_public) WHERE is_public = TRUE;
```

### 2. Restart Backend
```bash
cd backend
python main.py
```

### 3. Restart Frontend
```bash
npm run dev
```

## ✨ New Features

### 1️⃣ Move Page to Another Page

**What it does:** Makes a page a subpage of another page, or moves it to root level.

**How to use:**
1. Go to Pages list
2. Click **⋯** menu on any page
3. Select **"Move to Page"**
4. Choose destination:
   - **Root Level** - Make it a top-level page
   - **Any Page** - Make it a subpage
5. Click **"Move Page"**

**Example:**
```
Before:
- Project A
- Meeting Notes

After moving "Meeting Notes" to "Project A":
- Project A
  └─ Meeting Notes
```

### 2️⃣ Move Subpage to Different Parent

**What it does:** Changes which page is the parent of a subpage.

**How to use:**
1. Expand a page to see subpages
2. Click **⋯** on the subpage
3. Select **"Move to Page"**
4. Choose new parent or root level

**Example:**
```
Before:
- Project A
  └─ Notes
- Project B

After moving "Notes" to "Project B":
- Project A
- Project B
  └─ Notes
```

### 3️⃣ Move to Trash (Soft Delete)

**What it does:** Moves page to trash instead of permanently deleting it.

**How to use:**
1. Click **⋯** menu on any page
2. Select **"Move to Trash"** (🗑️ icon)
3. Confirm the action

**Features:**
- Page can be restored later
- Subpages are also moved to trash
- Only admins can delete pages

### 4️⃣ Make Page Public/Private

**What it does:** Controls whether a page is publicly accessible or private.

**How to use:**
1. Click **⋯** menu on any page
2. Select **"Make Public"** (🌐 icon) or **"Make Private"** (🔒 icon)
3. Status updates immediately

**Icons:**
- 🌐 **Globe** = Make Public
- 🔒 **Lock** = Make Private

## 🎯 Common Use Cases

### Organize Project Pages
```
1. Create "Project Alpha" page
2. Create "Meeting Notes", "Tasks", "Documents" pages
3. Move all three to "Project Alpha"
4. Result: Organized project structure
```

### Share Knowledge Base
```
1. Create "SQL Tutorial" page
2. Add content
3. Click ⋯ → "Make Public"
4. Result: Page is now publicly accessible
```

### Clean Up Workspace
```
1. Select old pages
2. Click ⋯ → "Move to Trash"
3. Pages moved to trash (can restore later)
4. Result: Cleaner workspace
```

## 🔐 Permissions

| Action | Required Role |
|--------|---------------|
| Move Page | Editor or higher |
| Move to Trash | Admin or higher |
| Change Sharing | Admin or higher |
| View Pages | Member or higher |

## 📱 UI Elements

### Page Dropdown Menu
```
⋯ Menu:
├─ ⭐ Pin/Unpin
├─ ✏️ Edit
├─ 👁️ View
├─ ─────────────
├─ 📁 Move to Page
├─ 🌐/🔒 Make Public/Private
├─ ─────────────
└─ 🗑️ Move to Trash
```

### Move Dialog
```
┌─────────────────────────────┐
│ Move Page                   │
├─────────────────────────────┤
│ Move "Page Name" to:        │
│                             │
│ ○ Root Level                │
│   Move to workspace root    │
│                             │
│ ○ Project A                 │
│ ○ Documentation             │
│ ○ Meeting Notes             │
│                             │
│ [Cancel]  [Move Page]       │
└─────────────────────────────┘
```

## 🐛 Troubleshooting

### "Failed to move page"
- Check you have Editor permissions
- Ensure target page exists
- Can't move page to its own subpage

### "Failed to update sharing"
- Check you have Admin permissions
- Ensure page exists and isn't deleted

### "Failed to move to trash"
- Check you have Admin permissions
- Ensure page isn't already in trash

## 💡 Tips

1. **Organize hierarchically** - Use subpages for related content
2. **Use root level** - For main category pages
3. **Public pages** - Great for documentation and tutorials
4. **Trash is safe** - Pages can be restored, so don't worry
5. **Bulk operations** - Use selection mode for multiple pages

## 🎨 Visual Indicators

- **📌 Pinned** - Yellow star in top-right
- **🌐 Public** - Globe icon in sharing menu
- **🔒 Private** - Lock icon in sharing menu
- **📁 Has Subpages** - Chevron expand/collapse button
- **🗑️ In Trash** - Not visible in main list

## 🔄 Workflow Examples

### Create Documentation Structure
```
1. Create "Documentation" page
2. Create "Getting Started", "API Reference", "Tutorials"
3. Move all to "Documentation"
4. Make "Documentation" public
5. Result: Public documentation site
```

### Archive Old Projects
```
1. Find completed project pages
2. Click ⋯ → "Move to Trash"
3. Pages archived but not deleted
4. Can restore if needed later
```

### Reorganize Workspace
```
1. Create category pages (Work, Personal, Learning)
2. Move existing pages to categories
3. Result: Clean, organized workspace
```

## ✅ Success Indicators

After implementing, you should see:
- ✅ "Move to Page" option in dropdown
- ✅ "Move to Trash" instead of "Delete"
- ✅ "Make Public/Private" option
- ✅ Beautiful move dialog
- ✅ Toast notifications for all actions
- ✅ Permission checks working

## 🚀 Ready to Use!

All features are now available in your Pages list. Start organizing your workspace!
