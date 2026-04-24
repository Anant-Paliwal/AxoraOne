# Pages System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  PagesPage   │  │  PageViewer  │  │  PageEditor  │        │
│  │              │  │              │  │              │        │
│  │ - List view  │  │ - Read mode  │  │ - Edit mode  │        │
│  │ - Search     │  │ - Analytics  │  │ - Auto-save  │        │
│  │ - Bulk ops   │  │ - View track │  │ - Sub-pages  │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                  │                  │                 │
│         └──────────────────┴──────────────────┘                 │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   SearchBar     │
                    │   Component     │
                    │                 │
                    │ - Debounced     │
                    │ - Highlighting  │
                    │ - Recent search │
                    └────────┬────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                    API CLIENT LAYER                             │
├────────────────────────────┼────────────────────────────────────┤
│                            │                                    │
│                    ┌───────▼────────┐                          │
│                    │   api.ts       │                          │
│                    │                │                          │
│  ┌─────────────────┼────────────────┼─────────────────┐       │
│  │                 │                │                 │       │
│  │  getPages()     │  searchPages() │  bulkDelete()   │       │
│  │  createPage()   │  trackView()   │  duplicate()    │       │
│  │  updatePage()   │  getAnalytics()│  bulkUpdate()   │       │
│  │                 │                │                 │       │
│  └─────────────────┴────────────────┴─────────────────┘       │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   HTTP/REST     │
                    └────────┬────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                    BACKEND API LAYER                            │
├────────────────────────────┼────────────────────────────────────┤
│                            │                                    │
│                    ┌───────▼────────┐                          │
│                    │  pages.py      │                          │
│                    │  (FastAPI)     │                          │
│                    │                │                          │
│  ┌─────────────────┼────────────────┼─────────────────┐       │
│  │                 │                │                 │       │
│  │  GET /pages     │  POST /search  │  POST /bulk-*   │       │
│  │  POST /pages    │  GET /{id}     │  POST /duplicate│       │
│  │  PATCH /{id}    │  POST /view    │  GET /analytics │       │
│  │                 │                │                 │       │
│  └─────────────────┴────────────────┴─────────────────┘       │
│                            │                                    │
│                    ┌───────▼────────┐                          │
│                    │  Validation    │                          │
│                    │  (Pydantic)    │                          │
│                    └───────┬────────┘                          │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                    DATABASE LAYER                               │
├────────────────────────────┼────────────────────────────────────┤
│                            │                                    │
│                    ┌───────▼────────┐                          │
│                    │  Supabase      │                          │
│                    │  (PostgreSQL)  │                          │
│                    │                │                          │
│  ┌─────────────────┴────────────────┴─────────────────┐       │
│  │                                                     │       │
│  │              pages TABLE                            │       │
│  │  ┌──────────────────────────────────────────────┐  │       │
│  │  │ Columns:                                     │  │       │
│  │  │ - id, user_id, workspace_id                 │  │       │
│  │  │ - title, content, icon, tags                │  │       │
│  │  │ - parent_page_id, page_order                │  │       │
│  │  │ - blocks, metadata                          │  │       │
│  │  │ - is_favorite, is_archived, is_template     │  │       │
│  │  │ - view_count, last_viewed_at                │  │       │
│  │  │ - word_count, estimated_reading_time        │  │       │
│  │  │ - search_vector (tsvector)                  │  │       │
│  │  │ - created_at, updated_at                    │  │       │
│  │  └──────────────────────────────────────────────┘  │       │
│  │                                                     │       │
│  │  ┌──────────────────────────────────────────────┐  │       │
│  │  │ Indexes:                                     │  │       │
│  │  │ - idx_pages_workspace_id                    │  │       │
│  │  │ - idx_pages_parent_page_id                  │  │       │
│  │  │ - idx_pages_user_workspace                  │  │       │
│  │  │ - idx_pages_tags (GIN)                      │  │       │
│  │  │ - idx_pages_updated_at                      │  │       │
│  │  │ - idx_pages_search (GIN)                    │  │       │
│  │  └──────────────────────────────────────────────┘  │       │
│  │                                                     │       │
│  │  ┌──────────────────────────────────────────────┐  │       │
│  │  │ Triggers:                                    │  │       │
│  │  │ - update_pages_search_vector()              │  │       │
│  │  │ - update_page_stats()                       │  │       │
│  │  └──────────────────────────────────────────────┘  │       │
│  │                                                     │       │
│  │  ┌──────────────────────────────────────────────┐  │       │
│  │  │ Functions:                                   │  │       │
│  │  │ - increment_page_view()                     │  │       │
│  │  └──────────────────────────────────────────────┘  │       │
│  │                                                     │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### 1. Page Creation Flow

```
User Action (Create Page)
         │
         ▼
┌─────────────────┐
│  PageEditor     │
│  - Enter title  │
│  - Add content  │
│  - Select icon  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  api.createPage │
│  - Validate     │
│  - Send POST    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend API    │
│  - Validate     │
│  - Check perms  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Database       │
│  - INSERT page  │
│  - Run triggers │
│    • calc stats │
│    • search vec │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Response       │
│  - Page object  │
│  - Navigate     │
└─────────────────┘
```

---

### 2. Search Flow

```
User Types Query
         │
         ▼
┌─────────────────┐
│  SearchBar      │
│  - Debounce     │
│  - 300ms delay  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  api.searchPages│
│  - POST request │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend API    │
│  - Full-text    │
│  - ts_search    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Database       │
│  - Query vector │
│  - Use GIN idx  │
│  - Rank results │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Response       │
│  - Results[]    │
│  - Snippets     │
│  - Highlight    │
└─────────────────┘
```

---

### 3. Auto-Save Flow

```
User Edits Content
         │
         ▼
┌─────────────────┐
│  PageEditor     │
│  - onChange     │
│  - Set dirty    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  useAutoSave    │
│  - Start timer  │
│  - 30 seconds   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Timer Expires  │
│  - Check dirty  │
│  - Call save    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  api.updatePage │
│  - PATCH req    │
│  - Show saving  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend API    │
│  - Update DB    │
│  - Run triggers │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Response       │
│  - Show saved   │
│  - Timestamp    │
└─────────────────┘
```

---

### 4. Bulk Operations Flow

```
User Selects Pages
         │
         ▼
┌─────────────────┐
│  PagesPage      │
│  - Selection    │
│  - Checkboxes   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Bulk Action    │
│  - Delete       │
│  - Duplicate    │
│  - Add tags     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Confirmation   │
│  - Show dialog  │
│  - User confirm │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  api.bulkDelete │
│  - POST request │
│  - page_ids[]   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend API    │
│  - Validate IDs │
│  - Check perms  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Database       │
│  - UPDATE/DELETE│
│  - Multiple rows│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Response       │
│  - Count        │
│  - Refresh list │
└─────────────────┘
```

---

### 5. Page View Tracking Flow

```
User Opens Page
         │
         ▼
┌─────────────────┐
│  PageViewer     │
│  - useEffect    │
│  - Track view   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  api.trackView  │
│  - POST request │
│  - Non-blocking │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend API    │
│  - Call RPC     │
│  - Async        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Database       │
│  - increment()  │
│  - UPDATE count │
│  - SET timestamp│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Response       │
│  - Success      │
│  - (silent)     │
└─────────────────┘
```

---

## Component Hierarchy

```
App
 │
 ├─ WorkspaceProvider
 │   │
 │   └─ PagesPage
 │       │
 │       ├─ SearchBar
 │       │   ├─ Input (debounced)
 │       │   └─ ResultsDropdown
 │       │       └─ ResultCard[]
 │       │
 │       ├─ BulkActionsBar (conditional)
 │       │   ├─ SelectAllButton
 │       │   ├─ DeleteButton
 │       │   └─ DuplicateButton
 │       │
 │       └─ PageCard[]
 │           ├─ Checkbox (selection mode)
 │           ├─ Icon
 │           ├─ Title
 │           ├─ Snippet
 │           ├─ Tags[]
 │           └─ DropdownMenu
 │
 ├─ PageViewer
 │   │
 │   ├─ Header
 │   │   ├─ BackButton
 │   │   ├─ EditButton
 │   │   └─ MoreMenu
 │   │
 │   ├─ Content
 │   │   ├─ Icon
 │   │   ├─ Title
 │   │   ├─ Tags[]
 │   │   └─ TiptapEditor (read-only)
 │   │
 │   └─ Sidebar
 │       ├─ TrackSkill
 │       ├─ Progress
 │       ├─ RelatedPages
 │       └─ Suggestions
 │
 └─ PageEditor
     │
     ├─ AppSidebar
     │
     ├─ Header
     │   ├─ BackButton
     │   ├─ FavoriteButton
     │   ├─ AutoSaveIndicator
     │   ├─ SaveButton
     │   └─ DeleteButton
     │
     ├─ TabBar (if sub-pages)
     │   ├─ ParentTab
     │   ├─ SubPageTab[]
     │   └─ AddTabButton
     │
     └─ Content
         ├─ IconInput
         ├─ TitleInput
         ├─ TagsInput
         ├─ EnhancedTiptapEditor
         │   └─ useAutoSave hook
         └─ SubPagesSection
```

---

## State Management

```
┌─────────────────────────────────────────┐
│         Application State               │
├─────────────────────────────────────────┤
│                                         │
│  WorkspaceContext                       │
│  ├─ workspaces[]                        │
│  ├─ currentWorkspace                    │
│  └─ loading                             │
│                                         │
│  PagesPage State                        │
│  ├─ pages[]                             │
│  ├─ loading                             │
│  ├─ searchQuery                         │
│  ├─ selectedPages (Set)                 │
│  └─ isSelectionMode                     │
│                                         │
│  PageEditor State                       │
│  ├─ currentPageId                       │
│  ├─ title                               │
│  ├─ content                             │
│  ├─ icon                                │
│  ├─ tags[]                              │
│  ├─ isFavorite                          │
│  ├─ blocks[]                            │
│  ├─ hasUnsavedChanges                   │
│  ├─ subPages[]                          │
│  ├─ isAutoSaving                        │
│  └─ lastSaved                           │
│                                         │
│  SearchBar State                        │
│  ├─ query                               │
│  ├─ results[]                           │
│  ├─ isSearching                         │
│  ├─ showResults                         │
│  └─ recentSearches[]                    │
│                                         │
└─────────────────────────────────────────┘
```

---

## Performance Optimizations

```
┌─────────────────────────────────────────┐
│         Performance Layer               │
├─────────────────────────────────────────┤
│                                         │
│  Database Level                         │
│  ├─ Indexes (9 total)                   │
│  ├─ GIN indexes for arrays              │
│  ├─ Partial indexes                     │
│  └─ Query optimization                  │
│                                         │
│  Backend Level                          │
│  ├─ Pagination (limit/offset)           │
│  ├─ Selective field loading             │
│  ├─ Non-blocking operations             │
│  └─ Efficient queries                   │
│                                         │
│  Frontend Level                         │
│  ├─ Debounced search (300ms)            │
│  ├─ Debounced auto-save (30s)           │
│  ├─ React.memo (future)                 │
│  ├─ Lazy loading (future)               │
│  └─ Virtual scrolling (future)          │
│                                         │
│  Caching Layer (Future)                 │
│  ├─ Redis cache                         │
│  ├─ Browser cache                       │
│  └─ Service worker                      │
│                                         │
└─────────────────────────────────────────┘
```

---

This architecture provides a solid foundation for scalable, performant page management with room for future enhancements.
