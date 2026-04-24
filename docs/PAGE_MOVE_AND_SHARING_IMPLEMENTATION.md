# Page Move and Sharing Implementation

## ✅ Features Implemented

### 1. Move Page to Another Page
- **Move pages to become subpages** of another page
- **Move subpages to different parent pages**
- **Move pages to root level** (remove parent)
- **Beautiful dialog UI** with page selection
- **Permission checks** - only editors can move pages

### 2. Move to Trash
- **Soft delete** - pages moved to trash instead of permanent deletion
- **Trash icon** in dropdown menu
- **Confirmation dialog** before moving to trash
- **Subpages also moved** to trash automatically
- **Permission checks** - only admins can delete

### 3. Page Sharing (Private/Public)
- **Toggle public/private** status for pages
- **Visual indicators** - Globe icon for public, Lock icon for private
- **Permission checks** - only admins can change sharing settings
- **Database column** added: `is_public`

## 🔧 Backend Changes

### New API Endpoints

#### Page Sharing
```python
POST /api/v1/pages/{page_id}/share
Body: { "is_public": true/false }
Response: { "success": true, "is_public": true, "message": "..." }

GET /api/v1/pages/{page_id}/share-status
Response: { "page_id": "...", "is_public": false }
```

#### Trash Operations (Already Existed)
```python
POST /api/v1/trash/move/{page_id}
POST /api/v1/trash/restore/{page_id}
DELETE /api/v1/trash/permanent/{page_id}
DELETE /api/v1/trash/empty?workspace_id=...
GET /api/v1/trash?workspace_id=...
GET /api/v1/trash/count?workspace_id=...
```

#### Page Movement (Already Existed)
```python
POST /api/v1/pages/{page_id}/move?new_parent_id=...&new_order=0
```

### Database Migration

**File:** `add-page-sharing-column.sql`

```sql
-- Add is_public column to pages table
ALTER TABLE pages ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Create index for public pages
CREATE INDEX IF NOT EXISTS idx_pages_public ON pages(is_public) WHERE is_public = TRUE;
```

## 🎨 Frontend Changes

### New Components

**`src/components/pages/MovePageDialog.tsx`**
- Beautiful modal for selecting target page
- Shows all available pages
- Option to move to root level
- Visual selection with icons

### Updated Components

**`src/pages/PagesPage.tsx`**
- Added `handleMoveToPage()` - opens move dialog
- Added `handleMoveConfirm()` - executes move
- Added `handleSharePage()` - toggles public/private
- Updated `handleDeletePage()` - now moves to trash instead of permanent delete
- Added move dialog state management

**`src/lib/api.ts`**
- Added `updatePageSharing(pageId, isPublic)`
- Added `getPageSharingStatus(pageId)`
- Added `movePageToTrash(pageId)`
- Added `getTrashItems(workspaceId)`
- Added `restoreFromTrash(pageId)`
- Added `deletePermanently(pageId)`
- Added `emptyTrash(workspaceId)`
- Added `getTrashCount(workspaceId)`

### Dropdown Menu Updates

**New Menu Items:**
1. **View** - Navigate to page viewer
2. **Move to Page** - Opens move dialog
3. **Make Public/Private** - Toggle sharing (with Globe/Lock icons)
4. **Move to Trash** - Soft delete (replaces "Delete")

## 🔐 Permission System

### Move Pages
- **Required:** Editor role or higher
- **Check:** `canEdit()` from WorkspaceContext

### Delete/Trash
- **Required:** Admin role or higher
- **Check:** `canAdmin()` from WorkspaceContext

### Change Sharing
- **Required:** Admin role or higher
- **Check:** `canAdmin()` from WorkspaceContext

## 📋 Usage Guide

### Move a Page
1. Click the **⋯** menu on any page card
2. Select **"Move to Page"**
3. Choose destination page or "Root Level"
4. Click **"Move Page"**

### Move to Trash
1. Click the **⋯** menu on any page card
2. Select **"Move to Trash"**
3. Confirm the action
4. Page is soft-deleted (can be restored from trash)

### Share a Page
1. Click the **⋯** menu on any page card
2. Select **"Make Public"** or **"Make Private"**
3. Page sharing status is updated immediately

### Move Subpages
- Subpages can be moved just like regular pages
- They can become root pages or subpages of other pages
- The hierarchy is automatically updated

## 🗂️ File Structure

```
backend/
├── app/api/endpoints/
│   ├── pages.py (updated - added sharing endpoints)
│   └── trash.py (existing - trash operations)
└── migrations/
    └── add-page-sharing-column.sql (new)

src/
├── components/pages/
│   └── MovePageDialog.tsx (new)
├── pages/
│   └── PagesPage.tsx (updated)
└── lib/
    └── api.ts (updated)
```

## 🚀 Next Steps

### Recommended Enhancements
1. **Trash Page UI** - Create dedicated trash/bin page
2. **Bulk Move** - Move multiple pages at once
3. **Drag & Drop** - Drag pages to move them
4. **Share Links** - Generate public links for shared pages
5. **Share Permissions** - Fine-grained sharing (view/edit/comment)
6. **Move History** - Track page movement history
7. **Undo Move** - Quick undo after moving

### Testing Checklist
- [ ] Move page to another page
- [ ] Move subpage to different parent
- [ ] Move page to root level
- [ ] Move to trash
- [ ] Toggle public/private
- [ ] Permission checks work correctly
- [ ] Subpages move with parent to trash
- [ ] Dialog shows correct available pages

## 🎯 Key Features

✅ **Move pages anywhere** - to other pages or root level
✅ **Subpage support** - move subpages independently
✅ **Trash system** - soft delete with restore capability
✅ **Public/Private sharing** - control page visibility
✅ **Beautiful UI** - modal dialog with visual selection
✅ **Permission system** - role-based access control
✅ **Toast notifications** - clear feedback for all actions

## 📝 Notes

- All operations respect workspace permissions
- Subpages are automatically handled when parent is moved/deleted
- Circular references are prevented (can't move page to its own descendant)
- Database migration is safe (uses IF NOT EXISTS)
- All API calls include proper error handling
