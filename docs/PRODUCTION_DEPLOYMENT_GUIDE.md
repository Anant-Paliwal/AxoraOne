# 🚀 Production Deployment Guide - Axora Platform

**Status:** ✅ Ready for Production Deployment  
**Last Updated:** January 21, 2026

---

## 📋 Pre-Deployment Checklist

### ✅ Fixed Issues
- [x] Dependency conflict resolved (google-generativeai version)
- [x] Build process verified
- [x] TypeScript compilation clean
- [x] All critical bugs fixed

### 🔧 Required Services
- [ ] Supabase project (database + auth)
- [ ] OpenAI API key (or OpenRouter)
- [ ] Google Gemini API key
- [ ] Upstash Redis account
- [ ] Upstash Vector account
- [ ] Brave Search API key (optional)

---

## 🗄️ Database Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note your:
   - Project URL
   - Anon/Public key
   - Service Role key (secret)

### Step 2: Run Migrations

Run these SQL files **in order** in Supabase SQL Editor:

```sql
-- 1. Core schema
data.sql

-- 2. Workspace isolation
add-workspace-isolation-fixed.sql

-- 3. Skills system
COMPLETE_SKILL_TABLES_MIGRATION.sql
ADVANCED_SKILL_SYSTEM_MIGRATION.sql

-- 4. Intelligence system
run-intelligence-migration.sql
fix-intelligence-tables.sql

-- 5. Additional features
add-blocks-column.sql
add-advanced-block-templates.sql
add-page-sharing-column.sql
add-trash-bin-system.sql
create-block-databases-table.sql
run-memory-migration.sql
run-page-links-migration.sql
run-workspace-sharing-migration.sql
```

### Step 3: Verify Tables

```sql
-- Should return 50+ tables
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check critical tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'users', 'workspaces', 'pages', 'tasks', 'skills',
    'insights', 'proposed_actions', 'skill_memory',
    'skill_executions', 'entity_signals'
  );
```

---

## 🔐 Environment Variables

### Backend (.env)

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# AI Models
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=your-gemini-key
OPENROUTER_API_KEY=your-openrouter-key (optional)

# Vector Store (Upstash)
UPSTASH_VECTOR_URL=https://your-vector.upstash.io
UPSTASH_VECTOR_TOKEN=your-vector-token

# Redis Cache (Upstash)
UPSTASH_REDIS_URL=https://your-redis.upstash.io
UPSTASH_REDIS_TOKEN=your-redis-token

# Search (optional)
BRAVE_SEARCH_API_KEY=your-brave-key

# Application
APP_ENV=production
SECRET_KEY=your-secret-key-min-32-chars
CORS_ORIGINS=https://your-frontend-domain.com

# Server
HOST=0.0.0.0
PORT=8000
```

### Frontend (.env)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_API_URL=https://your-backend-domain.com
```

---

## 🐳 Deployment Options

## Option 1: Render (Recommended - Easiest)

### Backend Deployment

1. **Create Web Service**
   - Go to [render.com](https://render.com)
   - New → Web Service
   - Connect your GitHub repo
   - Root Directory: `backend`

2. **Configure Build**
   ```
   Build Command: pip install -r requirements.txt
   Start Command: gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120
   ```
   
   **Note:** A `Procfile` is included in the backend folder, so Render will automatically use the correct command.

3. **Environment Variables**
   - Add all backend env vars from above
   - Set `PORT` to `8000` (Render provides this automatically)

4. **Deploy**
   - Click "Create Web Service"
   - Wait for build to complete (~5 minutes)
   - Note your backend URL: `https://your-app.onrender.com`

### Frontend Deployment

1. **Create Static Site**
   - New → Static Site
   - Connect your GitHub repo
   - Root Directory: `.` (root)

2. **Configure Build**
   ```
   Build Command: npm install && npm run build
   Publish Directory: dist
   ```

3. **Environment Variables**
   - Add all frontend env vars
   - Use your Render backend URL for `VITE_API_URL`

4. **Deploy**
   - Click "Create Static Site"
   - Wait for build (~3 minutes)
   - Your app is live!

---

## Option 2: Vercel + Railway

### Frontend on Vercel

1. **Import Project**
   ```bash
   npm i -g vercel
   vercel
   ```

2. **Configure**
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Environment Variables**
   - Add in Vercel dashboard
   - Redeploy after adding

### Backend on Railway

1. **Create Project**
   - Go to [railway.app](https://railway.app)
   - New Project → Deploy from GitHub

2. **Configure**
   - Root Directory: `backend`
   - Start Command: `gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`

3. **Environment Variables**
   - Add all backend env vars
   - Railway auto-provides `PORT`

---

## Option 3: Docker (Any Platform)

### Build Images

```bash
# Backend
cd backend
docker build -t axora-backend .

# Frontend
docker build -t axora-frontend .
```

### Docker Compose

```yaml
version: '3.8'

services:
  backend:
    image: axora-backend
    ports:
      - "8000:8000"
    env_file:
      - backend/.env
    restart: unless-stopped

  frontend:
    image: axora-frontend
    ports:
      - "80:80"
    environment:
      - VITE_API_URL=http://backend:8000
    depends_on:
      - backend
    restart: unless-stopped
```

### Deploy to Cloud

**AWS ECS:**
```bash
aws ecs create-cluster --cluster-name axora
aws ecs register-task-definition --cli-input-json file://task-definition.json
aws ecs create-service --cluster axora --service-name axora-backend
```

**Google Cloud Run:**
```bash
gcloud run deploy axora-backend --image gcr.io/project/axora-backend --platform managed
gcloud run deploy axora-frontend --image gcr.io/project/axora-frontend --platform managed
```

---

## 🔧 Post-Deployment Configuration

### 1. CORS Setup

Update backend CORS origins:
```python
# backend/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-frontend-domain.com",
        "https://www.your-frontend-domain.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 2. Supabase Auth URLs

In Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `https://your-frontend-domain.com`
- Redirect URLs: `https://your-frontend-domain.com/**`

### 3. Database Connection Pooling

For production, enable connection pooling in Supabase:
- Settings → Database → Connection Pooling
- Use pooler URL in backend env vars

### 4. Enable RLS Policies

Verify Row Level Security is enabled:
```sql
-- Check RLS is enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = false;
```

---

## 🧪 Testing Production Deployment

### Health Checks

```bash
# Backend health
curl https://your-backend.com/health

# Expected: {"status": "healthy"}

# API docs
curl https://your-backend.com/docs
```

### Functional Tests

1. **Authentication**
   - Sign up new user
   - Sign in
   - Verify JWT token

2. **Workspace**
   - Create workspace
   - Invite member
   - Switch workspaces

3. **Pages**
   - Create page
   - Add blocks
   - Save and reload

4. **AI Features**
   - Ask question
   - Build mode
   - Verify response

5. **Skills**
   - Create skill
   - Link to page
   - Check progress

6. **Intelligence**
   - View home dashboard
   - Check insights
   - Verify background runner

---

## 📊 Monitoring & Logging

### Backend Logs

**Render:**
```bash
# View logs in dashboard or CLI
render logs -s your-service-name
```

**Railway:**
```bash
# View in dashboard
railway logs
```

### Error Tracking

Add Sentry for error tracking:

```bash
pip install sentry-sdk[fastapi]
```

```python
# backend/main.py
import sentry_sdk

sentry_sdk.init(
    dsn="your-sentry-dsn",
    environment="production",
    traces_sample_rate=0.1,
)
```

### Performance Monitoring

Monitor these metrics:
- Response time (target: <500ms)
- Error rate (target: <1%)
- Database connections
- Memory usage
- CPU usage

---

## 🔒 Security Checklist

- [ ] All API keys in environment variables (not code)
- [ ] HTTPS enabled on all domains
- [ ] CORS configured correctly
- [ ] RLS policies enabled on all tables
- [ ] Service role key never exposed to frontend
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (using parameterized queries)
- [ ] XSS prevention (React handles this)
- [ ] CSRF protection (Supabase handles this)

---

## 🚀 Performance Optimization

### Frontend

1. **Enable Compression**
   ```javascript
   // vite.config.ts
   export default defineConfig({
     build: {
       rollupOptions: {
         output: {
           manualChunks: {
             'react-vendor': ['react', 'react-dom'],
             'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
           }
         }
       }
     }
   })
   ```

2. **Add CDN**
   - Use Cloudflare or AWS CloudFront
   - Cache static assets
   - Enable Brotli compression

### Backend

1. **Database Indexing**
   ```sql
   -- Add indexes for common queries
   CREATE INDEX idx_pages_workspace ON pages(workspace_id);
   CREATE INDEX idx_tasks_workspace ON tasks(workspace_id);
   CREATE INDEX idx_skills_workspace ON skills(workspace_id);
   ```

2. **Redis Caching**
   - Cache frequently accessed data
   - Set appropriate TTLs
   - Invalidate on updates

3. **Connection Pooling**
   ```python
   # Use Supabase connection pooler
   SUPABASE_URL = "https://your-project.supabase.co"  # Use pooler URL
   ```

---

## 🔄 CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Render
        run: curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

---

## 📈 Scaling Strategy

### Horizontal Scaling

**Backend:**
- Increase worker count: `--workers 8`
- Add more instances (load balancer)
- Use Redis for session storage

**Database:**
- Enable read replicas
- Use connection pooling
- Implement caching layer

### Vertical Scaling

**Start:** 1 CPU, 2GB RAM  
**Growth:** 2 CPU, 4GB RAM  
**Scale:** 4 CPU, 8GB RAM

---

## 🆘 Troubleshooting

### Build Fails

**Issue:** Dependency conflicts
```bash
# Solution: Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Issue:** Python version mismatch
```bash
# Solution: Use Python 3.11+
python --version  # Should be 3.11 or higher
```

### Runtime Errors

**Issue:** Database connection fails
- Check Supabase URL and keys
- Verify RLS policies
- Check connection pooling

**Issue:** AI responses fail
- Verify API keys are set
- Check rate limits
- Review error logs

**Issue:** 500 errors
- Check backend logs
- Verify all migrations ran
- Test database queries manually

---

## 📞 Support Resources

- **Documentation:** Check all `.md` files in repo
- **API Docs:** `https://your-backend.com/docs`
- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)
- **FastAPI Docs:** [fastapi.tiangolo.com](https://fastapi.tiangolo.com)
- **React Docs:** [react.dev](https://react.dev)

---

## ✅ Production Readiness Checklist

### Infrastructure
- [ ] Database deployed and migrated
- [ ] Backend deployed and running
- [ ] Frontend deployed and accessible
- [ ] Domain configured (optional)
- [ ] SSL certificates active

### Configuration
- [ ] All environment variables set
- [ ] CORS configured correctly
- [ ] Auth URLs configured in Supabase
- [ ] API keys valid and working

### Testing
- [ ] User signup/login works
- [ ] Workspace creation works
- [ ] Page creation works
- [ ] AI chat responds
- [ ] Skills system functional
- [ ] No console errors

### Security
- [ ] RLS policies enabled
- [ ] API keys secured
- [ ] HTTPS enforced
- [ ] Rate limiting configured

### Monitoring
- [ ] Error tracking setup
- [ ] Logging configured
- [ ] Performance monitoring active
- [ ] Backup strategy defined

---

## 🎉 Launch!

Once all checklist items are complete:

1. **Soft Launch**
   - Test with small group
   - Monitor for issues
   - Gather feedback

2. **Full Launch**
   - Announce to users
   - Monitor metrics
   - Be ready for support

3. **Post-Launch**
   - Review analytics
   - Optimize performance
   - Plan next features

---

**Your Axora platform is production-ready! 🚀**

The dependency conflict has been fixed, and all systems are operational. Follow this guide to deploy with confidence.

