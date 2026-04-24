"""
Index All Existing Pages to Upstash Vector
This script indexes all pages from Supabase into Upstash Vector for search functionality
"""

import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.supabase import supabase_admin
from app.services.vector_store import vector_store_service
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def index_all_pages():
    """Index all pages from Supabase to Upstash Vector"""
    
    print("=" * 60)
    print("INDEXING ALL PAGES TO UPSTASH VECTOR")
    print("=" * 60)
    
    # Check if vector store is available
    if not vector_store_service.upstash_available:
        print("\n❌ ERROR: Upstash Vector is NOT configured!")
        print("\nPlease set these environment variables in backend/.env:")
        print("  UPSTASH_VECTOR_REST_URL=your_url")
        print("  UPSTASH_VECTOR_REST_TOKEN=your_token")
        print("\nAlso ensure you have an embedding API key:")
        print("  GEMINI_API_KEY=your_key")
        print("  OR")
        print("  OPENAI_API_KEY=your_key")
        return
    
    print("\n✅ Upstash Vector is configured")
    print(f"   URL: {vector_store_service.vector_url[:50]}...")
    
    # Initialize vector store
    await vector_store_service.initialize()
    
    # Fetch all pages from Supabase
    print("\n📥 Fetching pages from Supabase...")
    try:
        response = supabase_admin.table("pages").select("*").execute()
        pages = response.data or []
        print(f"   Found {len(pages)} pages")
    except Exception as e:
        print(f"\n❌ ERROR fetching pages: {e}")
        return
    
    if len(pages) == 0:
        print("\n⚠️  No pages found in database")
        print("   Create some pages first, then run this script")
        return
    
    # Index each page
    print(f"\n🔄 Indexing {len(pages)} pages...")
    print("-" * 60)
    
    success_count = 0
    failed_count = 0
    
    for i, page in enumerate(pages, 1):
        page_id = page.get("id")
        title = page.get("title", "Untitled")
        content = page.get("content", "")
        user_id = page.get("user_id")
        workspace_id = page.get("workspace_id")
        tags = page.get("tags", [])
        
        print(f"\n[{i}/{len(pages)}] Indexing: {title}")
        print(f"   ID: {page_id}")
        print(f"   Content length: {len(content)} chars")
        print(f"   Workspace: {workspace_id or 'None'}")
        
        try:
            success = await vector_store_service.add_page(
                page_id=page_id,
                title=title,
                content=content,
                metadata={
                    "title": title,
                    "user_id": user_id,
                    "workspace_id": workspace_id,
                    "tags": tags
                }
            )
            
            if success:
                print(f"   ✅ Successfully indexed")
                success_count += 1
            else:
                print(f"   ❌ Failed to index")
                failed_count += 1
                
        except Exception as e:
            print(f"   ❌ Error: {e}")
            failed_count += 1
        
        # Small delay to avoid rate limits
        await asyncio.sleep(0.5)
    
    # Summary
    print("\n" + "=" * 60)
    print("INDEXING COMPLETE")
    print("=" * 60)
    print(f"\n✅ Successfully indexed: {success_count} pages")
    if failed_count > 0:
        print(f"❌ Failed to index: {failed_count} pages")
    print(f"\n📊 Total vector records: {success_count}")
    print("\n🔍 Pages are now searchable via Ask Anything!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(index_all_pages())
