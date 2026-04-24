# Sidebar Navigation Update - Workspace Context

## Changes Made

Updated the sidebar to show different navigation options based on whether the user is on the home page or inside a workspace.

## New Behavior

### On Home Page (`/home` - No Workspace Selected)

**Sidebar shows:**
- ✅ Home button (active)
- ✅ Workspaces section (with list of workspaces)
- ✅ Settings button
- ✅ User profile

**Hidden:**
- ❌ Ask Anything
- ❌ Pages
- ❌ Skills
- ❌ Knowledge Graph
- ❌ Tasks
- ❌ Calendar

### Inside a Workspace (`/workspace/{id}`)

**Sidebar shows:**
- ✅ Ask Anything (primary action with Infinity icon)
- ✅ Home (workspace home)
- ✅ Pages
- ✅ Skills
- ✅ Knowledge Graph
- ✅ Tasks
- ✅ Calendar
- ✅ Workspaces section (with list of workspaces)
- ✅ Settings button
- ✅ User profile

## Implementation

### Conditional Rendering Logic

```typescript
{!currentWorkspace ? (
  // Home page - show only Home button
  <Link to="/home">
    <Home /> Home
  </Link>
) : (
  // Inside workspace - show all navigation
  mainNavItems.map((item) => (
    <Link to={getNavPath(item.path)}>
      <Icon /> {item.label}
    </Link>
  ))
)}
```

### Navigation Path Logic

- **Without workspace**: `/home`, `/settings`
- **With workspace**: `/workspace/{id}`, `/workspace/{id}/ask`, `/workspace/{id}/pages`, etc.

## User Experience

### Flow 1: Starting from Home
1. User lands on `/home`
2. Sidebar shows: Home (active), Workspaces, Settings
3. User clicks a workspace → Navigates to `/workspace/{id}`
4. Sidebar expands to show all navigation options

### Flow 2: Inside a Workspace
1. User is in `/workspace/{id}/skills`
2. Sidebar shows all navigation with Skills active
3. User can navigate to any section within the workspace
4. Clicking another workspace switches context

### Flow 3: Returning to Home
1. User is inside a workspace
2. Clicks "Home" button
3. Returns to workspace home `/workspace/{id}`
4. To go to global home, click Zynapse logo or navigate to `/home`

## Benefits

1. **Cleaner Home Page**: Less clutter when selecting a workspace
2. **Clear Context**: Navigation options appear only when relevant
3. **Better UX**: Users focus on selecting a workspace first
4. **Workspace Isolation**: All workspace features are clearly scoped
5. **Consistent Settings**: Settings always accessible regardless of context

## Visual Structure

### Home Page Sidebar
```
┌─────────────────────┐
│ ∞ Zynapse          │
├─────────────────────┤
│ 🏠 Home            │ ← Only navigation item
├─────────────────────┤
│ WORKSPACES         │
│ 🎯 Data Analytics  │
│ 📁 Data Engineer   │
│ + Create           │
├─────────────────────┤
│ ⚙️ Settings        │
│ 👤 User Profile    │
└─────────────────────┘
```

### Workspace Sidebar
```
┌─────────────────────┐
│ ∞ Zynapse          │
├─────────────────────┤
│ ∞ Ask Anything     │ ← Primary
│ 🏠 Home            │
│ 📄 Pages           │
│ 🧠 Skills          │
│ 🌐 Knowledge Graph │
│ ✅ Tasks           │
│ 📅 Calendar        │
├─────────────────────┤
│ WORKSPACES         │
│ 🎯 Data Analytics  │ ← Active
│ 📁 Data Engineer   │
│ + Create           │
├─────────────────────┤
│ ⚙️ Settings        │
│ 👤 User Profile    │
└─────────────────────┘
```

## Testing Checklist

- [x] Home page shows only Home button in navigation
- [x] Workspaces section always visible
- [x] Settings always accessible
- [x] Inside workspace shows all navigation
- [x] Navigation paths include workspace ID
- [x] Active states work correctly
- [x] Switching workspaces updates navigation
- [x] Clicking Home goes to workspace home
- [x] User profile always visible

## Code Changes

**File**: `src/components/layout/AppSidebar.tsx`

**Key Changes**:
1. Added conditional rendering based on `currentWorkspace`
2. Simplified home page navigation to single Home button
3. Full navigation appears only inside workspaces
4. Workspaces and Settings sections always visible
