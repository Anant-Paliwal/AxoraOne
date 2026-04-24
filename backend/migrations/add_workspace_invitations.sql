-- ============================================
-- WORKSPACE INVITATIONS TABLE
-- Handles pending workspace invitations
-- ============================================

-- Create workspace_invitations table
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
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate pending invitations
    UNIQUE(workspace_id, email, status)
);

-- Add is_public column to workspaces if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'workspaces' AND column_name = 'is_public') THEN
        ALTER TABLE workspaces ADD COLUMN is_public BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace ON workspace_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON workspace_invitations(email);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_token ON workspace_invitations(token);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_status ON workspace_invitations(status);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Workspace owners/admins can view invitations
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

-- Workspace owners/admins can create invitations
CREATE POLICY "Workspace admins can create invitations"
    ON workspace_invitations FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Workspace owners/admins can update invitations
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

-- Workspace owners/admins can delete invitations
CREATE POLICY "Workspace admins can delete invitations"
    ON workspace_invitations FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- ============================================
-- FUNCTION: Accept invitation
-- ============================================
CREATE OR REPLACE FUNCTION accept_workspace_invitation(invitation_token TEXT)
RETURNS JSON AS $$
DECLARE
    inv RECORD;
    current_user_id UUID;
    current_user_email TEXT;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    SELECT email INTO current_user_email FROM auth.users WHERE id = current_user_id;
    
    -- Find the invitation
    SELECT * INTO inv FROM workspace_invitations 
    WHERE token = invitation_token 
    AND status = 'pending'
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;
    
    -- Check if email matches
    IF inv.email != current_user_email THEN
        RETURN json_build_object('success', false, 'error', 'This invitation was sent to a different email');
    END IF;
    
    -- Check if already a member
    IF EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = inv.workspace_id AND user_id = current_user_id) THEN
        -- Update invitation status
        UPDATE workspace_invitations SET status = 'accepted', updated_at = NOW() WHERE id = inv.id;
        RETURN json_build_object('success', true, 'message', 'Already a member of this workspace', 'workspace_id', inv.workspace_id);
    END IF;
    
    -- Add user as member
    INSERT INTO workspace_members (workspace_id, user_id, role, invited_by, joined_at)
    VALUES (inv.workspace_id, current_user_id, inv.role, inv.invited_by, NOW());
    
    -- Update invitation status
    UPDATE workspace_invitations SET status = 'accepted', updated_at = NOW() WHERE id = inv.id;
    
    RETURN json_build_object('success', true, 'message', 'Successfully joined workspace', 'workspace_id', inv.workspace_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: Update timestamp
-- ============================================
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
