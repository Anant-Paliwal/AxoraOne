# How to Use: Notion-Style Page Editor

## 🚀 Quick Start (2 Minutes)

### Step 1: Open Page Editor
```
Navigate to: /workspace/{workspace_id}/pages/new
```

### Step 2: Add Title
```
Click the title field
Type: "My First Notion-Style Page"
```

### Step 3: Add Your First Block
```
Click: "Add Block" button
Select: "Image"
Paste URL: https://picsum.photos/800/400
✅ Image appears!
```

### Step 4: Resize the Image
```
Hover over image
Drag the right edge to the left
✅ Image resizes smoothly!

OR

Click "50%" button below image
✅ Image snaps to 50% width!
```

### Step 5: Add More Blocks
```
Click: "Add Block"
Select: "Database"
✅ Database table appears!

Click: "Add Row"
Enter data
✅ Data saved!
```

### Step 6: Reorder Blocks
```
Hover over Database block
See drag handle (⋮⋮) on left
Drag up or down
✅ Block moves with smooth animation!
```

---

## 📚 Detailed Features

### Feature 1: Drag & Drop Blocks

**What it does:**
Reorder blocks by dragging them up or down

**How to use:**
1. Hover over any block
2. Drag handle (⋮⋮) appears on left side
3. Click and hold the handle
4. Drag up or down
5. Release to drop
6. Block stays in new position
7. Auto-saves automatically

**Visual:**
```
Before:                    After Dragging:
┌─────────────┐           ┌─────────────┐
│ Database    │           │ Image       │ ← Moved up
├─────────────┤           ├─────────────┤
│ Image       │  ═════>   │ Database    │ ← Moved down
├─────────────┤           ├─────────────┤
│ Calendar    │           │ Calendar    │
└─────────────┘           └─────────────┘
```

---

### Feature 2: Resize Images & Videos

**What it does:**
Change the width of images and videos

**Method 1: Drag Edges**
1. Hover over image
2. Resize handles appear on left/right edges
3. Drag edge left or right
4. Image resizes in real-time
5. Release to set size
6. Auto-saves

**Method 2: Preset Buttons**
1. Hover over image
2. Preset buttons appear below: [25%] [50%] [75%] [100%]
3. Click any preset
4. Image snaps to that width
5. Auto-saves

**Visual:**
```
25% Width:        50% Width:         100% Width:
┌────┐           ┌──────────┐       ┌──────────────────┐
│img │           │  image   │       │   full width     │
└────┘           └──────────┘       └──────────────────┘
```

---

### Feature 3: Fullscreen Preview

**What it does:**
View images in fullscreen mode

**How to use:**
1. Click on any image
2. Fullscreen modal opens
3. Image fills the screen
4. Click outside or press ESC to close

**Visual:**
```
Normal View:              Fullscreen:
┌──────────┐             ┌─────────────────────────┐
│  image   │   Click →   │                         │
└──────────┘             │    Full Screen Image    │
                         │                         │
                         └─────────────────────────┘
```

---

### Feature 4: Block-First Layout

**What it does:**
Shows blocks at top, text editor below (like Notion)

**How it works:**
- Add blocks → They appear at top
- Add text → Editor appears below with separator
- No text? → Editor is hidden
- Clean, uncluttered interface

**Visual:**
```
With Blocks Only:         With Blocks + Text:
┌─────────────────┐      ┌─────────────────┐
│ Title           │      │ Title           │
├─────────────────┤      ├─────────────────┤
│ 📊 Database     │      │ 📊 Database     │
│ 🖼️ Image        │      │ 🖼️ Image        │
│ 📅 Calendar     │      │ 📅 Calendar     │
│                 │      ├─────────────────┤ ← Separator
│ (no text)       │      │ Text Editor     │
└─────────────────┘      │ Lorem ipsum...  │
                         └─────────────────┘
```

---

### Feature 5: All Block Types

**Basic Blocks:**
- **Text** - Plain paragraph
- **Heading** - H1, H2, H3 headings
- **List** - Bullet, numbered, or todo lists
- **Callout** - Highlighted info boxes
- **Quote** - Block quotes with author
- **Toggle** - Collapsible content sections
- **Divider** - Horizontal separator line
- **Code** - Code blocks with language selection

**Advanced Blocks:**
- **Database** - Full spreadsheet with CRUD
- **Calendar** - Event calendar with dates
- **Gallery** - Image grid with lightbox
- **Timeline** - Chronological event timeline
- **Form** - Custom input forms

**Media Blocks:**
- **Image** - Resizable images with fullscreen
- **Video** - Resizable videos with controls
- **Embed** - External content embeds

---

### Feature 6: Page Links

**What it does:**
Connect pages together to build knowledge graph

**How to use:**
1. Open page sidebar (right side)
2. Find "Links" section
3. Click "Add Link" button
4. Search for page to link
5. Select page from results
6. Choose link type:
   - References (generic link)
   - Explains (this explains that)
   - Example of (this is example)
   - Depends on (requires understanding)
   - Related to (loosely related)
   - Extends (builds upon)
   - Summarizes (summary of)
7. Add context (optional)
8. Click "Create Link"
9. ✅ Link appears in sidebar
10. ✅ Backlink appears on target page

**Visual:**
```
Page A Sidebar:           Page B Sidebar:
┌─────────────────┐      ┌─────────────────┐
│ Links (1)       │      │ Backlinks (1)   │
│ → Page B        │      │ ← Page A        │
│   Explains      │      │   Explained by  │
└─────────────────┘      └─────────────────┘
```

---

## 🎯 Common Use Cases

### Use Case 1: Project Documentation
```
1. Create page: "Project Alpha"
2. Add Database block → Track tasks
3. Add Calendar block → Schedule milestones
4. Add Image blocks → Screenshots
5. Add text → Explanations
6. Link to related pages
✅ Complete project hub!
```

### Use Case 2: Learning Notes
```
1. Create page: "SQL Basics"
2. Add Heading blocks → Section titles
3. Add Code blocks → SQL examples
4. Add Callout blocks → Important tips
5. Add text → Explanations
6. Link to "Data Analytics" skill
✅ Structured learning content!
```

### Use Case 3: Visual Portfolio
```
1. Create page: "My Work"
2. Add Gallery block → Project images
3. Resize images to 50% → Side-by-side
4. Add text → Project descriptions
5. Add links → Related projects
✅ Beautiful portfolio page!
```

---

## ⌨️ Keyboard Shortcuts (Coming Soon)

- `Cmd/Ctrl + D` - Duplicate block
- `Cmd/Ctrl + Shift + ↑` - Move block up
- `Cmd/Ctrl + Shift + ↓` - Move block down
- `Cmd/Ctrl + /` - Open block picker
- `ESC` - Cancel drag/resize

---

## 💡 Pro Tips

### Tip 1: Visual Hierarchy
```
Use different image widths to create visual interest:
- Hero image: 100% width
- Side-by-side: 50% width each
- Thumbnails: 25% width
```

### Tip 2: Organize with Blocks
```
- Use Database for structured data
- Use Calendar for time-based info
- Use Gallery for visual content
- Use Timeline for history
- Use Text for explanations
```

### Tip 3: Link Everything
```
Link related pages to:
- Build knowledge graph
- Enable discovery
- Show relationships
- Track dependencies
```

### Tip 4: Block-First Thinking
```
Start with blocks for:
- Structured data
- Visual content
- Interactive elements

Add text for:
- Explanations
- Context
- Narrative
```

---

## 🐛 Troubleshooting

### Problem: Drag handle not appearing
**Solution:** Make sure you're hovering directly over the block. The handle appears on the left side.

### Problem: Image not resizing
**Solution:** Hover over the image to see resize handles on the edges. Make sure you're dragging the edge, not the image itself.

### Problem: Text editor not showing
**Solution:** The text editor is hidden when you only have blocks. Start typing or click in the empty space to make it appear.

### Problem: Block not saving
**Solution:** Auto-save triggers after 30 seconds or when you click "Save". Check for the "Saved" indicator in the header.

### Problem: Can't add blocks
**Solution:** Make sure you have edit permissions. Check if you see "View Only" in the header.

---

## ✅ Quick Checklist

**Getting Started:**
- [ ] Created first page
- [ ] Added title and icon
- [ ] Added first block
- [ ] Saved page

**Drag & Drop:**
- [ ] Hovered over block
- [ ] Saw drag handle
- [ ] Dragged block up/down
- [ ] Block reordered

**Resize Media:**
- [ ] Added image block
- [ ] Hovered to see handles
- [ ] Dragged edge to resize
- [ ] Clicked preset button

**Fullscreen:**
- [ ] Clicked image
- [ ] Viewed fullscreen
- [ ] Closed modal

**Page Links:**
- [ ] Opened sidebar
- [ ] Clicked "Add Link"
- [ ] Selected page
- [ ] Created link
- [ ] Saw backlink

---

## 🎉 You're Ready!

You now know how to:
- ✅ Drag & drop blocks
- ✅ Resize images/videos
- ✅ Use all block types
- ✅ Link pages together
- ✅ Create rich, interactive pages

**Start building your Notion-style workspace!** 🚀

---

## 📚 Additional Resources

- `FINAL_IMPLEMENTATION_STATUS.md` - Complete feature list
- `VISUAL_GUIDE_NOTION_BLOCKS.md` - Visual examples
- `QUICK_START_NOTION_BLOCKS.md` - 5-minute guide
- `INTEGRATION_VERIFICATION.md` - Technical details

**Need help?** Check the documentation or create an issue!
