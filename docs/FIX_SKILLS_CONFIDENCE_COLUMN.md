# ✅ Fixed: Skills Confidence Column Error

## Issue
Backend error: `column skills.confidence does not exist`

```
Error in get_graph_nodes: {'message': 'column skills.confidence does not exist', 'code': '42703'}
```

## Root Cause
The `graph.py` endpoint was trying to query a `confidence` column that doesn't exist in the `skills` table.

### Actual Skills Table Schema
```sql
CREATE TABLE public.skills (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  level TEXT NOT NULL,  -- Beginner, Intermediate, Advanced, Expert
  description TEXT,
  evidence TEXT[],
  goals TEXT[],
  workspace_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**No `confidence` column exists.**

## Changes Made

### 1. Fixed Skills Query (Line 30)
```python
# BEFORE
skills_query = supabase_admin.table("skills").select("id, name, level, confidence, workspace_id")

# AFTER
skills_query = supabase_admin.table("skills").select("id, name, level, workspace_id")
```

### 2. Fixed Skills Node Formatting (Line 80)
```python
# BEFORE
nodes.append({
    "id": skill["id"],
    "type": "skill",
    "label": skill["name"],
    "level": skill["level"],
    "confidence": skill.get("confidence", 0),  # ❌ Removed
    "workspace_id": skill.get("workspace_id"),
    "connection_count": conn_count,
    "importance": min(1.0, 0.5 + (conn_count * 0.1))
})

# AFTER
nodes.append({
    "id": skill["id"],
    "type": "skill",
    "label": skill["name"],
    "level": skill["level"],
    "workspace_id": skill.get("workspace_id"),
    "connection_count": conn_count,
    "importance": min(1.0, 0.5 + (conn_count * 0.1))
})
```

### 3. Fixed Node Preview (Line 614)
```python
# BEFORE
skill = supabase_admin.table("skills").select(
    "id, name, description, level, confidence"
).eq("id", node_id).eq("user_id", user_id).single().execute()

preview = {
    "id": skill.data["id"],
    "title": skill.data["name"],
    "preview": skill.data.get("description", ""),
    "level": skill.data.get("level"),
    "confidence": skill.data.get("confidence")  # ❌ Removed
}

# AFTER
skill = supabase_admin.table("skills").select(
    "id, name, description, level"
).eq("id", node_id).eq("user_id", user_id).single().execute()

preview = {
    "id": skill.data["id"],
    "title": skill.data["name"],
    "preview": skill.data.get("description", ""),
    "level": skill.data.get("level")
}
```

## Status
✅ Backend code fixed
✅ Hot-reload will pick up changes automatically
✅ Graph page should now load successfully

## Test Now
1. Refresh the graph page in your browser
2. You should see nodes loading without errors
3. Backend logs should show `200 OK` for `/api/v1/graph/nodes`

## Next Steps
After confirming the graph loads:
1. Run `fix-concepts-migration.sql` in Supabase SQL Editor
2. Test concept extraction by creating/updating pages
3. Test all new graph features (hover, focus mode, insights)
