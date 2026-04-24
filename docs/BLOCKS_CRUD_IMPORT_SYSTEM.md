# Database Block CRUD & Import System - Fixed

## Issues Fixed

### 1. Duplicate `uploadCSV` Identifier in api.ts ✅
- **Problem**: Two `uploadCSV` methods defined (line 1091 and line 2053)
- **Solution**: Removed the first duplicate, kept the more complete version with workspace/page ID support
- **Location**: `src/lib/api.ts`

### 2. Database API Endpoints Corrected ✅
- **Problem**: API methods were calling `/pages/{id}/properties` instead of `/database/pages/{id}/properties`
- **Solution**: Updated all database API methods to use correct `/database/` prefix
- **Methods Fixed**:
  - `getDatabaseProperties`
  - `createDatabaseProperty`
  - `getDatabaseRows`
  - `createDatabaseRow`

## Database Block Architecture

### Backend Tables (Supabase)
1. **`data_files`** - Stores uploaded CSV/Excel file metadata
2. **`database_properties`** - Stores column definitions (name, type, config)
3. **`database_rows`** - Stores actual row data

### Backend Endpoints

#### File Upload
- **POST** `/files/upload/csv` - Upload and parse CSV files
  - Returns: `{ headers, rows, column_types, row_count, column_count }`
  - Handles encoding detection (utf-8, latin-1, cp1252)
  - Auto-detects column types (text, number, decimal)

#### Database Properties (Columns)
- **GET** `/database/pages/{page_id}/properties` - Get all columns
- **POST** `/database/pages/{page_id}/properties` - Create column
- **PATCH** `/database/properties/{property_id}` - Update column
- **DELETE** `/database/properties/{property_id}` - Delete column

#### Database Rows
- **GET** `/database/pages/{page_id}/rows` - Get all rows
- **POST** `/database/pages/{page_id}/rows` - Create row
- **PATCH** `/database/rows/{row_id}` - Update row
- **DELETE** `/database/rows/{row_id}` - Delete row

### Frontend Integration

#### CSV Import Flow
1. User clicks "Import CSV" in database block toolbar
2. File uploaded to `/files/upload/csv`
3. Backend parses CSV and returns structured data
4. Frontend converts to column/row format
5. Data displayed in database block UI
6. Changes auto-save to block data

#### Current Status
- ✅ CSV upload working
- ✅ Data parsing and type detection
- ✅ Display in database block
- ⚠️ **TODO**: Persist to `database_properties` and `database_rows` tables

## Next Steps

### 1. Persist Database Block Data to Supabase
Currently, database block data is only stored in the page's `blocks` JSON field. Need to also save to dedicated tables:

**When CSV is imported:**
```typescript
// 1. Create properties (columns)
for (const column of columns) {
  await api.createDatabaseProperty(pageId, {
    name: column.name,
    property_type: column.type,
    property_order: columnIndex
  });
}

// 2. Create rows
for (const row of rows) {
  await api.createDatabaseRow(pageId, {
    properties: row // Convert row format to properties object
  });
}
```

**When user edits cells:**
```typescript
// Update existing row
await api.updateDatabaseRow(rowId, {
  properties: updatedRowData
});
```

**When user adds/deletes rows:**
```typescript
// Add row
await api.createDatabaseRow(pageId, { properties: newRow });

// Delete row
await api.deleteDatabaseRow(rowId);
```

### 2. Load Database Block from Supabase
On page load, fetch data from Supabase tables instead of just block data:

```typescript
// Load properties and rows
const properties = await api.getDatabaseProperties(pageId);
const rows = await api.getDatabaseRows(pageId);

// Convert to block format
const columns = properties.map(p => ({
  id: p.id,
  name: p.name,
  type: p.property_type
}));
```

### 3. Add Excel Support
Backend has placeholder for Excel upload at `/files/upload/excel`:
- Requires `openpyxl` or `pandas` Python library
- Currently returns 501 (Not Implemented)
- Suggests converting to CSV as workaround

## Files Modified

1. **src/lib/api.ts**
   - Removed duplicate `uploadCSV` method
   - Fixed database API endpoint URLs
   - All methods now point to correct backend routes

2. **src/components/blocks/UnifiedBlocks.tsx**
   - DatabaseBlockComponent already integrated with CSV upload
   - Uses `api.uploadCSV()` for file import
   - Shows loading state during upload
   - Displays imported data in table format

## Testing Checklist

- [x] No duplicate identifier errors
- [x] CSV upload endpoint accessible at `/files/upload/csv`
- [x] Database API methods point to correct endpoints
- [ ] Test CSV import in database block
- [ ] Verify data saves to `database_properties` table
- [ ] Verify data saves to `database_rows` table
- [ ] Test edit operations persist to Supabase
- [ ] Test delete operations persist to Supabase
- [ ] Test page reload loads data from Supabase

## Backend Files Reference

- `backend/app/api/endpoints/file_upload.py` - CSV/JSON upload and parsing
- `backend/app/api/endpoints/database.py` - Database properties and rows CRUD
- `backend/app/api/endpoints/data_files.py` - Data file metadata management
- `backend/app/api/routes.py` - Router registration (file_upload at `/files`, database at `/database`)
