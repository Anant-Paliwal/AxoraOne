# Quick Fix: 500 Error on Workspaces

## Error
```
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
WorkspaceContext.tsx:57 Failed to load workspaces
```

## Cause
Backend server issue - either not running or database connection problem.

## Quick Fix

### 1. Restart Backend Server

**Windows:**
```bash
# Stop any running backend
taskkill /F /IM python.exe

# Navigate to backend
cd backend

# Activate virtual environment
.venv\Scripts\activate

# Start server
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Linux/Mac:**
```bash
# Stop any running backend
pkill -f uvicorn

# Navigate to backend
cd backend

# Activate virtual environment
source .venv/bin/activate

# Start server
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Check Backend is Running

Open browser: `http://localhost:8000/docs`

Should see FastAPI Swagger documentation.

### 3. Check Database Connection

Verify `.env` file in backend folder has:
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

### 4. Clear Browser Cache

```bash
# Run this from project root
clear-cache.bat  # Windows
# or
./clear-cache.sh  # Linux/Mac
```

Then refresh browser (Ctrl+Shift+R or Cmd+Shift+R).

### 5. Check Frontend is Running

```bash
# From project root
npm run dev
```

Should see: `Local: http://localhost:5173/`

## Still Not Working?

### Check Backend Logs

Look for errors in terminal where backend is running.

Common issues:
- **Database connection failed** → Check Supabase credentials
- **Port already in use** → Kill process on port 8000
- **Module not found** → Run `pip install -r requirements.txt`

### Check Network

```bash
# Test backend directly
curl http://localhost:8000/api/v1/health
```

Should return: `{"status":"ok"}`

### Restart Everything

1. Stop backend (Ctrl+C)
2. Stop frontend (Ctrl+C)
3. Start backend first
4. Start frontend second
5. Refresh browser

## Prevention

Always start in this order:
1. Backend server
2. Frontend dev server
3. Open browser

This ensures all services are ready before the app loads.
