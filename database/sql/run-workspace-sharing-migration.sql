-- ============================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- Workspace Sharing & Invitations System
-- ============================================

-- 1. Create workspace_invitations table
CREATE TABLE IF NOT EXISTS workspace_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add is_public column to workspaces if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'workspaces' AND column_name = 'is_public') THEN
        ALTER TABLE workspaces ADD COLUMN is_public BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace ON workspace_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON workspace_invitations(email);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_token ON workspace_invitations(token);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_status ON workspace_invitations(status);

-- 4. Enable RLS
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if they exist
DROP POLICY IF EXISTS "Workspace admins can view invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Workspace admins can create invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Workspace admins can update invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Workspace admins can delete invitations" ON workspace_invitations;

-- 6. Create RLS policies
CREATE POLICY "Workspace admins can view invitations"
    ON workspace_invitations FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
        OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "Workspace admins can create invitations"
    ON workspace_invitations FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Workspace admins can update invitations"
    ON workspace_invitations FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
        OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "Workspace admins can delete invitations"
    ON workspace_invitations FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- 7. Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_workspace_invitation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workspace_invitation_updated ON workspace_invitations;
CREATE TRIGGER workspace_invitation_updated
    BEFORE UPDATE ON workspace_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_workspace_invitation_timestamp();

-- 8. Ensure workspace_members table exists and has proper structure
CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- 8.5 Create helper function to get user ID by email
CREATE OR REPLACE FUNCTION get_user_id_by_email(user_email TEXT)
RETURNS UUID AS $$
DECLARE
    found_user_id UUID;
BEGIN
    SELECT id INTO found_user_id FROM auth.users WHERE email = user_email LIMIT 1;
    RETURN found_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Add existing workspace owners as members if not already
INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT id, user_id, 'owner'
FROM workspaces
WHERE user_id IS NOT NULL
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- 10. Create indexes for workspace_members
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);

-- 11. Enable RLS on workspace_members
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- 12. Drop existing policies
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Owners and admins can add members" ON workspace_members;
DROP POLICY IF EXISTS "Owners and admins can update members" ON workspace_members;
DROP POLICY IF EXISTS "Owners and admins can remove members" ON workspace_members;

-- 13. Create RLS policies for workspace_members
CREATE POLICY "Users can view workspace members"
    ON workspace_members FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members wm
            WHERE wm.user_id = auth.uid()
        )
        OR workspace_id IN (
            SELECT id FROM workspaces WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Owners and admins can add members"
    ON workspace_members FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
        OR workspace_id IN (
            SELECT id FROM workspaces WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Owners and admins can update members"
    ON workspace_members FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
        OR workspace_id IN (
            SELECT id FROM workspaces WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Owners and admins can remove members"
    ON workspace_members FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
        OR workspace_id IN (
            SELECT id FROM workspaces WHERE user_id = auth.uid()
        )
        OR user_id = auth.uid()  -- Users can remove themselves
    );

SELECT 'Workspace sharing migration complete!' as status;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the setup:

-- Check if workspace_invitations table exists
-- SELECT * FROM workspace_invitations LIMIT 5;

-- Check if workspace_members table exists  
-- SELECT * FROM workspace_members LIMIT 5;

-- Check if get_user_id_by_email function exists
-- SELECT get_user_id_by_email('test@example.com');
