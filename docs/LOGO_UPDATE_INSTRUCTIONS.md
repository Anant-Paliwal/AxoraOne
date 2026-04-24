# Logo Update Instructions

## Manual Step Required

Since the new logo is a PNG image file, you need to manually save it:

1. **Save the logo image you provided as:** `public/axora-logo.png`
   - This will replace the existing logo file
   - The image should be the white "A" logo on black background

2. **Optional: Update favicon**
   - Save a smaller version (32x32 or 64x64) as `public/favicon.ico`
   - Or convert the logo to SVG and save as `public/favicon.svg`

## What's Already Updated

✅ **Login Page** (`src/pages/Login.tsx`)
   - Updated styling to use `object-contain` for better logo display
   - Removed rounded corners that might crop the logo

✅ **Sidebar** (`src/components/layout/AppSidebar.tsx`)
   - Removed background color and rounded corners
   - Logo now displays cleanly without background

## After Replacing the File

1. Clear browser cache or hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
2. The new logo will appear throughout the platform:
   - Login page
   - Sidebar navigation
   - Browser tab (favicon)

## Logo Locations in Platform

The logo appears in these locations:
- **Login Page**: Large logo with glow effect
- **Sidebar**: Small logo next to "Axora" text
- **Browser Tab**: Favicon (if you update favicon files)
