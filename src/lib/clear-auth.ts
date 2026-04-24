/**
 * Quick utility to clear invalid auth session
 * Run this in browser console if you're stuck with auth errors:
 * 
 * import { clearInvalidAuth } from './lib/clear-auth'
 * clearInvalidAuth()
 */

export function clearInvalidAuth() {
  // Clear all Supabase auth data from localStorage
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.includes('supabase') || key.includes('auth')) {
      localStorage.removeItem(key);
    }
  });
  
  // Clear session storage too
  sessionStorage.clear();
  
  console.log('✅ Auth data cleared. Redirecting to login...');
  
  // Redirect to login
  window.location.href = '/login';
}

// Auto-run if there's an auth error in console
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    if (message.includes('Refresh Token Not Found') || message.includes('Invalid Refresh Token')) {
      console.warn('🔧 Auth error detected. Clearing session...');
      clearInvalidAuth();
    }
    originalError.apply(console, args);
  };
}
