# Visual Guide: Page Features

## 🎨 What You'll See

### 1. Updated Dropdown Menu

When you click the **⋯** button on any page card:

```
┌─────────────────────────────┐
│ ⭐ Pin                      │  ← Pin to top
│ ✏️ Edit                     │  ← Edit page
│ 👁️ View                     │  ← View page
│ ─────────────────────────── │
│ 📁 Move to Page             │  ← NEW! Move page
│ 🌐 Make Public              │  ← NEW! Share publicly
│ ─────────────────────────── │
│ 🗑️ Move to Trash            │  ← NEW! Soft delete
└─────────────────────────────┘
```

**For Public Pages:**
```
│ 🔒 Make Private             │  ← Lock icon when public
```

### 2. Move Page Dialog

When you click "Move to Page":

```
╔═══════════════════════════════════════╗
║ Move Page                             ║
╠═══════════════════════════════════════╣
║ Move "Meeting Notes" to another page ║
║ or to root level                      ║
║                                       ║
║ ┌───────────────────────────────────┐ ║
║ │ 📁 Root Level              ✓      │ ║ ← Selected
║ │ Move to workspace root            │ ║
║ └───────────────────────────────────┘ ║
║                                       ║
║ Move to Page:                         ║
║ ┌───────────────────────────────────┐ ║
║ │ 📊 Project Alpha                  │ ║
║ │ 📝 Documentation                  │ ║
║ │ 🎯 Goals 2024                     │ ║
║ │ 📚 Learning Resources             │ ║
║ │ 💼 Work Projects                  │ ║
║ └───────────────────────────────────┘ ║
║                                       ║
║  [Cancel]           [Move Page]       ║
╚═══════════════════════════════════════╝
```

### 3. Page Hierarchy Display

**Before Moving:**
```
📄 Pages List
├─ 📊 Project Alpha
├─ 📝 Documentation
└─ 📋 Meeting Notes        ← Want to move this
```

**After Moving to "Project Alpha":**
```
📄 Pages List
├─ 📊 Project Alpha
│   └─ 📋 Meeting Notes    ← Now a subpage!
└─ 📝 Documentation
```

### 4. Subpage Expansion

**Collapsed:**
```
┌─────────────────────────────────────┐
│ ▶ 📊 Project Alpha          ⋯      │
│   Work Projects                     │
│   Updated 2 hours ago               │
└─────────────────────────────────────┘
```

**Expanded:**
```
┌─────────────────────────────────────┐
│ ▼ 📊 Project Alpha          ⋯      │
│   Work Projects                     │
│   Updated 2 hours ago               │
└─────────────────────────────────────┘
  ┌───────────────────────────────────┐
  │   📋 Meeting Notes        ⋯      │  ← Subpage
  │   Notes from meetings             │
  │   Updated 1 hour ago              │
  └───────────────────────────────────┘
  ┌───────────────────────────────────┐
  │   📊 Sprint Planning      ⋯      │  ← Subpage
  │   Sprint planning docs            │
  │   Updated 3 hours ago             │
  └───────────────────────────────────┘
```

### 5. Toast Notifications

**Move Success:**
```
┌─────────────────────────────────────┐
│ ✅ Moved "Meeting Notes" to         │
│    "Project Alpha"                  │
└─────────────────────────────────────┘
```

**Trash Success:**
```
┌─────────────────────────────────────┐
│ ✅ Page moved to trash              │
└─────────────────────────────────────┘
```

**Sharing Success:**
```
┌─────────────────────────────────────┐
│ ✅ Page is now public               │
└─────────────────────────────────────┘
```

**Permission Error:**
```
┌─────────────────────────────────────┐
│ ❌ You don't have permission to     │
│    move pages                       │
└─────────────────────────────────────┘
```

### 6. Confirmation Dialogs

**Move to Trash:**
```
┌─────────────────────────────────────┐
│ Are you sure you want to move       │
│ "Meeting Notes" to trash?           │
│                                     │
│        [Cancel]    [OK]             │
└─────────────────────────────────────┘
```

## 🎯 User Flows

### Flow 1: Organize Pages into Project

```
Step 1: User has flat structure
┌─────────────────┐
│ Project Alpha   │
│ Meeting Notes   │
│ Sprint Planning │
│ Documentation   │
└─────────────────┘

Step 2: Click ⋯ on "Meeting Notes"
┌─────────────────┐
│ Meeting Notes ⋯ │ ← Click here
└─────────────────┘

Step 3: Select "Move to Page"
┌─────────────────┐
│ 📁 Move to Page │ ← Click here
└─────────────────┘

Step 4: Choose "Project Alpha"
┌─────────────────┐
│ ○ Project Alpha │ ← Select
└─────────────────┘

Step 5: Click "Move Page"
[Move Page] ← Click

Step 6: Result - Organized!
┌─────────────────┐
│ ▼ Project Alpha │
│   └─ Meeting    │
│      Notes      │
│ Sprint Planning │
│ Documentation   │
└─────────────────┘
```

### Flow 2: Share Documentation Publicly

```
Step 1: Find documentation page
┌─────────────────┐
│ Documentation ⋯ │
└─────────────────┘

Step 2: Click ⋯ menu
┌─────────────────┐
│ 🌐 Make Public  │ ← Click here
└─────────────────┘

Step 3: Confirmation
✅ Page is now public

Step 4: Menu now shows
┌─────────────────┐
│ 🔒 Make Private │ ← Changed!
└─────────────────┘
```

### Flow 3: Clean Up Old Pages

```
Step 1: Find old page
┌─────────────────┐
│ Old Project   ⋯ │
└─────────────────┘

Step 2: Click ⋯ menu
┌─────────────────┐
│ 🗑️ Move to Trash│ ← Click here
└─────────────────┘

Step 3: Confirm
Are you sure? [OK]

Step 4: Success
✅ Page moved to trash

Step 5: Page disappears from list
(Can be restored from trash later)
```

## 🎨 Color Coding

### Icons and Their Meanings

| Icon | Meaning | Color |
|------|---------|-------|
| ⭐ | Pinned | Yellow |
| 🌐 | Public | Blue |
| 🔒 | Private | Gray |
| 🗑️ | Trash | Red |
| 📁 | Folder/Move | Blue |
| ✏️ | Edit | Gray |
| 👁️ | View | Gray |

### Visual States

**Normal Page:**
```
┌─────────────────────────────────────┐
│ 📄 Page Title              ⋯       │
│ Description text                    │
│ 🏷️ tag1  🏷️ tag2    🕐 2 hours ago │
└─────────────────────────────────────┘
```

**Pinned Page:**
```
┌─────────────────────────────────────┐
│ 📄 Page Title         ⭐    ⋯       │ ← Star
│ Description text                    │
│ 🏷️ tag1  🏷️ tag2    🕐 2 hours ago │
└─────────────────────────────────────┘
```

**Selected Page (in dialog):**
```
┌─────────────────────────────────────┐
│ 📄 Page Title              ✓       │ ← Checkmark
│ Description text                    │
└─────────────────────────────────────┘
  ↑ Blue border
```

**Subpage (indented):**
```
    ┌───────────────────────────────┐
    │ 📄 Subpage Title        ⋯    │ ← Indented
    │ Description text              │
    └───────────────────────────────┘
```

## 📱 Responsive Design

### Desktop View
```
┌─────────────┬─────────────┬─────────────┐
│   Page 1    │   Page 2    │   Page 3    │
│   ⋯         │   ⋯         │   ⋯         │
├─────────────┼─────────────┼─────────────┤
│   Page 4    │   Page 5    │   Page 6    │
│   ⋯         │   ⋯         │   ⋯         │
└─────────────┴─────────────┴─────────────┘
```

### Tablet View
```
┌─────────────┬─────────────┐
│   Page 1    │   Page 2    │
│   ⋯         │   ⋯         │
├─────────────┼─────────────┤
│   Page 3    │   Page 4    │
│   ⋯         │   ⋯         │
└─────────────┴─────────────┘
```

### Mobile View
```
┌─────────────┐
│   Page 1    │
│   ⋯         │
├─────────────┤
│   Page 2    │
│   ⋯         │
├─────────────┤
│   Page 3    │
│   ⋯         │
└─────────────┘
```

## 🎬 Animation Effects

### Dropdown Menu
- Slides down with fade-in
- Smooth transition (200ms)

### Move Dialog
- Fades in with scale effect
- Background overlay darkens
- Smooth close animation

### Toast Notifications
- Slides in from top-right
- Auto-dismiss after 3 seconds
- Smooth fade-out

### Page Expansion
- Smooth height transition
- Subpages fade in
- Chevron rotates 90°

## ✨ Interactive Elements

### Hover States
```
Normal:     [Button]
Hover:      [Button]  ← Slightly lighter
Active:     [Button]  ← Pressed effect
```

### Focus States
```
Keyboard focus: [Button]  ← Blue outline
```

### Loading States
```
Moving...   [●○○]  ← Spinner
```

## 🎯 Accessibility

- All buttons have proper labels
- Keyboard navigation supported
- Screen reader friendly
- High contrast mode compatible
- Focus indicators visible

## 💡 Pro Tips

1. **Quick Move:** Click and hold ⋯ for faster access
2. **Keyboard:** Use Tab to navigate, Enter to select
3. **Undo:** Moved wrong? Just move it back!
4. **Bulk:** Use selection mode for multiple pages
5. **Search:** Use search bar to find pages quickly

This is what your users will experience! 🎉
