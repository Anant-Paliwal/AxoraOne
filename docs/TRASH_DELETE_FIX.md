# Trash & Delete Error Fix

## Problem
```
Error moving to trash: 'str' object has no attribute 'get'
INFO: "POST /api/v1/trash/move/bcdfd262-e4b0-4bc8-8f66-4443198a0e44 HTTP/1.1" 500 Internal Server Error
```

## Root Cause
The `get_current_user` dependency returns a **string** (user ID), but the trash endpoint was treating it as a dictionary and calling `.get("id")` on it.

```python
# WRONG ❌
current_user: Dict = Depends(get_current_user)
user_id = current_user.get("id")  # Error: str has no attribute 'get'

# CORRECT ✅
user_id: str = Depends(get_current_user)
# user_id is already the string ID
```

## Fixed Endpoints
All trash endpoints in `backend/app/api/endpoints/trash.py`:
- ✅ `POST /api/v1/trash/move/{page_id}` - Move to trash
- ✅ `POST /api/v1/trash/restore/{page_id}` - Restore from trash
- ✅ `DELETE /api/v1/trash/permanent/{page_id}` - Permanently delete
- ✅ `DELETE /api/v1/trash/empty` - Empty trash
- ✅ `GET /api/v1/trash` - Get trash items
- ✅ `GET /api/v1/trash/count` - Get trash count

## Notification Endpoints
Checked `backend/app/api/endpoints/notifications.py` - already correct:
- ✅ All endpoints use `user_id: str = Depends(get_current_user)`
- ✅ No delete issues

## Testing
Restart backend and test:
```bash
# Move page to trash
POST /api/v1/trash/move/{page_id}

# Delete notification
DELETE /api/v1/notifications/{notification_id}
```

Both should work without errors now.
