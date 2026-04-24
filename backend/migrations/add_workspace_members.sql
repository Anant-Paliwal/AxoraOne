-- Workspace Members Table Migration
-- This table tracks which users belong to which workspaces

-- ============================================
-- 1. CREATE WORKSPACE MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member', 'viewer'
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(workspace_id, user_id)
);

-- ============================================
-- 2. ADD EXISTING WORKSPACE OWNERS AS MEMBERS
-- ============================================
-- Add workspace creators as owners
INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT id, user_id, 'owner'
FROM workspaces
WHERE user_id IS NOT NULL
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- ============================================
-- 3. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_role ON workspace_members(role);

-- ============================================
-- 4. RLS POLICIES
-- ============================================
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Users can view members of workspaces they belong to
CREATE POLICY "Users can view workspace members"
    ON workspace_members FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Only owners and admins can add members
CREATE POLICY "Owners and admins can add members"
    ON workspace_members FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Only owners and admins can update member roles
CREATE POLICY "Owners and admins can update members"
    ON workspace_members FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Only owners and admins can remove members
CREATE POLICY "Owners and admins can remove members"
    ON workspace_members FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- ============================================
-- 5. TRIGGER TO AUTO-ADD CREATOR AS OWNER
-- ============================================
CREATE OR REPLACE FUNCTION add_workspace_creator_as_owner()
RETURNS TRIGGER AS $$
BEGIN
    -- Add the workspace creator as owner
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_add_workspace_creator
    AFTER INSERT ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION add_workspace_creator_as_owner();

COMMENT ON TABLE workspace_members IS 'Tracks workspace membership and roles';
