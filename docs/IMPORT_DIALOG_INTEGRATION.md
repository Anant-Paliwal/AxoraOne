# Import Dialog Integration

## Overview

The Import Dialog provides a beautiful, user-friendly interface for importing data into DatabaseBlock components. It supports CSV, JSON, and shows options for linking external data sources and AI-powered generation.

## Features

### ✅ File Upload
- **CSV Import**: Upload CSV files with automatic header detection and type inference
- **JSON Import**: Upload JSON files with support for arrays and objects
- **Progress Indicator**: Visual upload progress with percentage
- **Drag & Drop**: (UI ready, can be enhanced)

### ✅ Import Options
- **New Data Source**: Create a new database table
- **Merge with Existing**: Merge data into existing table (UI ready)
- **Link Data Source**: Connect external databases (placeholder)
- **Build with AI**: Generate data from description (placeholder)

### ✅ User Experience
- Smooth animations (fade-in, zoom-in)
- Loading states with spinner
- Progress bar during upload
- Success/error toasts
- Backdrop click to close
- ESC key to close (can be added)

## How It Works

### 1. User Clicks "Import" Button
```tsx
<Button variant="ghost" size="sm" onClick={() => setShowImportDialog(true)}>
  <Upload className="w-4 h-4 mr-1" />
  Import
</Button>
```

### 2. Import Dialog Opens
```tsx
<ImportDialog
  isOpen={showImportDialog}
  onClose={() => setShowImportDialog(false)}
  onImportComplete={handleImportComplete}
/>
```

### 3. User Selects File
- Clicks "Upload CSV" area
- Selects CSV file from computer
- File is uploaded to backend `/api/v1/files/upload/csv`

### 4. Backend Processes File
```python
# Backend parses CSV
- Extracts headers
- Parses rows
- Infers column types
- Returns structured data
```

### 5. Frontend Updates Table
```tsx
const handleImportComplete = (data) => {
  // Create columns from headers
  const newColumns = data.headers.map((header, index) => ({
    id: String(index + 1),
    name: header,
    type: data.column_types[header] || 'text'
  }));
  
  // Create rows from data
  const newRows = data.rows.map((row, index) => ({
    id: String(index + 1),
    ...row
  }));
  
  setColumns(newColumns);
  setRows(newRows);
  onDataChange?.({ columns: newColumns, rows: newRows });
};
```

### 6. Success Message
```
✅ Imported 150 rows from sales_data.csv
```

## Dialog Structure

```
┌─────────────────────────────────────────┐
│ Import CSV into Database            [X] │
│ Create a new database with your CSV... │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  📊 Click to upload CSV file    │   │
│  │     or drag and drop            │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Import Location:                       │
│  [New data source] [Merge existing]     │
│                                         │
│  ────────── Or ──────────              │
│                                         │
│  📄 Import JSON                         │
│  🔗 Link Data Source                    │
│  ✨ Build with AI                       │
│                                         │
├─────────────────────────────────────────┤
│ 📖 Learn about imports                  │
└─────────────────────────────────────────┘
```

## Upload Progress

```
┌─────────────────────────────────────────┐
│ Import CSV into Database            [X] │
├─────────────────────────────────────────┤
│                                         │
│           ⟳ (spinning)                  │
│                                         │
│         Uploading...                    │
│                                         │
│  ████████████░░░░░░░░░░░░░░░░░░        │
│              75%                        │
│                                         │
└─────────────────────────────────────────┘
```

## Component Props

### ImportDialog

```typescript
interface ImportDialogProps {
  isOpen: boolean;              // Controls dialog visibility
  onClose: () => void;          // Called when dialog closes
  onImportComplete: (data: {    // Called when import succeeds
    headers: string[];
    rows: any[];
    column_types: any;
  }) => void;
}
```

## Usage Example

```tsx
import { ImportDialog } from '@/components/blocks/ImportDialog';

function MyComponent() {
  const [showImportDialog, setShowImportDialog] = useState(false);

  const handleImportComplete = (data) => {
    console.log('Imported:', data);
    // Update your component state
  };

  return (
    <>
      <Button onClick={() => setShowImportDialog(true)}>
        Import Data
      </Button>

      <ImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImportComplete={handleImportComplete}
      />
    </>
  );
}
```

## Styling

- Uses Tailwind CSS with theme variables
- Supports dark mode automatically
- Smooth animations with `animate-in` utilities
- Responsive design (max-w-2xl)
- Backdrop blur effect

## Future Enhancements

- [ ] Actual drag & drop file upload
- [ ] Excel file support
- [ ] Column mapping UI (map CSV columns to database columns)
- [ ] Data preview before import
- [ ] Import settings (delimiter, encoding, etc.)
- [ ] Merge strategy selection (append, replace, update)
- [ ] External database connection UI
- [ ] AI data generation interface
- [ ] Import history
- [ ] Scheduled imports
- [ ] Webhook imports

## Error Handling

```typescript
try {
  const result = await api.uploadCSV(file);
  onImportComplete(result);
  toast.success(`Imported ${result.row_count} rows`);
} catch (error) {
  toast.error(error.message || 'Failed to import file');
}
```

## Accessibility

- Keyboard navigation (can be enhanced)
- Focus management
- ARIA labels (can be added)
- Screen reader support (can be enhanced)
- Color contrast compliant

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- File API support required
- FormData API support required
