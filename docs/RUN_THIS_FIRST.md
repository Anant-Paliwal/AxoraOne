# 🚀 Knowledge Graph Setup - Run This First!

## Problem
The Knowledge Graph shows nodes but no connections because the `graph_edges` table is empty.

## Solution
Run the SQL migration to populate existing connections and set up automatic syncing.

## Steps

### 1. Open Supabase Dashboard
Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/editor

### 2. Run the Migration
Copy and paste the entire contents of `populate-graph-edges.sql` into the SQL Editor and click "Run"

### 3. Verify
After running, you should see output showing:
- Total edges created
- Evidence edges (from skills)
- Linked edges (from tasks)

### 4. Refresh Knowledge Graph
Go back to your app and refresh the Knowledge Graph page. You should now see:
- ✅ All nodes (pages, skills, tasks)
- ✅ Orange lines for skill evidence connections
- ✅ Purple lines for task links
- ✅ Workspace filtering working

## What This Does

1. **Updates Constraints**: Allows 'evidence' and 'linked' edge types
2. **Populates Existing Data**: Creates edges from:
   - Skills with evidence → Creates evidence edges
   - Tasks with linked_page_id → Creates linked edges
   - Tasks with linked_skill_id → Creates linked edges
3. **Sets Up Triggers**: Automatically creates edges when:
   - You add evidence to a skill
   - You link a task to a page/skill
4. **Adds RLS Policies**: Ensures users only see their own connections
5. **Creates Indexes**: Improves query performance

## After Running

### Test It:
1. Go to Skills page
2. Add a page as evidence to a skill
3. Go to Knowledge Graph
4. You should see an orange connection line!

### AI Suggestions:
Click "AI Suggest Links" button to get AI-powered connection suggestions.

## Troubleshooting

### Still no connections?
1. Check if you have skills with evidence:
   ```sql
   SELECT id, name, evidence FROM skills WHERE evidence IS NOT NULL;
   ```

2. Check if edges were created:
   ```sql
   SELECT * FROM graph_edges LIMIT 10;
   ```

3. Check workspace_id matches:
   ```sql
   SELECT workspace_id, COUNT(*) FROM graph_edges GROUP BY workspace_id;
   ```

### Backend not updating?
Restart your backend server:
```bash
cd backend
python main.py
```

## Next Steps

After the migration runs successfully:
1. ✅ Knowledge Graph will show all connections
2. ✅ New evidence/links will automatically create edges
3. ✅ Workspace filtering will work
4. ✅ AI suggestions will work

The Knowledge Graph is now fully functional! 🎉
