# 🚨 FIX CORS ERROR - IMMEDIATE ACTION REQUIRED

## The Problem

Your frontend at `https://axorawork.netlify.app` cannot talk to your backend at `https://axora-0j81.onrender.com` because of CORS (Cross-Origin Resource Sharing) blocking.

**Error in browser:**
```
Access to fetch at 'https://axora-0j81.onrender.com/...' from origin 'https://axorawork.netlify.app' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

## The Fix (5 Minutes)

### Step 1: Go to Render Dashboard

1. Open [render.com](https://render.com)
2. Click on your backend service: **axora-0j81**
3. Click **"Environment"** tab on the left

### Step 2: Add/Update These Variables

Click **"Add Environment Variable"** and add:

```
Key: CORS_ORIGINS
Value: ["https://axorawork.netlify.app"]
```

**IMPORTANT:** 
- The value MUST be a JSON array with square brackets and quotes
- Copy this EXACTLY: `["https://axorawork.netlify.app"]`
- Do NOT add spaces or change the format

Also add:

```
Key: APP_ENV
Value: production
```

### Step 3: Save and Redeploy

1. Click **"Save Changes"** button
2. Render will automatically redeploy (takes 2-3 minutes)
3. Watch the logs for successful startup

### Step 4: Verify It Works

After deployment completes:

1. Open `https://axorawork.netlify.app`
2. Open browser console (F12)
3. Refresh the page
4. CORS errors should be GONE ✅

---

## Additional Issues to Fix

### 1. Missing Logo (404 Error)

The app is looking for `axora-logo.svg` but you only have PNG files.

**Quick Fix:**

Either:
- Rename your logo file to `.svg` format
- OR update the code to use `.png`

**To use PNG instead:**

Update `public/manifest.json`:
```json
{
  "icons": [
    {
      "src": "/axora-logo.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 2. Deprecated Meta Tag

Replace in `index.html`:
```html
<!-- OLD -->
<meta name="apple-mobile-web-app-capable" content="yes">

<!-- NEW -->
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
```

---

## Complete Environment Variables for Render

Here's the FULL list of environment variables your backend needs:

```env
# CRITICAL - CORS Configuration
CORS_ORIGINS=["https://axorawork.netlify.app"]
APP_ENV=production

# Application Security
SECRET_KEY=your-super-secret-key-min-32-chars-change-this

# Supabase
SUPABASE_URL=https://elwlchiiextcpkjnpyyt.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsd2xjaGlpZXh0Y3Bram5weXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMTQ1MTcsImV4cCI6MjA4MTc5MDUxN30.KkI0fmHuHl3pLRzevtM-vS3GvDlod4w_zaqPwJRnABQ
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsd2xjaGlpZXh0Y3Bram5weXl0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIxNDUxNywiZXhwIjoyMDgxNzkwNTE3fQ.yfAxkM8pX5U6O23XdYIac3qXtx2yMj_AsOMInlzfK0c

# AI APIs
GEMINI_API_KEY=AIzaSyDmKIoWVQ4gvVbjOfYi92u2gNns0qy3WxU
OPENROUTER_API_KEY=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
OPENAI_API_KEY=sk-proj-your-key-here
BRAVE_API_KEY=BSAO3Jrz7smv6NApSEPDMJGx_I96EWX

# Vector Store (Upstash)
UPSTASH_VECTOR_REST_URL=https://alert-seagull-55007-us1-vector.upstash.io
UPSTASH_VECTOR_REST_TOKEN=ABcFMGFsZXJ0LXNlYWd1bGwtNTUwMDctdXMxYWRtaW5OREV3WkRBek9Ea3RZakEwT0MwME5qZzBMV0l4TldVdE0yRmxOMlU0WVdSbE1qZzU=

# Redis Cache (Upstash)
UPSTASH_REDIS_REST_URL=https://helpful-wildcat-39932.upstash.io
UPSTASH_REDIS_REST_TOKEN=AZv8AAIncDJmN2YwN2I5YWJlZDQ0NjM1YTZhODZkNDRhMzVlODRmYnAyMzk5MzI

# Embedding Model
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

---

## How to Add All Variables at Once

### Option 1: One by One (Slower)
1. Click "Add Environment Variable"
2. Enter Key and Value
3. Click "Add"
4. Repeat for each variable

### Option 2: Bulk Import (Faster)
1. Click "Add Environment Variable"
2. Look for "Bulk Edit" or "Import" option
3. Paste all variables in `KEY=VALUE` format
4. Save

---

## Verification Checklist

After adding variables and redeploying:

### ✅ Backend Health Check
```bash
curl https://axora-0j81.onrender.com/health
# Should return: {"status":"healthy","version":"1.0.0"}
```

### ✅ Check Render Logs
Look for these messages:
```
[INFO] Using worker: uvicorn.workers.UvicornWorker
INFO:     Application startup complete.
🧠 Living Intelligence OS activated
📊 Skill Metrics Updater activated
🔔 Reminder Notifier activated
```

### ✅ Test Frontend
1. Open `https://axorawork.netlify.app`
2. Open browser console (F12)
3. Check for:
   - ✅ No CORS errors
   - ✅ API calls succeed
   - ✅ Can login/signup
   - ✅ Data loads

---

## Still Getting CORS Errors?

### Double-Check the Format

The `CORS_ORIGINS` value MUST be:
```
["https://axorawork.netlify.app"]
```

**Common mistakes:**
- ❌ `https://axorawork.netlify.app` (missing brackets)
- ❌ `['https://axorawork.netlify.app']` (single quotes)
- ❌ `["https://axorawork.netlify.app/"]` (trailing slash)
- ✅ `["https://axorawork.netlify.app"]` (CORRECT)

### Check Backend Code

The backend should have this in `main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,  # This reads from env var
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

This is already in your code, so just setting the env var should work!

---

## Timeline

- **Step 1-2:** Add env vars (2 minutes)
- **Step 3:** Render redeploys (2-3 minutes)
- **Step 4:** Test (1 minute)

**Total: ~5 minutes** ⏱️

---

## 🎉 Success!

Once CORS is fixed, your app will:
- ✅ Load user settings
- ✅ Load workspaces
- ✅ Load chat sessions
- ✅ Load AI models
- ✅ Allow full functionality

**Go fix it now! Your app is waiting! 🚀**
