"""
Check Vector Store Configuration
Verifies all required environment variables and connections
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.config import settings
from app.services.vector_store import vector_store_service

def check_config():
    """Check if vector store is properly configured"""
    
    print("=" * 60)
    print("VECTOR STORE CONFIGURATION CHECK")
    print("=" * 60)
    
    all_good = True
    
    # Check Upstash Vector
    print("\n📦 Upstash Vector Configuration:")
    if settings.UPSTASH_VECTOR_REST_URL:
        print(f"   ✅ UPSTASH_VECTOR_REST_URL: {settings.UPSTASH_VECTOR_REST_URL[:50]}...")
    else:
        print("   ❌ UPSTASH_VECTOR_REST_URL: NOT SET")
        all_good = False
    
    if settings.UPSTASH_VECTOR_REST_TOKEN:
        print(f"   ✅ UPSTASH_VECTOR_REST_TOKEN: {settings.UPSTASH_VECTOR_REST_TOKEN[:20]}...")
    else:
        print("   ❌ UPSTASH_VECTOR_REST_TOKEN: NOT SET")
        all_good = False
    
    # Check Embedding API
    print("\n🧠 Embedding API Configuration:")
    has_embedding_key = False
    
    if settings.GEMINI_API_KEY:
        print(f"   ✅ GEMINI_API_KEY: {settings.GEMINI_API_KEY[:20]}...")
        has_embedding_key = True
    else:
        print("   ⚠️  GEMINI_API_KEY: NOT SET")
    
    if settings.OPENAI_API_KEY:
        print(f"   ✅ OPENAI_API_KEY: {settings.OPENAI_API_KEY[:20]}...")
        has_embedding_key = True
    else:
        print("   ⚠️  OPENAI_API_KEY: NOT SET")
    
    if not has_embedding_key:
        print("\n   ❌ ERROR: No embedding API key configured!")
        print("   You need either GEMINI_API_KEY or OPENAI_API_KEY")
        all_good = False
    
    # Check Vector Store Service
    print("\n🔧 Vector Store Service:")
    if vector_store_service.upstash_available:
        print("   ✅ Upstash Vector: AVAILABLE")
    else:
        print("   ❌ Upstash Vector: NOT AVAILABLE")
        all_good = False
    
    # Summary
    print("\n" + "=" * 60)
    if all_good:
        print("✅ CONFIGURATION COMPLETE")
        print("=" * 60)
        print("\n🎉 All required settings are configured!")
        print("\n📝 Next steps:")
        print("   1. Run: python scripts/index_all_pages.py")
        print("   2. Verify vector records in Upstash dashboard")
        print("   3. Test search in Ask Anything")
    else:
        print("❌ CONFIGURATION INCOMPLETE")
        print("=" * 60)
        print("\n⚠️  Missing required configuration!")
        print("\n📝 To fix:")
        print("   1. Edit backend/.env file")
        print("   2. Add missing environment variables:")
        print("\n   # Upstash Vector (get from https://console.upstash.com/)")
        print("   UPSTASH_VECTOR_REST_URL=your_url")
        print("   UPSTASH_VECTOR_REST_TOKEN=your_token")
        print("\n   # Embedding API (choose one)")
        print("   GEMINI_API_KEY=your_key  # FREE from https://makersuite.google.com/app/apikey")
        print("   # OR")
        print("   OPENAI_API_KEY=your_key")
        print("\n   3. Restart backend")
        print("   4. Run this check again")
    
    print("=" * 60)
    
    return all_good

if __name__ == "__main__":
    is_configured = check_config()
    sys.exit(0 if is_configured else 1)
