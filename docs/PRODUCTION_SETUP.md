# Production Setup Guide

Complete guide to deploy the AI Knowledge Platform to production.

## Overview

This platform consists of:
- **Frontend**: React + TypeScript + Vite
- **Backend**: FastAPI + LangChain + LangGraph
- **Database**: Supabase (PostgreSQL)
- **Vector DB**: ChromaDB
- **AI**: OpenAI GPT-4

## Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **OpenAI API Key**: Get from [platform.openai.com](https://platform.openai.com)
3. **Node.js 18+**: For frontend
4. **Python 3.11+**: For backend

## Step 1: Database Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be provisioned
3. Note your project URL and anon key

### 1.2 Run Database Migrations

1. Go to SQL Editor in Supabase dashboard
2. Copy contents of `data.sql`
3. Run the SQL to create all tables and policies

### 1.3 Enable Authentication

1. Go to Authentication > Settings
2. Enable Email provider
3. Configure email templates (optional)

## Step 2: Backend Setup

### 2.1 Install Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2.2 Configure Environment

Create `backend/.env`:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# Application
APP_ENV=production
SECRET_KEY=generate-random-secret-key
CORS_ORIGINS=https://your-frontend-domain.com

# Vector Database
CHROMA_PERSIST_DIR=./data/chroma
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

### 2.3 Test Locally

```bash
python main.py
```

Visit `http://localhost:8000/docs` to see API documentation.

### 2.4 Deploy Backend

#### Option A: Docker

```bash
docker build -t ai-knowledge-backend .
docker run -p 8000:8000 --env-file .env ai-knowledge-backend
```

#### Option B: Cloud Platforms

**AWS Elastic Beanstalk:**
```bash
eb init -p python-3.11 ai-knowledge-backend
eb create production-env
eb deploy
```

**Google Cloud Run:**
```bash
gcloud run deploy ai-knowledge-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

**Heroku:**
```bash
heroku create ai-knowledge-backend
git push heroku main
```

## Step 3: Frontend Setup

### 3.1 Install Dependencies

```bash
npm install
```

### 3.2 Configure Environment

Create `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_API_URL=https://your-backend-api.com
```

### 3.3 Build for Production

```bash
npm run build
```

### 3.4 Deploy Frontend

#### Option A: Vercel (Recommended)

```bash
npm install -g vercel
vercel --prod
```

#### Option B: Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod
```

#### Option C: AWS S3 + CloudFront

```bash
aws s3 sync dist/ s3://your-bucket-name
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

## Step 4: Post-Deployment

### 4.1 Update CORS

Update `backend/.env` with your frontend domain:

```env
CORS_ORIGINS=https://your-frontend-domain.com,https://www.your-frontend-domain.com
```

### 4.2 Test Authentication

1. Visit your frontend URL
2. Sign up with a test account
3. Verify email (if enabled)
4. Test login

### 4.3 Test AI Features

1. Create a test page
2. Ask a question in "Ask Anything"
3. Verify AI responses
4. Check knowledge graph

### 4.4 Monitor

- **Backend**: Check logs in your cloud platform
- **Database**: Monitor in Supabase dashboard
- **Errors**: Set up error tracking (Sentry, etc.)

## Step 5: Optimization

### 5.1 Performance

- Enable CDN for frontend assets
- Use connection pooling for database
- Cache frequently accessed data
- Optimize vector search queries

### 5.2 Security

- Enable rate limiting
- Set up API key rotation
- Use environment-specific secrets
- Enable HTTPS everywhere

### 5.3 Scaling

- **Backend**: Use auto-scaling groups
- **Database**: Enable Supabase connection pooling
- **Vector DB**: Consider managed vector DB (Pinecone, Weaviate)
- **AI**: Implement request queuing for high load

## Troubleshooting

### Backend won't start

- Check all environment variables are set
- Verify Supabase credentials
- Check Python version (3.11+)
- Review logs for specific errors

### Authentication fails

- Verify Supabase URL and keys
- Check CORS settings
- Ensure database migrations ran
- Test with Supabase dashboard

### AI queries fail

- Verify OpenAI API key
- Check API quota/limits
- Review vector store initialization
- Check network connectivity

### Vector search not working

- Ensure ChromaDB directory exists
- Check embedding model download
- Verify pages are being indexed
- Review vector store logs

## Cost Optimization

### OpenAI

- Use GPT-4o-mini for most queries
- Implement caching for common questions
- Set token limits
- Monitor usage in OpenAI dashboard

### Supabase

- Start with free tier
- Upgrade as needed
- Use connection pooling
- Optimize queries

### Hosting

- Use serverless for backend (Cloud Run, Lambda)
- Static hosting for frontend (Vercel, Netlify)
- CDN for assets
- Auto-scaling based on traffic

## Maintenance

### Regular Tasks

- Monitor error logs
- Review API usage
- Update dependencies
- Backup database
- Test AI responses quality

### Updates

```bash
# Backend
cd backend
pip install -r requirements.txt --upgrade

# Frontend
npm update
```

## Support

For issues:
1. Check logs
2. Review documentation
3. Test with minimal setup
4. Contact support if needed

## Next Steps

- Add custom AI prompts
- Implement advanced graph algorithms
- Add real-time collaboration
- Integrate more AI models
- Build mobile app
