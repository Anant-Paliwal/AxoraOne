-- Fix Infinite Recursion in workspace_members RLS Policy
-- The policy was referencing workspace_members within its own check, causing infinite loop

-- ============================================
-- STEP 1: DROP PROBLEMATIC POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Owners and admins can add members" ON workspace_members;
DROP POLICY IF EXISTS "Owners and admins can update members" ON workspace_members;
DROP POLICY IF EXISTS "Owners and admins can remove members" ON workspace_members;

DROP POLICY IF EXISTS "Users can view their workspace subscriptions" ON workspace_subscriptions;
DROP POLICY IF EXISTS "Users can view their workspace usage" ON usage_metrics;

-- ============================================
-- STEP 2: CREATE FIXED POLICIES FOR workspace_members
-- ============================================

-- Users can view members of workspaces they belong to
-- FIX: Use direct user_id check instead of subquery
CREATE POLICY "Users can view workspace members"
    ON workspace_members FOR SELECT
    USING (user_id = auth.uid() OR workspace_id IN (
        SELECT w.id FROM workspaces w WHERE w.user_id = auth.uid()
    ));

-- Only workspace owners can add members
CREATE POLICY "Owners can add members"
    ON workspace_members FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT w.id FROM workspaces w WHERE w.user_id = auth.uid()
        )
    );

-- Only workspace owners can update member roles
CREATE POLICY "Owners can update members"
    ON workspace_members FOR UPDATE
    USING (
        workspace_id IN (
            SELECT w.id FROM workspaces w WHERE w.user_id = auth.uid()
        )
    );

-- Only workspace owners can remove members
CREATE POLICY "Owners can remove members"
    ON workspace_members FOR DELETE
    USING (
        workspace_id IN (
            SELECT w.id FROM workspaces w WHERE w.user_id = auth.uid()
        )
    );

-- ============================================
-- STEP 3: CREATE FIXED POLICIES FOR SUBSCRIPTION TABLES
-- ============================================

-- Workspace subscriptions - check via workspaces table instead
CREATE POLICY "Users can view their workspace subscriptions"
    ON workspace_subscriptions FOR SELECT
    USING (
        workspace_id IN (
            SELECT w.id FROM workspaces w WHERE w.user_id = auth.uid()
        )
    );

-- Usage metrics - check via workspaces table
CREATE POLICY "Users can view their workspace usage"
    ON usage_metrics FOR SELECT
    USING (
        workspace_id IN (
            SELECT w.id FROM workspaces w WHERE w.user_id = auth.uid()
        )
    );

-- ============================================
-- DONE!
-- ============================================
SELECT 'RLS policies fixed - infinite recursion resolved!' as status;
