# Block-Based Page Editor Implementation Plan

## Overview
Transform the PageEditor from a simple textarea to a block-based editor (like Notion) where users can insert different types of content blocks.

## Block Types to Implement

### Basic Blocks
1. **Text** - Regular paragraph text
2. **Heading** - H1, H2, H3 headings
3. **Bullet List** - Unordered list items
4. **Code** - Code block with syntax highlighting

### Media Blocks
5. **YouTube Video** - Embed YouTube videos
6. **File Upload** - Upload and display files

### AI Blocks
7. **AI Explain** - AI-generated explanation of a topic
8. **AI Summary** - AI-generated summary
9. **AI Quiz** - AI-generated quiz questions

### Link Blocks
10. **Skill Link** - Link to a skill in the workspace

## Database Schema Changes

### Current Schema
```sql
CREATE TABLE public.pages (
  id UUID PRIMARY KEY,
  user_id UUID,
  workspace_id UUID,
  title TEXT,
  content TEXT,  -- Currently plain text/markdown
  icon TEXT,
  tags TEXT[],
  ...
);
```

### Option 1: Keep content as TEXT (Markdown)
- Store blocks as structured markdown
- Pros: Simple, backward compatible
- Cons: Limited block features

### Option 2: Change content to JSONB
```sql
ALTER TABLE public.pages 
ALTER COLUMN content TYPE JSONB USING content::jsonb;
```

Store blocks as JSON:
```json
{
  "blocks": [
    {
      "id": "block-1",
      "type": "text",
      "content": "This is a paragraph"
    },
    {
      "id": "block-2",
      "type": "heading",
      "level": 2,
      "content": "Section Title"
    },
    {
      "id": "block-3",
      "type": "code",
      "language": "python",
      "content": "print('Hello')"
    }
  ]
}
```

**Recommendation:** Use Option 2 (JSONB) for flexibility

## Implementation Steps

### Phase 1: Basic Structure (Minimal)
1. Add "Blocks" button to header
2. Create blocks menu dropdown
3. Implement Text and Heading blocks
4. Update save/load logic

### Phase 2: Lists and Code
5. Implement Bullet List block
6. Implement Code block with syntax highlighting

### Phase 3: Media
7. Implement YouTube Video embed
8. Implement File Upload

### Phase 4: AI Features
9. Implement AI Explain block
10. Implement AI Summary block
11. Implement AI Quiz block

### Phase 5: Links
12. Implement Skill Link block

## Component Structure

```
src/
  components/
    blocks/
      BlockMenu.tsx          - Dropdown menu for block types
      TextBlock.tsx          - Text paragraph block
      HeadingBlock.tsx       - Heading block
      BulletListBlock.tsx    - List block
      CodeBlock.tsx          - Code block
      YouTubeBlock.tsx       - YouTube embed
      FileUploadBlock.tsx    - File upload
      AIExplainBlock.tsx     - AI explanation
      AISummaryBlock.tsx     - AI summary
      AIQuizBlock.tsx        - AI quiz
      SkillLinkBlock.tsx     - Skill link
      BlockRenderer.tsx      - Renders appropriate block component
```

## Minimal Implementation (Quick Start)

For a quick implementation, I'll create:
1. Blocks button with menu
2. Basic block types (Text, Heading, List, Code)
3. Simple block rendering
4. Keep backward compatibility with existing markdown content

This allows users to start using blocks while maintaining existing pages.

## Migration Strategy

### For Existing Pages
- If content is string → Show in textarea (legacy mode)
- If content is JSONB → Show as blocks (new mode)
- Add "Convert to Blocks" button for legacy pages

### Gradual Migration
1. New pages use blocks by default
2. Existing pages can be converted on-demand
3. Both formats supported simultaneously

## User Experience

### Adding Blocks
1. Click "Blocks" button in header
2. Select block type from menu
3. Block inserted at cursor position
4. Focus moves to new block

### Editing Blocks
- Click block to edit
- Drag handle to reorder
- Delete button to remove
- Type "/" for quick block menu (future)

### Block Actions
- Each block has a menu (⋮) with:
  - Duplicate
  - Delete
  - Convert to different type
  - Move up/down

## Next Steps

Would you like me to:
1. **Quick Implementation** - Basic blocks (Text, Heading, List, Code) with simple UI
2. **Full Implementation** - All block types with rich features
3. **Phased Approach** - Start with basics, add features incrementally

For now, I'll create a minimal but functional implementation that you can expand later.
