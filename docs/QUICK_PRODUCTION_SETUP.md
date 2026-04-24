# ⚡ Quick Production Setup - 3 Steps

## Your URLs
- Frontend: `https://axorawork.netlify.app`
- Backend: `https://axora-0j81.onrender.com`

---

## Step 1️⃣: Render Backend Config (2 minutes)

Go to: [render.com](https://render.com) → Your service → **Environment** tab

**Add these 2 critical variables:**

```
CORS_ORIGINS=["https://axorawork.netlify.app"]
APP_ENV=production
```

**Verify these are already set:**
- SUPABASE_URL
- SUPABASE_KEY
- SUPABASE_SERVICE_KEY
- GEMINI_API_KEY
- OPENROUTER_API_KEY
- UPSTASH_VECTOR_REST_URL
- UPSTASH_VECTOR_REST_TOKEN
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN

Click **Save** → Render will auto-redeploy

---

## Step 2️⃣: Netlify Frontend Config (2 minutes)

Go to: [netlify.com](https://netlify.com) → Your site → **Site settings** → **Environment variables**

**Add these 3 variables:**

```
VITE_API_URL=https://axora-0j81.onrender.com/api/v1
VITE_SUPABASE_URL=https://elwlchiiextcpkjnpyyt.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsd2xjaGlpZXh0Y3Bram5weXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMTQ1MTcsImV4cCI6MjA4MTc5MDUxN30.KkI0fmHuHl3pLRzevtM-vS3GvDlod4w_zaqPwJRnABQ
```

Click **Save** → Then **Trigger deploy** → **Deploy site**

---

## Step 3️⃣: Supabase Auth Config (1 minute)

Go to: [supabase.com](https://supabase.com) → Your project → **Authentication** → **URL Configuration**

**Update:**
```
Site URL: https://axorawork.netlify.app
Redirect URLs: https://axorawork.netlify.app/**
```

Click **Save**

---

## ✅ Test It Works

Wait 3-5 minutes for deployments, then:

```bash
# Test backend
curl https://axora-0j81.onrender.com/health
# Should return: {"status":"healthy","version":"1.0.0"}
```

Then open: `https://axorawork.netlify.app`

**Check browser console (F12):**
- ✅ No CORS errors
- ✅ API calls go to `axora-0j81.onrender.com`
- ✅ No 404 or 500 errors

**Test features:**
- ✅ Sign up / Login works
- ✅ Create workspace works
- ✅ Create page works
- ✅ AI chat responds

---

## 🚨 If You See CORS Error

Browser console shows:
```
Access to fetch at 'https://axora-0j81.onrender.com/...' blocked by CORS
```

**Fix:**
1. Go back to Render → Environment
2. Double-check `CORS_ORIGINS=["https://axorawork.netlify.app"]`
3. Make sure it's exactly this format (JSON array with quotes)
4. Save and wait for redeploy

---

## 🚨 If API Calls Go to Localhost

Browser console shows:
```
Failed to fetch http://localhost:8000/...
```

**Fix:**
1. Go back to Netlify → Environment variables
2. Verify `VITE_API_URL=https://axora-0j81.onrender.com/api/v1`
3. Trigger new deploy
4. Clear browser cache (Ctrl+Shift+Delete)

---

## 🎉 Done!

Your app should now be fully functional at:
**https://axorawork.netlify.app**

See `PRODUCTION_ENV_SETUP.md` for detailed troubleshooting.
