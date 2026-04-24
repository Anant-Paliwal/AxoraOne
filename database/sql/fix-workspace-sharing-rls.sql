-- ============================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- Complete Workspace Sharing with RLS Policies
-- ============================================

-- 1. Create helper function to check workspace membership
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM workspace_members 
        WHERE workspace_id = ws_id AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM workspaces 
        WHERE id = ws_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create helper function to get user's role in workspace
CREATE OR REPLACE FUNCTION get_workspace_role(ws_id UUID)
RETURNS TEXT AS $$
DECLARE
    role_val TEXT;
BEGIN
    -- Check if owner
    IF EXISTS (SELECT 1 FROM workspaces WHERE id = ws_id AND user_id = auth.uid()) THEN
        RETURN 'owner';
    END IF;
    
    -- Check membership
    SELECT role INTO role_val FROM workspace_members 
    WHERE workspace_id = ws_id AND user_id = auth.uid();
    
    RETURN COALESCE(role_val, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create helper function to check if user can edit in workspace
CREATE OR REPLACE FUNCTION can_edit_workspace(ws_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    role_val TEXT;
BEGIN
    role_val := get_workspace_role(ws_id);
    RETURN role_val IN ('owner', 'admin', 'member');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PAGES RLS - Allow workspace members to access
-- ============================================
DROP POLICY IF EXISTS "Users can view own pages" ON pages;
DROP POLICY IF EXISTS "Users can view workspace pages" ON pages;
DROP POLICY IF EXISTS "Users can view pages" ON pages;
DROP POLICY IF EXISTS "Users can create pages" ON pages;
DROP POLICY IF EXISTS "Users can update own pages" ON pages;
DROP POLICY IF EXISTS "Users can update workspace pages" ON pages;
DROP POLICY IF EXISTS "Users can update pages" ON pages;
DROP POLICY IF EXISTS "Users can delete own pages" ON pages;
DROP POLICY IF EXISTS "Users can delete pages" ON pages;

-- Select: Own OR workspace member
CREATE POLICY "Users can view pages"
    ON pages FOR SELECT
    USING (
        user_id = auth.uid() 
        OR is_workspace_member(workspace_id)
    );

-- Create: Own OR workspace member with edit permission
CREATE POLICY "Users can create pages"
    ON pages FOR INSERT
    WITH CHECK (
        user_id = auth.uid() 
        OR can_edit_workspace(workspace_id)
    );

-- Update: Own OR workspace member with edit permission
CREATE POLICY "Users can update pages"
    ON pages FOR UPDATE
    USING (
        user_id = auth.uid() 
        OR can_edit_workspace(workspace_id)
    );

-- Delete: Own OR workspace admin/owner
CREATE POLICY "Users can delete pages"
    ON pages FOR DELETE
    USING (
        user_id = auth.uid() 
        OR get_workspace_role(workspace_id) IN ('owner', 'admin')
    );

-- ============================================
-- TASKS RLS - Allow workspace members to access
-- ============================================
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view workspace tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update workspace tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks" ON tasks;

CREATE POLICY "Users can view tasks"
    ON tasks FOR SELECT
    USING (
        user_id = auth.uid() 
        OR is_workspace_member(workspace_id)
    );

CREATE POLICY "Users can create tasks"
    ON tasks FOR INSERT
    WITH CHECK (
        user_id = auth.uid() 
        OR can_edit_workspace(workspace_id)
    );

CREATE POLICY "Users can update tasks"
    ON tasks FOR UPDATE
    USING (
        user_id = auth.uid() 
        OR can_edit_workspace(workspace_id)
    );

CREATE POLICY "Users can delete tasks"
    ON tasks FOR DELETE
    USING (
        user_id = auth.uid() 
        OR get_workspace_role(workspace_id) IN ('owner', 'admin')
    );

-- ============================================
-- SKILLS RLS - Allow workspace members to access
-- ============================================
DROP POLICY IF EXISTS "Users can view own skills" ON skills;
DROP POLICY IF EXISTS "Users can view workspace skills" ON skills;
DROP POLICY IF EXISTS "Users can view skills" ON skills;
DROP POLICY IF EXISTS "Users can create skills" ON skills;
DROP POLICY IF EXISTS "Users can update own skills" ON skills;
DROP POLICY IF EXISTS "Users can update workspace skills" ON skills;
DROP POLICY IF EXISTS "Users can update skills" ON skills;
DROP POLICY IF EXISTS "Users can delete own skills" ON skills;
DROP POLICY IF EXISTS "Users can delete skills" ON skills;

CREATE POLICY "Users can view skills"
    ON skills FOR SELECT
    USING (
        user_id = auth.uid() 
        OR is_workspace_member(workspace_id)
    );

CREATE POLICY "Users can create skills"
    ON skills FOR INSERT
    WITH CHECK (
        user_id = auth.uid() 
        OR can_edit_workspace(workspace_id)
    );

CREATE POLICY "Users can update skills"
    ON skills FOR UPDATE
    USING (
        user_id = auth.uid() 
        OR can_edit_workspace(workspace_id)
    );

CREATE POLICY "Users can delete skills"
    ON skills FOR DELETE
    USING (
        user_id = auth.uid() 
        OR get_workspace_role(workspace_id) IN ('owner', 'admin')
    );

-- ============================================
-- WORKSPACES RLS - Members can view shared workspaces
-- ============================================
DROP POLICY IF EXISTS "Users can view own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view shared workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can update own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can update workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can delete own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can delete workspaces" ON workspaces;

-- View: Own OR member
CREATE POLICY "Users can view workspaces"
    ON workspaces FOR SELECT
    USING (
        user_id = auth.uid() 
        OR id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );

-- Create: Anyone authenticated
CREATE POLICY "Users can create workspaces"
    ON workspaces FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Update: Only owner
CREATE POLICY "Users can update workspaces"
    ON workspaces FOR UPDATE
    USING (user_id = auth.uid());

-- Delete: Only owner
CREATE POLICY "Users can delete workspaces"
    ON workspaces FOR DELETE
    USING (user_id = auth.uid());

-- ============================================
-- WORKSPACE_MEMBERS RLS
-- ============================================
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Owners and admins can add members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can add members" ON workspace_members;
DROP POLICY IF EXISTS "Owners and admins can update members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can update members" ON workspace_members;
DROP POLICY IF EXISTS "Owners and admins can remove members" ON workspace_members;
DROP POLICY IF EXISTS "Members can leave workspace" ON workspace_members;
DROP POLICY IF EXISTS "Members can be removed" ON workspace_members;

-- View: Workspace members can see other members
CREATE POLICY "Users can view workspace members"
    ON workspace_members FOR SELECT
    USING (
        is_workspace_member(workspace_id)
    );

-- Insert: Owner or admin can add
CREATE POLICY "Admins can add members"
    ON workspace_members FOR INSERT
    WITH CHECK (
        get_workspace_role(workspace_id) IN ('owner', 'admin')
    );

-- Update: Owner or admin can change roles
CREATE POLICY "Admins can update members"
    ON workspace_members FOR UPDATE
    USING (
        get_workspace_role(workspace_id) IN ('owner', 'admin')
    );

-- Delete: Owner/admin can remove, OR user can remove themselves
CREATE POLICY "Members can be removed"
    ON workspace_members FOR DELETE
    USING (
        get_workspace_role(workspace_id) IN ('owner', 'admin')
        OR user_id = auth.uid()
    );

-- ============================================
-- WORKSPACE_INVITATIONS RLS
-- ============================================
DROP POLICY IF EXISTS "Workspace admins can view invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Workspace admins can create invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Workspace admins can update invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Workspace admins can delete invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Invited users can view their invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Users can view invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Users can update invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON workspace_invitations;

-- View: Admins OR the invited user
CREATE POLICY "Users can view invitations"
    ON workspace_invitations FOR SELECT
    USING (
        get_workspace_role(workspace_id) IN ('owner', 'admin')
        OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Create: Owner or admin
CREATE POLICY "Admins can create invitations"
    ON workspace_invitations FOR INSERT
    WITH CHECK (
        get_workspace_role(workspace_id) IN ('owner', 'admin')
    );

-- Update: Owner/admin OR invited user (to accept/decline)
CREATE POLICY "Users can update invitations"
    ON workspace_invitations FOR UPDATE
    USING (
        get_workspace_role(workspace_id) IN ('owner', 'admin')
        OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Delete: Owner or admin
CREATE POLICY "Admins can delete invitations"
    ON workspace_invitations FOR DELETE
    USING (
        get_workspace_role(workspace_id) IN ('owner', 'admin')
    );

-- ============================================
-- GRAPH_EDGES RLS
-- ============================================
DROP POLICY IF EXISTS "Users can view graph edges" ON graph_edges;
DROP POLICY IF EXISTS "Users can create graph edges" ON graph_edges;
DROP POLICY IF EXISTS "Users can update graph edges" ON graph_edges;
DROP POLICY IF EXISTS "Users can delete graph edges" ON graph_edges;

CREATE POLICY "Users can view graph edges"
    ON graph_edges FOR SELECT
    USING (
        user_id = auth.uid() 
        OR is_workspace_member(workspace_id)
    );

CREATE POLICY "Users can create graph edges"
    ON graph_edges FOR INSERT
    WITH CHECK (
        user_id = auth.uid() 
        OR can_edit_workspace(workspace_id)
    );

CREATE POLICY "Users can update graph edges"
    ON graph_edges FOR UPDATE
    USING (
        user_id = auth.uid() 
        OR can_edit_workspace(workspace_id)
    );

CREATE POLICY "Users can delete graph edges"
    ON graph_edges FOR DELETE
    USING (
        user_id = auth.uid() 
        OR can_edit_workspace(workspace_id)
    );

-- ============================================
-- Enable RLS on all tables
-- ============================================
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_edges ENABLE ROW LEVEL SECURITY;

SELECT 'Workspace sharing RLS policies created!' as status;
