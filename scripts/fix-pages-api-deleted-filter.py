"""
Fix to add deleted_at filter to pages API endpoints
This ensures deleted pages don't show in normal queries
"""

# Add this filter to ALL pages queries in backend/app/api/endpoints/pages.py:
# .is_("deleted_at", "null")

# Lines to update:

FIXES = """
Line 217: query = supabase_admin.table("pages").select("*", count="exact")
ADD: .is_("deleted_at", "null")

Line 420: response = supabase_admin.table("pages").select("*").eq("workspace_id", workspace_id).eq("is_archived", False).order("page_order").execute()
ADD: .is_("deleted_at", "null") before .order()

Line 433: response = supabase_admin.table("pages").select("*").eq("id", page_id).execute()
ADD: .is_("deleted_at", "null")

Line 480: page_check = supabase_admin.table("pages").select("id, user_id, workspace_id, blocks").eq("id", page_id).execute()
ADD: .is_("deleted_at", "null")

Line 560: page_check = supabase_admin.table("pages").select("id, user_id, workspace_id").eq("id", page_id).execute()
ADD: .is_("deleted_at", "null")

Line 598: response = supabase_admin.table("pages").select("*").eq("parent_page_id", page_id).eq("user_id", user_id).order("page_order").execute()
ADD: .is_("deleted_at", "null") before .order()

Line 613: search_query = supabase_admin.table("pages").select("id, title, content, icon, tags, workspace_id, updated_at, word_count, estimated_reading_time")
ADD: .is_("deleted_at", "null")

Line 718: original = supabase_admin.table("pages").select("*").eq("id", page_id).eq("user_id", user_id).execute()
ADD: .is_("deleted_at", "null")

Line 811: response = supabase_admin.table("pages").select("*").eq("user_id", user_id).eq("is_template", True).eq("is_archived", False).execute()
ADD: .is_("deleted_at", "null")

Line 1028: children = supabase_admin.table("pages").select("id, title, icon, parent_page_id, depth, page_order, updated_at").in_("parent_page_id", current_level).eq("user_id", user_id).eq("is_archived", False).order("page_order").execute()
ADD: .is_("deleted_at", "null") before .order()

Line 1053: response = supabase_admin.table("pages").select("id, title, icon, parent_page_id, depth, page_order, updated_at, is_favorite, page_type").eq("workspace_id", workspace_id).eq("user_id", user_id).eq("is_archived", False).order("page_order").execute()
ADD: .is_("deleted_at", "null") before .order()
"""

print(FIXES)
print("\n✅ Apply these fixes to backend/app/api/endpoints/pages.py")
print("✅ Add .is_('deleted_at', 'null') to filter out deleted pages")
