# Dark Theme Implementation

## Overview
A complete Perplexity-inspired dark theme has been added to the platform with automatic theme detection and manual toggle functionality.

## Features

### Theme System
- **Light Mode**: Clean white backgrounds with purple accents
- **Dark Mode**: Very dark backgrounds (almost black, like Perplexity) with enhanced contrast
- **Auto-detection**: Respects system preference on first load
- **Persistence**: Theme choice saved to localStorage
- **Smooth transitions**: All color changes animate smoothly

### Color Scheme

#### Light Theme
- Background: White (#FFFFFF)
- Text: Dark gray (#1a1a1a)
- Primary: Purple (#8B5CF6)
- Cards: White with subtle shadows

#### Dark Theme (Perplexity-Style)
- Background: Very dark gray (#121212) - almost black
- Cards: Slightly lighter (#1a1a1a)
- Text: Near white (#FAFAFA)
- Primary: Lighter purple (#A78BFA)
- Borders: Subtle dark borders (#2e2e2e)
- Enhanced contrast for excellent readability

### Theme Toggle Locations
1. **Sidebar** (bottom section near Settings)
2. **Login Page** (top-right corner)
3. **Page Editor** (header toolbar)

## Enhanced Skill Creation Form

The skill creation form has been redesigned with a modern, clean interface inspired by Perplexity:

### Features
- **Skill Name**: Clean input with icon
- **Purpose & Goals Section**: 
  - Level selector (Beginner, Intermediate, Advanced, Expert)
  - Purpose input field
  - Long-term goals input
- **Keywords System**: 
  - Add/remove keywords dynamically
  - Tag-style display with remove buttons
  - Press Enter to add keywords
- **Evidence Section**: Placeholder for linking pages and quizzes
- **Modern UI**: 
  - Rounded corners (xl radius)
  - Proper spacing and typography
  - Focus states with ring effects
  - Smooth transitions

## Implementation Details

### Files Created
- `src/contexts/ThemeContext.tsx` - Theme state management
- `src/components/ThemeToggle.tsx` - Toggle button component

### Files Modified
- `src/App.tsx` - Added ThemeProvider wrapper
- `src/index.css` - Perplexity-style dark theme colors (very dark, almost black)
- `src/components/layout/AppSidebar.tsx` - Added theme toggle
- `src/pages/Login.tsx` - Added theme toggle
- `src/pages/PageEditor.tsx` - Added theme toggle
- `src/pages/SkillsPage.tsx` - Enhanced skill creation form

### CSS Variables
All colors use CSS custom properties (HSL format) defined in `src/index.css`:
- Very dark backgrounds in dark mode (7% lightness)
- Neutral grays without color tint for true dark theme
- Consistent color tokens across the entire platform
- Easy to customize and maintain

## Usage

### For Users
Click the sun/moon icon to toggle between light and dark themes. Your preference is automatically saved.

### For Developers
```tsx
import { useTheme } from '@/contexts/ThemeContext';

function MyComponent() {
  const { theme, toggleTheme, setTheme } = useTheme();
  
  // Current theme: 'light' or 'dark'
  console.log(theme);
  
  // Toggle between themes
  toggleTheme();
  
  // Set specific theme
  setTheme('dark');
}
```

## Browser Support
- Modern browsers with CSS custom properties support
- Respects `prefers-color-scheme` media query
- Graceful fallback to light theme
