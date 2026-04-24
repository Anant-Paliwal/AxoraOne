# 🚀 Knowledge Graph API — Quick Reference

## 📡 Backend Endpoints

### Nodes
```typescript
GET /api/v1/graph/nodes?workspace_id={id}
// Returns: { nodes: Array<Node> }
// Node types: page, skill, task, quiz, concept
// Includes: importance, connection_count, metadata
```

### Edges
```typescript
GET /api/v1/graph/edges?workspace_id={id}
// Returns: { edges: Array<Edge> }
// Edge types: explicit, inferred, evidence, linked, learns, explains, 
//             depends_on, prerequisite, mentions, part_of, blocks, related

POST /api/v1/graph/edges
// Body: { source_id, source_type, target_id, target_type, edge_type, workspace_id }
// Returns: Created edge

DELETE /api/v1/graph/edges/{edge_id}
// Returns: { message: "Edge deleted successfully" }

PUT /api/v1/graph/edges/{edge_id}/type
// Body: { edge_type: string }
// Returns: Updated edge
```

### Intelligence
```typescript
GET /api/v1/graph/insights?workspace_id={id}
// Returns: {
//   skill_gaps: Array<SkillGap>,
//   central_nodes: Array<CentralNode>,
//   isolated_nodes: Array<IsolatedNode>,
//   recommendations: Array<Recommendation>,
//   total_nodes: number,
//   total_edges: number
// }

GET /api/v1/graph/path?start_id={id}&end_id={id}&workspace_id={id}
// Returns: { path: Array<PathNode> }
// Finds shortest learning path between two nodes

GET /api/v1/graph/backlinks/{node_id}?workspace_id={id}
// Returns: { backlinks: Array<Backlink>, count: number }
// All nodes that link TO this node
```

### Concepts
```typescript
POST /api/v1/graph/concepts/extract
// Body: { page_id: string, workspace_id?: string }
// Returns: { concepts: Array<Concept>, message: string }
// Manually trigger concept extraction

GET /api/v1/graph/node/{node_id}/preview?node_type={type}
// Returns: {
//   id, title, preview, icon, tags, 
//   connection_count, status, level, etc.
// }
// For hover previews
```

### Suggestions
```typescript
POST /api/v1/graph/infer-edges?workspace_id={id}&node_id={id}
// Returns: { suggestions: Array<Suggestion> }
// AI-suggested connections with confidence scores

POST /api/v1/graph/edges/accept-suggestion
// Body: { source_id, source_type, target_id, target_type, workspace_id }
// Returns: Created inferred edge
```

---

## 💻 Frontend API Client

### Import
```typescript
import { api } from '@/lib/api';
```

### Usage Examples

#### Get Graph Data
```typescript
// Load nodes and edges
const { nodes } = await api.getGraphNodes(workspaceId);
const { edges } = await api.getGraphEdges(workspaceId);
```

#### Get Insights
```typescript
const insights = await api.getGraphInsights(workspaceId);

// Access data
insights.skill_gaps.forEach(gap => {
  console.log(`${gap.skill_name}: ${gap.gap_type}`);
});

insights.recommendations.forEach(rec => {
  console.log(`${rec.title} - ${rec.action.route}`);
});
```

#### Find Learning Path
```typescript
const { path } = await api.findLearningPath(
  startNodeId, 
  endNodeId, 
  workspaceId
);

// path is array of nodes showing progression
path.forEach(node => {
  console.log(`${node.node_type}: ${node.depth} steps`);
});
```

#### Get Backlinks
```typescript
const { backlinks, count } = await api.getBacklinks(
  nodeId, 
  workspaceId
);

// Show who links to this node
backlinks.forEach(link => {
  console.log(`${link.node_type}: ${link.label} (${link.edge_type})`);
});
```

#### Extract Concepts
```typescript
const { concepts } = await api.extractConcepts(
  pageId, 
  workspaceId
);

// Newly extracted concepts
concepts.forEach(concept => {
  console.log(`${concept.name}: used ${concept.usage_count}x`);
});
```

#### Get Node Preview
```typescript
const preview = await api.getNodePreview(nodeId, nodeType);

// Use for hover tooltips
console.log(preview.title);
console.log(preview.preview); // First 200 chars
console.log(preview.connection_count);
```

#### Create Edge
```typescript
await api.createEdge({
  source_id: pageId,
  source_type: 'page',
  target_id: skillId,
  target_type: 'skill',
  edge_type: 'explains',
  workspace_id: workspaceId
});
```

#### Accept AI Suggestion
```typescript
await api.acceptSuggestion({
  source_id: suggestion.source_id,
  source_type: suggestion.source_type,
  target_id: suggestion.target_id,
  target_type: suggestion.target_type,
  workspace_id: workspaceId
});
```

---

## 🗄️ Database Functions

### calculate_graph_insights
```sql
SELECT calculate_graph_insights(
  'user-uuid'::uuid,
  'workspace-uuid'::uuid
);

-- Returns JSONB with insights
```

### find_learning_path
```sql
SELECT find_learning_path(
  'user-uuid'::uuid,
  'start-node-uuid'::uuid,
  'end-node-uuid'::uuid,
  'workspace-uuid'::uuid
);

-- Returns JSONB array of path nodes
```

### extract_concepts_from_page
```sql
-- Trigger function (auto-runs on page insert/update)
-- Extracts capitalized terms as concepts
-- Creates concept nodes and edges
```

---

## 📊 Data Structures

### Node
```typescript
interface GraphNode {
  id: string;
  type: 'page' | 'skill' | 'task' | 'quiz' | 'concept';
  label: string;
  icon?: string;
  tags?: string[];
  level?: string;
  status?: string;
  confidence?: number;
  workspace_id?: string;
  connection_count: number;
  importance: number; // 0-1
  usage_count?: number; // For concepts
}
```

### Edge
```typescript
interface GraphEdge {
  id: string;
  source_id: string;
  source_type: string;
  target_id: string;
  target_type: string;
  edge_type: 
    | 'explicit' | 'inferred' | 'evidence' | 'linked'
    | 'learns' | 'explains' | 'depends_on' | 'prerequisite'
    | 'mentions' | 'part_of' | 'blocks' | 'related';
  strength?: number; // 0-1
  bidirectional?: boolean;
  metadata?: Record<string, any>;
  workspace_id?: string;
  created_at: string;
}
```

### Insight
```typescript
interface GraphInsights {
  skill_gaps: Array<{
    skill_id: string;
    skill_name: string;
    level: string;
    connection_count: number;
    gap_type: 'no_evidence' | 'weak_evidence' | 'needs_practice';
  }>;
  central_nodes: Array<{
    node_id: string;
    node_type: string;
    connection_count: number;
  }>;
  isolated_nodes: Array<{
    node_id: string;
    node_type: string;
    label: string;
  }>;
  recommendations: Array<{
    type: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    action: {
      label: string;
      route: string;
    };
  }>;
  total_nodes: number;
  total_edges: number;
}
```

### Suggestion
```typescript
interface Suggestion {
  source_id: string;
  source_type: string;
  source_label: string;
  target_id: string;
  target_type: string;
  target_label: string;
  confidence: number; // 0-1
  reason: string;
}
```

### Backlink
```typescript
interface Backlink {
  edge_id: string;
  node_id: string;
  node_type: string;
  label: string;
  icon?: string;
  edge_type: string;
  strength: number;
  created_at: string;
}
```

---

## 🎨 React Components

### ConceptNode
```typescript
import { ConceptNode } from '@/components/graph/ConceptNode';

// Use in ReactFlow nodeTypes
const nodeTypes = {
  concept: ConceptNode,
  // ... other types
};
```

### NodeHoverPreview
```typescript
import { NodeHoverPreview } from '@/components/graph/NodeHoverPreview';

{hoveredNode && (
  <NodeHoverPreview
    nodeId={hoveredNode.id}
    nodeType={hoveredNode.type}
    position={{ x: mouseX, y: mouseY }}
    onClose={() => setHoveredNode(null)}
  />
)}
```

### GraphInsightsPanel
```typescript
import { GraphInsightsPanel } from '@/components/graph/GraphInsightsPanel';

<GraphInsightsPanel 
  workspaceId={currentWorkspace?.id}
  onNodeFocus={(nodeId) => setSelectedNode(nodeId)}
/>
```

---

## 🔧 Common Patterns

### Load Full Graph
```typescript
const loadGraph = async () => {
  const [nodesData, edgesData, insights] = await Promise.all([
    api.getGraphNodes(workspaceId),
    api.getGraphEdges(workspaceId),
    api.getGraphInsights(workspaceId)
  ]);
  
  setNodes(nodesData.nodes);
  setEdges(edgesData.edges);
  setInsights(insights);
};
```

### Filter by Type
```typescript
const filteredNodes = nodes.filter(node => 
  filterType ? node.type === filterType : true
);

const filteredEdges = edges.filter(edge =>
  filteredNodes.some(n => n.id === edge.source_id) &&
  filteredNodes.some(n => n.id === edge.target_id)
);
```

### Search Nodes
```typescript
const searchResults = nodes.filter(node =>
  node.label.toLowerCase().includes(searchQuery.toLowerCase())
);
```

### Get Connected Nodes
```typescript
const connectedEdges = edges.filter(e => 
  e.source_id === nodeId || e.target_id === nodeId
);

const connectedNodes = connectedEdges.map(edge => {
  const connectedId = edge.source_id === nodeId 
    ? edge.target_id 
    : edge.source_id;
  return nodes.find(n => n.id === connectedId);
}).filter(Boolean);
```

### Handle Suggestion Accept
```typescript
const handleAcceptSuggestion = async (suggestion: Suggestion) => {
  try {
    await api.acceptSuggestion({
      source_id: suggestion.source_id,
      source_type: suggestion.source_type,
      target_id: suggestion.target_id,
      target_type: suggestion.target_type,
      workspace_id: workspaceId
    });
    
    toast.success('Connection added');
    
    // Remove from suggestions
    setSuggestions(prev => 
      prev.filter(s => s !== suggestion)
    );
    
    // Reload graph
    await loadGraph();
  } catch (error) {
    toast.error('Failed to add connection');
  }
};
```

---

## 🎯 Edge Type Guide

| Edge Type | Meaning | Example |
|-----------|---------|---------|
| `explicit` | User-created | Manual connection |
| `inferred` | AI-suggested | Accepted suggestion |
| `evidence` | Skill proof | Page proves skill |
| `linked` | Task/page link | Task links to page |
| `learns` | Teaching | Page teaches skill |
| `explains` | Explanation | Page explains concept |
| `depends_on` | Dependency | Skill needs another |
| `prerequisite` | Required first | Must learn before |
| `mentions` | Reference | Page mentions concept |
| `part_of` | Component | Subpage of parent |
| `blocks` | Prevents | Skill blocks goal |
| `related` | General | Related content |

---

## 🚨 Error Handling

```typescript
try {
  const insights = await api.getGraphInsights(workspaceId);
  setInsights(insights);
} catch (error) {
  if (error.message.includes('404')) {
    toast.error('Workspace not found');
  } else if (error.message.includes('401')) {
    toast.error('Please log in');
    navigate('/login');
  } else {
    toast.error('Failed to load insights');
    console.error('Graph error:', error);
  }
}
```

---

## ⚡ Performance Tips

1. **Debounce search**: `useDebouncedValue(searchQuery, 300)`
2. **Memoize filters**: `useMemo(() => filterNodes(), [nodes, filter])`
3. **Lazy load insights**: Load on demand, not on mount
4. **Virtualize large graphs**: Use `react-window` for 100+ nodes
5. **Cache API calls**: Use `react-query` with 5min stale time

---

## 📚 Related Files

- `backend/migrations/add_concept_nodes_and_typed_edges.sql`
- `backend/app/api/endpoints/graph.py`
- `src/lib/api.ts`
- `src/components/graph/ConceptNode.tsx`
- `src/components/graph/NodeHoverPreview.tsx`
- `src/components/graph/GraphInsightsPanel.tsx`
- `KNOWLEDGE_GRAPH_NEXT_LEVEL.md`
- `INTEGRATE_NEXT_LEVEL_GRAPH.md`
- `GRAPH_BEFORE_AFTER.md`

---

**Quick Start:** See `INTEGRATE_NEXT_LEVEL_GRAPH.md`
