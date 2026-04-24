from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime
from app.core.supabase import supabase_admin
from app.api.dependencies import get_current_user

router = APIRouter()

class UploadResponse(BaseModel):
    url: str
    path: str
    success: bool

@router.post("/profile-photo", response_model=UploadResponse)
async def upload_profile_photo(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
):
    """Upload profile photo using service role to bypass RLS"""
    try:
        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, GIF, WEBP allowed.")
        
        # Generate unique filename
        file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'png'
        file_name = f"{user_id}/{uuid.uuid4()}.{file_ext}"
        
        # Read file content
        content = await file.read()
        
        # Upload using service role (bypasses RLS)
        result = supabase_admin.storage.from_('PROFILE').upload(
            file_name,
            content,
            file_options={"content-type": file.content_type, "upsert": "true"}
        )
        
        # Get public URL
        public_url = supabase_admin.storage.from_('PROFILE').get_public_url(file_name)
        
        # Update user settings with new avatar URL
        supabase_admin.table("user_settings").upsert({
            "user_id": user_id,
            "avatar_url": public_url
        }, on_conflict="user_id").execute()
        
        return UploadResponse(url=public_url, path=file_name, success=True)
        
    except Exception as e:
        print(f"Error uploading profile photo: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/profile-photo")
async def delete_profile_photo(user_id: str = Depends(get_current_user)):
    """Delete profile photo"""
    try:
        # Get current avatar URL to find the file path
        settings = supabase_admin.table("user_settings").select("avatar_url").eq("user_id", user_id).execute()
        
        if settings.data and settings.data[0].get("avatar_url"):
            avatar_url = settings.data[0]["avatar_url"]
            # Extract file path from URL
            if "/PROFILE/" in avatar_url:
                file_path = avatar_url.split("/PROFILE/")[-1]
                # Delete from storage
                try:
                    supabase_admin.storage.from_('PROFILE').remove([file_path])
                except:
                    pass  # File might not exist
        
        # Clear avatar URL in settings
        supabase_admin.table("user_settings").update({"avatar_url": None}).eq("user_id", user_id).execute()
        
        return {"success": True, "message": "Profile photo deleted"}
        
    except Exception as e:
        print(f"Error deleting profile photo: {e}")
        raise HTTPException(status_code=500, detail=str(e))
