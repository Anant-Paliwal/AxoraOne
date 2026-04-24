# 🚨 RENDER DEPLOYMENT - IMMEDIATE FIX

## The Error You're Seeing

```
TypeError: FastAPI.__call__() missing 1 required positional argument: 'send'
```

## The Fix (Choose ONE)

### ✅ Option 1: Let Render Auto-Detect (EASIEST)

1. Commit the new `backend/Procfile` to your repo:
   ```bash
   git add backend/Procfile
   git commit -m "Add Procfile for Render deployment"
   git push
   ```

2. Render will automatically redeploy with the correct command
3. Wait 2-3 minutes
4. Done! ✅

### ✅ Option 2: Update Render Dashboard Manually

1. Go to your Render dashboard
2. Select your backend service
3. Click "Settings"
4. Find "Start Command"
5. Replace with:
   ```
   gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120
   ```
6. Click "Save Changes"
7. Render will redeploy automatically

## Why This Fixes It

FastAPI is an **ASGI** app, not WSGI. You MUST use:
```
--worker-class uvicorn.workers.UvicornWorker
```

Without this, Gunicorn tries to run FastAPI as WSGI, which causes the error.

## Verify It's Working

After deployment, check logs for:
```
[INFO] Using worker: uvicorn.workers.UvicornWorker
INFO:     Application startup complete.
🧠 Living Intelligence OS activated
```

Then test:
```bash
curl https://your-app.onrender.com/health
# Should return: {"status":"healthy","version":"1.0.0"}
```

## Files Created

- ✅ `backend/Procfile` - Render auto-detects this
- ✅ `backend/start.sh` - Alternative startup script
- ✅ `RENDER_DEPLOYMENT_FIX.md` - Detailed explanation

---

**Pick Option 1 or 2 above and your app will be live in minutes! 🚀**
