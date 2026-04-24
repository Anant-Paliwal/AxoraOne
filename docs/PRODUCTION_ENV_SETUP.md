# 🔧 Production Environment Configuration

## Your Deployed URLs

- **Frontend (Netlify):** `https://axorawork.netlify.app`
- **Backend (Render):** `https://axora-0j81.onrender.com`

---

## 🎯 Step 1: Configure Backend on Render

### Go to Render Dashboard

1. Open [render.com](https://render.com)
2. Select your backend service: **axora-0j81**
3. Click **"Environment"** tab
4. Add/Update these variables:

```env
# Application
APP_ENV=production
SECRET_KEY=your-super-secret-key-change-this-in-production-min-32-chars
CORS_ORIGINS=["https://axorawork.netlify.app"]

# Supabase (Already set, verify these)
SUPABASE_URL=https://elwlchiiextcpkjnpyyt.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsd2xjaGlpZXh0Y3Bram5weXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMTQ1MTcsImV4cCI6MjA4MTc5MDUxN30.KkI0fmHuHl3pLRzevtM-vS3GvDlod4w_zaqPwJRnABQ
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsd2xjaGlpZXh0Y3Bram5weXl0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIxNDUxNywiZXhwIjoyMDgxNzkwNTE3fQ.yfAxkM8pX5U6O23XdYIac3qXtx2yMj_AsOMInlzfK0c

# AI APIs (Already set, verify these)
GEMINI_API_KEY=AIzaSyDmKIoWVQ4gvVbjOfYi92u2gNns0qy3WxU
OPENROUTER_API_KEY=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
OPENAI_API_KEY=sk-proj-your-key-here
BRAVE_API_KEY=BSAO3Jrz7smv6NApSEPDMJGx_I96EWX

# Vector & Cache (Already set, verify these)
UPSTASH_VECTOR_REST_URL=https://alert-seagull-55007-us1-vector.upstash.io
UPSTASH_VECTOR_REST_TOKEN=ABcFMGFsZXJ0LXNlYWd1bGwtNTUwMDctdXMxYWRtaW5OREV3WkRBek9Ea3RZakEwT0MwME5qZzBMV0l4TldVdE0yRmxOMlU0WVdSbE1qZzU=
UPSTASH_REDIS_REST_URL=https://helpful-wildcat-39932.upstash.io
UPSTASH_REDIS_REST_TOKEN=AZv8AAIncDJmN2YwN2I5YWJlZDQ0NjM1YTZhODZkNDRhMzVlODRmYnAyMzk5MzI

# Embedding Model
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

### Important Notes:

- **CORS_ORIGINS** must be a JSON array: `["https://axorawork.netlify.app"]`
- **SECRET_KEY** should be at least 32 characters for production
- Click **"Save Changes"** after adding all variables
- Render will automatically redeploy

---

## 🎯 Step 2: Configure Frontend on Netlify

### Go to Netlify Dashboard

1. Open [netlify.com](https://netlify.com)
2. Select your site: **axorawork**
3. Go to **Site settings** → **Environment variables**
4. Add these variables:

```env
VITE_API_URL=https://axora-0j81.onrender.com/api/v1
VITE_SUPABASE_URL=https://elwlchiiextcpkjnpyyt.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsd2xjaGlpZXh0Y3Bram5weXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMTQ1MTcsImV4cCI6MjA4MTc5MDUxN30.KkI0fmHuHl3pLRzevtM-vS3GvDlod4w_zaqPwJRnABQ
```

### Important Notes:

- **VITE_API_URL** must point to your Render backend
- **DO NOT** include trailing slash in API URL
- Click **"Save"** after adding variables
- Then click **"Trigger deploy"** → **"Deploy site"**

---

## 🎯 Step 3: Update Supabase Auth URLs

### Go to Supabase Dashboard

1. Open [supabase.com](https://supabase.com)
2. Select your project: **elwlchiiextcpkjnpyyt**
3. Go to **Authentication** → **URL Configuration**
4. Update these fields:

```
Site URL: https://axorawork.netlify.app
Redirect URLs: https://axorawork.netlify.app/**
```

5. Click **"Save"**

---

## ✅ Step 4: Verify Configuration

### Test Backend

```bash
# Health check
curl https://axora-0j81.onrender.com/health

# Expected response:
{"status":"healthy","version":"1.0.0"}

# API docs
curl https://axora-0j81.onrender.com/docs
```

### Test Frontend

1. Open `https://axorawork.netlify.app`
2. Open browser console (F12)
3. Check for errors
4. Try to sign up/login
5. Check if API calls are going to Render backend

### Check CORS

If you see CORS errors in browser console:
1. Verify `CORS_ORIGINS` in Render includes your Netlify URL
2. Make sure it's a JSON array format: `["https://axorawork.netlify.app"]`
3. Redeploy backend after changing

---

## 🔍 Troubleshooting

### Issue: CORS Error

**Error in browser console:**
```
Access to fetch at 'https://axora-0j81.onrender.com/api/v1/...' from origin 'https://axorawork.netlify.app' has been blocked by CORS policy
```

**Solution:**
1. Go to Render → Environment
2. Update `CORS_ORIGINS=["https://axorawork.netlify.app"]`
3. Save and wait for redeploy

### Issue: API calls going to localhost

**Error in browser console:**
```
Failed to fetch http://localhost:8000/api/v1/...
```

**Solution:**
1. Go to Netlify → Environment variables
2. Verify `VITE_API_URL=https://axora-0j81.onrender.com/api/v1`
3. Trigger new deploy

### Issue: Backend not responding

**Check Render logs:**
1. Go to Render dashboard
2. Click on your service
3. Check "Logs" tab
4. Look for startup errors

**Common fixes:**
- Make sure Procfile exists in backend folder
- Verify Start Command uses Uvicorn workers
- Check all required env vars are set

### Issue: Authentication not working

**Solution:**
1. Verify Supabase URL and keys match in both frontend and backend
2. Check Supabase Auth URLs are set correctly
3. Clear browser cache and cookies
4. Try incognito mode

---

## 📋 Quick Checklist

### Backend (Render)
- [ ] All environment variables set
- [ ] `CORS_ORIGINS` includes Netlify URL
- [ ] `APP_ENV=production`
- [ ] Procfile exists
- [ ] Service is running (green status)
- [ ] Health endpoint responds

### Frontend (Netlify)
- [ ] All environment variables set
- [ ] `VITE_API_URL` points to Render
- [ ] Build successful
- [ ] Site is live
- [ ] No console errors

### Supabase
- [ ] Site URL set to Netlify URL
- [ ] Redirect URLs configured
- [ ] RLS policies enabled
- [ ] All migrations run

---

## 🚀 After Configuration

Once everything is set:

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Open your app:** `https://axorawork.netlify.app`
3. **Test core features:**
   - Sign up / Login
   - Create workspace
   - Create page
   - Ask AI question
   - Check if data persists

4. **Monitor logs:**
   - Render logs for backend errors
   - Browser console for frontend errors
   - Supabase logs for database issues

---

## 🎉 Success Indicators

You'll know it's working when:

✅ No CORS errors in browser console  
✅ API calls go to `https://axora-0j81.onrender.com`  
✅ Authentication works  
✅ Data persists after refresh  
✅ AI responses work  
✅ No 500 errors  

---

**Your production environment is now configured! 🚀**

If you encounter any issues, check the troubleshooting section above or review the logs in Render/Netlify dashboards.
