-- Fix ambiguous column reference and type mismatch in get_page_history_with_diff function

CREATE OR REPLACE FUNCTION get_page_history_with_diff(
    page_id_param UUID,
    limit_param INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    version_number INTEGER,
    user_id UUID,
    user_email TEXT,
    change_type TEXT,
    change_summary TEXT,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_current BOOLEAN,
    days_until_expiry INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ph.id,
        ph.version_number,
        ph.user_id,
        u.email::TEXT as user_email,
        ph.change_type::TEXT,
        ph.change_summary::TEXT,
        ph.created_at,
        ph.expires_at,
        (ph.version_number = (SELECT MAX(ph2.version_number) FROM page_history ph2 WHERE ph2.page_id = page_id_param)) as is_current,
        EXTRACT(DAY FROM (ph.expires_at - NOW()))::INTEGER as days_until_expiry
    FROM page_history ph
    LEFT JOIN auth.users u ON ph.user_id = u.id
    WHERE ph.page_id = page_id_param
    ORDER BY ph.version_number DESC
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
