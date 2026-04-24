import { supabase } from '@/integrations/supabase/client';

/**
 * Handle Supabase auth errors gracefully
 * Clears invalid sessions and redirects to login
 */
export async function handleAuthError(error: any): Promise<void> {
  const errorMessage = error?.message || '';
  
  // Check for refresh token errors
  if (
    errorMessage.includes('Refresh Token Not Found') ||
    errorMessage.includes('Invalid Refresh Token') ||
    errorMessage.includes('refresh_token_not_found') ||
    error?.status === 400
  ) {
    console.warn('Invalid auth session detected, clearing...');
    
    // Clear all auth data
    await supabase.auth.signOut();
    localStorage.removeItem('supabase.auth.token');
    
    // Redirect to login if not already there
    if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
      window.location.href = '/login';
    }
  }
}

/**
 * Verify current session is valid
 * Returns true if valid, false if invalid (and clears session)
 */
export async function verifySession(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      await handleAuthError(error);
      return false;
    }
    
    if (!session) {
      return false;
    }
    
    return true;
  } catch (error) {
    await handleAuthError(error);
    return false;
  }
}

/**
 * Clear all auth data and redirect to login
 */
export async function clearAuthAndRedirect(): Promise<void> {
  await supabase.auth.signOut();
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = '/login';
}
