-- Final Fix: Add INSERT policy for workspace_subscriptions
-- The backend service needs permission to create subscriptions

-- ============================================
-- ADD INSERT POLICY FOR SUBSCRIPTIONS
-- ============================================

-- Allow service role to insert subscriptions (backend auto-assignment)
CREATE POLICY "Service can create subscriptions"
    ON workspace_subscriptions FOR INSERT
    WITH CHECK (true);  -- Service role bypasses this anyway

-- Allow workspace owners to insert subscriptions (for manual creation)
CREATE POLICY "Workspace owners can create subscriptions"
    ON workspace_subscriptions FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT w.id FROM workspaces w WHERE w.user_id = auth.uid()
        )
    );

-- ============================================
-- ADD UPDATE POLICY FOR SUBSCRIPTIONS
-- ============================================

-- Allow workspace owners to update their subscriptions
CREATE POLICY "Workspace owners can update subscriptions"
    ON workspace_subscriptions FOR UPDATE
    USING (
        workspace_id IN (
            SELECT w.id FROM workspaces w WHERE w.user_id = auth.uid()
        )
    );

-- ============================================
-- DONE!
-- ============================================
SELECT 'Subscription RLS policies fixed - INSERT now allowed!' as status;
