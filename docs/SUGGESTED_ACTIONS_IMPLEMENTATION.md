# Suggested Actions - Full Implementation

## Overview
The suggested action buttons at the bottom of AI responses are now fully functional. When clicked, they perform real actions like creating pages, generating tasks, or navigating to relevant sections.

## Implemented Actions

### 1. 📝 Create Summary Page / Save as New Page
**Trigger:** "Create summary page", "Save as new page"

**What it does:**
- Creates a new page in the current workspace
- Title: First 50 characters of your question
- Content: Your question as heading + AI response
- Icon: 📝
- Tags: ['ai-generated']
- Automatically navigates to the new page editor

**Example:**
```
You ask: "What is data analytics?"
AI responds with explanation
Click: "Create summary page"
→ New page created with title "What is data analytics?"
→ Opens page editor with the full Q&A content
```

### 2. ✅ Generate Practice Tasks
**Trigger:** "Generate practice tasks", "Create tasks from plan"

**What it does:**
- Switches to BUILD mode
- Asks AI to create 3-5 specific, actionable tasks
- AI automatically creates tasks in the database
- Tasks appear in your Tasks page
- Requires workspace to be selected

**Example:**
```
You ask: "How do I learn SQL?"
AI responds with learning path
Click: "Generate practice tasks"
→ AI creates tasks like:
  - "Practice SELECT queries on sample database"
  - "Learn JOIN operations with examples"
  - "Complete 10 WHERE clause exercises"
→ Tasks saved to Tasks page
```

### 3. 📄 View Related Pages
**Trigger:** "View related pages"

**What it does:**
- Navigates to the Pages section
- Shows all pages in current workspace
- Useful for exploring related content

### 4. 🕸️ Visualize in Knowledge Graph
**Trigger:** "Visualize in knowledge graph", "View in graph"

**What it does:**
- Navigates to the Knowledge Graph page
- Shows connections between pages, skills, and concepts
- Helps understand relationships

### 5. 📖 Explain in Detail
**Trigger:** "Explain in detail"

**What it does:**
- Switches to EXPLAIN mode
- Re-runs the same query with detailed explanation
- Provides more comprehensive, educational response
- Breaks down complex topics

**Example:**
```
You ask: "What is a JOIN?"
AI gives brief answer
Click: "Explain in detail"
→ AI provides comprehensive explanation with:
  - Definition
  - Types of JOINs
  - Examples
  - Use cases
  - Best practices
```

### 6. 📋 Create a Plan
**Trigger:** "Create a plan", "Create detailed plan"

**What it does:**
- Switches to PLAN mode
- Re-runs query to create structured plan
- Provides step-by-step roadmap
- Includes timelines and milestones

**Example:**
```
You ask: "How do I become a data analyst?"
Click: "Create a plan"
→ AI creates detailed plan:
  - Phase 1: Foundations (Weeks 1-4)
  - Phase 2: Tools & Technologies (Weeks 5-8)
  - Phase 3: Projects (Weeks 9-12)
  - Phase 4: Job Search (Weeks 13-16)
```

### 7. 🎯 Generate Related Skills
**Trigger:** "Generate related skills"

**What it does:**
- Navigates to Skills page
- Shows your current skills
- Can manually add skills mentioned in AI response

### 8. 💬 Ask Follow-up Question
**Trigger:** "Ask follow-up question"

**What it does:**
- Focuses on the follow-up input field
- Allows continuing the conversation
- Maintains context from previous response

## How Actions Work

### Pattern Matching
The system uses case-insensitive pattern matching to detect action types:

```typescript
const actionLower = action.toLowerCase();

if (actionLower.includes('summary page')) {
  // Create page action
}
else if (actionLower.includes('practice tasks')) {
  // Generate tasks action
}
// ... etc
```

### BUILD Mode for Content Creation
When creating tasks, pages, or skills, the system uses BUILD mode:

1. User clicks "Generate practice tasks"
2. System switches to BUILD mode
3. Sends new query: "Create 3-5 practice tasks for: [original question]"
4. AI generates structured content
5. Backend `_execute_actions` method creates actual database entries
6. User sees confirmation and can view created items

### Workspace Context
All created content is associated with the current workspace:

```typescript
workspace_id: currentWorkspace?.id
```

This ensures:
- Pages created in correct workspace
- Tasks belong to current workspace
- Skills are user-wide (no workspace yet)

## Backend Integration

### AI Agent BUILD Mode
The backend AI agent has special logic for BUILD mode:

```python
if mode == "build":
    # Extract structured content from AI response
    structured_data = extract_json_from_response(response)
    
    # Create pages
    for page_data in structured_data["pages"]:
        create_page(page_data, workspace_id)
    
    # Create tasks
    for task_data in structured_data["tasks"]:
        create_task(task_data, user_id)
    
    # Create skills
    for skill_data in structured_data["skills"]:
        create_skill(skill_data, user_id)
```

### Response Format
When AI is in BUILD mode, it formats responses as JSON:

```json
{
  "pages": [
    {
      "title": "SQL Basics",
      "content": "...",
      "icon": "📊",
      "tags": ["sql", "database"]
    }
  ],
  "tasks": [
    {
      "title": "Practice SELECT queries",
      "priority": "medium",
      "status": "todo"
    }
  ],
  "skills": [
    {
      "name": "SQL",
      "level": "Beginner",
      "description": "..."
    }
  ]
}
```

## User Experience Flow

### Example: Complete Learning Flow

1. **Ask Question**
   ```
   User: "How do I learn data analytics?"
   Mode: ASK
   ```

2. **Get Response**
   ```
   AI: Provides overview of data analytics learning path
   Suggested Actions:
   - Explain in detail
   - Create a plan
   - Generate practice tasks
   - Create summary page
   ```

3. **Create Plan**
   ```
   User clicks: "Create a plan"
   Mode switches to: PLAN
   AI: Generates detailed 12-week learning plan
   ```

4. **Generate Tasks**
   ```
   User clicks: "Generate practice tasks"
   Mode switches to: BUILD
   AI: Creates 5 tasks in database
   Result: Tasks appear in Tasks page
   ```

5. **Save Summary**
   ```
   User clicks: "Create summary page"
   Result: New page created with plan content
   Opens: Page editor for further editing
   ```

6. **View Progress**
   ```
   User navigates to: Tasks page
   Sees: All generated tasks
   Can: Check off tasks as completed
   ```

## Error Handling

### No Workspace Selected
```typescript
if (!currentWorkspace) {
  toast.error('Please select a workspace first');
  return;
}
```

### No Response Available
```typescript
if (!response) {
  toast.error('No response to save');
  return;
}
```

### API Errors
```typescript
try {
  await api.createPage(...);
  toast.success('Page created!');
} catch (error) {
  toast.error('Failed to create page');
  console.error(error);
}
```

## Testing

### Test Create Summary Page
1. Ask any question
2. Wait for AI response
3. Click "Create summary page"
4. Verify: New page opens in editor
5. Verify: Content includes question and answer
6. Verify: Page appears in Pages list

### Test Generate Tasks
1. Ask: "How do I learn Python?"
2. Wait for response
3. Click "Generate practice tasks"
4. Wait for BUILD mode response
5. Navigate to Tasks page
6. Verify: New tasks appear
7. Verify: Tasks are specific and actionable

### Test Explain in Detail
1. Ask brief question: "What is SQL?"
2. Get brief answer
3. Click "Explain in detail"
4. Verify: Mode switches to EXPLAIN
5. Verify: New, more detailed response appears

### Test Create Plan
1. Ask: "How do I become a data scientist?"
2. Click "Create a plan"
3. Verify: Detailed plan with phases/timeline
4. Click "Generate practice tasks" on plan
5. Verify: Tasks created from plan

## Future Enhancements

### Smart Action Suggestions
Based on query type, suggest most relevant actions:
- Learning questions → "Create plan", "Generate tasks"
- Concept questions → "Explain in detail", "View related pages"
- How-to questions → "Create summary page", "Generate tasks"

### Action History
Track which actions users click most:
- Show popular actions first
- Personalize suggestions
- Learn user preferences

### Batch Actions
Allow multiple actions at once:
- "Create page AND generate tasks"
- "Explain in detail AND create plan"

### Custom Actions
Let users define their own action buttons:
- Custom prompts
- Custom workflows
- Integration with external tools

## Summary

Suggested actions are now fully functional and provide real value:
- ✅ Create pages with AI content
- ✅ Generate tasks automatically
- ✅ Switch modes for different response types
- ✅ Navigate to relevant sections
- ✅ Maintain workspace context
- ✅ Handle errors gracefully

Users can now have a complete workflow from asking questions to creating actionable content in their workspace!
