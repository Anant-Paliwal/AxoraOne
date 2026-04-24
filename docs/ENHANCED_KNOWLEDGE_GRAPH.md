# Enhanced Knowledge Graph - Complete Guide

## 🎯 Overview

The Enhanced Knowledge Graph provides a powerful visual representation of your workspace with automatic AI-powered linking, manual connection capabilities, and an improved interactive canvas.

## ✨ Key Features

### 1. **Automatic AI Link Suggestions**
- Smart detection of connections between pages, skills, and tasks
- Confidence scoring for each suggestion
- Batch acceptance of AI recommendations
- Reasons provided for each suggested connection

### 2. **Manual Connection Creation**
- **Connect Mode**: Click-to-connect interface
  - Click "Connect Nodes" button
  - Select source node (turns green)
  - Select target node
  - Connection created automatically
- **From Detail Panel**: Select a node and click "Create Connection"
- **Drag & Drop**: Visual connection creation (coming soon)

### 3. **Enhanced Canvas**
- **Zoom Controls**: 50% to 200% zoom range
- **Search**: Real-time node search
- **Filters**: Filter by type (All, Pages, Skills, Tasks)
- **Visual Feedback**: Highlighted connections on node selection
- **Responsive Layout**: Force-directed node positioning

### 4. **Connection Types**

| Type | Description | Visual | Editable |
|------|-------------|--------|----------|
| **Explicit** | User-created connections | Solid primary line | ✅ Yes |
| **Inferred** | AI-suggested connections | Dashed line | ✅ Yes |
| **Evidence** | Skill evidence links | Thick accent line | ❌ Auto |
| **Linked** | Task-page/skill links | Medium primary line | ❌ Auto |

### 5. **Detail Panel**
- Node metadata (level, status, tags)
- All connections listed
- Quick actions:
  - Open node
  - Create new connection
  - Delete explicit connections
- Navigate to connected nodes

## 🚀 How to Use

### Creating Connections Manually

**Method 1: Connect Mode**
```
1. Click "Connect Nodes" button in header
2. Click source node (it turns green)
3. Click target node
4. Connection created!
```

**Method 2: From Detail Panel**
```
1. Click any node to open detail panel
2. Click "Create Connection" button
3. Select target node
4. Connection created!
```

### Using AI Suggestions

```
1. Click "AI Suggest" button
2. Review suggestions panel at bottom
3. Each suggestion shows:
   - Source → Target
   - Reason for connection
   - Confidence score
4. Click "Accept" on any suggestion
5. Connection added to graph
```

### Filtering & Search

**Search Nodes:**
- Type in search box (top right)
- Nodes filter in real-time
- Edges update automatically

**Filter by Type:**
- Click filter buttons (below header)
- Options: All, Pages, Skills, Tasks
- Graph updates instantly

### Managing Connections

**View Connections:**
- Click any node
- Detail panel shows all connections
- Click connected node name to navigate

**Delete Connections:**
- Select node with connections
- Hover over explicit connection
- Click trash icon
- Confirm deletion

## 🎨 Visual Guide

### Node Types

```
📄 Pages    - Primary color, rounded square
🧠 Skills   - Secondary color, rounded square  
✅ Tasks    - Accent color, rounded square
```

### Connection Styles

```
━━━━━━━  Explicit (user-created)
- - - -  Inferred (AI-suggested)
━━━━━━━  Evidence (thick, accent)
━━━━━━━  Linked (medium, primary)
```

### States

```
🔵 Normal     - Default state
🟢 Selected   - Ring highlight
🟢 Source     - Green ring (connect mode)
🔵 Hover      - Scale up slightly
```

## 🔧 Backend API

### Endpoints

**Get Nodes**
```
GET /graph/nodes?workspace_id={id}
Returns: { nodes: [...] }
```

**Get Edges**
```
GET /graph/edges?workspace_id={id}
Returns: { edges: [...] }
```

**Infer Connections**
```
POST /graph/infer-edges?workspace_id={id}
Returns: { suggestions: [...] }
```

**Create Edge**
```
POST /graph/edges
Body: {
  source_id, source_type,
  target_id, target_type,
  edge_type, workspace_id
}
```

**Accept Suggestion**
```
POST /graph/edges/accept-suggestion
Body: {
  source_id, source_type,
  target_id, target_type,
  workspace_id
}
```

**Delete Edge**
```
DELETE /graph/edges/{edge_id}
```

**Update Edge Type**
```
PUT /graph/edges/{edge_id}/type
Body: { edge_type }
```

## 🧠 AI Suggestion Algorithm

The AI analyzes:

1. **Common Tags** (Pages ↔ Pages)
   - 2+ common tags = suggestion
   - Confidence: 0.5 + (0.1 × tag count)

2. **Content Mentions** (Pages ↔ Skills)
   - Skill name in page content
   - Confidence: 0.8

3. **Task References** (Tasks ↔ Pages)
   - Page title/tags in task description
   - Confidence: 0.7

4. **Existing Connections**
   - Duplicates automatically filtered
   - Only new suggestions shown

## 📊 Database Schema

### graph_edges Table

```sql
CREATE TABLE graph_edges (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  workspace_id UUID,
  source_id UUID NOT NULL,
  source_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  target_type TEXT NOT NULL,
  edge_type TEXT CHECK (edge_type IN (
    'explicit', 'inferred', 'evidence', 'linked'
  )),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Automatic Triggers

**Skill Evidence Trigger**
- Fires when evidence array updated
- Creates/updates evidence edges
- Links skills to pages

**Task Link Trigger**
- Fires when linked_page_id or linked_skill_id updated
- Creates linked edges
- Maintains task connections

## 🎯 Best Practices

### For Users

1. **Start with AI Suggestions**
   - Run AI suggest first
   - Accept high-confidence suggestions
   - Review medium-confidence manually

2. **Use Tags Effectively**
   - Add relevant tags to pages
   - AI uses tags for suggestions
   - Better tags = better suggestions

3. **Regular Maintenance**
   - Review connections monthly
   - Delete outdated links
   - Accept new AI suggestions

4. **Workspace Organization**
   - Keep related content in same workspace
   - Use filters to focus on specific types
   - Search for specific nodes

### For Developers

1. **Performance**
   - Limit AI suggestions to top 20
   - Use workspace filtering
   - Index source_id and target_id

2. **Extensibility**
   - Add new edge types in schema
   - Update AI algorithm for new patterns
   - Extend node types as needed

3. **Testing**
   - Test with 100+ nodes
   - Verify duplicate detection
   - Check workspace isolation

## 🔮 Future Enhancements

- [ ] Drag-and-drop node positioning
- [ ] Save custom layouts
- [ ] Export graph as image
- [ ] Mindmap view mode
- [ ] Clustering algorithm
- [ ] Path finding between nodes
- [ ] Bulk connection operations
- [ ] Connection strength visualization
- [ ] Time-based graph evolution
- [ ] Collaborative editing

## 🐛 Troubleshooting

**Nodes not appearing?**
- Check workspace filter
- Verify RLS policies
- Refresh the page

**AI suggestions not working?**
- Ensure pages have content
- Add tags to pages
- Check workspace_id parameter

**Connections not saving?**
- Verify authentication
- Check network tab for errors
- Ensure workspace_id is set

**Performance issues?**
- Reduce zoom level
- Use filters to show fewer nodes
- Clear browser cache

## 📝 Summary

The Enhanced Knowledge Graph provides:
- ✅ Automatic AI-powered link detection
- ✅ Manual connection creation (click-to-connect)
- ✅ Advanced filtering and search
- ✅ Beautiful, interactive canvas
- ✅ Full CRUD operations on connections
- ✅ Workspace isolation
- ✅ Real-time updates

Everything works seamlessly with automatic database triggers and AI-powered suggestions!
