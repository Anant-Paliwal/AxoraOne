/**
 * Theme utilities for managing accent colors and theme preferences
 */

/**
 * Convert hex color to HSL format for CSS variables
 */
export function hexToHSL(hex: string): string {
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
  
  // Convert to HSL string format for CSS variables
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  
  return `${h} ${s}% ${l}%`;
}

/**
 * Apply accent color to the entire workspace
 */
export function applyAccentColor(color: string): void {
  try {
    // Convert hex to HSL
    const hsl = hexToHSL(color);
    
    // Update CSS variables on root element
    const root = document.documentElement;
    root.style.setProperty('--primary', hsl);
    
    // Calculate foreground color (white for dark colors, black for light colors)
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Use white text for dark colors, black for light colors
    const foreground = luminance > 0.5 ? '0 0% 0%' : '0 0% 100%';
    root.style.setProperty('--primary-foreground', foreground);
    
    // Store in localStorage for persistence
    localStorage.setItem('accent-color', color);
    
    console.log(`Applied accent color: ${color} (${hsl})`);
  } catch (error) {
    console.error('Failed to apply accent color:', error);
  }
}

/**
 * Load saved accent color from localStorage
 */
export function loadSavedAccentColor(): string | null {
  try {
    const savedColor = localStorage.getItem('accent-color');
    if (savedColor) {
      applyAccentColor(savedColor);
      return savedColor;
    }
  } catch (error) {
    console.error('Failed to load saved accent color:', error);
  }
  return null;
}

/**
 * Reset accent color to default
 */
export function resetAccentColor(): void {
  const defaultColor = '#8B5CF6'; // Purple
  applyAccentColor(defaultColor);
}

/**
 * Preset accent colors
 */
export const PRESET_COLORS = [
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Sky', value: '#0EA5E9' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Lime', value: '#84CC16' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Rose', value: '#F43F5E' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Fuchsia', value: '#D946EF' },
  { name: 'Violet', value: '#A855F7' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Slate', value: '#64748B' },
  { name: 'Gray', value: '#6B7280' },
];
