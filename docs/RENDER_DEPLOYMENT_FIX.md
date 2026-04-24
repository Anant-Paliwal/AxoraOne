# Render Deployment Fix - pkg_resources Error

## Problem
```
ModuleNotFoundError: No module named 'pkg_resources'
```

The `razorpay` package requires `setuptools` which provides `pkg_resources`, but it wasn't listed in requirements.txt.

## Solution Applied ✅

Added `setuptools>=65.0.0` to `backend/requirements.txt`:

```txt
# Payment Processing
razorpay==1.4.2
setuptools>=65.0.0
gunicorn==21.2.0
```

## How to Deploy

### Option 1: Trigger Redeploy on Render
1. Go to your Render dashboard
2. Find your backend service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Or push a new commit to trigger auto-deploy

### Option 2: Push Changes
```bash
git add backend/requirements.txt
git commit -m "fix: add setuptools for razorpay pkg_resources"
git push origin main
```

Render will automatically redeploy.

## Verification

After deployment, check logs for:
```
✅ Successfully installed setuptools-XX.X.X
✅ Build successful 🎉
✅ Deploying...
✅ Your service is live 🎉
```

## Why This Happened

- Python 3.13 doesn't include `setuptools` by default
- `razorpay` package imports `pkg_resources` from `setuptools`
- Without explicit declaration, Render's Python 3.13 environment doesn't have it

## Alternative Solutions (if still fails)

### Solution 1: Pin Python Version
Add to `render.yaml` or service settings:
```yaml
services:
  - type: web
    name: axora-backend
    env: python
    runtime: python-3.11  # Use 3.11 instead of 3.13
```

### Solution 2: Use Different Razorpay Client
If setuptools still causes issues, consider using Razorpay's REST API directly:
```python
import httpx

async def create_razorpay_order(amount: int):
    url = "https://api.razorpay.com/v1/orders"
    auth = (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)
    data = {
        "amount": amount * 100,
        "currency": "INR"
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=data, auth=auth)
        return response.json()
```

## Status

✅ **FIXED** - setuptools added to requirements.txt

Redeploy and it should work!
