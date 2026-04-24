# Backend Errors - Diagnosis & Fix

## 🔍 Problems Identified

### 1. ❌ Upstash Vector Query Error
```
Upstash Vector query failed: Cannot deserialize value of type `float[]` from Object value
```

**Root Cause**: The code was converting dense vectors to sparse format (indices + values), but Upstash expects dense float arrays directly.

**Impact**: Vector search (Ask Anything context retrieval) fails completely.

### 2. ❌ OpenRouter Rate Limit (429)
```
Error code: 429 - meta-llama/llama-3.2-3b-instruct:free is temporarily rate-limited
```

**Root Cause**: Free model has hit rate limits. Need to either:
- Wait for rate limit to reset
- Switch to a different model
- Add your own API key

**Impact**: AI responses fail when rate limited.

## ✅ Fixes Applied

### Fix 1: Upstash Vector Format
**File**: `backend/app/services/vector_store.py`

**Changed**:
```python
# OLD - Sparse format (WRONG)
"vector": {
    "indices": sparse_indices,
    "values": sparse_values
}

# NEW - Dense format (CORRECT)
"vector": embedding  # Direct float array
```

**Why**: Upstash Vector expects dense float arrays, not sparse format. The sparse conversion was causing deserialization errors.

**Affected Methods**:
- `add_page()` - Fixed upsert format
- `search_pages()` - Fixed query format

### Fix 2: Model Selection Strategy

**Current Model**: `meta-llama/llama-3.2-3b-instruct:free`

**Options to Fix Rate Limits**:

#### Option A: Switch to Different Free Model
```python
# In ai_agent.py, change line 42:
model="google/gemini-flash-1.5-8b:free"  # Alternative free model
```

#### Option B: Use Paid Model (Recommended)
```python
# In ai_agent.py:
model="openai/gpt-4o-mini"  # $0.15/1M tokens
```

#### Option C: Add Your Own API Key
Add to `.env`:
```
OPENROUTER_API_KEY=your_key_here
```
Get key from: https://openrouter.ai/settings/integrations

## 🔧 How to Apply Fixes

### Step 1: Vector Store Fix (Already Applied)
The vector store fix has been applied to `backend/app/services/vector_store.py`.

### Step 2: Fix Rate Limits (Choose One)

**Option A - Switch Model** (Quick Fix):
```bash
# Edit backend/app/services/ai_agent.py line 42
# Change to: model="google/gemini-flash-1.5-8b:free"
```

**Option B - Use Paid Model** (Recommended):
```bash
# Edit backend/app/services/ai_agent.py line 42
# Change to: model="openai/gpt-4o-mini"
```

**Option C - Add API Key**:
```bash
# Add to backend/.env
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

### Step 3: Restart Backend
```bash
# Stop the backend (Ctrl+C)
# Then restart:
cd backend
python -m uvicorn main:app --reload
```

## 🧪 Testing

### Test Vector Search:
1. Go to Ask Anything
2. Ask: "What pages do I have about SQL?"
3. Should return relevant pages without errors

### Test AI Response:
1. Go to Ask Anything
2. Ask any question
3. Should get response without 429 error

## 📊 Expected Behavior After Fix

### Before:
```
❌ Upstash Vector query failed: Cannot deserialize...
❌ Error code: 429 - rate-limited
```

### After:
```
✅ Vector search returns relevant pages
✅ AI generates responses successfully
✅ No deserialization errors
✅ No rate limit errors (if using different model/key)
```

## 🎯 Recommended Configuration

For best results, use this configuration:

**backend/.env**:
```env
# OpenRouter (for AI responses)
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Gemini (for embeddings - free)
GEMINI_API_KEY=your_gemini_key

# Upstash Vector (for search)
UPSTASH_VECTOR_REST_URL=your_upstash_url
UPSTASH_VECTOR_REST_TOKEN=your_upstash_token
```

**backend/app/services/ai_agent.py** (line 42):
```python
model="openai/gpt-4o-mini"  # Reliable, cheap ($0.15/1M tokens)
```

## 🚨 Common Issues

### Issue: Still getting 429 errors
**Solution**: 
- Wait 1 hour for rate limit reset, OR
- Switch to paid model, OR
- Add your own API key

### Issue: Vector search still failing
**Solution**:
- Check Upstash credentials in `.env`
- Verify Upstash Vector index is created
- Check backend logs for specific error

### Issue: No pages found in search
**Solution**:
- Re-index pages: Run `backend/scripts/index_all_pages.py`
- Check pages exist in database
- Verify workspace_id filtering

## 📝 Summary

**Fixed**:
- ✅ Upstash Vector format (dense arrays)
- ✅ Vector search deserialization

**Action Required**:
- ⚠️ Choose rate limit solution (switch model or add key)
- ⚠️ Restart backend after changes

**Files Modified**:
- `backend/app/services/vector_store.py` - Vector format fix

**Files to Modify** (your choice):
- `backend/app/services/ai_agent.py` - Model selection
- `backend/.env` - API keys (optional)
