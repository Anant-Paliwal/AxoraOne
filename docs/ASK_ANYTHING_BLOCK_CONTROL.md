# Ask Anything Block Control Implementation

## Overview

Ask Anything now has full control over page blocks in BUILD mode. Users can generate content (text, tables, lists, code blocks, etc.) and insert them directly into the current page.

## Architecture (Following Steering Rules)

```
User Request → Ask Anything (Intent Detection) → Backend API → Generate Blocks → Return Actions → UI Inserts Blocks
```

**Key Principle**: Ask Anything is a CONTROL layer. It generates blocks and returns actions. The PageEditor component handles the actual insertion.

## How It Works

### 1. Intent Detection (`backend/app/services/intent_detector.py`)

Added `ContentType.BLOCK` for detecting when users want to add content to the current page:

```python
ContentType.BLOCK = "block"  # Add blocks to existing page
```

Block-specific patterns detected:
- "add a table about..."
- "insert a list of..."
- "generate code for..."
- "write a paragraph about..."
- "create a heading for..."

### 2. Block Generation (`backend/app/services/smart_builder.py`)

New `_generate_blocks()` method parses AI response and converts to structured blocks:

**Supported Block Types:**
- `text` - Plain text paragraphs
- `heading` - H1, H2, H3 headings (from # ## ###)
- `list` - Bullet and numbered lists
- `table` - Markdown tables
- `code` - Code blocks with language detection
- `quote` - Blockquotes
- `divider` - Horizontal dividers

### 3. Frontend Context (`src/contexts/BlockInsertContext.tsx`)

New context for sharing blocks between FloatingAskAnything and PageEditor:

```typescript
const { pendingBlocks, insertBlocks, clearPendingBlocks } = useBlockInsert();
```

### 4. FloatingAskAnything Updates

- Captures `generated_blocks` from API response
- Shows "Insert X Block(s) to Page" button when blocks are available
- Only shows insert button when user is on a page (has `currentPageId`)

### 5. PageEditor Updates

- Listens for `pendingBlocks` from context
- Automatically appends new blocks to existing blocks
- Shows toast notification on successful insertion

## Usage Examples

### Generate a Table
```
User: "Create a table comparing Python and JavaScript"
→ Detects: ContentType.BLOCK
→ Generates: Table block with comparison data
→ Shows: "Insert 1 Block(s) to Page" button
```

### Generate Multiple Blocks
```
User: "Write an introduction about machine learning with key concepts"
→ Detects: ContentType.BLOCK
→ Generates: Heading + Text + List blocks
→ Shows: "Insert 4 Block(s) to Page" button
```

### Generate Code
```
User: "Add a Python function to calculate fibonacci"
→ Detects: ContentType.BLOCK
→ Generates: Code block with Python syntax
→ Shows: "Insert 1 Block(s) to Page" button
```

## Files Modified

1. `backend/app/services/intent_detector.py` - Added BLOCK ContentType
2. `backend/app/services/smart_builder.py` - Added `_generate_blocks()` method
3. `backend/app/services/enhanced_ai_agent.py` - Added `generated_blocks` to response
4. `src/contexts/BlockInsertContext.tsx` - New context for block sharing
5. `src/components/FloatingAskAnything.tsx` - Block insert UI
6. `src/pages/PageEditor.tsx` - Block insertion logic
7. `src/App.tsx` - Added BlockInsertProvider

## Response Format

When blocks are generated, the API returns:

```json
{
  "success": true,
  "response": "Here's the content you requested...",
  "generated_blocks": [
    {
      "id": "heading-1234567890-0",
      "type": "heading",
      "position": 0,
      "data": {
        "content": "Introduction to Machine Learning",
        "level": 2
      }
    },
    {
      "id": "text-1234567890-1",
      "type": "text",
      "position": 1,
      "data": {
        "content": "Machine learning is a subset of artificial intelligence..."
      }
    }
  ],
  "actions": [
    {
      "label": "Insert Blocks",
      "action": "insert_blocks",
      "blocks": [...]
    }
  ]
}
```
