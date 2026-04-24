# Task Sources - Quick Reference Card

## 🎯 What It Does
Ask Anything can now access tasks AND their linked pages/skills for smarter answers.

## 🔧 Files Changed
```
Frontend:
✓ src/components/FloatingAskAnything.tsx
✓ src/pages/AskAnything.tsx

Backend:
✓ backend/app/services/context_gatherer.py
✓ backend/app/services/enhanced_ai_agent.py
```

## 💡 Quick Examples

### Example 1: Ask About Tasks
```
You: "What tasks do I have for SQL?"
AI: Shows tasks + linked SQL pages + Database skill
```

### Example 2: Mention a Task
```
You: "@Complete SQL Tutorial - help me"
AI: Reads task + linked tutorial page + skill level
```

### Example 3: Get Context
```
You: "What should I learn for my React tasks?"
AI: Checks tasks + linked React pages + skill gaps
```

## 🎨 Visual Indicators

```
📋 Task Name                    ← Normal background
   task

📄 Linked Page Name             ← Highlighted background
   page → from task             ← Shows relationship

🧠 Linked Skill Name            ← Highlighted background
   skill → from task            ← Shows relationship
```

## 🔍 How to Use

1. **Enable Tasks Source** (enabled by default)
   - Click sources dropdown
   - Ensure "Tasks" is checked ✓

2. **Ask Questions**
   - "What tasks do I have for [topic]?"
   - "Help me with @[task name]"
   - "What should I work on next?"

3. **Click Sources**
   - Click task → Go to tasks page
   - Click page → Go to that page
   - Click skill → Go to skills page

## 🗄️ Database Links

Tasks link to content via:
```sql
linked_page_id  → pages(id)   -- Learning content
linked_skill_id → skills(id)  -- Skill being developed
```

## 🚀 Key Benefits

✅ AI reads full page content when discussing tasks
✅ Better task recommendations based on skills
✅ Find tasks through their linked content
✅ Navigate between tasks, pages, and skills
✅ Connected learning experience

## 📊 Data Flow

```
Query → Context Gatherer → Fetch Tasks + Linked Sources
                         ↓
                    AI Agent → Generate Response
                         ↓
                    Frontend → Display with Indicators
```

## 🧪 Test It

```python
# Run test suite
python test_task_sources.py
```

## 📚 Full Documentation

- **Implementation:** ASK_ANYTHING_TASK_SOURCES_IMPLEMENTATION.md
- **User Guide:** ASK_ANYTHING_TASK_SOURCES_QUICK_GUIDE.md
- **Technical:** TASK_SOURCES_TECHNICAL_DETAILS.md
- **Summary:** TASK_SOURCES_COMPLETE_SUMMARY.md

## ✅ Status

**COMPLETE AND READY TO USE**

All changes implemented, tested, and documented.

---

**Quick Tip:** Link your tasks to pages and skills for the best AI experience! 🎯
