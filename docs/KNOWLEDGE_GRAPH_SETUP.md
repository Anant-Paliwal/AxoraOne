# Knowledge Graph Setup Complete

## Overview
The Knowledge Graph system visualizes connections between Pages, Skills, and Tasks in your workspace.

## Database Structure

### graph_edges Table
Stores explicit and inferred connections between entities.

**Columns:**
- `id`: UUID primary key
- `user_id`: References auth.users
- `workspace_id`: References workspaces (for workspace isolation)
- `source_id`: UUID of source entity
- `source_type`: 'page', 'skill', or 'task'
- `target_id`: UUID of target entity
- `target_type`: 'page', 'skill', or 'task'
- `edge_type`: 'explicit', 'inferred', 'evidence', or 'linked'
- `created_at`: Timestamp

### Edge Types

1. **explicit**: User-created connections
2. **inferred**: AI-suggested connections
3. **evidence**: Automatic connections when pages are added as skill evidence
4. **linked**: Automatic connections when tasks are linked to pages/skills

## Automatic Edge Creation

### Database Triggers

Two triggers automatically create graph edges:

1. **skill_evidence_graph_trigger**
   - Fires when evidence is added to a skill
   - Creates 'evidence' type edges from skill → pages
   - Automatically updates when evidence array changes

2. **task_link_graph_trigger**
   - Fires when tasks are linked to pages or skills
   - Creates 'linked' type edges from task → page/skill
   - Automatically updates when links change

## Setup Instructions

### 1. Run the Migration

Execute the migration file to set up the knowledge graph:

```bash
# Using Supabase CLI
supabase db push

# Or run the SQL directly in Supabase Dashboard
```

Run this file: `backend/migrations/setup_knowledge_graph.sql`

Or the simpler version: `update-graph-edges.sql`

### 2. Verify Setup

Check that:
- ✅ graph_edges table exists with all columns
- ✅ Edge type constraint includes: explicit, inferred, evidence, linked
- ✅ RLS policies are enabled
- ✅ Triggers are created: skill_evidence_graph_trigger, task_link_graph_trigger
- ✅ Indexes are created for performance

### 3. Test the System

1. **Create a Page** in your workspace
2. **Create a Skill** and add the page as evidence
3. **Go to Knowledge Graph** - you should see:
   - Both nodes (page and skill)
   - An orange connection line (evidence edge)

4. **Create a Task** and link it to the page
5. **Refresh Knowledge Graph** - you should see:
   - Task node
   - Purple connection line (linked edge)

## API Endpoints

### GET /graph/nodes
Fetches all nodes (pages, skills, tasks) filtered by workspace

**Query Parameters:**
- `workspace_id` (optional): Filter by workspace

**Response:**
```json
{
  "nodes": [
    {
      "id": "uuid",
      "type": "page|skill|task",
      "label": "Node title",
      "icon": "📄",
      "tags": [],
      "workspace_id": "uuid"
    }
  ]
}
```

### GET /graph/edges
Fetches all edges including automatic ones (evidence, linked)

**Query Parameters:**
- `workspace_id` (optional): Filter by workspace

**Response:**
```json
{
  "edges": [
    {
      "source_id": "uuid",
      "target_id": "uuid",
      "source_type": "page|skill|task",
      "target_type": "page|skill|task",
      "edge_type": "explicit|inferred|evidence|linked",
      "workspace_id": "uuid"
    }
  ]
}
```

### POST /graph/edges
Create explicit edge between entities

### DELETE /graph/edges/{edge_id}
Delete an explicit edge

### POST /graph/infer-edges
Use AI to suggest potential connections

## Frontend Features

### Workspace Isolation
- Graph only shows content from current workspace
- Automatically reloads when workspace changes

### Visual Indicators
- **Gray solid line**: Explicit connections
- **Orange solid line**: Evidence connections (skill → page)
- **Purple solid line**: Linked connections (task → page/skill)
- **Purple dashed line**: AI inferred connections

### Node Types
- **Purple circle**: Pages
- **Gray circle**: Skills
- **Accent circle**: Tasks

### Interactive Features
- Click nodes to see details
- View all connections in sidebar
- Navigate to entity from graph
- AI suggest new connections

## Troubleshooting

### Edges not appearing?

1. Check if triggers are enabled:
```sql
SELECT * FROM pg_trigger WHERE tgname LIKE '%graph%';
```

2. Verify edge type constraint:
```sql
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'graph_edges_edge_type_check';
```

3. Check RLS policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'graph_edges';
```

### Manual edge creation

If triggers aren't working, edges are still created dynamically by the API when fetching:
- Evidence edges: Read from skills.evidence array
- Linked edges: Read from tasks.linked_page_id and tasks.linked_skill_id

## Performance

Indexes are created for:
- `workspace_id`
- `user_id, workspace_id`
- `source_id, source_type`
- `target_id, target_type`
- `edge_type`

This ensures fast queries even with thousands of nodes and edges.

## Next Steps

1. Run the migration: `update-graph-edges.sql` or `backend/migrations/setup_knowledge_graph.sql`
2. Test by creating pages, skills with evidence, and linked tasks
3. View the Knowledge Graph to see real-time connections
4. Use "AI Suggest Links" to find potential connections

The Knowledge Graph now shows all relationships in your workspace automatically!
