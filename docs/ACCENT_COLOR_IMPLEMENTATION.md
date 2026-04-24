# Accent Color Preferences Implementation

## Overview
Implement user-customizable accent colors in Settings that apply workspace-wide, affecting all UI elements that use the primary color.

## Current State
- Settings page already has `accent_color` field defined in UserSettings interface
- Default accent color: `#8B5CF6` (purple)
- Theme system uses CSS variables for colors

## Implementation Plan

### 1. Settings UI Enhancement
Add color picker in Preferences section:

```tsx
{/* Accent Color Picker */}
<div className="space-y-3">
  <Label>Accent Color</Label>
  <p className="text-sm text-muted-foreground">
    Choose your preferred accent color for the workspace
  </p>
  <div className="flex items-center gap-4">
    {/* Color preview */}
    <div 
      className="w-16 h-16 rounded-xl border-2 border-border shadow-sm"
      style={{ backgroundColor: settings.accent_color }}
    />
    
    {/* Color input */}
    <Input
      type="color"
      value={settings.accent_color}
      onChange={(e) => {
        setSettings({ ...settings, accent_color: e.target.value });
        setHasChanges(true);
      }}
      className="w-24 h-12 cursor-pointer"
    />
    
    {/* Preset colors */}
    <div className="flex gap-2">
      {PRESET_COLORS.map(color => (
        <button
          key={color}
          onClick={() => {
            setSettings({ ...settings, accent_color: color });
            setHasChanges(true);
          }}
          className="w-8 h-8 rounded-lg border-2 border-border hover:scale-110 transition-transform"
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}
    </div>
  </div>
</div>
```

### 2. Preset Color Palette
```tsx
const PRESET_COLORS = [
  '#8B5CF6', // Purple (default)
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Teal
];
```

### 3. CSS Variable Update
When user changes accent color, update CSS variables:

```tsx
const applyAccentColor = (color: string) => {
  // Convert hex to HSL
  const hsl = hexToHSL(color);
  
  // Update CSS variables
  document.documentElement.style.setProperty('--primary', hsl);
  document.documentElement.style.setProperty('--primary-foreground', '0 0% 100%');
  
  // Store in localStorage for persistence
  localStorage.setItem('accent-color', color);
};

// Helper function to convert hex to HSL
const hexToHSL = (hex: string): string => {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  // Find min and max
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  // Convert to HSL string
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  
  return `${h} ${s}% ${l}%`;
};
```

### 4. Load Accent Color on App Start
In main App component or theme provider:

```tsx
useEffect(() => {
  // Load saved accent color
  const savedColor = localStorage.getItem('accent-color');
  if (savedColor) {
    applyAccentColor(savedColor);
  }
}, []);
```

### 5. Save to Database
Update the save settings function:

```tsx
const saveSettings = async () => {
  try {
    setSaving(true);
    
    // Update user profile
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: settings.full_name,
        avatar_url: settings.avatar_url,
        theme: settings.theme,
        accent_color: settings.accent_color, // Save accent color
        font_size: settings.font_size,
        // ... other settings
      })
      .eq('id', user.id);
    
    if (error) throw error;
    
    // Apply accent color immediately
    applyAccentColor(settings.accent_color);
    
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated",
    });
    
    setHasChanges(false);
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to save settings",
      variant: "destructive"
    });
  } finally {
    setSaving(false);
  }
};
```

### 6. Affected UI Elements
The accent color will automatically apply to:

- **Buttons** (primary variant)
- **Links** (hover states)
- **Progress bars**
- **Badges** (primary variant)
- **Icons** (primary color)
- **Borders** (focus states)
- **Backgrounds** (primary/10 opacity)
- **Skill Hub widget** (icon backgrounds, buttons)
- **Navigation** (active states)
- **Form inputs** (focus rings)
- **Checkboxes** (checked state)
- **Radio buttons** (selected state)
- **Sliders** (track fill)
- **Tabs** (active indicator)

### 7. Database Schema
Ensure `profiles` table has `accent_color` column:

```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#8B5CF6';
```

### 8. Workspace-Wide Application
Since CSS variables are global, changing the accent color affects:
- All pages in the workspace
- All widgets
- All components
- All interactive elements

### 9. Preview Mode
Add live preview in settings:

```tsx
<div className="mt-6 p-4 bg-secondary rounded-xl">
  <h4 className="text-sm font-medium mb-3">Preview</h4>
  <div className="space-y-3">
    {/* Button preview */}
    <Button className="w-full">Primary Button</Button>
    
    {/* Badge preview */}
    <div className="flex gap-2">
      <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
        Badge
      </span>
      <span className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm">
        Badge Solid
      </span>
    </div>
    
    {/* Progress preview */}
    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
      <div 
        className="h-full bg-primary transition-all"
        style={{ width: '60%' }}
      />
    </div>
    
    {/* Link preview */}
    <a href="#" className="text-primary hover:underline text-sm">
      Link Example
    </a>
  </div>
</div>
```

### 10. Reset to Default
Add reset button:

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => {
    setSettings({ ...settings, accent_color: '#8B5CF6' });
    setHasChanges(true);
  }}
>
  Reset to Default
</Button>
```

## Benefits

1. **Personalization** - Users can customize their workspace appearance
2. **Brand Consistency** - Teams can match their brand colors
3. **Accessibility** - Users can choose colors that work better for them
4. **Instant Feedback** - Changes apply immediately with preview
5. **Persistent** - Saved to database and localStorage
6. **Workspace-Wide** - Affects all UI elements consistently

## Testing Checklist

- [ ] Color picker opens and closes correctly
- [ ] Preset colors apply when clicked
- [ ] Custom color input works
- [ ] Preview updates in real-time
- [ ] Save button persists color to database
- [ ] Color loads on page refresh
- [ ] Color applies to all UI elements
- [ ] Reset to default works
- [ ] Works in light and dark themes
- [ ] HSL conversion is accurate

## Files to Modify

1. **src/pages/SettingsPage.tsx**
   - Add color picker UI
   - Add preset colors
   - Add preview section
   - Add save logic

2. **src/lib/theme.ts** (create if doesn't exist)
   - Add `applyAccentColor()` function
   - Add `hexToHSL()` helper
   - Add color management utilities

3. **src/App.tsx** or **src/main.tsx**
   - Load saved accent color on app start
   - Apply to CSS variables

4. **Database Migration**
   - Ensure `accent_color` column exists in `profiles` table

## Example Usage

```tsx
// In SettingsPage.tsx
<div className="space-y-6">
  <div>
    <h3 className="text-lg font-semibold mb-4">Appearance</h3>
    
    {/* Theme selector (existing) */}
    <div className="space-y-3 mb-6">
      <Label>Theme</Label>
      {/* ... existing theme selector ... */}
    </div>
    
    {/* NEW: Accent Color Picker */}
    <div className="space-y-3">
      <Label>Accent Color</Label>
      <p className="text-sm text-muted-foreground">
        Customize the primary color used throughout the workspace
      </p>
      
      <div className="flex items-center gap-4">
        {/* Color preview */}
        <div 
          className="w-16 h-16 rounded-xl border-2 border-border shadow-sm cursor-pointer hover:scale-105 transition-transform"
          style={{ backgroundColor: settings.accent_color }}
          onClick={() => document.getElementById('color-input')?.click()}
        />
        
        {/* Hidden color input */}
        <Input
          id="color-input"
          type="color"
          value={settings.accent_color}
          onChange={(e) => {
            setSettings({ ...settings, accent_color: e.target.value });
            setHasChanges(true);
            applyAccentColor(e.target.value); // Live preview
          }}
          className="w-0 h-0 opacity-0 absolute"
        />
        
        {/* Preset colors */}
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map(color => (
            <button
              key={color}
              onClick={() => {
                setSettings({ ...settings, accent_color: color });
                setHasChanges(true);
                applyAccentColor(color); // Live preview
              }}
              className={cn(
                "w-10 h-10 rounded-lg border-2 hover:scale-110 transition-all",
                settings.accent_color === color 
                  ? "border-foreground ring-2 ring-offset-2 ring-foreground" 
                  : "border-border"
              )}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        
        {/* Reset button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSettings({ ...settings, accent_color: '#8B5CF6' });
            setHasChanges(true);
            applyAccentColor('#8B5CF6');
          }}
          className="ml-auto"
        >
          Reset
        </Button>
      </div>
      
      {/* Live Preview */}
      <div className="mt-4 p-4 bg-secondary/50 rounded-xl border border-border">
        <h4 className="text-sm font-medium mb-3 text-foreground">Preview</h4>
        <div className="space-y-3">
          <Button className="w-full">Primary Button</Button>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
              Badge
            </span>
            <span className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm font-medium">
              Badge Solid
            </span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: '70%' }} />
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

## Summary

This implementation provides:
1. ✅ User-customizable accent colors
2. ✅ 8 preset colors + custom color picker
3. ✅ Live preview of changes
4. ✅ Workspace-wide application
5. ✅ Persistent storage (database + localStorage)
6. ✅ Easy reset to default
7. ✅ Affects all UI elements automatically

The accent color system integrates seamlessly with the existing theme system and provides users with full control over their workspace appearance.
