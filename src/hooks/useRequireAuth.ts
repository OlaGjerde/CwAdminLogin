/**
 * useRequireAuth Hook
 * 
 * Protects components by ensuring user is authenticated.
 * Automatically redirects to login if not authenticated.
 * 
 * This hook does NOT require React Router - it uses the same
 * Cognito redirect mechanism that's already in place.
 * 
 * Usage:
 * ```tsx
 * function ProtectedComponent() {
 *   const { isLoading } = useRequireAuth();
 *   
 *   if (isLoading) {
 *     return <LoadingIndicator />;
 *   }
 *   
 *   return <div>Protected content</div>;
 * }
 * ```
 */

import { useEffect } from 'react';
import { useAuth } from '../contexts';
import { logDebug } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface UseRequireAuthResult {
  /**
   * Whether authentication is currently being checked
   */
  isLoading: boolean;
  
  /**
   * Whether the user is authenticated (will always be true after loading completes,
   * as unauthenticated users are redirected)
   */
  isAuthenticated: boolean;
  
  /**
   * Current user's email address
   */
  userEmail: string | null;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Require Authentication Hook
 * 
 * Use this hook in any component that requires authentication.
 * It will automatically redirect to Cognito login if the user is not authenticated.
 * 
 * The hook returns the loading state so you can show a loading indicator
 * while authentication is being checked.
 * 
 * Note: This does NOT use React Router. It redirects to Cognito Hosted UI
 * using window.location.href, just like the existing login flow.
 * 
 * @returns Auth state with isLoading and isAuthenticated flags
 * 
 * @example
 * ```tsx
 * function DashboardComponent() {
 *   const { isLoading, userEmail } = useRequireAuth();
 *   
 *   if (isLoading) {
 *     return <LoadingIndicator />;
 *   }
 *   
 *   // At this point, user is guaranteed to be authenticated
 *   return <div>Welcome {userEmail}!</div>;
 * }
 * ```
 */
export function useRequireAuth(): UseRequireAuthResult {
  const { isAuthenticated, isLoading, login, userEmail, error } = useAuth();

  useEffect(() => {
    // Only redirect if we're done loading and not authenticated
    // Also don't redirect if there's already an error being shown
    if (!isLoading && !isAuthenticated && !error) {
      logDebug('useRequireAuth: User not authenticated, redirecting to login...');
      login();
    }
  }, [isLoading, isAuthenticated, error, login]);

  return {
    isLoading,
    isAuthenticated,
    userEmail,
  };
}
