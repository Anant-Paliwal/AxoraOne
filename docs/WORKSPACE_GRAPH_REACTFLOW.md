# Workspace-Centric Knowledge Graph with React Flow

## Overview

A professional, interactive knowledge graph built with **React Flow** that places the workspace at the center with all nodes connecting to it.

## Features

### ✅ Workspace-Centric Design
- **Workspace node at center** - Large, animated central hub
- **Everything connects to workspace** - Clear visual hierarchy
- **Radial layout** - Nodes arranged around the center

### ✅ Infinite Canvas
- **Pan** - Click and drag to move around
- **Zoom** - Scroll to zoom in/out (0.1x to 2x)
- **Fit view** - Auto-fit all nodes on load
- **Mini-map** - Navigate large graphs easily

### ✅ Professional Node Types

#### 1. Workspace Node (Center)
- Large 300x150px gradient card
- Animated background effects
- Briefcase icon with sparkle
- Purple gradient theme
- 4 connection handles (all sides)

#### 2. Skill Nodes
- Purple gradient with brain icon
- Shows skill level
- Connects to workspace and pages

#### 3. Page Nodes
- Blue gradient with custom icon/emoji
- Shows tags
- Connects to workspace and skills

#### 4. Task Nodes
- Yellow gradient with checkbox icon
- Shows status (todo/in progress/completed)
- Status-based color coding

#### 5. Quiz Nodes
- Pink gradient with sparkles icon
- Shows score if completed
- Connects to related pages/skills

### ✅ Smart Connections
- **Workspace edges** - Purple, connects center to all nodes
- **Explicit edges** - Purple, thick (user-created)
- **Evidence edges** - Blue, with 📚 label (skill evidence)
- **Linked edges** - Green (task links)
- **Inferred edges** - Purple, dashed, animated (AI suggestions)

### ✅ Interactive Features
- **Drag nodes** - Reposition any node
- **Hover effects** - Nodes scale up on hover
- **Selection** - Click to select, shows glow effect
- **Search** - Filter nodes by name
- **Type filters** - Show only specific node types
- **AI suggestions** - Infer new connections
- **Refresh** - Reload graph data

### ✅ Layout Algorithm
- **Dagre layout** - Hierarchical graph layout
- **Top-to-bottom** - Workspace at top, items below
- **Smart spacing** - 150px rank separation, 100px node separation
- **Auto-positioning** - Nodes positioned automatically

## Usage

### Installation

```bash
npm install reactflow dagre @types/dagre
```

### Access the Graph

Navigate to: `/workspace/{workspace_id}/graph`

Or use the "Knowledge Graph" link in the sidebar.

### Controls

- **Pan**: Click and drag on empty space
- **Zoom**: Scroll wheel or use +/- buttons
- **Select**: Click on a node
- **Drag node**: Click and drag a node
- **Fit view**: Click the fit view button in controls
- **Search**: Type in search box to filter
- **Filter**: Click type buttons to show specific nodes
- **AI Suggest**: Click to get AI-powered connection suggestions
- **Refresh**: Reload graph data

### Keyboard Shortcuts

- `Ctrl/Cmd + Scroll`: Zoom
- `Space + Drag`: Pan (alternative)

## Architecture

### Components

```
src/pages/WorkspaceGraphPage.tsx          # Main graph page
src/components/graph/
  ├── WorkspaceNode.tsx                   # Center workspace node
  ├── SkillNode.tsx                       # Skill nodes
  ├── PageNode.tsx                        # Page nodes
  ├── TaskNode.tsx                        # Task nodes
  └── QuizNode.tsx                        # Quiz nodes
```

### Data Flow

```
1. Load workspace data
2. Fetch nodes (pages, skills, tasks, quizzes)
3. Fetch edges (connections)
4. Create workspace center node
5. Create edges from workspace to all nodes
6. Apply Dagre layout algorithm
7. Render with React Flow
```

### Node Structure

```typescript
{
  id: string,
  type: 'workspace' | 'skill' | 'page' | 'task' | 'quiz',
  position: { x: number, y: number },
  data: {
    label: string,
    icon?: string,
    level?: string,
    status?: string,
    tags?: string[],
    ...
  }
}
```

### Edge Structure

```typescript
{
  id: string,
  source: string,
  target: string,
  type: 'smoothstep',
  animated: boolean,
  style: {
    stroke: string,
    strokeWidth: number,
    strokeDasharray?: string
  },
  label?: string
}
```

## Customization

### Change Layout Direction

In `WorkspaceGraphPage.tsx`:

```typescript
const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
  allNodes,
  allEdges,
  'LR' // Left-to-right instead of 'TB' (top-to-bottom)
);
```

### Adjust Spacing

```typescript
dagreGraph.setGraph({ 
  rankdir: direction,
  ranksep: 200,    // Increase vertical spacing
  nodesep: 150,    // Increase horizontal spacing
  edgesep: 50,
});
```

### Custom Node Colors

Edit the node component files to change colors:

```typescript
// In SkillNode.tsx
className="bg-gradient-to-br from-green-500/20 to-green-600/20"
```

### Edge Colors

In `getEdgeColor()` function:

```typescript
case 'explicit':
  return 'rgb(34, 197, 94)'; // Change to green
```

## Performance

- **Optimized rendering** - React Flow handles virtualization
- **Memo components** - Nodes are memoized to prevent re-renders
- **Efficient layout** - Dagre runs once on data load
- **Smooth animations** - Framer Motion for 60fps animations

## Best Practices

1. **Keep graphs focused** - Use filters for large workspaces
2. **Use AI suggestions** - Let AI find hidden connections
3. **Organize visually** - Drag nodes to create meaningful layouts
4. **Save custom layouts** - (Future feature)
5. **Export graphs** - (Future feature)

## Troubleshooting

### Graph not loading
- Check workspace is selected
- Verify backend API is running
- Check browser console for errors

### Nodes overlapping
- Click "Fit View" button
- Adjust zoom level
- Use filters to reduce node count

### Performance issues
- Filter by node type
- Use search to focus on specific nodes
- Reduce number of visible nodes

## Future Enhancements

- [ ] Save custom node positions
- [ ] Export graph as image
- [ ] Collaborative editing
- [ ] Custom edge types
- [ ] Node grouping/clustering
- [ ] Timeline view
- [ ] 3D graph view
- [ ] Graph analytics dashboard

## Technical Details

### Libraries Used

- **React Flow** - Graph visualization and interaction
- **Dagre** - Graph layout algorithm
- **Framer Motion** - Smooth animations
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

### Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile: ⚠️ Limited (touch gestures work)

## API Integration

### Endpoints Used

- `GET /api/graph/nodes?workspace_id={id}` - Fetch all nodes
- `GET /api/graph/edges?workspace_id={id}` - Fetch all edges
- `POST /api/graph/infer-edges` - Get AI suggestions
- `POST /api/graph/edges` - Create new edge
- `DELETE /api/graph/edges/{id}` - Delete edge

## Summary

The workspace-centric knowledge graph provides a beautiful, interactive way to visualize and explore your knowledge base. With React Flow's powerful features and our custom node designs, you get:

- ✅ Professional appearance
- ✅ Smooth interactions
- ✅ Infinite canvas
- ✅ Perfect connections
- ✅ Easy customization
- ✅ Great performance

Everything connects to your workspace at the center, making it easy to see relationships and navigate your knowledge!
