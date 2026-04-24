# Perplexity-Style Multi-Source Selection

## Overview
Implemented a Perplexity-inspired sources dropdown with toggleable multiple sources, allowing users to granularly control which data sources the AI searches.

## Features

### 1. Multi-Source Toggle System
- **Individual toggles** for each source type
- **"All Sources" master toggle** that enables/disables all sources at once
- **Visual feedback** with toggle switches and color coding
- **Persistent selection** across queries

### 2. Available Sources

| Source | Icon | Description |
|--------|------|-------------|
| **Web** | 🔗 | Search the internet using Brave Search |
| **Pages** | 📄 | Search your workspace pages |
| **Skills** | ⭐ | Search your tracked skills |
| **Graph** | 🔀 | Search knowledge graph connections |
| **Knowledge Base** | 🔖 | Search all workspace content |

### 3. Smart Button Label
The sources button dynamically shows:
- **"All Sources"** - When all sources are enabled
- **"No Sources"** - When no sources are selected
- **"X Source(s)"** - Shows count when partially selected (e.g., "3 Sources")

### 4. Visual Design

#### All Sources Toggle
- **Prominent position** at the top with border
- **Larger icon** (10x10) for emphasis
- **Primary color** when active
- **Master control** - clicking toggles all sources on/off

#### Individual Source Toggles
- **iOS-style toggle switches** with smooth animations
- **Active state** with primary color
- **Hover effects** for better UX
- **Descriptions** for each source type
- **Icon indicators** for quick recognition

### 5. Toggle Switch Design
```
Enabled:  [●----] (blue/primary)
Disabled: [----●] (gray/muted)
```

## User Experience

### Enabling All Sources
1. Click "All Sources" button at top
2. All individual toggles turn on
3. Button shows "All Sources"

### Disabling All Sources
1. Click "All Sources" button when all are enabled
2. All individual toggles turn off
3. Button shows "No Sources"

### Selective Sources
1. Click individual source toggles
2. Enable only the sources you need
3. Button shows count (e.g., "2 Sources")

### Visual Feedback
- **Active sources**: Primary blue color, toggle on right
- **Inactive sources**: Gray color, toggle on left
- **Hover states**: Subtle background change
- **Smooth animations**: Toggle transitions

## Technical Implementation

### State Management
```typescript
const [enabledSources, setEnabledSources] = useState<string[]>([
  'web', 'pages', 'skills', 'graph', 'kb'
]);
```

### Source Configuration
```typescript
const availableSources = [
  { id: 'web', label: 'Web', icon: ExternalLink, description: 'Search the internet' },
  { id: 'pages', label: 'Pages', icon: FileText, description: 'Your workspace pages' },
  { id: 'skills', label: 'Skills', icon: Brain, description: 'Your tracked skills' },
  { id: 'graph', label: 'Graph', icon: GitBranch, description: 'Knowledge connections' },
  { id: 'kb', label: 'Knowledge Base', icon: Bookmark, description: 'All workspace content' },
];
```

### Toggle Logic
```typescript
// Toggle individual source
onClick={() => {
  if (isEnabled) {
    setEnabledSources(enabledSources.filter(id => id !== source.id));
  } else {
    setEnabledSources([...enabledSources, source.id]);
  }
}}

// Toggle all sources
onClick={() => {
  if (enabledSources.length === availableSources.length) {
    setEnabledSources([]); // Disable all
  } else {
    setEnabledSources(availableSources.map(s => s.id)); // Enable all
  }
}}
```

## UI Components

### Dropdown Structure
```
┌─────────────────────────────────┐
│ SEARCH SOURCES                  │
├─────────────────────────────────┤
│ [🔍] All Sources         [●---] │ ← Master toggle
├─────────────────────────────────┤
│ [🔗] Web                 [●---] │
│     Search the internet         │
│                                 │
│ [📄] Pages               [---●] │
│     Your workspace pages        │
│                                 │
│ [⭐] Skills              [●---] │
│     Your tracked skills         │
│                                 │
│ [🔀] Graph               [●---] │
│     Knowledge connections       │
│                                 │
│ [🔖] Knowledge Base      [●---] │
│     All workspace content       │
└─────────────────────────────────┘
```

## Benefits

1. **Granular Control**: Users choose exactly which sources to search
2. **Faster Queries**: Fewer sources = faster responses
3. **Relevant Results**: Focus on specific content types
4. **Better UX**: Clear visual feedback on what's being searched
5. **Flexible**: Easy to add new sources in the future

## Future Enhancements

Could add:
- **Source priority/ordering**: Rank sources by importance
- **Recent sources**: Quick access to frequently used combinations
- **Saved presets**: Save favorite source combinations
- **Source-specific settings**: Configure each source individually
- **Search result breakdown**: Show which sources contributed results
- **Source performance metrics**: Display response times per source

## Comparison to Perplexity

### Similarities
✅ Toggle-based source selection
✅ "All Sources" master control
✅ Visual toggle switches
✅ Clean, modern design
✅ Dropdown interface

### Enhancements
🎯 Descriptions for each source
🎯 Larger, more prominent "All Sources" toggle
🎯 Dynamic button label showing selection count
🎯 Workspace-specific sources (Pages, Skills, Graph)
🎯 Integrated with existing workspace context
