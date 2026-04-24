# Quick Reference Guide

## 🎯 For Users

### Import CSV Data
1. Open page editor
2. Look at right sidebar
3. Click "Import CSV"
4. Select your CSV file
5. Database block appears with your data
6. Click any cell to edit

### Import JSON Data
1. Open page editor
2. Right sidebar → "Import JSON"
3. Select JSON file (must be array of objects)
4. Database block created automatically
5. Edit inline by clicking cells

### Create Manual Database
1. Click Grid icon (⊞) in toolbar
2. Select "Database"
3. Empty database appears
4. Click cells to edit
5. Add rows: Click "Add Row"
6. Add columns: Click "Column"
7. Delete: Hover and click trash icon

### Edit Database
- **Edit Cell**: Click cell → type → Enter to save
- **Cancel Edit**: Press Escape
- **Add Row**: Click "Add Row" button at bottom
- **Delete Row**: Hover row → click trash icon
- **Add Column**: Click "Column" button in header
- **Delete Column**: Hover column header → click X

## 🔧 For Developers

### File Locations
```
src/components/blocks/     ← All block components
src/lib/csvParser.ts        ← CSV/JSON parser
src/components/editor/      ← Editor components
src/pages/PageEditor.tsx    ← Main editor page
```

### Add New Block Type

**Step 1**: Create component
```tsx
// src/components/blocks/MyBlock.tsx
export function MyBlock({ id, onRemove }) {
  return (
    <div className="border border-border rounded-lg p-4 my-4 bg-card">
      {/* Your block content */}
    </div>
  );
}
```

**Step 2**: Export it
```tsx
// src/components/blocks/index.tsx
export { MyBlock } from './MyBlock';
```

**Step 3**: Add to editor
```tsx
// src/components/editor/EnhancedTiptapEditor.tsx

// Import
import { MyBlock } from '@/components/blocks';

// Add to blockTypes
const blockTypes = [
  { type: 'myblock', icon: MyIcon, label: 'My Block', description: 'Description' },
];

// Add to switch
case 'myblock':
  return <MyBlock key={block.id} id={block.id} onRemove={() => removeBlock(block.id)} />;
```

### Add New Import Type

**Step 1**: Create parser
```tsx
// src/lib/csvParser.ts
export function parseXML(xmlText: string): ParsedCSVData {
  // Parse and return { columns, rows }
}
```

**Step 2**: Add to sidebar
```tsx
// src/components/blocks/BlockSidebar.tsx
<button onClick={() => xmlInputRef?.click()}>
  Import XML
</button>
```

**Step 3**: Add handler
```tsx
// src/components/editor/EnhancedTiptapEditor.tsx
const handleImportXML = (file: File) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = parseXML(e.target.result);
    insertBlock('database', data);
  };
  reader.readAsText(file);
};
```

### Block with CRUD

```tsx
interface MyBlockProps {
  id: string;
  initialData?: any;
  onRemove?: () => void;
  onDataChange?: (data: any) => void;
}

export function MyBlock({ id, initialData, onRemove, onDataChange }: MyBlockProps) {
  const [data, setData] = useState(initialData || defaultData);
  
  const updateData = (newData) => {
    setData(newData);
    onDataChange?.(newData);
  };
  
  return (
    <div>
      {/* CRUD operations */}
    </div>
  );
}
```

## 📊 Data Structures

### ParsedCSVData
```tsx
interface ParsedCSVData {
  columns: Array<{
    id: string;
    name: string;
    type: 'text' | 'select' | 'date' | 'number';
  }>;
  rows: Array<{
    id: string;
    [key: string]: any;
  }>;
}
```

### Block State
```tsx
interface Block {
  id: string;
  type: 'database' | 'form' | 'table' | 'gallery' | 'calendar' | 'timeline' | 'list';
  data?: ParsedCSVData;
}
```

## 🎨 Styling

### Block Container
```tsx
<div className="border border-border rounded-lg p-4 my-4 bg-card">
```

### Block Header
```tsx
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-2">
    <Icon className="w-5 h-5 text-primary" />
    <h3 className="font-semibold text-foreground">Title</h3>
  </div>
  <div className="flex items-center gap-2">
    {/* Action buttons */}
  </div>
</div>
```

### Editable Cell
```tsx
<div
  onClick={() => startEdit()}
  className="cursor-pointer hover:bg-accent/30 rounded px-2 py-1"
>
  {value}
</div>
```

## 🔍 Testing

### Test CSV Import
```csv
Name,Age,Status
John,25,Active
Jane,30,Inactive
```

### Test JSON Import
```json
[
  {"name": "John", "age": 25, "status": "Active"},
  {"name": "Jane", "age": 30, "status": "Inactive"}
]
```

### Test CRUD
1. Import data
2. Click cell → edit → save
3. Add row
4. Delete row
5. Add column
6. Delete column

## 🐛 Debugging

### Block Not Rendering
```tsx
// Check console for errors
console.log('Block type:', block.type);
console.log('Block data:', block.data);

// Verify switch case exists
case 'myblock':
  return <MyBlock ... />;
```

### Import Not Working
```tsx
// Check file content
reader.onload = (e) => {
  console.log('File content:', e.target.result);
  const parsed = parseCSV(e.target.result);
  console.log('Parsed data:', parsed);
};
```

### Edit Not Saving
```tsx
// Check state updates
const saveEdit = () => {
  console.log('Saving:', editValue);
  const updated = rows.map(row => {
    if (row.id === editingCell.rowId) {
      console.log('Updated row:', { ...row, [editingCell.colName]: editValue });
      return { ...row, [editingCell.colName]: editValue };
    }
    return row;
  });
  setRows(updated);
};
```

## 📞 Common Issues

### "Block not found"
→ Check if block type is in switch statement

### "Cannot read property of undefined"
→ Check if initialData is passed correctly

### "CSV not parsing"
→ Verify CSV has headers in first row

### "JSON import fails"
→ Ensure JSON is array of objects

### "Edit not working"
→ Check if onDataChange callback exists

## 🎓 Learning Path

1. **Start Simple**: Create a basic block
2. **Add State**: Make it interactive
3. **Add CRUD**: Implement create/update/delete
4. **Add Import**: Support data import
5. **Polish**: Add animations and feedback

## 📚 Resources

- `MODULAR_BLOCKS_SYSTEM.md` - Architecture details
- `BLOCKS_CRUD_IMPORT_SYSTEM.md` - CRUD implementation
- `EDITOR_FEATURES_SUMMARY.md` - Complete feature list
- `QUICK_REFERENCE.md` - This file

## ✨ Pro Tips

1. **Use TypeScript** for type safety
2. **Test with real data** before deploying
3. **Handle errors gracefully** with try-catch
4. **Provide user feedback** via toasts
5. **Keep blocks simple** and focused
6. **Document your code** for future you
7. **Use consistent styling** across blocks
8. **Optimize for performance** with large datasets

---

**Need help?** Check the full documentation files or console.log everything! 🚀
