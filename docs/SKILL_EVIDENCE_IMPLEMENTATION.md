# Skill Evidence Implementation

## Overview
Implemented a complete system for linking pages to skills as evidence of skill development. Users can now attach pages to skills and manage these relationships through an intuitive interface.

## Database Changes

### New Table: `skill_evidence`
Created a junction table to store relationships between skills and pages:

```sql
CREATE TABLE public.skill_evidence (
  id UUID PRIMARY KEY,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  evidence_type TEXT DEFAULT 'page' CHECK (evidence_type IN ('page', 'quiz')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(skill_id, page_id)
);
```

**Features:**
- Links skills to pages with many-to-many relationship
- Prevents duplicate links (UNIQUE constraint)
- Supports future quiz evidence type
- Cascading deletes when skill or page is removed
- Row Level Security (RLS) enabled

**Migration File:** `backend/migrations/add_skill_evidence.sql`

## Backend API Changes

### New Endpoints

#### GET `/api/v1/skills`
- Enhanced to return `linked_evidence` array with page details
- Includes page title and icon for display

#### POST `/api/v1/skills/{skill_id}/evidence`
- Add a page as evidence to a skill
- Request body: `{ page_id, evidence_type?, notes? }`
- Returns the created evidence record
- Prevents duplicate links

#### DELETE `/api/v1/skills/{skill_id}/evidence/{evidence_id}`
- Remove evidence from a skill
- Validates ownership before deletion

**File Modified:** `backend/app/api/endpoints/skills.py`

## Frontend Changes

### API Client (`src/lib/api.ts`)
Added two new methods:
- `addSkillEvidence(skillId, evidence)` - Link a page to a skill
- `removeSkillEvidence(skillId, evidenceId)` - Unlink a page from a skill

### Skills Page (`src/pages/SkillsPage.tsx`)

#### Updated Skill Interface
```typescript
interface Skill {
  // ... existing fields
  linked_evidence?: Array<{
    id: string;
    page_id: string;
    evidence_type: string;
    pages: {
      id: string;
      title: string;
      icon: string;
    };
  }>;
}
```

#### Enhanced Skill Dialog
The skill creation/edit dialog now includes a fully functional Evidence section:

**Features:**
1. **Add Page Button** - Opens page selector
2. **Page Selector** - Shows all available pages
   - Loads pages dynamically
   - Shows which pages are already linked
   - Prevents duplicate linking
3. **Linked Evidence Display** - Shows currently linked pages
   - Page icon and title
   - Remove button (appears on hover)
4. **Smart Validation** - Must save skill before adding evidence

**User Flow:**
1. Create/edit a skill
2. Save the skill first
3. Click "Add Page" in Evidence section
4. Select pages from the list
5. Pages appear as linked evidence
6. Hover over linked pages to remove them

## Features

### Evidence Management
- ✅ Link multiple pages to a skill
- ✅ View linked pages with icons and titles
- ✅ Remove page links
- ✅ Prevent duplicate links
- ✅ Real-time updates after linking/unlinking
- ✅ Visual feedback (loading states, disabled states)
- ✅ Error handling with user-friendly messages

### UI/UX Improvements
- Clean, modern interface matching Perplexity style
- Smooth transitions and hover effects
- Loading indicators
- Toast notifications for all actions
- Disabled states for already-linked pages
- Validation messages

## Database Migration

To apply the database changes, run:

```sql
-- Execute the migration file
psql -d your_database < backend/migrations/add_skill_evidence.sql
```

Or through Supabase dashboard:
1. Go to SQL Editor
2. Paste contents of `backend/migrations/add_skill_evidence.sql`
3. Run the query

## Testing

### Test Scenarios
1. **Create Skill** → Save → Add Page Evidence → Verify link appears
2. **Edit Skill** → Add more pages → Verify all pages show
3. **Remove Evidence** → Click remove button → Verify page unlinked
4. **Duplicate Prevention** → Try adding same page twice → See error message
5. **Delete Skill** → Verify evidence records are cascade deleted
6. **Delete Page** → Verify evidence records are cascade deleted

## Future Enhancements
- Quiz evidence type support
- Evidence notes/comments
- Evidence ordering/sorting
- Bulk evidence management
- Evidence statistics and insights
- Link evidence from page editor
