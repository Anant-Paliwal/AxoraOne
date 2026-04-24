from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import List, Dict, Any
import csv
import json
import io
from app.api.dependencies import get_current_user

router = APIRouter()

@router.post("/upload/csv")
async def upload_csv(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload and parse CSV file
    Returns structured data with headers and rows
    """
    try:
        # Validate file type
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        # Accept both .csv and .CSV extensions
        if not file.filename.lower().endswith('.csv'):
            raise HTTPException(status_code=400, detail=f"File must be a CSV (got: {file.filename})")
        
        # Read file content
        content = await file.read()
        
        if not content:
            raise HTTPException(status_code=400, detail="File is empty")
        
        # Try different encodings
        decoded_content = None
        for encoding in ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252']:
            try:
                decoded_content = content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        
        if decoded_content is None:
            raise HTTPException(status_code=400, detail="Unable to decode file. Please ensure it's a valid CSV file.")
        
        # Parse CSV
        csv_reader = csv.DictReader(io.StringIO(decoded_content))
        
        # Extract headers
        headers = list(csv_reader.fieldnames) if csv_reader.fieldnames else []
        
        if not headers:
            raise HTTPException(status_code=400, detail="CSV file has no headers")
        
        # Extract rows
        rows = []
        for row in csv_reader:
            rows.append(dict(row))
        
        if not rows:
            raise HTTPException(status_code=400, detail="CSV file has no data rows")
        
        # Infer column types
        column_types = {}
        for header in headers:
            sample_value = str(rows[0].get(header, ''))
            if sample_value.isdigit():
                column_types[header] = 'number'
            elif sample_value.replace('.', '', 1).replace('-', '', 1).isdigit():
                column_types[header] = 'decimal'
            else:
                column_types[header] = 'text'
        
        return {
            "success": True,
            "filename": file.filename,
            "headers": headers,
            "rows": rows,
            "row_count": len(rows),
            "column_count": len(headers),
            "column_types": column_types,
            "data": {
                "headers": headers,
                "rows": rows
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = f"Error processing CSV: {str(e)}\n{traceback.format_exc()}"
        print(error_detail)  # Log to console
        raise HTTPException(status_code=500, detail=f"Error processing CSV: {str(e)}")


@router.post("/upload/json")
async def upload_json(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload and parse JSON file
    Returns structured data
    """
    if not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="File must be a JSON")
    
    try:
        # Read file content
        content = await file.read()
        decoded_content = content.decode('utf-8')
        
        # Parse JSON
        data = json.loads(decoded_content)
        
        # Handle different JSON structures
        if isinstance(data, list):
            # Array of objects
            if data and isinstance(data[0], dict):
                headers = list(data[0].keys())
                rows = data
            else:
                headers = ['value']
                rows = [{'value': item} for item in data]
        elif isinstance(data, dict):
            # Single object or nested structure
            if all(isinstance(v, (str, int, float, bool)) for v in data.values()):
                # Flat object - convert to single row
                headers = list(data.keys())
                rows = [data]
            else:
                # Nested structure - try to flatten
                headers = ['key', 'value']
                rows = [{'key': k, 'value': str(v)} for k, v in data.items()]
        else:
            raise HTTPException(status_code=400, detail="Unsupported JSON structure")
        
        # Infer column types
        column_types = {}
        if rows:
            for header in headers:
                sample_value = rows[0].get(header)
                if isinstance(sample_value, int):
                    column_types[header] = 'number'
                elif isinstance(sample_value, float):
                    column_types[header] = 'decimal'
                elif isinstance(sample_value, bool):
                    column_types[header] = 'boolean'
                else:
                    column_types[header] = 'text'
        
        return {
            "success": True,
            "filename": file.filename,
            "headers": headers,
            "rows": rows,
            "row_count": len(rows),
            "column_count": len(headers),
            "column_types": column_types,
            "data": {
                "headers": headers,
                "rows": rows
            }
        }
    
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing JSON: {str(e)}")


@router.post("/upload/excel")
async def upload_excel(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload and parse Excel file (requires openpyxl or pandas)
    Returns structured data
    """
    if not (file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
        raise HTTPException(status_code=400, detail="File must be an Excel file")
    
    try:
        # This requires pandas or openpyxl
        # For now, return a placeholder
        raise HTTPException(
            status_code=501, 
            detail="Excel support requires additional dependencies. Please convert to CSV."
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing Excel: {str(e)}")
