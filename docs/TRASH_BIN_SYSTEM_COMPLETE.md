# 🗑️ Trash/Bin System - Complete Implementation

## Overview

A complete **soft delete** system for pages with a trash bin UI. Deleted pages go to trash first before permanent deletion, giving users a safety net to recover accidentally deleted content.

---

## 🎯 Features

### 1. **Soft Delete**
- Pages are not immediately deleted
- Moved to trash with `deleted_at` timestamp
- Can be restored within 30 days
- Auto-cleanup after 30 days

### 2. **Trash UI**
- Dedicated trash page in sidebar
- View all deleted items
- Restore or permanently delete
- Empty entire trash at once

### 3. **Safety Features**
- Confirmation dialogs for permanent deletion
- Shows when item was deleted
- Indicates if item is a subpage
- Batch operations (empty trash)

---

## 📁 Database Schema

### New Columns on `pages` Table

```sql
-- Soft delete columns
deleted_at TIMESTAMPTZ      -- When page was moved to trash
deleted_by UUID             -- User who deleted the page
```

### Functions

1. **`soft_delete_page(page_id, user_id)`**
   - Moves page and subpages to trash
   - Sets deleted_at timestamp

2. **`restore_page(page_id)`**
   - Restores page and subpages from trash
   - Clears deleted_at timestamp

3. **`permanently_delete_page(page_id)`**
   - Permanently deletes from database
   - Only works on items already in trash

4. **`empty_trash(workspace_id)`**
   - Permanently deletes all trash items
   - Workspace-scoped

5. **`auto_cleanup_trash()`**
   - Deletes items older than 30 days
   - Can be scheduled with pg_cron

---

## 🔌 API Endpoints

### Base URL: `/api/v1/trash`

### 1. Get Trash Items
```http
GET /trash?workspace_id={workspace_id}
```

**Response:**
```json
{
  "success": true,
  "items": [
    {
      "id": "page-123",
      "title": "Old Tutorial",
      "icon": "📄",
      "page_type": "page",
      "deleted_at": "2025-01-21T10:30:00Z",
      "deleted_by": "user-456",
      "parent_page_id": null,
      "created_at": "2025-01-15T08:00:00Z"
    }
  ],
  "count": 1
}
```

### 2. Move to Trash (Soft Delete)
```http
POST /trash/move/{page_id}
```

**Response:**
```json
{
  "success": true,
  "message": "Moved 'Tutorial' to trash",
  "page_id": "page-123"
}
```

### 3. Restore from Trash
```http
POST /trash/restore/{page_id}
```

**Response:**
```json
{
  "success": true,
  "message": "Restored 'Tutorial' from trash",
  "page_id": "page-123"
}
```

### 4. Permanently Delete
```http
DELETE /trash/permanent/{page_id}
```

**Response:**
```json
{
  "success": true,
  "message": "Permanently deleted 'Tutorial'",
  "page_id": "page-123"
}
```

### 5. Empty Trash
```http
DELETE /trash/empty?workspace_id={workspace_id}
```

**Response:**
```json
{
  "success": true,
  "message": "Trash emptied successfully",
  "deleted_count": 5
}
```

### 6. Get Trash Count
```http
GET /trash/count?workspace_id={workspace_id}
```

**Response:**
```json
{
  "success": true,
  "count": 3
}
```

---

## 🎨 Frontend Components

### TrashPage Component

**Location:** `src/pages/TrashPage.tsx`

**Features:**
- Lists all deleted items
- Shows deletion time (relative)
- Restore button per item
- Delete permanently button per item
- Empty trash button (batch delete)
- Confirmation dialogs for destructive actions

**UI Elements:**
- Empty state when no items
- Loading spinner
- Item cards with icons
- Action buttons
- Alert dialogs for confirmations

---

## 🧭 Navigation

### Sidebar Integration

Trash appears in the main navigation:

```
📍 Ask Anything
🏠 Home
📄 Pages
🧠 Skills
🌳 Knowledge Graph
✅ Tasks
📅 Calendar
🗑️ Trash  ← NEW
```

### Routes

**Workspace-scoped:**
```
/workspace/{workspaceId}/trash
```

**Legacy:**
```
/trash
```

---

## 🔄 User Flow

### Deleting a Page

```
1. User: "delete this page"
   ↓
2. Agent detects delete intent
   ↓
3. Soft delete: Set deleted_at timestamp
   ↓
4. Page hidden from normal views
   ↓
5. Page appears in Trash
   ↓
6. User sees confirmation: "Moved to trash"
```

### Restoring a Page

```
1. User opens Trash page
   ↓
2. Clicks "Restore" on item
   ↓
3. API clears deleted_at timestamp
   ↓
4. Page reappears in Pages list
   ↓
5. User sees confirmation: "Restored"
```

### Permanent Deletion

```
1. User opens Trash page
   ↓
2. Clicks delete icon (X) on item
   ↓
3. Confirmation dialog appears
   ↓
4. User confirms
   ↓
5. API permanently deletes from database
   ↓
6. Item removed from trash
```

### Empty Trash

```
1. User clicks "Empty Trash" button
   ↓
2. Confirmation dialog shows count
   ↓
3. User confirms
   ↓
4. API deletes all trash items
   ↓
5. Trash page shows empty state
```

---

## 🛡️ RLS (Row Level Security)

### Updated Policies

**Normal Page Queries:**
```sql
-- Exclude deleted pages from normal views
WHERE deleted_at IS NULL
```

**Trash Queries:**
```sql
-- Only show deleted pages in trash
WHERE deleted_at IS NOT NULL
```

**Permissions:**
- Users can only see trash in their workspaces
- Only workspace members can restore/delete
- Workspace isolation maintained

---

## 🤖 Agentic Agent Integration

### Natural Language Commands

**Delete Page:**
```
"delete this page"
"remove this page"
"trash this page"
```

**Result:**
- Page moved to trash (soft delete)
- Confirmation message
- Button to view trash

### Updated Delete Behavior

**Before:**
```python
# Hard delete - permanent
DELETE FROM pages WHERE id = page_id
```

**After:**
```python
# Soft delete - recoverable
UPDATE pages 
SET deleted_at = NOW(), deleted_by = user_id
WHERE id = page_id
```

---

## ⏰ Auto-Cleanup

### Scheduled Cleanup (Optional)

If `pg_cron` is available:

```sql
-- Run daily at 2 AM
SELECT cron.schedule(
  'cleanup-trash',
  '0 2 * * *',
  'SELECT auto_cleanup_trash()'
);
```

**What it does:**
- Finds items with `deleted_at > 30 days ago`
- Permanently deletes them
- Keeps trash manageable

---

## 📊 Benefits

### 1. **User Safety**
- Accidental deletions can be recovered
- 30-day grace period
- Clear confirmation dialogs

### 2. **Better UX**
- Familiar trash metaphor
- Easy to restore
- Batch operations

### 3. **Data Integrity**
- Soft delete preserves relationships
- Audit trail (who deleted, when)
- Can analyze deletion patterns

### 4. **Performance**
- Deleted items excluded from queries
- Index on deleted_at for fast filtering
- Workspace-scoped queries

---

## 🚀 Setup Instructions

### 1. Run Database Migration

```bash
# Apply the trash system migration
psql -d your_database -f add-trash-bin-system.sql
```

### 2. Restart Backend

```bash
cd backend
python main.py
```

The trash router is automatically registered.

### 3. Frontend Already Configured

- TrashPage component created
- Route added to App.tsx
- Sidebar navigation updated
- No additional setup needed

---

## 🧪 Testing

### Test Soft Delete

```bash
# 1. Create a test page
# 2. Say "delete this page" to agent
# 3. Check trash page - should appear
# 4. Check pages list - should NOT appear
```

### Test Restore

```bash
# 1. Go to trash page
# 2. Click "Restore" on an item
# 3. Check pages list - should reappear
# 4. Check trash - should disappear
```

### Test Permanent Delete

```bash
# 1. Go to trash page
# 2. Click X icon on an item
# 3. Confirm deletion
# 4. Item permanently removed
```

### Test Empty Trash

```bash
# 1. Have multiple items in trash
# 2. Click "Empty Trash"
# 3. Confirm
# 4. All items permanently deleted
```

---

## 📝 Usage Examples

### Via Agent

```
User: "delete this page"
Agent: ✅ Deleted page: Tutorial
       [Go to Trash]

User: "show trash"
Agent: You have 3 items in trash
       [View Trash]
```

### Via UI

1. **Navigate to Trash:**
   - Click "Trash" in sidebar
   - See all deleted items

2. **Restore Item:**
   - Click "Restore" button
   - Item returns to pages

3. **Permanent Delete:**
   - Click X icon
   - Confirm in dialog
   - Item gone forever

4. **Empty Trash:**
   - Click "Empty Trash" button
   - Confirm deletion of all items
   - Trash cleared

---

## 🔮 Future Enhancements

### Possible Additions

1. **Trash Count Badge**
   - Show number in sidebar
   - Visual indicator

2. **Bulk Selection**
   - Select multiple items
   - Restore/delete in batch

3. **Search in Trash**
   - Find specific deleted items
   - Filter by date

4. **Trash for Other Objects**
   - Soft delete for skills
   - Soft delete for tasks
   - Unified trash view

5. **Restore Preview**
   - Preview page before restoring
   - See content snapshot

---

## ✅ Summary

The trash/bin system provides:

✅ **Soft delete** for pages (recoverable)
✅ **Dedicated trash UI** in sidebar
✅ **Restore functionality** within 30 days
✅ **Permanent deletion** with confirmation
✅ **Empty trash** batch operation
✅ **Auto-cleanup** after 30 days
✅ **Agent integration** with natural language
✅ **RLS policies** for security
✅ **Workspace isolation** maintained

Users can now safely delete pages knowing they can recover them if needed!
