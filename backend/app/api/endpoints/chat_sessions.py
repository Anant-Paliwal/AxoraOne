from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, validator
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.core.supabase import supabase_admin
from app.api.dependencies import get_current_user

router = APIRouter()

class ChatSessionCreate(BaseModel):
    title: Optional[str] = None
    workspace_id: Optional[str] = None

class ChatSessionUpdate(BaseModel):
    title: Optional[str] = None

class MessageAdd(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str
    sources: Optional[List[Dict[str, Any]]] = []
    model: Optional[str] = None
    
    @validator('role')
    def validate_role(cls, v):
        if v not in ['user', 'assistant']:
            raise ValueError('Role must be either "user" or "assistant"')
        return v
    
    @validator('content')
    def validate_content(cls, v):
        if not v or not v.strip():
            raise ValueError('Content cannot be empty')
        return v.strip()
    
    @validator('sources', pre=True)
    def validate_sources(cls, v):
        if v is None:
            return []
        if not isinstance(v, list):
            print(f"Warning: sources is not a list, got {type(v)}: {v}")
            return []
        
        # Validate each source item
        validated_sources = []
        for i, source in enumerate(v):
            if not isinstance(source, dict):
                print(f"Warning: source {i} is not a dict, got {type(source)}: {source}")
                continue
            
            # Ensure all values are JSON serializable
            clean_source = {}
            for key, value in source.items():
                if isinstance(value, (str, int, float, bool, type(None))):
                    clean_source[key] = value
                elif isinstance(value, (list, dict)):
                    try:
                        import json
                        json.dumps(value)  # Test if serializable
                        clean_source[key] = value
                    except (TypeError, ValueError):
                        print(f"Warning: source {i} key '{key}' is not JSON serializable: {type(value)}")
                        clean_source[key] = str(value)
                else:
                    print(f"Warning: source {i} key '{key}' converted to string: {type(value)}")
                    clean_source[key] = str(value)
            
            validated_sources.append(clean_source)
        
        return validated_sources
    
    class Config:
        # Allow extra fields to be ignored
        extra = "ignore"

@router.get("")
async def get_chat_sessions(workspace_id: Optional[str] = None, user_id: str = Depends(get_current_user)):
    """Get all chat sessions for the current user"""
    try:
        query = supabase_admin.table("chat_sessions").select("*").eq("user_id", user_id)
        if workspace_id:
            query = query.eq("workspace_id", workspace_id)
        response = query.order("updated_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
async def create_chat_session(session: ChatSessionCreate, user_id: str = Depends(get_current_user)):
    """Create a new chat session"""
    try:
        response = supabase_admin.table("chat_sessions").insert({
            "user_id": user_id,
            "title": session.title or "New Chat",
            "messages": [],
            "workspace_id": session.workspace_id
        }).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{session_id}")
async def get_chat_session(session_id: str, user_id: str = Depends(get_current_user)):
    """Get a specific chat session"""
    try:
        response = supabase_admin.table("chat_sessions").select("*").eq("id", session_id).eq("user_id", user_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Chat session not found")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{session_id}")
async def update_chat_session(session_id: str, session: ChatSessionUpdate, user_id: str = Depends(get_current_user)):
    """Update a chat session"""
    try:
        update_data = {k: v for k, v in session.dict().items() if v is not None}
        response = supabase_admin.table("chat_sessions").update(update_data).eq("id", session_id).eq("user_id", user_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Chat session not found")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{session_id}")
async def delete_chat_session(session_id: str, user_id: str = Depends(get_current_user)):
    """Delete a chat session"""
    try:
        response = supabase_admin.table("chat_sessions").delete().eq("id", session_id).eq("user_id", user_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Chat session not found")
        return {"message": "Chat session deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{session_id}/messages")
async def add_message_to_session(session_id: str, message: MessageAdd, user_id: str = Depends(get_current_user)):
    """Add a message to a chat session"""
    try:
        # Debug logging
        print(f"Received message: role={message.role}, content_length={len(message.content)}, sources_type={type(message.sources)}, sources_count={len(message.sources) if message.sources else 0}")
        
        # Validate message content
        if not message.content or not message.content.strip():
            print(f"Empty content error: '{message.content}'")
            raise HTTPException(status_code=422, detail="Message content cannot be empty")
        
        # Ensure sources is a valid list
        sources = message.sources if message.sources is not None else []
        
        # Validate sources format
        if not isinstance(sources, list):
            print(f"Invalid sources type: {type(sources)}, converting to list")
            sources = []
        
        # Additional validation for sources content
        validated_sources = []
        for i, source in enumerate(sources):
            if isinstance(source, dict):
                # Clean the source object
                clean_source = {}
                for key, value in source.items():
                    if key in ['id', 'title', 'type', 'url'] and value is not None:
                        clean_source[key] = str(value)
                validated_sources.append(clean_source)
            else:
                print(f"Skipping invalid source at index {i}: {type(source)}")
        
        print(f"Validated {len(validated_sources)} sources from {len(sources)} original sources")
        
        # Get current session
        session_response = supabase_admin.table("chat_sessions").select("*").eq("id", session_id).eq("user_id", user_id).execute()
        if not session_response.data:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        session_data = session_response.data[0]
        messages = session_data.get("messages", [])
        
        # Add new message
        new_message = {
            "role": message.role,
            "content": message.content.strip(),
            "timestamp": datetime.utcnow().isoformat(),
            "sources": validated_sources,
            "model": message.model
        }
        messages.append(new_message)
        
        # Update title if it's still "New Chat" and this is a user message
        update_data = {"messages": messages, "updated_at": datetime.utcnow().isoformat()}
        current_title = session_data.get("title", "New Chat")
        if message.role == "user" and (current_title == "New Chat" or not current_title):
            # Use first 50 chars of message as title
            update_data["title"] = message.content[:50] + ("..." if len(message.content) > 50 else "")
        
        # Update session
        response = supabase_admin.table("chat_sessions").update(update_data).eq("id", session_id).eq("user_id", user_id).execute()
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error adding message to session: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
