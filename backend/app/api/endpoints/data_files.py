from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import csv
import io
from app.core.supabase import supabase_admin
from app.api.dependencies import get_current_user

router = APIRouter()

class DataFileCreate(BaseModel):
    filename: str
    file_type: str
    workspace_id: str
    page_id: Optional[str] = None
    parsed_data: Optional[Dict[str, Any]] = None
    column_types: Optional[Dict[str, str]] = None
    tags: Optional[List[str]] = []
    metadata: Optional[Dict[str, Any]] = {}

class DataFileUpdate(BaseModel):
    filename: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None
    parsed_data: Optional[Dict[str, Any]] = None

@router.get("")
async def get_data_files(
    workspace_id: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """Get all data files for the current user"""
    try:
        query = supabase_admin.table("data_files").select("*").eq("user_id", user_id)
        
        if workspace_id:
            query = query.eq("workspace_id", workspace_id)
        
        response = query.order("uploaded_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
async def create_data_file(
    data_file: DataFileCreate,
    user_id: str = Depends(get_current_user)
):
    """Create a new data file record"""
    try:
        # Calculate stats from parsed data
        row_count = 0
        column_count = 0
        
        if data_file.parsed_data:
            if isinstance(data_file.parsed_data, dict):
                if 'rows' in data_file.parsed_data:
                    row_count = len(data_file.parsed_data['rows'])
                if 'headers' in data_file.parsed_data:
                    column_count = len(data_file.parsed_data['headers'])
        
        file_data = {
            "user_id": user_id,
            "workspace_id": data_file.workspace_id,
            "page_id": data_file.page_id,
            "filename": data_file.filename,
            "file_type": data_file.file_type,
            "file_size": len(json.dumps(data_file.parsed_data or {})),
            "parsed_data": data_file.parsed_data,
            "column_types": data_file.column_types,
            "row_count": row_count,
            "column_count": column_count,
            "status": "processed",
            "processed_at": datetime.utcnow().isoformat(),
            "tags": data_file.tags,
            "metadata": data_file.metadata
        }
        
        response = supabase_admin.table("data_files").insert(file_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create data file")
        
        # Log activity
        try:
            activity_data = {
                "user_id": user_id,
                "workspace_id": data_file.workspace_id,
                "activity_type": "file_uploaded",
                "entity_type": "data_file",
                "entity_id": response.data[0]["id"],
                "action": "create",
                "details": {
                    "filename": data_file.filename,
                    "file_type": data_file.file_type,
                    "row_count": row_count,
                    "column_count": column_count
                }
            }
            supabase_admin.table("user_activity_log").insert(activity_data).execute()
        except Exception as log_error:
            print(f"Activity log error (non-fatal): {log_error}")
        
        return response.data[0]
    except Exception as e:
        print(f"ERROR creating data file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{file_id}")
async def get_data_file(
    file_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get a specific data file"""
    try:
        response = supabase_admin.table("data_files").select("*").eq("id", file_id).eq("user_id", user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Data file not found")
        
        # Update last accessed time
        supabase_admin.table("data_files").update({
            "last_accessed_at": datetime.utcnow().isoformat()
        }).eq("id", file_id).execute()
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{file_id}")
async def update_data_file(
    file_id: str,
    data_file: DataFileUpdate,
    user_id: str = Depends(get_current_user)
):
    """Update a data file"""
    try:
        update_data = {k: v for k, v in data_file.dict().items() if v is not None}
        
        response = supabase_admin.table("data_files").update(update_data).eq("id", file_id).eq("user_id", user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Data file not found")
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{file_id}")
async def delete_data_file(
    file_id: str,
    user_id: str = Depends(get_current_user)
):
    """Delete a data file"""
    try:
        response = supabase_admin.table("data_files").delete().eq("id", file_id).eq("user_id", user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Data file not found")
        
        return {"message": "Data file deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    workspace_id: str = None,
    page_id: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """Upload and parse a data file (CSV, JSON, etc.)"""
    try:
        content = await file.read()
        filename = file.filename
        file_type = filename.split('.')[-1].lower() if '.' in filename else 'unknown'
        
        parsed_data = None
        column_types = {}
        
        # Parse based on file type
        if file_type == 'csv':
            parsed_data = parse_csv(content)
        elif file_type == 'json':
            parsed_data = parse_json(content)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_type}")
        
        # Detect column types
        if parsed_data and 'rows' in parsed_data and len(parsed_data['rows']) > 0:
            column_types = detect_column_types(parsed_data['rows'], parsed_data.get('headers', []))
        
        # Create data file record
        file_data = DataFileCreate(
            filename=filename,
            file_type=file_type,
            workspace_id=workspace_id,
            page_id=page_id,
            parsed_data=parsed_data,
            column_types=column_types
        )
        
        return await create_data_file(file_data, user_id)
        
    except Exception as e:
        print(f"ERROR uploading file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def parse_csv(content: bytes) -> Dict[str, Any]:
    """Parse CSV content"""
    try:
        text = content.decode('utf-8')
        reader = csv.DictReader(io.StringIO(text))
        rows = list(reader)
        headers = reader.fieldnames or []
        
        return {
            "headers": headers,
            "rows": rows
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

def parse_json(content: bytes) -> Dict[str, Any]:
    """Parse JSON content"""
    try:
        data = json.loads(content.decode('utf-8'))
        
        # Handle different JSON structures
        if isinstance(data, list):
            if len(data) > 0 and isinstance(data[0], dict):
                headers = list(data[0].keys())
                return {
                    "headers": headers,
                    "rows": data
                }
        elif isinstance(data, dict):
            # If it's already in our format
            if 'headers' in data and 'rows' in data:
                return data
            # Otherwise treat it as a single row
            headers = list(data.keys())
            return {
                "headers": headers,
                "rows": [data]
            }
        
        raise HTTPException(status_code=400, detail="Unsupported JSON structure")
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")

def detect_column_types(rows: List[Dict], headers: List[str]) -> Dict[str, str]:
    """Detect column types from data"""
    column_types = {}
    
    for header in headers:
        # Sample first few non-empty values
        sample_values = []
        for row in rows[:10]:
            value = row.get(header)
            if value is not None and str(value).strip():
                sample_values.append(str(value))
        
        if not sample_values:
            column_types[header] = 'text'
            continue
        
        # Try to detect type
        all_numbers = all(is_number(v) for v in sample_values)
        all_dates = all(is_date(v) for v in sample_values)
        
        if all_numbers:
            column_types[header] = 'number'
        elif all_dates:
            column_types[header] = 'date'
        else:
            column_types[header] = 'text'
    
    return column_types

def is_number(value: str) -> bool:
    """Check if value is a number"""
    try:
        float(value)
        return True
    except:
        return False

def is_date(value: str) -> bool:
    """Check if value is a date"""
    from dateutil import parser
    try:
        parser.parse(value)
        return True
    except:
        return False
