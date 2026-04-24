# Knowledge Graph Cross-Screen Synchronization

## 🎯 Goal
Make Knowledge Graph connections **functional and visible across all screens**, not just decorative.

## 📊 Where Connections Should Appear

### 1. **Page Viewer** (`PageViewer.tsx`)
**Show:**
- Connected Skills (from graph_edges where source=page, target=skill)
- Connected Tasks (from graph_edges where source=page, target=task)
- Related Pages (from graph_edges where source=page, target=page)

**Display Location:**
- Sidebar section "Connected Items"
- Quick links to navigate

### 2. **Skills Page** (`SkillsPage.tsx`)
**Show:**
- Evidence Pages (from graph_edges where source=skill, target=page, type=evidence)
- Related Tasks (from graph_edges where source=skill, target=task)
- Related Skills (from graph_edges where source=skill, target=skill)

**Display Location:**
- Skill detail card
- "Evidence" section
- "Related" section

### 3. **Tasks Page** (`TasksPage.tsx`)
**Show:**
- Linked Pages (from graph_edges where source=task, target=page)
- Linked Skills (from graph_edges where source=task, target=skill)
- Related Tasks (from graph_edges where source=task, target=task)

**Display Location:**
- Task detail panel
- "Connections" section

### 4. **Page Editor** (`PageEditor.tsx`)
**Show:**
- Quick access to connected items
- Suggest connections while editing
- Link insertion helper

**Display Location:**
- Sidebar widget
- Slash command menu

### 5. **Home Dashboard** (`HomePage.tsx`)
**Show:**
- Connection statistics
- Recently connected items
- Suggested connections

**Display Location:**
- Workspace Pulse widget
- Quick actions

## 🔄 Synchronization Strategy

### Real-time Updates
```typescript
// When connection created/deleted in graph:
1. Update graph_edges table (database)
2. Trigger refresh in all open screens
3. Update local cache
4. Show toast notification
```

### Data Flow
```
Graph Page → Create Connection
    ↓
Database (graph_edges table)
    ↓
All Screens Query graph_edges
    ↓
Display Connected Items
```

## 🛠️ Implementation Plan

### Phase 1: Add Connection Queries to Each Screen
- Add `getConnectedItems(itemId, itemType)` API method
- Query graph_edges for each item
- Display in UI

### Phase 2: Add Connection Widgets
- Create `<ConnectedItems>` component
- Reusable across all screens
- Shows connections with icons and links

### Phase 3: Add Quick Actions
- "Add Connection" button on each screen
- Opens mini graph selector
- Creates connection instantly

### Phase 4: Add Suggestions
- Show AI suggestions on each screen
- "You might want to connect this to..."
- One-click acceptance

## 📝 Database Queries Needed

```sql
-- Get all connections for an item
SELECT * FROM graph_edges 
WHERE (source_id = $1 OR target_id = $1)
AND workspace_id = $2;

-- Get connected pages for a skill
SELECT p.* FROM pages p
JOIN graph_edges e ON e.target_id = p.id
WHERE e.source_id = $1 
AND e.source_type = 'skill'
AND e.target_type = 'page';

-- Get connected skills for a page
SELECT s.* FROM skills s
JOIN graph_edges e ON e.target_id = s.id
WHERE e.source_id = $1 
AND e.source_type = 'page'
AND e.target_type = 'skill';
```

## 🎨 UI Components Needed

### ConnectedItemsWidget
```tsx
<ConnectedItemsWidget 
  itemId={pageId}
  itemType="page"
  onNavigate={(id, type) => navigate(...)}
  onAddConnection={() => openConnectionDialog()}
/>
```

### ConnectionBadge
```tsx
<ConnectionBadge 
  count={5}
  type="skill"
  onClick={() => showConnections()}
/>
```

### QuickConnectButton
```tsx
<QuickConnectButton
  sourceId={pageId}
  sourceType="page"
  onConnect={(targetId, targetType) => createConnection()}
/>
```

## ✅ Success Criteria

- [ ] Connections visible on Page Viewer
- [ ] Connections visible on Skills Page
- [ ] Connections visible on Tasks Page
- [ ] Connections visible on Page Editor
- [ ] Connections visible on Home Dashboard
- [ ] Real-time sync when connections change
- [ ] Quick navigation between connected items
- [ ] Add connection from any screen
- [ ] AI suggestions on each screen
- [ ] Connection count badges

## 🚀 Benefits

1. **Contextual Learning**: See related content while studying
2. **Quick Navigation**: Jump between connected items
3. **Better Organization**: Understand relationships
4. **Productivity**: Less searching, more learning
5. **AI Assistance**: Smart suggestions everywhere
