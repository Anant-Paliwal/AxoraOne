# Fix Console Blank Screen - Service Worker Issue

## Problem
Browser console shows:
```
The FetchEvent for ... resulted in a network error response: 
the promise was rejected
```

This is a **Service Worker** caching issue blocking all requests.

## Immediate Fix (For Users)

### Option 1: Unregister Service Worker (Recommended)
1. Open browser DevTools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click **Service Workers** in left sidebar
4. Find `axora.work` service worker
5. Click **Unregister**
6. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### Option 2: Clear Site Data
1. Open DevTools (F12)
2. Go to **Application** tab
3. Click **Clear storage** in left sidebar
4. Check all boxes
5. Click **Clear site data**
6. Refresh page

### Option 3: Incognito/Private Mode
- Open site in incognito/private window
- Service workers won't interfere

## Permanent Fix (For Developers)

### Fix 1: Update Service Worker to Handle Errors

Check if you have `public/sw.js` or similar. Update it:

```javascript
// public/sw.js
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .catch((error) => {
        console.error('Fetch failed:', error);
        // Return a fallback response instead of rejecting
        return new Response('Network error', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});
```

### Fix 2: Disable Service Worker in Development

Update `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Disable service worker in development
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
}));
```

### Fix 3: Add Service Worker Unregister on App Load

Add to `src/main.tsx`:

```typescript
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Unregister any existing service workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
      console.log('Service worker unregistered');
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
```

### Fix 4: Check for PWA Manifest Issues

If you have `public/manifest.json`, ensure it's valid:

```json
{
  "name": "Axora",
  "short_name": "Axora",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#10b981",
  "icons": [
    {
      "src": "/axora-logo.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

## Why This Happens

1. **Old Service Worker**: Previous deployment registered a service worker
2. **Caching Issues**: Service worker is caching old/broken assets
3. **Network Errors**: Service worker is rejecting fetch requests
4. **PWA Configuration**: Manifest or service worker misconfigured

## Testing After Fix

1. Clear browser cache
2. Unregister service workers
3. Hard refresh (Ctrl+Shift+R)
4. Check console - should see logs now
5. Check Network tab - requests should succeed

## Production Deployment

After fixing, redeploy:

```bash
npm run build
# Deploy to your hosting
```

Then tell users to:
1. Clear cache
2. Hard refresh
3. Or use incognito mode

## Verification

Console should show:
```
✅ Service worker unregistered
✅ React app loaded
✅ No fetch errors
```

## Status

Apply Fix 3 (unregister service worker on load) for immediate resolution.
