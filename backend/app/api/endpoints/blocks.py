from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.core.supabase import supabase_admin
from app.api.dependencies import get_current_user
import json
import csv
import io

router = APIRouter()

# ============================================
# DATA FILES ENDPOINTS
# ============================================

class DataFileResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    file_size: int
    parsed_data: Optional[Dict] = None
    column_types: Optional[Dict] = None
    row_count: Optional[int] = None
    column_count: Optional[int] = None
    status: str
    uploaded_at: str

@router.post("/data-files/upload")
async def upload_data_file(
    file: UploadFile = File(...),
    workspace_id: str = None,
    page_id: str = None,
    block_id: str = None,
    user_id: str = Depends(get_current_user)
):
    """Upload and parse a data file (CSV, JSON, Excel)"""
    try:
        # Read file content
        content = await file.read()
        file_size = len(content)
        
        # Determine file type
        filename = file.filename
        file_type = filename.split('.')[-1].lower() if '.' in filename else 'unknown'
        
        # Parse based on file type
        parsed_data = None
        column_types = {}
        row_count = 0
        column_count = 0
        status = 'uploaded'
        error_message = None
        
        try:
            if file_type == 'csv':
                # Parse CSV
                text_content = content.decode('utf-8')
                csv_reader = csv.DictReader(io.StringIO(text_content))
                rows = list(csv_reader)
                
                if rows:
                    headers = list(rows[0].keys())
                    column_count = len(headers)
                    row_count = len(rows)
                    
                    # Detect column types
                    for header in headers:
                        sample_values = [row.get(header, '') for row in rows[:10]]
                        column_types[header] = detect_column_type(sample_values)
                    
                    parsed_data = {
                        'headers': headers,
                        'rows': rows
                    }
                    status = 'processed'
                    
            elif file_type == 'json':
                # Parse JSON
                json_content = json.loads(content.decode('utf-8'))
                
                if isinstance(json_content, list) and len(json_content) > 0:
                    headers = list(json_content[0].keys())
                    column_count = len(headers)
                    row_count = len(json_content)
                    
                    # Detect column types
                    for header in headers:
                        sample_values = [row.get(header, '') for row in json_content[:10]]
                        column_types[header] = detect_column_type(sample_values)
                    
                    parsed_data = {
                        'headers': headers,
                        'rows': json_content
                    }
                    status = 'processed'
                else:
                    parsed_data = json_content
                    status = 'processed'
                    
            else:
                status = 'error'
                error_message = f'Unsupported file type: {file_type}'
                
        except Exception as parse_error:
            status = 'error'
            error_message = str(parse_error)
        
        # Insert into database
        file_data = {
            'user_id': user_id,
            'workspace_id': workspace_id,
            'page_id': page_id,
            'block_id': block_id,
            'filename': filename,
            'file_type': file_type,
            'file_size': file_size,
            'mime_type': file.content_type,
            'parsed_data': parsed_data,
            'column_types': column_types,
            'row_count': row_count,
            'column_count': column_count,
            'status': status,
            'error_message': error_message,
            'processed_at': datetime.utcnow().isoformat() if status == 'processed' else None
        }
        
        response = supabase_admin.table('data_files').insert(file_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail='Failed to save file')
        
        return response.data[0]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data-files/{file_id}")
async def get_data_file(file_id: str, user_id: str = Depends(get_current_user)):
    """Get a data file by ID"""
    try:
        response = supabase_admin.table('data_files').select('*').eq('id', file_id).eq('user_id', user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail='File not found')
        
        # Update last_accessed_at
        supabase_admin.table('data_files').update({
            'last_accessed_at': datetime.utcnow().isoformat()
        }).eq('id', file_id).execute()
        
        return response.data[0]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data-files/by-page/{page_id}")
async def get_data_files_by_page(page_id: str, user_id: str = Depends(get_current_user)):
    """Get all data files for a page"""
    try:
        response = supabase_admin.table('data_files').select('*').eq('page_id', page_id).eq('user_id', user_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/data-files/{file_id}")
async def delete_data_file(file_id: str, user_id: str = Depends(get_current_user)):
    """Delete a data file"""
    try:
        response = supabase_admin.table('data_files').delete().eq('id', file_id).eq('user_id', user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail='File not found')
        
        return {'message': 'File deleted successfully'}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# FORM SUBMISSIONS ENDPOINTS
# ============================================

class FormSubmission(BaseModel):
    page_id: str
    block_id: str
    form_data: Dict[str, Any]
    workspace_id: Optional[str] = None

@router.post("/forms/submit")
async def submit_form(submission: FormSubmission, user_id: str = Depends(get_current_user)):
    """Submit a form"""
    try:
        submission_data = {
            'user_id': user_id,
            'workspace_id': submission.workspace_id,
            'page_id': submission.page_id,
            'block_id': submission.block_id,
            'form_data': submission.form_data,
            'submitted_by': user_id
        }
        
        response = supabase_admin.table('form_submissions').insert(submission_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail='Failed to save submission')
        
        # Log activity
        log_activity(
            user_id=user_id,
            workspace_id=submission.workspace_id,
            activity_type='form_submitted',
            entity_type='form',
            entity_id=submission.block_id,
            action='create',
            details={'page_id': submission.page_id}
        )
        
        return response.data[0]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/forms/{block_id}/submissions")
async def get_form_submissions(
    block_id: str,
    page_id: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """Get all submissions for a form block"""
    try:
        query = supabase_admin.table('form_submissions').select('*').eq('block_id', block_id).eq('user_id', user_id)
        
        if page_id:
            query = query.eq('page_id', page_id)
        
        response = query.order('submitted_at', desc=True).execute()
        return response.data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# ACTIVITY LOG ENDPOINTS
# ============================================

class ActivityLog(BaseModel):
    activity_type: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    action: str
    details: Optional[Dict] = None
    workspace_id: Optional[str] = None

@router.post("/activity/log")
async def log_user_activity(activity: ActivityLog, user_id: str = Depends(get_current_user)):
    """Log user activity"""
    try:
        log_activity(
            user_id=user_id,
            workspace_id=activity.workspace_id,
            activity_type=activity.activity_type,
            entity_type=activity.entity_type,
            entity_id=activity.entity_id,
            action=activity.action,
            details=activity.details
        )
        return {'message': 'Activity logged'}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/activity/recent")
async def get_recent_activity(
    limit: int = 50,
    workspace_id: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """Get recent workspace activity by fetching CRUD history from all tables"""
    try:
        activities = []
        
        # First try to get from activity log table
        try:
            log_query = supabase_admin.table('user_activity_log').select('*')
            if workspace_id:
                log_query = log_query.eq('workspace_id', workspace_id)
            else:
                log_query = log_query.eq('user_id', user_id)
            log_response = log_query.order('created_at', desc=True).limit(limit).execute()
            if log_response.data:
                activities.extend(log_response.data)
        except Exception as log_error:
            print(f"Activity log table not available: {log_error}")
        
        # If no activity log data, build activity from actual tables
        if len(activities) < limit:
            remaining = limit - len(activities)
            
            # Get recent pages (created/updated)
            try:
                pages_query = supabase_admin.table('pages').select('id, title, icon, created_at, updated_at, workspace_id, user_id')
                if workspace_id:
                    pages_query = pages_query.eq('workspace_id', workspace_id)
                else:
                    pages_query = pages_query.eq('user_id', user_id)
                pages_response = pages_query.order('updated_at', desc=True).limit(remaining // 3 + 5).execute()
                
                if pages_response.data:
                    for page in pages_response.data:
                        # Determine if created or updated
                        created_at = page.get('created_at')
                        updated_at = page.get('updated_at')
                        is_new = created_at == updated_at if created_at and updated_at else True
                        
                        activities.append({
                            'id': f"page-{page['id']}-{'create' if is_new else 'update'}",
                            'user_id': page.get('user_id', user_id),
                            'workspace_id': page.get('workspace_id', workspace_id),
                            'activity_type': 'page',
                            'entity_type': 'page',
                            'entity_id': page['id'],
                            'action': 'create' if is_new else 'update',
                            'details': {
                                'entity_name': page.get('title', 'Untitled'),
                                'icon': page.get('icon', '📄')
                            },
                            'created_at': updated_at or created_at
                        })
            except Exception as e:
                print(f"Error fetching pages: {e}")
            
            # Get recent tasks
            try:
                tasks_query = supabase_admin.table('tasks').select('id, title, status, created_at, updated_at, workspace_id, user_id')
                if workspace_id:
                    tasks_query = tasks_query.eq('workspace_id', workspace_id)
                else:
                    tasks_query = tasks_query.eq('user_id', user_id)
                tasks_response = tasks_query.order('updated_at', desc=True).limit(remaining // 3 + 5).execute()
                
                if tasks_response.data:
                    for task in tasks_response.data:
                        created_at = task.get('created_at')
                        updated_at = task.get('updated_at')
                        is_new = created_at == updated_at if created_at and updated_at else True
                        is_completed = task.get('status') == 'completed'
                        
                        action = 'create' if is_new else ('complete' if is_completed else 'update')
                        
                        activities.append({
                            'id': f"task-{task['id']}-{action}",
                            'user_id': task.get('user_id', user_id),
                            'workspace_id': task.get('workspace_id', workspace_id),
                            'activity_type': 'task',
                            'entity_type': 'task',
                            'entity_id': task['id'],
                            'action': action,
                            'details': {
                                'entity_name': task.get('title', 'Untitled Task'),
                                'status': task.get('status')
                            },
                            'created_at': updated_at or created_at
                        })
            except Exception as e:
                print(f"Error fetching tasks: {e}")
            
            # Get recent skills
            try:
                skills_query = supabase_admin.table('skills').select('id, name, level, created_at, updated_at, workspace_id, user_id')
                if workspace_id:
                    skills_query = skills_query.eq('workspace_id', workspace_id)
                else:
                    skills_query = skills_query.eq('user_id', user_id)
                skills_response = skills_query.order('updated_at', desc=True).limit(remaining // 3 + 5).execute()
                
                if skills_response.data:
                    for skill in skills_response.data:
                        created_at = skill.get('created_at')
                        updated_at = skill.get('updated_at')
                        is_new = created_at == updated_at if created_at and updated_at else True
                        
                        activities.append({
                            'id': f"skill-{skill['id']}-{'create' if is_new else 'update'}",
                            'user_id': skill.get('user_id', user_id),
                            'workspace_id': skill.get('workspace_id', workspace_id),
                            'activity_type': 'skill',
                            'entity_type': 'skill',
                            'entity_id': skill['id'],
                            'action': 'create' if is_new else 'update',
                            'details': {
                                'entity_name': skill.get('name', 'Untitled Skill'),
                                'level': skill.get('level')
                            },
                            'created_at': updated_at or created_at
                        })
            except Exception as e:
                print(f"Error fetching skills: {e}")
        
        # Sort all activities by created_at descending
        activities.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        # Return limited results
        return activities[:limit]
        
    except Exception as e:
        print(f"Error in get_recent_activity: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# PAGE SNAPSHOTS ENDPOINTS
# ============================================

@router.get("/pages/{page_id}/snapshots")
async def get_page_snapshots(
    page_id: str,
    limit: int = 10,
    user_id: str = Depends(get_current_user)
):
    """Get version history snapshots for a page"""
    try:
        response = supabase_admin.table('page_snapshots').select('*').eq('page_id', page_id).eq('user_id', user_id).order('created_at', desc=True).limit(limit).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/pages/{page_id}/snapshots")
async def create_manual_snapshot(
    page_id: str,
    description: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """Create a manual snapshot of a page"""
    try:
        # Get current page data
        page_response = supabase_admin.table('pages').select('*').eq('id', page_id).eq('user_id', user_id).execute()
        
        if not page_response.data:
            raise HTTPException(status_code=404, detail='Page not found')
        
        page = page_response.data[0]
        
        # Create snapshot
        snapshot_data = {
            'page_id': page_id,
            'user_id': user_id,
            'content': page.get('content'),
            'blocks': page.get('blocks'),
            'version': page.get('version', 1),
            'snapshot_type': 'manual',
            'description': description
        }
        
        response = supabase_admin.table('page_snapshots').insert(snapshot_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail='Failed to create snapshot')
        
        return response.data[0]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/pages/{page_id}/restore/{snapshot_id}")
async def restore_snapshot(
    page_id: str,
    snapshot_id: str,
    user_id: str = Depends(get_current_user)
):
    """Restore a page from a snapshot"""
    try:
        # Get snapshot
        snapshot_response = supabase_admin.table('page_snapshots').select('*').eq('id', snapshot_id).eq('page_id', page_id).eq('user_id', user_id).execute()
        
        if not snapshot_response.data:
            raise HTTPException(status_code=404, detail='Snapshot not found')
        
        snapshot = snapshot_response.data[0]
        
        # Update page with snapshot data
        update_data = {
            'content': snapshot.get('content'),
            'blocks': snapshot.get('blocks')
        }
        
        response = supabase_admin.table('pages').update(update_data).eq('id', page_id).eq('user_id', user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail='Page not found')
        
        # Log activity
        log_activity(
            user_id=user_id,
            activity_type='page_restored',
            entity_type='page',
            entity_id=page_id,
            action='update',
            details={'snapshot_id': snapshot_id, 'version': snapshot.get('version')}
        )
        
        return response.data[0]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# HELPER FUNCTIONS
# ============================================

def detect_column_type(values: List[Any]) -> str:
    """Detect the type of a column based on sample values"""
    if not values:
        return 'text'
    
    # Remove empty values
    non_empty = [v for v in values if v and str(v).strip()]
    
    if not non_empty:
        return 'text'
    
    # Check if all are numbers
    try:
        [float(v) for v in non_empty]
        return 'number'
    except:
        pass
    
    # Check if all are dates
    date_patterns = ['/', '-', '.']
    if all(any(p in str(v) for p in date_patterns) for v in non_empty):
        return 'date'
    
    # Check if all are booleans
    bool_values = {'true', 'false', 'yes', 'no', '1', '0'}
    if all(str(v).lower() in bool_values for v in non_empty):
        return 'boolean'
    
    return 'text'

def log_activity(
    user_id: str,
    activity_type: str,
    action: str,
    workspace_id: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    details: Optional[Dict] = None
):
    """Helper function to log user activity"""
    try:
        activity_data = {
            'user_id': user_id,
            'workspace_id': workspace_id,
            'activity_type': activity_type,
            'entity_type': entity_type,
            'entity_id': entity_id,
            'action': action,
            'details': details or {}
        }
        
        supabase_admin.table('user_activity_log').insert(activity_data).execute()
    except Exception as e:
        # Don't fail the main operation if logging fails
        print(f"Failed to log activity: {e}")
