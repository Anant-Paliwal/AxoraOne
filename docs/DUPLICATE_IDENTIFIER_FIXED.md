# ✅ Duplicate Identifier Fixed

## Issue
TypeScript error: `Duplicate identifier 'getBacklinks'` at line 698 in `src/lib/api.ts`

## Root Cause
Two methods with the same name:
1. **Line 375**: `getBacklinks(pageId)` - for page backlinks (page-to-page links)
2. **Line 698**: `getBacklinks(nodeId, workspaceId)` - for graph node backlinks

## Solution
Renamed the graph method to `getGraphBacklinks` to distinguish it from page backlinks.

## Changes Made

### `src/lib/api.ts`
```typescript
// OLD (line 698)
async getBacklinks(nodeId: string, workspaceId?: string) { ... }

// NEW
async getGraphBacklinks(nodeId: string, workspaceId?: string) { ... }
```

## Method Usage

### `getBacklinks(pageId)` - Page Links
- **Used by**: `src/components/pages/Backlinks.tsx`
- **Purpose**: Show which pages link to a specific page
- **Endpoint**: `/api/v1/pages/{pageId}/backlinks`

### `getGraphBacklinks(nodeId, workspaceId)` - Graph Nodes
- **Used by**: Not yet implemented in UI
- **Purpose**: Show which nodes link to a specific graph node (for hover previews, focus mode)
- **Endpoint**: `/api/v1/graph/backlinks/{nodeId}`

## Status
✅ TypeScript error resolved
✅ No breaking changes (graph method wasn't used yet)
✅ Both methods now have clear, distinct names

## Next Steps
When implementing graph node hover previews or focus mode, use `api.getGraphBacklinks(nodeId, workspaceId)`.
