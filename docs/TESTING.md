# 🧪 Testing Guide

## Testing Strategy

This guide covers how to test the AI Knowledge Platform at different levels.

## Quick Test Checklist

### ✅ Basic Functionality Test (5 minutes)

1. **Backend Health**
   ```bash
   curl http://localhost:8000/health
   # Should return: {"status":"healthy","version":"1.0.0"}
   ```

2. **Frontend Loads**
   - Open http://localhost:5173
   - Should see login page

3. **Authentication**
   - Sign up with test email
   - Should redirect to app
   - Sign out and sign in again

4. **Create Page**
   - Go to Pages
   - Click "New Page"
   - Add title and content
   - Click Save
   - Should see success message

5. **AI Query**
   - Go to "Ask Anything"
   - Type: "What pages do I have?"
   - Should get AI response with sources

6. **Knowledge Graph**
   - Go to Graph
   - Should see nodes
   - Click a node
   - Should see details

## Manual Testing

### Authentication Flow

**Test Sign Up:**
```
1. Go to /login
2. Click "Sign Up" tab
3. Enter:
   - Full Name: Test User
   - Email: test@example.com
   - Password: testpass123
4. Click "Create Account"
5. ✅ Should redirect to /ask
6. ✅ Should see user in Supabase dashboard
```

**Test Sign In:**
```
1. Sign out
2. Go to /login
3. Enter credentials
4. Click "Sign In"
5. ✅ Should redirect to /ask
6. ✅ Should maintain session on refresh
```

**Test Protected Routes:**
```
1. Sign out
2. Try to access /pages directly
3. ✅ Should redirect to /login
```

### Page Management

**Test Create Page:**
```
1. Go to /pages
2. Click "New Page"
3. Add:
   - Icon: 📝
   - Title: "Test Page"
   - Tags: "test", "demo"
   - Content: "This is a test page"
4. Click Save
5. ✅ Should see success toast
6. ✅ Should appear in pages list
7. ✅ Check Supabase: page should exist
8. ✅ Check backend logs: vector indexed
```

**Test Edit Page:**
```
1. Click on a page
2. Modify title and content
3. Click Save
4. ✅ Should update successfully
5. ✅ Changes should persist
```

**Test Delete Page:**
```
1. Click on a page
2. Click delete button
3. Confirm deletion
4. ✅ Should remove from list
5. ✅ Should remove from database
```

### AI Features

**Test AI Query:**
```
1. Create 2-3 pages with different content
2. Go to "Ask Anything"
3. Test queries:
   - "What pages do I have?"
   - "Summarize my content"
   - "What topics am I covering?"
4. ✅ Should get relevant responses
5. ✅ Should cite sources
6. ✅ Should suggest actions
```

**Test Semantic Search:**
```
1. Create pages about:
   - "Machine Learning Basics"
   - "Neural Networks"
   - "Cooking Recipes"
2. Ask: "Tell me about AI"
3. ✅ Should return ML and NN pages
4. ✅ Should NOT return cooking page
```

**Test AI Connections:**
```
1. Create 5+ pages
2. Go to Graph
3. Click "AI Suggest Links"
4. ✅ Should show connection suggestions
5. ✅ Should have confidence scores
```

### Knowledge Graph

**Test Graph Display:**
```
1. Create pages, skills, tasks
2. Go to /graph
3. ✅ Should show all nodes
4. ✅ Should show connections
5. ✅ Should be interactive
```

**Test Node Selection:**
```
1. Click on a node
2. ✅ Should highlight
3. ✅ Should show detail panel
4. ✅ Should show connections
```

**Test Graph Controls:**
```
1. Use zoom controls
2. ✅ Should zoom in/out
3. ✅ Should maintain layout
```

### Skills & Tasks

**Test Skills:**
```
1. Go to /skills
2. Create a skill:
   - Name: "Python Programming"
   - Level: "Intermediate"
   - Description: "Backend development"
3. ✅ Should save successfully
4. ✅ Should appear in list
```

**Test Tasks:**
```
1. Go to /tasks
2. Create a task:
   - Title: "Write documentation"
   - Status: "todo"
   - Priority: "high"
3. ✅ Should save successfully
4. ✅ Should appear in list
```

## API Testing

### Using curl

**Test Health:**
```bash
curl http://localhost:8000/health
```

**Test Auth:**
```bash
# Sign up
curl -X POST http://localhost:8000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123",
    "full_name": "Test User"
  }'

# Sign in
curl -X POST http://localhost:8000/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }'
```

**Test Pages (with auth):**
```bash
# Get token from sign in response
TOKEN="your_access_token_here"

# List pages
curl http://localhost:8000/api/v1/pages \
  -H "Authorization: Bearer $TOKEN"

# Create page
curl -X POST http://localhost:8000/api/v1/pages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "API Test Page",
    "content": "Created via API",
    "tags": ["api", "test"]
  }'
```

**Test AI:**
```bash
curl -X POST http://localhost:8000/api/v1/ai/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What pages do I have?",
    "mode": "ask",
    "scope": "all"
  }'
```

### Using Swagger UI

1. Start backend
2. Go to http://localhost:8000/docs
3. Click "Authorize"
4. Enter Bearer token
5. Test any endpoint interactively

## Performance Testing

### Load Testing

**Test API Response Times:**
```bash
# Install Apache Bench
# Ubuntu: sudo apt-get install apache2-utils
# Mac: brew install ab

# Test health endpoint
ab -n 1000 -c 10 http://localhost:8000/health

# Expected: < 100ms average
```

**Test Vector Search:**
```bash
# Create 100 pages
# Then test search performance
time curl -X POST http://localhost:8000/api/v1/ai/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "test query"}'

# Expected: < 2s for search + AI response
```

### Memory Testing

**Monitor Backend Memory:**
```bash
# While backend is running
ps aux | grep python

# Should be < 500MB for normal usage
```

**Monitor Vector Store:**
```bash
du -sh backend/data/chroma

# Should grow ~1MB per 100 pages
```

## Integration Testing

### End-to-End Flow

**Complete User Journey:**
```
1. Sign up new user
2. Create 3 pages
3. Ask AI question
4. View knowledge graph
5. Create skill
6. Create task linked to page
7. View connections in graph
8. Edit page
9. Ask AI about updated content
10. Sign out and sign in
11. ✅ All data should persist
```

## Error Testing

### Test Error Handling

**Invalid Auth:**
```bash
# Try accessing protected endpoint without token
curl http://localhost:8000/api/v1/pages
# ✅ Should return 401 Unauthorized
```

**Invalid Data:**
```bash
# Try creating page without title
curl -X POST http://localhost:8000/api/v1/pages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "No title"}'
# ✅ Should return 422 Validation Error
```

**Network Errors:**
```
1. Stop backend
2. Try to create page in frontend
3. ✅ Should show error message
4. ✅ Should not crash app
```

## Database Testing

### Test RLS Policies

**Test User Isolation:**
```
1. Create user A, add pages
2. Create user B, add pages
3. Sign in as user A
4. ✅ Should only see user A's pages
5. Sign in as user B
6. ✅ Should only see user B's pages
```

**Test in Supabase:**
```sql
-- In Supabase SQL Editor
-- Try to access another user's data
SELECT * FROM pages WHERE user_id != auth.uid();
-- ✅ Should return empty (RLS blocks it)
```

## Security Testing

### Test Authentication

**Test Token Expiry:**
```
1. Sign in
2. Wait for token to expire (or manually expire)
3. Try to access protected route
4. ✅ Should redirect to login
```

**Test CORS:**
```bash
# Try from different origin
curl -X POST http://localhost:8000/api/v1/pages \
  -H "Origin: http://evil.com" \
  -H "Authorization: Bearer $TOKEN"
# ✅ Should be blocked by CORS
```

## Automated Testing

### Backend Tests (Future)

```bash
cd backend
pytest tests/
```

**Test Structure:**
```
backend/tests/
├── test_auth.py
├── test_pages.py
├── test_ai.py
└── test_graph.py
```

### Frontend Tests (Future)

```bash
npm test
```

**Test Structure:**
```
src/__tests__/
├── Login.test.tsx
├── PageEditor.test.tsx
├── AskAnything.test.tsx
└── GraphPage.test.tsx
```

## Monitoring in Production

### Health Checks

**Setup:**
```bash
# Add to cron or monitoring service
*/5 * * * * curl https://your-api.com/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

### Log Monitoring

**Backend Logs:**
```bash
# Check for errors
tail -f backend/logs/app.log | grep ERROR
```

**Database Monitoring:**
- Check Supabase dashboard
- Monitor query performance
- Check connection pool

### Performance Metrics

**Track:**
- API response times
- Vector search latency
- Database query times
- Memory usage
- Error rates

## Test Data

### Sample Test Data

**Users:**
```
test1@example.com / testpass123
test2@example.com / testpass123
```

**Pages:**
```
- "Getting Started with AI"
- "Machine Learning Basics"
- "Project Planning"
- "Team Meeting Notes"
```

**Queries:**
```
- "What are my AI-related pages?"
- "Summarize my project plans"
- "What skills should I develop?"
```

## Troubleshooting Tests

### Common Issues

**Backend won't start:**
```bash
# Check Python version
python --version

# Check dependencies
pip list

# Check environment
cat backend/.env
```

**Frontend can't connect:**
```bash
# Check API URL
echo $VITE_API_URL

# Check backend is running
curl http://localhost:8000/health
```

**AI queries fail:**
```bash
# Check OpenAI key
echo $OPENAI_API_KEY

# Check vector store
ls -la backend/data/chroma

# Check backend logs
tail -f backend/logs/app.log
```

## Test Checklist

### Pre-Deployment Testing

- [ ] All authentication flows work
- [ ] CRUD operations for all entities
- [ ] AI queries return relevant results
- [ ] Knowledge graph displays correctly
- [ ] Vector search finds similar content
- [ ] RLS policies enforce user isolation
- [ ] Error handling works properly
- [ ] Performance is acceptable
- [ ] Security measures are in place
- [ ] Documentation is accurate

### Post-Deployment Testing

- [ ] Health check responds
- [ ] Can create account
- [ ] Can sign in
- [ ] Can create pages
- [ ] AI queries work
- [ ] HTTPS is enabled
- [ ] CORS is configured
- [ ] Logs are accessible
- [ ] Monitoring is active
- [ ] Backups are working

## Success Criteria

**Functionality:**
- ✅ All features work as documented
- ✅ No critical bugs
- ✅ Error handling is graceful

**Performance:**
- ✅ API responses < 500ms
- ✅ AI queries < 3s
- ✅ Page loads < 2s

**Security:**
- ✅ Authentication required
- ✅ RLS enforced
- ✅ HTTPS enabled
- ✅ Secrets secured

**User Experience:**
- ✅ Intuitive interface
- ✅ Clear error messages
- ✅ Smooth interactions
- ✅ Mobile responsive

---

**For more testing details, see:**
- [QUICKSTART.md](./QUICKSTART.md) - Setup testing
- [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) - Production testing
- API Docs: http://localhost:8000/docs
