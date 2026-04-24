# Visual Guide: Notion-Style Blocks

## 🎯 What You Can Do Now

### 1. **Drag & Drop Blocks**

```
Before:                          After Dragging:
┌─────────────────┐             ┌─────────────────┐
│ 📊 Database     │             │ 📅 Calendar     │ ← Moved up
├─────────────────┤             ├─────────────────┤
│ 📅 Calendar     │  ═══════>   │ 📊 Database     │ ← Moved down
├─────────────────┤             ├─────────────────┤
│ 🖼️ Gallery      │             │ 🖼️ Gallery      │
└─────────────────┘             └─────────────────┘

How: Hover over block → Drag handle appears on left → Drag up/down
```

---

### 2. **Resize Images & Videos**

```
Small (25%):                    Large (100%):
┌──────┐                        ┌─────────────────────────────┐
│ img  │                        │         Full Width          │
└──────┘                        │          Image              │
                                └─────────────────────────────┘

Medium (50%):                   Custom Size:
┌──────────────┐                ┌──────────────────┐
│    Image     │                │  Drag edges to   │
└──────────────┘                │  resize freely   │
                                └──────────────────┘

How: Hover → Drag left/right edges OR click preset buttons (25%, 50%, 75%, 100%)
```

---

### 3. **Block-First Layout**

```
TRADITIONAL LAYOUT (Old):       NOTION-STYLE (New):
┌─────────────────────┐         ┌─────────────────────┐
│ Title               │         │ Title               │
│ Text Editor         │         │ Tags                │
│ (Always visible)    │         ├─────────────────────┤
│                     │         │ 📊 Database Block   │ ← Blocks at top
│ Lorem ipsum...      │         │ 📅 Calendar Block   │
│                     │         │ 🖼️ Gallery Block    │
│ Blocks below:       │         ├─────────────────────┤
│ 📊 Database         │         │ Text Editor         │ ← Text below
│ 📅 Calendar         │         │ (Only if needed)    │
└─────────────────────┘         └─────────────────────┘

Benefits:
✅ Blocks are primary content
✅ Text editor hidden when not needed
✅ Clean, uncluttered interface
✅ Matches Notion's UX
```

---

### 4. **Resizable Media Controls**

```
┌─────────────────────────────────────┐
│  [Fullscreen] [Delete]              │ ← Toolbar (hover)
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │         Your Image            │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│  [25%] [50%] [75%] [100%]           │ ← Quick presets
└─────────────────────────────────────┘
     ↑                           ↑
  Drag edge                   Drag edge
  to resize                   to resize

Features:
• Drag handles on left/right edges
• Click preset buttons for quick sizing
• Fullscreen button for preview
• Delete button to remove
• Smooth animations
```

---

### 5. **Block Picker**

```
Press "Add Block" button:

┌─────────────────────────────┐
│ Search blocks...            │
├─────────────────────────────┤
│ BASIC BLOCKS                │
│ 📝 Text                     │
│ 📋 Heading                  │
│ • List                      │
│ 💡 Callout                  │
├─────────────────────────────┤
│ ADVANCED BLOCKS             │
│ 📊 Database                 │
│ 📅 Calendar                 │
│ 🖼️ Gallery                  │
│ ⏱️ Timeline                  │
├─────────────────────────────┤
│ MEDIA                       │
│ 🖼️ Image                    │
│ 🎥 Video                    │
│ 🔗 Embed                    │
└─────────────────────────────┘

Click any block type to add it!
```

---

### 6. **Page Links**

```
┌─────────────────────────────┐
│ Links (3)          [+ Add]  │
├─────────────────────────────┤
│ 📄 SQL Basics               │
│    References               │
├─────────────────────────────┤
│ 📄 Data Analytics           │
│    Explains                 │
├─────────────────────────────┤
│ 📄 Python Guide             │
│    Depends on               │
└─────────────────────────────┘

Link Types:
• References - Generic link
• Explains - This page explains that concept
• Example of - This is an example
• Depends on - Requires understanding
• Related to - Loosely related
• Extends - Builds upon
• Summarizes - Summary of
```

---

## 🎬 User Workflows

### Workflow 1: Create Page with Blocks

```
1. Create new page
   ┌─────────────────┐
   │ [+ New Page]    │
   └─────────────────┘

2. Add title and icon
   ┌─────────────────┐
   │ 📊 My Project   │
   └─────────────────┘

3. Click "Add Block"
   ┌─────────────────┐
   │ [+ Add Block]   │
   └─────────────────┘

4. Select Database
   ┌─────────────────┐
   │ 📊 Database     │ ← Added!
   └─────────────────┘

5. Add more blocks
   ┌─────────────────┐
   │ 📊 Database     │
   │ 📅 Calendar     │
   │ 🖼️ Gallery      │
   └─────────────────┘

6. Reorder by dragging
   ┌─────────────────┐
   │ 📅 Calendar     │ ← Dragged up
   │ 📊 Database     │
   │ 🖼️ Gallery      │
   └─────────────────┘

7. Auto-saves!
   ✅ Saved
```

---

### Workflow 2: Add & Resize Image

```
1. Click "Add Block"
2. Select "Image"
3. Paste URL
   ┌─────────────────────┐
   │ Paste image URL...  │
   │ [Add Image]         │
   └─────────────────────┘

4. Image appears (100% width)
   ┌─────────────────────────────┐
   │      Full Width Image       │
   └─────────────────────────────┘

5. Click "50%" preset
   ┌──────────────┐
   │ Half Width   │
   └──────────────┘

6. Or drag edge to custom size
   ┌──────────────────┐
   │  Custom Width    │
   └──────────────────┘

7. Click for fullscreen
   ┌─────────────────────────────┐
   │                             │
   │    Fullscreen Preview       │
   │                             │
   └─────────────────────────────┘
```

---

### Workflow 3: Link Pages

```
1. Open page sidebar
   ┌─────────────────┐
   │ Links (0)       │
   │ [+ Add Link]    │
   └─────────────────┘

2. Click "Add Link"
3. Search for page
   ┌─────────────────┐
   │ Search pages... │
   │ • SQL Basics    │
   │ • Python Guide  │
   └─────────────────┘

4. Select page
5. Choose link type
   ┌─────────────────┐
   │ ○ References    │
   │ ● Explains      │ ← Selected
   │ ○ Extends       │
   └─────────────────┘

6. Add context (optional)
   ┌─────────────────┐
   │ This page       │
   │ explains SQL... │
   └─────────────────┘

7. Create link
   ✅ Link created!
```

---

## 🎨 Visual States

### Block Hover State
```
Normal:                 Hover:
┌─────────────┐        ⋮⋮ ┌─────────────┐
│ Database    │   →    ⋮⋮ │ Database    │ [⋯]
└─────────────┘        ⋮⋮ └─────────────┘
                       ↑                  ↑
                    Drag handle        Actions menu
```

### Image Resize State
```
Normal:                 Hover:                  Resizing:
┌─────────┐            ║ ┌─────────┐ ║         ║ ┌───────────┐ ║
│  Image  │      →     ║ │  Image  │ ║    →    ║ │   Image   │ ║
└─────────┘            ║ └─────────┘ ║         ║ └───────────┘ ║
                       ↑             ↑         ↑               ↑
                    Resize          Resize   Dragging...    Dragging...
                    handle          handle
```

### Block Dragging State
```
Before Drag:           During Drag:           After Drop:
┌─────────────┐       ┌─────────────┐        ┌─────────────┐
│ Block 1     │       │ Block 2     │        │ Block 2     │
├─────────────┤       ├─────────────┤        ├─────────────┤
│ Block 2     │  →    │ [Block 1]   │   →    │ Block 1     │
├─────────────┤       │  (dragging) │        ├─────────────┤
│ Block 3     │       ├─────────────┤        │ Block 3     │
└─────────────┘       │ Block 3     │        └─────────────┘
                      └─────────────┘
```

---

## 🚀 Quick Tips

### Keyboard Shortcuts (Coming Soon)
- `Cmd/Ctrl + D` - Duplicate block
- `Cmd/Ctrl + Shift + ↑` - Move block up
- `Cmd/Ctrl + Shift + ↓` - Move block down
- `Cmd/Ctrl + /` - Open block picker
- `Escape` - Cancel drag/resize

### Best Practices
1. **Use blocks for structured data** (databases, calendars, galleries)
2. **Use text editor for narrative content** (explanations, notes)
3. **Combine both** for rich, interactive pages
4. **Link related pages** to build knowledge graph
5. **Resize images** to create visual hierarchy

### Performance Tips
- Images lazy-load automatically
- Blocks are memoized (no unnecessary re-renders)
- Auto-save debounced to 30 seconds
- Drag operations use RAF for smooth 60fps

---

## 📱 Responsive Behavior

### Desktop (> 1024px)
```
┌────────────────────────────────────────┐
│ Sidebar │ Editor (blocks + text)  │ TOC│
└────────────────────────────────────────┘
```

### Tablet (768px - 1024px)
```
┌──────────────────────────────┐
│ Editor (blocks + text)       │
└──────────────────────────────┘
```

### Mobile (< 768px)
```
┌──────────────┐
│ Editor       │
│ (stacked)    │
└──────────────┘
```

---

## ✅ What's Working

- ✅ Drag & drop blocks
- ✅ Resize images/videos
- ✅ Block-first layout
- ✅ Page links
- ✅ All block types
- ✅ Auto-save
- ✅ Fullscreen media
- ✅ Block picker
- ✅ Workspace isolation

---

**Ready to use!** Start creating Notion-style pages with drag-and-drop blocks and resizable media.
