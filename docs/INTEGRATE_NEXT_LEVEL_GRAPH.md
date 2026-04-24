# 🚀 Quick Integration Guide — Next Level Knowledge Graph

## Step 1: Run Database Migration

```bash
# Connect to your Supabase database
psql -U postgres -h your-supabase-host -d postgres

# Or use Supabase SQL Editor and paste the contents of:
backend/migrations/add_concept_nodes_and_typed_edges.sql
```

## Step 2: Update EnhancedGraphPage.tsx

Add the new components to your existing graph page:

```typescript
// Add imports
import { ConceptNode } from '@/components/graph/ConceptNode';
import { NodeHoverPreview } from '@/components/graph/NodeHoverPreview';
import { GraphInsightsPanel } from '@/components/graph/GraphInsightsPanel';

// Add to nodeTypes
const nodeTypes = {
  page: PageNode,
  skill: SkillNode,
  task: TaskNode,
  quiz: QuizNode,
  concept: ConceptNode, // NEW
  workspace: WorkspaceNode
};

// Add hover state
const [hoveredNode, setHoveredNode] = useState<{id: string, type: string} | null>(null);
const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

// Add hover handlers to nodes
<div 
  onMouseEnter={(e) => {
    setHoveredNode({ id: node.id, type: node.type });
    setMousePosition({ x: e.clientX + 20, y: e.clientY });
  }}
  onMouseLeave={() => setHoveredNode(null)}
>
  {/* Node content */}
</div>

// Add preview component
{hoveredNode && (
  <NodeHoverPreview
    nodeId={hoveredNode.id}
    nodeType={hoveredNode.type}
    position={mousePosition}
    onClose={() => setHoveredNode(null)}
  />
)}

// Replace right panel content with insights
<GraphInsightsPanel 
  workspaceId={currentWorkspace?.id}
  onNodeFocus={(nodeId) => setSelectedNode(nodeId)}
/>
```

## Step 3: Add Concept Node Styling

The ConceptNode component is already styled, but you can customize colors:

```typescript
// In ConceptNode.tsx, change colors:
from-amber-500/20 to-orange-600/20  // Background gradient
border-amber-500                     // Border color
bg-amber-500/30                      // Icon background
text-amber-600                       // Icon color
```

## Step 4: Test the Features

### Test Concept Extraction
```typescript
// Create or update a page with capitalized terms
const page = await api.createPage({
  title: "Machine Learning Basics",
  content: "Machine Learning uses Neural Networks and Deep Learning...",
  workspace_id: workspaceId
});

// Concepts "Machine Learning", "Neural Networks", "Deep Learning" 
// should be auto-extracted
```

### Test Insights
```typescript
const insights = await api.getGraphInsights(workspaceId);
console.log(insights);
// Should show skill_gaps, central_nodes, recommendations
```

### Test Backlinks
```typescript
const backlinks = await api.getBacklinks(pageId, workspaceId);
console.log(backlinks);
// Shows all nodes linking to this page
```

### Test Learning Path
```typescript
const path = await api.findLearningPath(skillId, pageId, workspaceId);
console.log(path);
// Shows path from skill to page
```

## Step 5: Add to Navigation (Optional)

Update your graph page route to support new features:

```typescript
// In App.tsx or routes
<Route path="/graph" element={<EnhancedGraphPage />} />

// Support query params for focus mode
<Route path="/graph?focus=:nodeId" element={<EnhancedGraphPage />} />
<Route path="/graph?mode=mindmap&skill=:skillId" element={<EnhancedGraphPage />} />
```

## Step 6: Add Keyboard Shortcuts (Optional)

```typescript
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'f' && e.ctrlKey) {
      // Toggle focus mode
      setFocusMode(!focusMode);
    }
    if (e.key === 'i' && e.ctrlKey) {
      // Toggle insights panel
      setShowInsights(!showInsights);
    }
    if (e.key === 'Escape') {
      // Clear selection
      setSelectedNode(null);
    }
  };
  
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [focusMode, showInsights]);
```

## Step 7: Add Context Menu (Optional)

Right-click on nodes for quick actions:

```typescript
const [contextMenu, setContextMenu] = useState<{x: number, y: number, node: any} | null>(null);

<div
  onContextMenu={(e) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }}
>
  {/* Node */}
</div>

{contextMenu && (
  <div 
    className="fixed z-50 bg-card border rounded-lg shadow-lg p-2"
    style={{ left: contextMenu.x, top: contextMenu.y }}
  >
    <button onClick={() => handleOpenNode(contextMenu.node)}>Open</button>
    <button onClick={() => handleViewBacklinks(contextMenu.node)}>View Backlinks</button>
    <button onClick={() => handleExtractConcepts(contextMenu.node)}>Extract Concepts</button>
    <button onClick={() => handleDelete(contextMenu.node)}>Delete</button>
  </div>
)}
```

## Step 8: Performance Optimization

For large graphs (100+ nodes):

```typescript
// 1. Virtualize nodes (only render visible)
import { useVirtualizer } from '@tanstack/react-virtual';

// 2. Debounce search
import { useDebouncedValue } from '@/hooks/useDebounce';
const debouncedSearch = useDebouncedValue(searchQuery, 300);

// 3. Lazy load insights
const { data: insights } = useQuery({
  queryKey: ['graph-insights', workspaceId],
  queryFn: () => api.getGraphInsights(workspaceId),
  staleTime: 5 * 60 * 1000 // 5 minutes
});

// 4. Memoize expensive calculations
const filteredNodes = useMemo(() => 
  nodes.filter(node => /* filter logic */),
  [nodes, filterType, searchQuery]
);
```

## Step 9: Add Loading States

```typescript
{loading ? (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">Loading knowledge graph...</p>
    </div>
  </div>
) : (
  <GraphContent />
)}
```

## Step 10: Error Handling

```typescript
try {
  const insights = await api.getGraphInsights(workspaceId);
  setInsights(insights);
} catch (error) {
  toast.error('Failed to load insights', {
    description: 'Please try again or contact support'
  });
  console.error('Insights error:', error);
}
```

## 🎯 Quick Wins

### 1. Add Concept Badge to Pages
```typescript
// In PageViewer or PageEditor
const concepts = await api.getBacklinks(pageId, workspaceId);
const conceptCount = concepts.backlinks.filter(b => b.node_type === 'concept').length;

<Badge variant="secondary">
  <Lightbulb className="w-3 h-3 mr-1" />
  {conceptCount} concepts
</Badge>
```

### 2. Add "View in Graph" Button
```typescript
<Button 
  variant="outline" 
  onClick={() => navigate(`/graph?focus=${pageId}`)}
>
  <Network className="w-4 h-4 mr-2" />
  View in Graph
</Button>
```

### 3. Add Insights Widget to Dashboard
```typescript
// In HomePage.tsx
<Card>
  <CardHeader>
    <CardTitle>Knowledge Graph Insights</CardTitle>
  </CardHeader>
  <CardContent>
    <GraphInsightsPanel workspaceId={currentWorkspace?.id} />
  </CardContent>
</Card>
```

## 🐛 Common Issues

### Issue: Concepts not appearing
**Solution:** Check if trigger is enabled and page has content with capitalized terms.

### Issue: Insights panel empty
**Solution:** Ensure you have at least 3-5 pages/skills with some connections.

### Issue: Hover preview not showing
**Solution:** Check z-index and ensure preview component is rendered outside scrollable container.

### Issue: Performance slow with many nodes
**Solution:** Implement virtualization or pagination for large graphs.

## ✅ Verification Checklist

- [ ] Database migration applied successfully
- [ ] Concept nodes appear in graph
- [ ] Hover preview shows on node hover
- [ ] Insights panel displays recommendations
- [ ] Backlinks work for all node types
- [ ] Learning path finder returns results
- [ ] Node colors match types correctly
- [ ] Filters work (type, status, search)
- [ ] No console errors
- [ ] Performance acceptable (<2s load time)

## 🎉 You're Done!

Your knowledge graph is now a next-level thinking and planning engine!

**Test it:**
1. Create a few pages with related content
2. Add some skills
3. Create tasks linked to pages
4. Watch concepts auto-extract
5. View AI insights and recommendations
6. Hover over nodes for previews
7. Click recommendations to take action

**Next:** Share with your team and gather feedback!
