# 🚀 Quick Start Guide

Get the AI Knowledge Platform running in 10 minutes!

## Prerequisites

- Node.js 18+ installed
- Python 3.11+ installed
- Supabase account (free tier works)
- OpenAI API key

## Step 1: Clone & Install (2 min)

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

## Step 2: Database Setup (3 min)

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for provisioning (2-3 minutes)
3. Go to **SQL Editor** in Supabase dashboard
4. Copy all content from `data.sql` file
5. Paste and click **Run**
6. Go to **Settings > API** and copy:
   - Project URL
   - `anon` `public` key
   - `service_role` `secret` key

## Step 3: Configure Backend (2 min)

Create `backend/.env`:

```env
# Supabase (from Step 2)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGc...  # anon key
SUPABASE_SERVICE_KEY=eyJhbGc...  # service_role key

# OpenAI
OPENAI_API_KEY=sk-...  # Your OpenAI key

# Application
APP_ENV=development
SECRET_KEY=your-random-secret-key-here
CORS_ORIGINS=http://localhost:5173

# Vector Database
CHROMA_PERSIST_DIR=./data/chroma
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

## Step 4: Configure Frontend (1 min)

Update `.env` file:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co  # Same as backend
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...  # Same anon key
VITE_API_URL=http://localhost:8000
```

## Step 5: Start Everything (2 min)

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
python main.py
```

Wait for: `Application startup complete.`

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Wait for: `Local: http://localhost:5173/`

## Step 6: First Login

1. Open browser to `http://localhost:5173`
2. Click **Sign Up**
3. Enter email and password
4. Click **Create Account**
5. You're in! 🎉

## Step 7: Try It Out

### Create Your First Page
1. Click **Pages** in sidebar
2. Click **New Page**
3. Add title and content
4. Click **Save**

### Ask AI a Question
1. Click **Ask Anything** in sidebar
2. Type: "What pages do I have?"
3. Click **Ask**
4. See AI response with sources!

### View Knowledge Graph
1. Click **Graph** in sidebar
2. See your pages visualized
3. Click nodes to see details

## 🎯 What You Can Do Now

✅ Create and edit pages with rich text
✅ Ask AI questions about your content
✅ Visualize connections in knowledge graph
✅ Track skills and tasks
✅ Get AI-suggested connections

## 🔧 Troubleshooting

### Backend won't start
```bash
# Check Python version
python --version  # Should be 3.11+

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Frontend won't start
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Can't login
- Check Supabase URL and keys in `.env`
- Verify database migrations ran successfully
- Check browser console for errors

### AI queries fail
- Verify OpenAI API key is correct
- Check you have API credits
- Review backend logs for errors

## 📚 Next Steps

1. **Read the docs**: Check `README.md` for full documentation
2. **Explore features**: Try all pages and features
3. **Customize**: Modify UI and prompts to your needs
4. **Deploy**: Follow `PRODUCTION_SETUP.md` to go live

## 🆘 Need Help?

- **API Docs**: http://localhost:8000/docs
- **Project Overview**: See `PROJECT_OVERVIEW.md`
- **Deployment Guide**: See `PRODUCTION_SETUP.md`
- **Backend Docs**: See `backend/README.md`

## 🎉 You're All Set!

Your AI Knowledge Platform is running. Start creating pages and asking questions!

---

**Time to complete**: ~10 minutes
**Difficulty**: Easy
**Cost**: Free (with free tiers)
