# BUILD Mode CRUD - Quick Guide

## 🚀 What's New

BUILD mode now has **full CRUD capabilities** with **web search always enabled**!

## 📋 Operations

### ✅ CREATE
Create new pages, skills, tasks, quizzes, and flashcards.

**Examples:**
- "Create a page about Python async/await"
- "Add a skill for Machine Learning at Intermediate level"
- "Make a task to complete the React tutorial"
- "Generate a quiz from this page"
- "Create flashcards for SQL commands"

### 📖 READ
View existing content (returns information about items).

**Examples:**
- "Show me the Python page"
- "What's in my Machine Learning skill?"
- "List all my tasks"

### 🔄 UPDATE
Modify existing pages, skills, and tasks.

**Examples:**
- "Update the Python page with type hints examples"
- "Change Machine Learning skill to Advanced"
- "Mark the React tutorial task as completed"
- "Update the SQL quiz with more questions"

### ❌ DELETE
Remove pages, skills, tasks, and learning objects.

**Examples:**
- "Delete the old Python basics page"
- "Remove the outdated Machine Learning skill"
- "Delete all completed tasks"
- "Remove the SQL quiz"

## 🌐 Web Search (Always On)

BUILD mode **automatically searches the web** for current information:
- Latest features and updates
- Best practices
- Code examples
- Accurate data

Web sources are displayed in the response.

## 💡 Usage

### From Ask Anything Page
1. Select **BUILD** mode
2. Type your command
3. Press Enter
4. View results and created objects

### From Floating Ask Anything
1. Click the floating button (bottom-right)
2. Type your command (BUILD mode auto-detected)
3. Press Enter
4. Objects created in current workspace

## 📊 Response Format

After execution, you'll see:

```
🌐 Web Sources Used (3):
   • Python 3.12 Release Notes
   • Type Hints Best Practices
   • Async/Await Tutorial

✅ Created 1 Page(s):
   📄 Python 3.12 Features

🔄 Updated 1 Item(s):
   📄 Python Basics
      Updated: content, tags

❌ Deleted 1 Item(s):
   📄 Old Python Tutorial

⏭️ Skipped 0 Duplicate(s)

❌ Failed Operations (0)

🔗 Objects are now visible in:
   • Pages screen
   • Skills screen
   • Tasks screen
   • Knowledge Graph
```

## 🎯 Smart Features

### Duplicate Detection
- Checks for existing pages/skills/tasks
- Prevents duplicates
- Reports skipped items

### Fuzzy Matching
- "Update Python page" finds "Python Basics"
- "Delete React task" finds "Complete React Tutorial"
- Case-insensitive matching

### Auto-linking
- Pages linked to knowledge graph
- Skills track evidence
- Tasks linked to pages/skills
- Quizzes/flashcards linked to source pages

## 🔧 Technical Details

### Backend
- Enhanced `_execute_actions` method
- CRUD operation detection
- Web search integration
- Improved error handling

### Frontend
- FloatingAskAnything supports all operations
- AskAnything page with mode selection
- Structured result display
- Action buttons for created objects

## 📝 Examples

### Create a Course
```
"Create a course about Data Science with chapters on Python, Statistics, and ML"
```

Result:
- Parent page: "Data Science Course"
- Chapter 1: "Python for Data Science"
- Chapter 2: "Statistics Fundamentals"
- Chapter 3: "Machine Learning Basics"

### Update Multiple Items
```
"Update all my Python pages with the latest 3.12 features"
```

Result:
- Finds all pages with "Python" in title
- Searches web for Python 3.12 features
- Updates content with new information

### Delete Old Content
```
"Delete all pages tagged as 'draft' or 'outdated'"
```

Result:
- Finds pages with those tags
- Deletes them
- Reports deleted items

## ⚠️ Important Notes

1. **Workspace Required**: BUILD mode needs a workspace context
2. **Web Search**: Always enabled for current information
3. **Confirmation**: Operations are executed immediately
4. **Visibility**: Created objects appear in all relevant screens
5. **Architecture**: Ask Anything creates objects, UI components render them

## 🎓 Best Practices

1. **Be Specific**: "Create a page about React Hooks" is better than "Create a page"
2. **Use Context**: Mention workspace or page names for updates
3. **Check Results**: Review the summary to verify operations
4. **Iterate**: Update content as you learn more
5. **Clean Up**: Delete outdated content regularly

## 🚦 Status

✅ CREATE - Fully implemented
✅ READ - Fully implemented  
✅ UPDATE - Fully implemented
✅ DELETE - Fully implemented
✅ Web Search - Always enabled
✅ Duplicate Detection - Active
✅ Fuzzy Matching - Active
✅ Auto-linking - Active

## 🔗 Related

- `BUILD_MODE_CRUD_IMPLEMENTATION.md` - Full technical details
- `ASK_ANYTHING_ARCHITECTURE_FLOW.md` - Architecture overview
- `ask-anything-architecture.md` - Core principles
