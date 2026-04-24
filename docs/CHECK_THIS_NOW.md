# ⚠️ Why Contributions Are Not Being Created

## The Problem

You linked a page to a skill, but **no contribution was created** in the database.

This means the backend code is **NOT running** or **NOT being called**.

## Check These 3 Things

### 1. Is Backend Running?

```bash
cd backend
python main.py
```

**You should see:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

**If not running:** Start it now!

### 2. Check Backend Logs

When you link a page, you should see in backend logs:
```
✅ Contribution tracked: page_linked to skill abc-123
```

**If you don't see this:** The API endpoint is not being called.

### 3. Check Browser Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Link a page to a skill
4. Look for request to `/skills/{id}/evidence`
5. Check the response

**Expected response:**
```json
{
  "id": "...",
  "skill_id": "...",
  "page_id": "...",
  ...
}
```

## Most Likely Issues

### Issue 1: Backend Not Running ❌

**Symptom:** No API calls in Network tab, or they fail with "Connection refused"

**Fix:**
```bash
cd backend
python main.py
```

### Issue 2: Old Backend Code Running ❌

**Symptom:** Backend is running but no "✅ Contribution tracked" in logs

**Fix:**
1. Stop backend (Ctrl+C)
2. Make sure my changes are saved in `backend/app/api/endpoints/skills.py`
3. Restart backend: `python main.py`

### Issue 3: Frontend Not Calling API ❌

**Symptom:** No requests in Network tab when linking page

**Fix:** Check if the page link feature is working at all. Try:
1. Create a skill
2. Create a page
3. In page editor, try to link to skill
4. Check if `skill_evidence` table gets a row

```sql
SELECT * FROM skill_evidence ORDER BY created_at DESC LIMIT 5;
```

If `skill_evidence` has rows but `skill_contributions` doesn't, then the backend code isn't creating contributions.

## Quick Test

### Step 1: Check if backend file was updated

Open `backend/app/api/endpoints/skills.py` and search for:
```python
"✅ Contribution tracked: page_linked to skill"
```

**If you find it:** ✅ Code is updated
**If you don't find it:** ❌ My changes weren't saved

### Step 2: Restart backend

```bash
cd backend
# Stop if running (Ctrl+C)
python main.py
```

### Step 3: Link a page

1. Go to a page
2. Link it to a skill
3. Watch backend logs

**Expected in logs:**
```
✅ Contribution tracked: page_linked to skill abc-123-def-456
```

### Step 4: Check database

```sql
SELECT * FROM skill_contributions 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected:** 1 row with `contribution_type = 'page_linked'`

## If Still Not Working

### Check 1: Verify the code change

Run this to see if the file has the new code:

```bash
grep -n "Contribution tracked" backend/app/api/endpoints/skills.py
```

**Expected output:**
```
238:                print(f"✅ Contribution tracked: page_linked to skill {skill_id}")
```

**If no output:** The file wasn't updated. Let me know and I'll fix it.

### Check 2: Test API directly

```bash
# Replace with your actual IDs
curl -X POST "http://localhost:8000/api/v1/skills/YOUR_SKILL_ID/evidence" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "page_id": "YOUR_PAGE_ID",
    "evidence_type": "page",
    "notes": "test"
  }'
```

**Expected:** Should create both evidence AND contribution

### Check 3: Look for errors in backend logs

Common errors:
- `skill_contributions does not exist` → Run the SQL setup
- `permission denied` → RLS policy issue
- `workspace_id is null` → Skill has no workspace

## The Fix

Based on "Success. No rows returned", the most likely issue is:

**The backend is NOT creating contributions because:**
1. Backend not running, OR
2. Old code still running (need restart), OR
3. API not being called from frontend

**Solution:**
1. ✅ Make sure `backend/app/api/endpoints/skills.py` has my changes
2. ✅ Restart backend: `cd backend && python main.py`
3. ✅ Link a NEW page (old links won't retroactively create contributions)
4. ✅ Check backend logs for "✅ Contribution tracked"
5. ✅ Check database for new row in `skill_contributions`

## Summary

The code I added SHOULD create contributions automatically. If it's not working:

1. **Backend not running** → Start it
2. **Old code running** → Restart backend
3. **Code not saved** → Let me know, I'll re-apply the fix
4. **API not called** → Check frontend is working

**After fixing, link a NEW page and it should work!** 🚀
