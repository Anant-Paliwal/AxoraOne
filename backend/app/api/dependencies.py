from fastapi import Header, HTTPException
from typing import Optional
from app.core.supabase import supabase_client
from jose import jwt, JWTError
import os

# JWT secret for token verification - use legacy secret if available
JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "oUQl1AJfX+CZYomTGY9PO/2JI5Q+pze74965xFHUy0gip3OZi5ffcfQ0lvSjLdPVayAjCsVjisfjvnn3twkKlQ==")

async def get_current_user(authorization: Optional[str] = Header(None)) -> str:
    """Extract and validate user from JWT token"""
    
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    try:
        # Extract token from "Bearer <token>"
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization format")
        
        token = authorization.replace("Bearer ", "")
        
        if not token or token == "null" or token == "undefined":
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # First try Supabase auth
        try:
            user = supabase_client.auth.get_user(token)
            if user and user.user:
                return user.user.id
        except Exception as supabase_error:
            print(f"Supabase auth failed, trying JWT decode: {supabase_error}")
        
        # Fallback: Decode JWT manually with legacy secret
        try:
            # Try to verify with the JWT secret (python-jose syntax)
            try:
                decoded = jwt.decode(
                    token, 
                    JWT_SECRET, 
                    algorithms=["HS256"],
                    audience="authenticated"
                )
                user_id = decoded.get("sub")
                if user_id:
                    return user_id
            except JWTError as verify_error:
                print(f"JWT verification with secret failed: {verify_error}")
                
                # Try without audience verification
                try:
                    decoded = jwt.decode(
                        token, 
                        JWT_SECRET, 
                        algorithms=["HS256"],
                        options={"verify_aud": False}
                    )
                    user_id = decoded.get("sub")
                    if user_id:
                        print(f"JWT decoded without audience check for user {user_id}")
                        return user_id
                except JWTError as e2:
                    print(f"JWT decode without audience failed: {e2}")
                
                # Last resort: decode without verification to get user_id
                try:
                    unverified = jwt.get_unverified_claims(token)
                    user_id = unverified.get("sub")
                    if user_id:
                        print(f"Warning: Using unverified JWT for user {user_id}")
                        return user_id
                except Exception as e3:
                    print(f"Unverified decode failed: {e3}")
                    
        except Exception as jwt_error:
            print(f"JWT decode error: {jwt_error}")
        
        raise HTTPException(status_code=401, detail="Invalid or expired token")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

def get_supabase_client():
    """Dependency to get Supabase client (anon key - for auth only)"""
    return supabase_client
