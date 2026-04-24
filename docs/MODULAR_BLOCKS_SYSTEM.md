# Modular Blocks System

## Overview

The page editor now supports a modular block system where each advanced feature (Database, Form, Table, Gallery, etc.) is its own separate component. This makes it easy to add more features without cluttering the main editor.

## Architecture

```
src/components/blocks/
├── index.tsx              # Export all blocks
├── DatabaseBlock.tsx      # Database/spreadsheet view
├── FormBlock.tsx          # Input forms
├── TableBlock.tsx         # Simple tables
├── GalleryBlock.tsx       # Image galleries
├── CalendarBlock.tsx      # Event calendars
├── TimelineBlock.tsx      # Chronological timelines
└── ListBlock.tsx          # Checklists
```

## How It Works

### 1. Block Components
Each block is a self-contained React component with:
- **Props**: `id` (unique identifier) and `onRemove` (callback to remove block)
- **Header**: Icon, title, settings button, and remove button
- **Content**: The actual block functionality
- **Styling**: Consistent card-based design

### 2. Insert Menu
The editor toolbar has two insert menus:
- **Plus (+) Button**: Basic elements (images, videos, links, tables, lists)
- **Grid Button**: Advanced blocks (database, form, gallery, calendar, timeline)

### 3. Block Management
- Blocks are stored in `insertedBlocks` state array
- Each block has a unique ID generated with timestamp
- Blocks can be removed individually via the trash icon
- Blocks render below the main editor content

## Adding New Blocks

To add a new block type:

### Step 1: Create Block Component
```tsx
// src/components/blocks/YourBlock.tsx
import { YourIcon, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface YourBlockProps {
  id: string;
  onRemove?: () => void;
}

export function YourBlock({ id, onRemove }: YourBlockProps) {
  return (
    <div className="border border-border rounded-lg p-4 my-4 bg-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <YourIcon className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Your Block</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
          {onRemove && (
            <Button variant="ghost" size="sm" onClick={onRemove}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Your block content here */}
    </div>
  );
}
```

### Step 2: Export from Index
```tsx
// src/components/blocks/index.tsx
export { YourBlock } from './YourBlock';
```

### Step 3: Add to Editor
```tsx
// src/components/editor/EnhancedTiptapEditor.tsx

// 1. Import the block
import { YourBlock } from '@/components/blocks';

// 2. Add to blockTypes array
const blockTypes = [
  // ... existing blocks
  { 
    type: 'yourblock', 
    icon: YourIcon, 
    label: 'Your Block', 
    description: 'Description of your block' 
  },
];

// 3. Add to switch statement in render
case 'yourblock':
  return <YourBlock key={block.id} id={block.id} onRemove={() => removeBlock(block.id)} />;
```

## Available Blocks

### DatabaseBlock
- Spreadsheet-like data table
- Columns with types (text, select, date)
- Add/remove rows
- Perfect for structured data

### FormBlock
- Input forms with multiple field types
- Required field validation
- Text, email, textarea support
- Submit button

### TableBlock
- Simple data table
- Static rows and columns
- Good for displaying data

### GalleryBlock
- Image grid layout
- 3-column responsive grid
- Image captions
- Add more images button

### CalendarBlock
- Event list view
- Date and time display
- Visual date badges
- Hover effects

### TimelineBlock
- Chronological event display
- Visual timeline line
- Event dots and descriptions
- Perfect for project milestones

### ListBlock
- Checklist with checkboxes
- Strike-through completed items
- Add new items
- Interactive checkboxes

## Benefits

1. **Modularity**: Each block is independent and reusable
2. **Scalability**: Easy to add new block types
3. **Maintainability**: Changes to one block don't affect others
4. **Consistency**: All blocks follow the same design pattern
5. **Flexibility**: Blocks can be customized individually

## Future Enhancements

- Drag and drop to reorder blocks
- Block templates and presets
- Save/load block configurations
- Export blocks as standalone components
- Block collaboration features
- Block version history
- Custom block creation UI
