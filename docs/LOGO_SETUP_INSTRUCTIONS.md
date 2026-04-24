# Axora Logo Setup Instructions

## 📸 Add Your Logo Image

### Step 1: Save Your Logo
Save your Axora logo image (the one you provided) to:
```
public/axora-logo.png
```

**Requirements:**
- Format: PNG with transparent background (recommended)
- Size: 512x512px or larger (will be scaled down)
- The geometric "A" design you showed

### Step 2: Create Favicon
For the browser tab icon, save a smaller version:
```
public/favicon.ico
```

**Or use the SVG favicon** (already created):
```
public/favicon.svg
```

---

## 🎨 Rounded Corners Applied

### Where Rounded Corners Are Used:

#### 1. **Logo Containers**
- Login page logo: `rounded-xl` (12px radius)
- Sidebar logo: `rounded-lg` (8px radius) on container, `rounded-md` (6px) on image

#### 2. **Cards & Containers**
All major UI elements use rounded corners:
- Cards: `rounded-2xl` (16px)
- Buttons: `rounded-xl` (12px)
- Inputs: `rounded-xl` (12px)
- Dialogs: `rounded-2xl` (16px)

#### 3. **Global Tailwind Config**
The design system uses these border radius values:
- `rounded-sm`: 4px
- `rounded`: 6px
- `rounded-md`: 6px
- `rounded-lg`: 8px
- `rounded-xl`: 12px
- `rounded-2xl`: 16px
- `rounded-3xl`: 24px

---

## 🔧 Files Updated

### 1. **Login Page** (`src/pages/Login.tsx`)
```tsx
<img src="/axora-logo.png" alt="Axora" className="w-12 h-12 rounded-xl" />
```
- Uses PNG logo
- Rounded corners: `rounded-xl`

### 2. **Sidebar** (`src/components/layout/AppSidebar.tsx`)
```tsx
<div className="... rounded-lg ...">
  <img src="/axora-logo.png" alt="Axora" className="... rounded-md" />
</div>
```
- Uses PNG logo
- Container: `rounded-lg`
- Image: `rounded-md`

### 3. **Favicon** (`public/favicon.svg`)
- Updated with Axora "A" design
- Rounded container: `rx="6"`

---

## 📋 Quick Setup Checklist

- [ ] Save your logo image as `public/axora-logo.png`
- [ ] (Optional) Create `public/favicon.ico` for older browsers
- [ ] (Optional) Create `public/apple-touch-icon.png` (180x180px) for iOS
- [ ] Restart dev server: `npm run dev`
- [ ] Check login page - logo should appear
- [ ] Check sidebar - logo should appear
- [ ] Check browser tab - favicon should appear

---

## 🎯 Logo Specifications

### Main Logo (`axora-logo.png`)
- **Recommended size**: 512x512px
- **Format**: PNG with transparent background
- **Usage**: Login page, sidebar, general branding

### Favicon (`favicon.ico`)
- **Size**: 32x32px or 16x16px
- **Format**: ICO or SVG
- **Usage**: Browser tab icon

### Apple Touch Icon (`apple-touch-icon.png`)
- **Size**: 180x180px
- **Format**: PNG
- **Usage**: iOS home screen icon

---

## 🔄 How to Replace Logo

If you need to update the logo later:

1. **Replace the file**:
   ```bash
   # Save new logo as:
   public/axora-logo.png
   ```

2. **Clear browser cache**:
   - Press `Ctrl+Shift+R` (Windows/Linux)
   - Press `Cmd+Shift+R` (Mac)

3. **Restart dev server**:
   ```bash
   npm run dev
   ```

---

## 🎨 Customizing Rounded Corners

To adjust rounded corners globally, edit `tailwind.config.ts`:

```typescript
export default {
  theme: {
    extend: {
      borderRadius: {
        'custom': '20px', // Add custom radius
      }
    }
  }
}
```

Then use in components:
```tsx
<div className="rounded-custom">...</div>
```

---

## ✅ Verification

After adding your logo, verify:

1. **Login Page**:
   - Logo appears next to "Axora" text
   - Logo has rounded corners
   - Logo is properly sized (48x48px displayed)

2. **Sidebar**:
   - Logo appears in header
   - Logo has rounded corners
   - Logo fits in 32x32px container

3. **Browser Tab**:
   - Favicon appears in tab
   - Favicon is recognizable at small size

---

## 🚨 Troubleshooting

### Logo not appearing?
1. Check file path: `public/axora-logo.png`
2. Check file name (case-sensitive)
3. Clear browser cache
4. Restart dev server

### Logo looks blurry?
1. Use higher resolution image (512x512px+)
2. Ensure PNG has transparent background
3. Check image quality/compression

### Favicon not updating?
1. Hard refresh: `Ctrl+Shift+R`
2. Clear browser cache completely
3. Check `public/favicon.svg` or `public/favicon.ico` exists

---

## 📝 Notes

- The logo image should have a **transparent background** for best results
- The **geometric "A" design** you provided will look great with rounded corners
- All UI components already use consistent rounded corners throughout the app
- The design follows modern UI principles with smooth, rounded edges

---

## 🎉 Complete!

Once you add your logo image to `public/axora-logo.png`, the Axora branding will be complete with:
- ✅ Logo on login page
- ✅ Logo in sidebar
- ✅ Favicon in browser tab
- ✅ Rounded corners everywhere
- ✅ Consistent branding throughout
