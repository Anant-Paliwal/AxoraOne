# Vector Dimension Fix - COMPLETE

## Problem
```
Upstash Vector query failed: {"error" : "Invalid vector dimension: 384, expected: 1536","status" : 422}
```

## Root Cause
- **Old setup**: Using `sentence-transformers/all-MiniLM-L6-v2` → 384 dimensions
- **Upstash Vector**: Configured for 1536 dimensions (OpenAI standard)
- **Mismatch**: 384 ≠ 1536 → API rejection

## Solution Applied

### 1. Updated Vector Store Service
**File**: `backend/app/services/vector_store.py`

**Changes**:
- ❌ Removed: `sentence-transformers` library
- ✅ Added: OpenAI Embeddings API integration
- ✅ Model: `text-embedding-3-small` (1536 dimensions)
- ✅ Made `embed_text()` async for API calls

### 2. Updated Environment Configuration
**File**: `backend/.env`

**Note**: You need to add a valid OpenAI API key:
```env
OPENAI_API_KEY=sk-proj-YOUR-ACTUAL-KEY-HERE
```

The OpenRouter key won't work for embeddings - you need a real OpenAI key.

## How to Get OpenAI API Key

1. Go to: https://platform.openai.com/api-keys
2. Sign in or create account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-proj-...`)
5. Add to `backend/.env`:
   ```
   OPENAI_API_KEY=sk-proj-your-actual-key-here
   ```

## Testing

### 1. Restart Backend
```bash
cd backend
# Stop current process (Ctrl+C)
python -m uvicorn main:app --reload
```

### 2. Test Vector Search
```bash
# In Ask Anything:
1. Enable "Pages" or "Knowledge Base" source
2. Ask a question about your content
3. Should work without dimension errors
```

### 3. Check Logs
Look for:
```
✅ "Vector store initialized successfully with Upstash Vector + OpenAI embeddings"
❌ "Upstash Vector configured but no OpenAI API key - vector search disabled"
```

## Cost Impact

OpenAI Embeddings pricing:
- **Model**: text-embedding-3-small
- **Cost**: $0.02 per 1M tokens
- **Very cheap**: ~1000 queries = $0.02

## Alternative: Recreate Upstash Index

If you don't want to use OpenAI embeddings, you can recreate your Upstash Vector index with 384 dimensions:

1. Go to Upstash Console
2. Delete current vector index
3. Create new index with:
   - **Dimensions**: 384
   - **Metric**: Cosine
4. Keep using sentence-transformers

But OpenAI embeddings are better quality and very cheap.

## Status

✅ **Code Updated**
⚠️ **Action Required**: Add valid OpenAI API key to `backend/.env`
🔄 **Next**: Restart backend after adding key
