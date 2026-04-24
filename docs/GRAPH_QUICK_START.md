# 🚀 Knowledge Graph — Quick Start Guide

## ✅ What's Ready

Your EnhancedGraphPage.tsx now has **all next-level features** integrated and working!

## 🎯 Try It Now (3 Steps)

### Step 1: View the Enhanced Graph
```bash
# Start your app (if not running)
npm run dev

# Navigate to
http://localhost:5173/graph
```

**You'll see:**
- ✅ Concept nodes (if any exist)
- ✅ Hover previews on nodes
- ✅ Focus Mode button
- ✅ AI Insights panel
- ✅ Connection count badges
- ✅ 6 node type filters

### Step 2: Test Hover Previews
1. Hover over any node (don't click)
2. Preview appears instantly
3. Shows: title, type, connections, preview text
4. Move mouse away → preview disappears

### Step 3: Try Focus Mode
1. Click any node to select it
2. Click "Focus Mode" button (bottom toolbar)
3. Unrelated nodes fade to 20% opacity
4. Only selected + connected nodes stay bright
5. Click "Focus Mode" again to disable

## 🔧 Enable Full Features (Database Setup)

To get **concept extraction** and **AI insights** working:

### Option 1: Supabase SQL Editor (Recommended)
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Create new query
4. Paste contents of: `backend/migrations/add_concept_nodes_and_typed_edges.sql`
5. Click "Run"
6. Wait for success message

### Option 2: Command Line
```bash
# If you have psql installed
psql -U postgres -h your-supabase-host -d postgres -f backend/migrations/add_concept_nodes_and_typed_edges.sql
```

## 🎨 What Each Feature Does

### 🟠 Concept Nodes
**What:** Auto-extracted terms from your pages
**How:** Create a page with capitalized terms like "Machine Learning", "Neural Networks"
**Result:** Concepts appear as orange nodes in graph

### 👁️ Hover Previews
**What:** Instant node information without clicking
**How:** Just hover your mouse over any node
**Result:** Popup shows title, type, connections, preview

### 🎯 Focus Mode
**What:** Fade unrelated nodes for clarity
**How:** Select a node → Click "Focus Mode" button
**Result:** Only selected + connected nodes stay visible

### 🧠 AI Insights
**What:** Smart recommendations and gap detection
**How:** Click "Insights" tab in right panel
**Result:** See skill gaps, recommendations, stats

### 🔢 Connection Badges
**What:** Shows how many connections each node has
**How:** Automatic - appears on nodes with connections
**Result:** Small badge with number (e.g., "5")

### 🎨 Node Filters
**What:** Show only specific node types
**How:** Click emoji buttons at top (🟣🔵🟠🟡🟢🔴)
**Result:** Graph shows only selected type

## 🎮 Interactive Demo

### Demo 1: Explore Connections
```
1. Click any skill node (purple)
2. See connected pages/tasks light up
3. Hover over connected nodes for details
4. Click "Focus Mode" for clarity
5. Click connected node to explore further
```

### Demo 2: Accept AI Suggestions
```
1. Click "Suggestions" tab (right panel)
2. See AI-suggested connections
3. Check confidence score (e.g., 85%)
4. Click "Accept" on a suggestion
5. Graph updates with new connection
```

### Demo 3: Find Skill Gaps
```
1. Click "Insights" tab (right panel)
2. Scroll to "Skill Gaps" section
3. See skills with weak evidence
4. Click recommendation to take action
5. Add evidence pages to strengthen skill
```

## 🎯 Common Use Cases

### Use Case 1: "What should I learn next?"
```
1. Open graph
2. Click "Insights" tab
3. Look at "AI Recommendations"
4. Click recommendation
5. Follow suggested action
```

### Use Case 2: "How is this skill connected?"
```
1. Find skill node (purple)
2. Click to select
3. Enable "Focus Mode"
4. See all connected pages/tasks
5. Hover for details
```

### Use Case 3: "What concepts do I use most?"
```
1. Click "Concept" filter (🟠)
2. See only concept nodes
3. Larger nodes = more usage
4. Hover to see usage count
5. Click to see which pages mention it
```

## 🐛 Troubleshooting

### Issue: No concept nodes appearing
**Solution:** 
1. Concepts need to be extracted first
2. Run database migration (see above)
3. Create/update a page with capitalized terms
4. Refresh graph

### Issue: Hover preview not showing
**Solution:**
1. Make sure you're hovering (not clicking)
2. Don't have a node selected
3. Check browser console for errors
4. Try refreshing page

### Issue: Insights panel empty
**Solution:**
1. Need at least 3-5 pages/skills
2. Run database migration for insights function
3. Click refresh button in panel
4. Check backend is running

### Issue: Focus mode not working
**Solution:**
1. Select a node first (click it)
2. Then click "Focus Mode" button
3. Should fade unrelated nodes
4. Click again to disable

## 📊 What to Expect

### With 0-5 Nodes
- Basic graph layout
- Limited insights
- Few connections
- **Action:** Add more content

### With 5-20 Nodes
- Interesting patterns emerge
- AI suggestions appear
- Some skill gaps detected
- **Action:** Accept suggestions

### With 20+ Nodes
- Rich knowledge graph
- Many AI insights
- Clear learning paths
- Central nodes visible
- **Action:** Use daily for planning

## 🎓 Pro Tips

### Tip 1: Use Focus Mode for Exploration
When exploring a new topic, select the main skill and enable Focus Mode. This helps you see only relevant connections without distraction.

### Tip 2: Accept High-Confidence Suggestions
AI suggestions with 80%+ confidence are usually accurate. Accept them to build a richer graph quickly.

### Tip 3: Check Insights Daily
The insights panel updates as you add content. Check it daily to see what needs attention.

### Tip 4: Hover Before Clicking
Get into the habit of hovering first. You'll often find the info you need without navigating away.

### Tip 5: Use Filters for Focus
When working on a specific area, use filters to show only relevant node types (e.g., only Pages when writing).

## 🚀 Next Level Usage

### Advanced: Keyboard Shortcuts (Coming Soon)
```
Ctrl+F     → Toggle Focus Mode
Escape     → Clear selection
Ctrl+I     → Toggle Insights
Ctrl+S     → Search nodes
```

### Advanced: Context Menu (Coming Soon)
```
Right-click node → Quick actions
- Open
- View Backlinks
- Extract Concepts
- Create Task
- Delete
```

### Advanced: Learning Paths (Coming Soon)
```
Select start node
Select end node
Click "Find Path"
See learning progression
```

## ✅ Success Checklist

After 1 week of use, you should have:
- [ ] 10+ pages created
- [ ] 5+ skills defined
- [ ] Concepts auto-extracted
- [ ] AI suggestions accepted
- [ ] Skill gaps addressed
- [ ] Focus mode used regularly
- [ ] Insights checked daily

## 🎉 You're Ready!

Your knowledge graph is now a **powerful thinking tool**.

**Start using it:**
1. Open `/graph`
2. Hover over nodes
3. Try Focus Mode
4. Check Insights
5. Accept suggestions
6. Build your knowledge base

**Remember:** The more you use it, the smarter it gets!

---

**Questions?** Check:
- `ENHANCED_GRAPH_INTEGRATION_COMPLETE.md` — What was implemented
- `KNOWLEDGE_GRAPH_NEXT_LEVEL.md` — Full documentation
- `GRAPH_API_QUICK_REFERENCE.md` — API reference
