# Course Creation with BUILD Mode

## Overview

BUILD mode now supports automatic course creation with chapters as sub-pages! Perfect for creating structured learning content.

## How to Use

### 1. Basic Course Creation

In Ask Anything (BUILD mode), simply ask:

```
Create a course on Data Analytics with 5 chapters
```

```
Build a Python programming course with chapters on basics, data structures, and functions
```

```
Create a curriculum for SQL with 4 lessons
```

### 2. What Gets Created

**Parent Page (Course)**
- Title: Course name
- Icon: 📚
- Content: Course overview
- Tags: Related topics

**Sub-Pages (Chapters)**
- Title: Chapter names
- Icon: 📖
- Content: Chapter content
- Order: Sequential (0, 1, 2...)
- Parent: Linked to course page

### 3. Example Request

**User:** "Create a Data Analytics course with 4 chapters"

**AI Creates:**
```
📚 Data Analytics Course (Parent Page)
  ├── 📖 Chapter 1: Introduction to Data
  ├── 📖 Chapter 2: SQL Fundamentals
  ├── 📖 Chapter 3: Data Visualization
  └── 📖 Chapter 4: Advanced Analytics
```

### 4. Browser-Style Navigation

Once created, you can:
- **View tabs** for each chapter at the top
- **Click tabs** to switch between chapters
- **Edit any chapter** independently
- **Add more chapters** with "+ New Tab" button
- **Delete chapters** by hovering and clicking ×

## Use Cases

### 📚 Educational Courses
```
Create a Machine Learning course with 6 chapters covering basics to deployment
```

### 📖 Study Guides
```
Build a study guide for Biology with chapters on cells, genetics, and evolution
```

### 🎓 Training Programs
```
Create an employee onboarding course with 5 modules
```

### 📝 Documentation
```
Build API documentation with chapters for authentication, endpoints, and examples
```

## Advanced Features

### Link to Skills
Courses automatically link to related skills:
```
Create a Python course and link it to Python Programming skill
```

### Generate Quizzes
Add quizzes for each chapter:
```
Create a Data Analytics course with quizzes for each chapter
```

### Create Tasks
Generate learning tasks:
```
Build a course with practice tasks for each chapter
```

## Tips

✅ **Be Specific** - Mention number of chapters for better structure
✅ **Use Keywords** - "course", "curriculum", "chapters", "lessons", "modules"
✅ **Mention Workspace** - Use @WorkspaceName to organize properly
✅ **Add Details** - Describe what each chapter should cover

## Example Prompts

```
Create a comprehensive SQL course with 5 chapters:
1. SQL Basics
2. Joins and Relationships
3. Aggregations
4. Subqueries
5. Performance Optimization
```

```
Build a Web Development curriculum with chapters on HTML, CSS, JavaScript, and React
```

```
Create a Data Science course with 8 modules covering Python, pandas, visualization, and machine learning
```

## Response Format

After creation, you'll see:

```
✅ Course Created: Data Analytics Course

📚 Parent Page: Data Analytics Course
  📖 Chapter 1: Introduction to Data
  📖 Chapter 2: SQL Fundamentals
  📖 Chapter 3: Data Visualization
  📖 Chapter 4: Advanced Analytics

🎯 Actions:
  • View Course → /pages/{course_id}
  • Edit Course → /pages/{course_id}/edit
```

## Benefits

🎯 **Structured Learning** - Organized course content
📑 **Easy Navigation** - Browser-style tabs
✏️ **Quick Editing** - Edit any chapter independently
📊 **Progress Tracking** - Track completion per chapter
🔗 **Skill Integration** - Link courses to skills
🤖 **AI-Powered** - Generate entire courses automatically

---

**Ready to create your first course?** Head to Ask Anything, switch to BUILD mode, and start creating! 🚀
