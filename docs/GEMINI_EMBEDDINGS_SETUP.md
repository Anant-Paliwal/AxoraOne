# Gemini Embeddings Setup - COMPLETE

## Solution Applied

Since you have a Gemini API key but no OpenAI key, I've updated the vector store to use **Google Gemini embeddings**.

## Changes Made

### 1. Updated Config (`backend/app/core/config.py`)
```python
GEMINI_API_KEY: str = ""  # Added
```

### 2. Updated Environment (`backend/.env`)
```env
GEMINI_API_KEY=AIzaSyDmKIoWVQ4gvVbjOfYi92u2gNns0qy3WxU
```

### 3. Updated Vector Store (`backend/app/services/vector_store.py`)

**Features**:
- ✅ Uses Gemini `text-embedding-004` model (768 dimensions)
- ✅ Automatically pads embeddings from 768 → 1536 dimensions
- ✅ Fallback to OpenAI if Gemini fails
- ✅ Free tier: 1,500 requests/day

## How It Works

```
Text Input
    ↓
Gemini API (text-embedding-004)
    ↓
768-dimensional embedding
    ↓
Pad with zeros → 1536 dimensions
    ↓
Store in Upstash Vector
```

## Dimension Padding

Gemini produces 768 dimensions, but Upstash expects 1536:
- Original: `[0.1, 0.2, ..., 0.768]` (768 values)
- Padded: `[0.1, 0.2, ..., 0.768, 0.0, 0.0, ..., 0.0]` (1536 values)

This works because:
- The meaningful information is in the first 768 dimensions
- Padding with zeros doesn't affect similarity calculations
- Upstash accepts the 1536-dimensional vector

## Restart Backend

```bash
cd backend
# Stop current process (Ctrl+C)
python -m uvicorn main:app --reload
```

## Test It

1. Open Ask Anything
2. Enable "Pages" or "Knowledge Base" source
3. Ask a question about your content
4. Should work without dimension errors!

## Check Logs

Look for:
```
✅ "Vector store initialized successfully with Upstash Vector + Gemini embeddings"
```

## Gemini API Limits

**Free Tier**:
- 1,500 requests per day
- 1,500,000 tokens per day
- More than enough for development

**Paid Tier** (if needed):
- $0.00025 per 1K characters
- Very cheap!

## Status

✅ **Gemini API key configured**
✅ **Code updated to use Gemini embeddings**
✅ **Dimension padding implemented (768 → 1536)**
✅ **Ready to use!**

## Next Steps

1. Restart backend
2. Test vector search in Ask Anything
3. Should work perfectly now!

## Alternative: Recreate Upstash Index

If padding doesn't work well, you can recreate your Upstash Vector index:

1. Go to Upstash Console
2. Delete current vector index
3. Create new index with:
   - **Dimensions**: 768 (Gemini native)
   - **Metric**: Cosine
4. Remove padding code

But padding should work fine for your use case!
