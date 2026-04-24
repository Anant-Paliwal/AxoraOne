# File Upload Backend Integration

## Overview

The system now uses backend API endpoints to process uploaded files (CSV, JSON, Excel) instead of client-side parsing. This provides better security, validation, and data processing capabilities.

## Backend Implementation

### Endpoint: `/api/v1/files/upload/csv`
**Method:** POST  
**Content-Type:** multipart/form-data

**Request:**
```
file: CSV file
```

**Response:**
```json
{
  "success": true,
  "filename": "data.csv",
  "headers": ["Name", "Status", "Date"],
  "rows": [
    {"Name": "Task 1", "Status": "In Progress", "Date": "2024-01-15"},
    {"Name": "Task 2", "Status": "Done", "Date": "2024-01-16"}
  ],
  "row_count": 2,
  "column_count": 3,
  "column_types": {
    "Name": "text",
    "Status": "text",
    "Date": "text"
  },
  "data": {
    "headers": ["Name", "Status", "Date"],
    "rows": [...]
  }
}
```

### Endpoint: `/api/v1/files/upload/json`
**Method:** POST  
**Content-Type:** multipart/form-data

**Request:**
```
file: JSON file
```

**Response:**
```json
{
  "success": true,
  "filename": "data.json",
  "headers": ["key1", "key2"],
  "rows": [...],
  "row_count": 10,
  "column_count": 5,
  "column_types": {
    "key1": "text",
    "key2": "number"
  }
}
```

### Endpoint: `/api/v1/files/upload/excel`
**Method:** POST  
**Content-Type:** multipart/form-data

**Status:** 501 Not Implemented (requires pandas/openpyxl)

## Frontend Integration

### API Methods

```typescript
// src/lib/api.ts

api.uploadCSV(file: File): Promise<UploadResponse>
api.uploadJSON(file: File): Promise<UploadResponse>
api.uploadExcel(file: File): Promise<UploadResponse>
```

### Usage in Components

```typescript
// DatabaseBlock.tsx
const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setLoading(true);
  try {
    const result = await api.uploadCSV(file);
    
    // Update columns from headers
    const newColumns = result.headers.map((header, index) => ({
      id: String(index + 1),
      name: header,
      type: result.column_types[header] || 'text'
    }));
    setColumns(newColumns);

    // Update rows from data
    const newRows = result.rows.map((row, index) => ({
      id: String(index + 1),
      ...row
    }));
    setRows(newRows);

    toast.success(`Imported ${result.row_count} rows`);
  } catch (error) {
    toast.error(error.message);
  } finally {
    setLoading(false);
  }
};
```

## Features

### CSV Upload
- ✅ Automatic header detection
- ✅ Column type inference (text, number, decimal)
- ✅ Row parsing with proper data types
- ✅ Error handling for malformed CSV

### JSON Upload
- ✅ Supports array of objects
- ✅ Supports single object
- ✅ Supports nested structures (flattened)
- ✅ Type inference (text, number, decimal, boolean)
- ✅ Error handling for invalid JSON

### Excel Upload
- ⏳ Planned (requires additional dependencies)
- Suggests converting to CSV for now

## Security

- ✅ Authentication required (Bearer token)
- ✅ File type validation
- ✅ File size limits (handled by FastAPI)
- ✅ Content validation
- ✅ Error messages don't expose system details

## Type Inference

The backend automatically infers column types:

| Sample Value | Inferred Type |
|--------------|---------------|
| "123" | number |
| "123.45" | decimal |
| "true"/"false" | boolean (JSON only) |
| "Hello" | text |
| "" | text (default) |

## Error Handling

### Client-Side
```typescript
try {
  const result = await api.uploadCSV(file);
  // Handle success
} catch (error) {
  toast.error(error.message);
  // Handle error
}
```

### Server-Side
- 400: Invalid file type or malformed data
- 401: Unauthorized (no token)
- 500: Server error during processing

## Benefits

1. **Security**: File processing happens server-side
2. **Validation**: Backend validates file format and content
3. **Type Safety**: Automatic type inference
4. **Scalability**: Can handle large files better
5. **Consistency**: Same parsing logic for all users
6. **Extensibility**: Easy to add new file formats

## Future Enhancements

- [ ] Excel file support (requires openpyxl or pandas)
- [ ] XML file support
- [ ] Database connection imports
- [ ] API endpoint imports
- [ ] File size limits configuration
- [ ] Batch file uploads
- [ ] File preview before import
- [ ] Column mapping UI
- [ ] Data transformation options
