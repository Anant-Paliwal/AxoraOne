# Skill Chaining Implementation (Phase 1)

## Overview

Implemented skill chaining to enable "Skills as Mini Agents" pattern where skills can suggest next skills after execution.

## Database Changes

Run this migration in Supabase:
```sql
-- File: backend/migrations/add_skill_chaining.sql
```

### New Columns on `skills` table:
- `linked_skills UUID[]` - Skills that chain from this skill
- `prerequisite_skills UUID[]` - Skills that should be learned first
- `skill_type TEXT` - Category: learning, research, creation, analysis, practice

### New Tables:
- `skill_chains` - Named sequences of skills
- `skill_executions` - Log of skill runs with suggestions

## API Endpoints

### GET `/skills/{skill_id}/suggested-next`
Get suggested next skills after completing a skill.

**Response:**
```json
{
  "current_skill": { "id": "...", "name": "SQL Basics", "level": "Beginner" },
  "suggested_next": [
    { "id": "...", "name": "Data Analysis", "level": "Intermediate", "reason": "Linked skill" },
    { "id": "...", "name": "Python for Data", "level": "Intermediate", "reason": "Natural progression" }
  ],
  "message": "After mastering SQL Basics, consider these skills:"
}
```

### POST `/skills/{skill_id}/execute`
Log a skill execution and get chaining suggestions.

**Request:**
```json
{
  "trigger_source": "manual",  // manual, ask_anything, task, chain
  "input_context": {},
  "output_type": "page",       // page, task, quiz, flashcards, insight
  "output_id": "uuid"
}
```

**Response:**
```json
{
  "execution_id": "uuid",
  "skill_executed": { "id": "...", "name": "SQL Basics" },
  "output": { "type": "page", "id": "uuid" },
  "suggested_next": [...],
  "chain_prompt": "After SQL Basics, would you like to continue with one of these skills?"
}
```

### POST `/skills/{skill_id}/link/{target_skill_id}`
Link two skills for chaining.

### DELETE `/skills/{skill_id}/link/{target_skill_id}`
Remove link between skills.

### GET `/skills/{skill_id}/executions`
Get execution history for a skill.

## Frontend Changes

### SkillsPage.tsx
- Added "Run Skill" button on each skill card
- Added skill type badge display
- Added "Chains to" display showing linked skills
- Added link menu to connect skills
- Added chain dialog showing suggested next skills after execution
- Updated skill dialog with:
  - Skill type selector (learning, research, creation, analysis, practice)
  - Prerequisites selector
  - Linked skills (chains to) selector

### api.ts
New functions:
- `getSuggestedNextSkills(skillId, workspaceId)`
- `executeSkill(skillId, execution, workspaceId)`
- `linkSkills(sourceId, targetId)`
- `unlinkSkills(sourceId, targetId)`
- `getSkillExecutions(skillId, limit)`

## How Skill Chaining Works

1. **Create Skills** with types (learning, research, creation, etc.)
2. **Link Skills** together:
   - Set prerequisites (skills to learn first)
   - Set linked skills (suggested next skills)
3. **Run a Skill** → System suggests next skills based on:
   - Explicitly linked skills (priority 1)
   - Skills that have this as prerequisite (priority 2)
   - Same type skills at next level (priority 3)
4. **Chain Execution** → User can click suggested skill to run it next

## Example Chain

```
SQL Basics (Beginner, learning)
    ↓ chains to
Data Analysis (Intermediate, analysis)
    ↓ chains to
Python for Data (Intermediate, creation)
    ↓ chains to
Build Dashboard (Advanced, creation)
```

## Usage

1. Run the migration: `backend/migrations/add_skill_chaining.sql`
2. Create skills with appropriate types
3. Link skills together in the skill dialog
4. Click "Run Skill" to execute and see suggestions
5. Follow the chain by clicking suggested skills

## Future Phases

- **Phase 2**: Add execution steps to skills (actual workflow automation)
- **Phase 3**: Add confidence scoring and automatic level progression
- **Phase 4**: Full skill execution with output generation
