# Ask Anything - Task Sources Quick Guide

## What's New?

Ask Anything can now access your tasks AND their linked content (pages and skills), giving you smarter, more contextual answers.

## How to Use

### 1. Enable Task Sources

Task sources are **enabled by default**. You'll see "Tasks" in the sources dropdown.

**In FloatingAskAnything (bottom-right):**
- Click the sources button (shows number of enabled sources)
- "Tasks" checkbox should be checked ✓

**In AskAnything page:**
- Same sources dropdown in the top controls
- "Tasks" enabled by default

### 2. Ask About Tasks

**Simple queries:**
```
"What tasks do I have for SQL?"
"Show me my Python tasks"
"What should I work on next?"
```

**With context:**
```
"Help me with my React tasks"
→ AI reads linked React pages and skill level

"What do I need to learn for this task?"
→ AI checks linked skill requirements

"Explain the content for my SQL task"
→ AI reads the linked SQL tutorial page
```

### 3. Mention Tasks with @

**Direct mention:**
```
"@Complete SQL Tutorial - what should I focus on?"
→ AI reads the task + linked SQL page + Database skill
```

**Multiple mentions:**
```
"Compare @Task1 and @Task2"
→ AI compares both tasks and their linked content
```

### 4. Understanding Sources Display

**In responses, you'll see sources like:**

```
┌─────────────────────────────────────┐
│ 📋 Complete SQL Tutorial            │  ← The task itself
│    task                              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 📄 SQL Basics Guide                 │  ← Linked page (highlighted)
│    page → from task                  │     Shows it came from the task
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🧠 Database Management              │  ← Linked skill (highlighted)
│    skill → from task                 │     Shows it came from the task
└─────────────────────────────────────┘
```

**Visual indicators:**
- 📋 = Task
- 📄 = Page
- 🧠 = Skill
- Highlighted background = Linked from a task
- "→ from task" = This source came from a task's links

### 5. Click Sources to Navigate

**Click any source to navigate:**
- Click task → Go to Tasks page
- Click linked page → Go directly to that page
- Click linked skill → Go to Skills page

## Use Cases

### Learning & Study

**"What should I study for my upcoming tasks?"**
- AI checks all pending tasks
- Reads linked learning pages
- Suggests study order based on skills

**"Help me understand @Learn React Hooks"**
- AI reads the React Hooks page linked to the task
- Explains concepts from the page
- Relates to your React skill level

### Task Planning

**"What tasks are related to Data Analytics?"**
- Finds tasks linked to Data Analytics skill
- Shows related pages and content
- Helps you plan learning path

**"Which tasks will improve my Python skills?"**
- Finds tasks linked to Python skill
- Shows what you'll learn from each
- Prioritizes based on skill gaps

### Content Discovery

**"What content do I have for my SQL tasks?"**
- Lists all tasks about SQL
- Shows linked tutorial pages
- Displays related skills

**"Show me everything about @Project Setup"**
- Task details
- Linked documentation page
- Related skills and requirements

## Tips & Tricks

### 1. Link Tasks to Pages
When creating tasks, link them to relevant pages:
- Tutorial pages
- Documentation
- Study notes
- Project specs

**Why?** Ask Anything can read the full content when discussing the task.

### 2. Link Tasks to Skills
Connect tasks to the skills they develop:
- "Complete Python Course" → Python skill
- "Build React App" → React skill
- "SQL Practice" → Database Management skill

**Why?** AI understands skill progression and can suggest next steps.

### 3. Use Descriptive Task Titles
Good: "Complete SQL Joins Tutorial - Chapter 3"
Better than: "SQL stuff"

**Why?** Better keyword matching for relevant results.

### 4. Combine Sources
Enable multiple sources for best results:
- ✓ Tasks (for action items)
- ✓ Pages (for content)
- ✓ Skills (for tracking)
- ✓ Graph (for connections)

### 5. Ask Follow-up Questions
```
You: "What tasks do I have for React?"
AI: [Shows 3 React tasks with linked pages]

You: "Tell me more about the first one"
AI: [Reads the linked React page and explains]

You: "What should I learn first?"
AI: [Checks skill levels and suggests order]
```

## Examples

### Example 1: Study Planning
```
You: "I want to learn SQL. What tasks should I do?"

AI Response:
"You have 3 SQL-related tasks:

1. Complete SQL Basics Tutorial (pending)
   - Linked to: SQL Fundamentals page
   - Skill: Database Management (Beginner)
   
2. Practice SQL Joins (pending)
   - Linked to: Advanced SQL page
   - Skill: Database Management (Intermediate)
   
3. Build Database Project (not started)
   - Linked to: Project Requirements page
   - Skill: Database Management (Advanced)

I recommend starting with task 1, as it covers the fundamentals..."

Sources: [3 tasks, 3 pages, 1 skill]
```

### Example 2: Task Help
```
You: "@Complete React Hooks Tutorial - I'm stuck on useEffect"

AI Response:
"Looking at your React Hooks Tutorial task and the linked React Hooks Guide page...

useEffect is used for side effects. Based on the tutorial content:
[Explains useEffect from the linked page]

Your task is at 60% complete. The next section covers..."

Sources: [Task, React Hooks Guide page, React skill]
```

### Example 3: Progress Check
```
You: "How am I doing with my Python learning?"

AI Response:
"Based on your Python tasks and linked content:

Completed:
- ✓ Python Basics (linked to Python 101 page)
- ✓ Functions & Modules (linked to Python Intermediate page)

In Progress:
- 📋 Object-Oriented Programming (50% complete)
  Linked to: OOP in Python page
  
Your Python skill is at Intermediate level. Great progress!..."

Sources: [5 tasks, 3 pages, 1 skill]
```

## Troubleshooting

### "No tasks found"
- Check that tasks exist in your workspace
- Try broader keywords
- Enable "Tasks" in sources dropdown

### "Task has no linked content"
- Task exists but isn't linked to pages/skills
- AI will still show the task, just without extra context
- Consider linking tasks to relevant pages

### "Sources not showing"
- Check that "Tasks" source is enabled
- Verify you're in the correct workspace
- Try refreshing the page

## Best Practices

1. **Link tasks to learning materials** - Pages with tutorials, guides, notes
2. **Link tasks to skills** - Track what each task develops
3. **Use descriptive titles** - Better search and relevance
4. **Keep content updated** - Update linked pages as you learn
5. **Review sources** - Click sources to verify AI's context

## Summary

Task sources make Ask Anything smarter by connecting:
- **Tasks** (what to do)
- **Pages** (how to do it)
- **Skills** (why you're doing it)

This creates a knowledge-connected workspace where AI understands not just your tasks, but the full learning context behind them.

**Result:** Better answers, smarter suggestions, and a more helpful AI assistant! 🎉
