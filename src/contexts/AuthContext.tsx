/**
 * Auth Context Provider
 * 
 * Wraps the existing useCognitoAuth hook to provide authentication state
 * and methods throughout the component tree via React Context.
 * 
 * Hybrid Authentication Security Model:
 * - Access Token: localStorage → Authorization: Bearer header
 * - ID Token: localStorage (for user info display)
 * - Refresh Token: httpOnly cookie (XSS protection)
 * 
 * Security Benefits:
 * - Short-lived access tokens (5-15 min) minimize XSS risk
 * - Refresh token in httpOnly cookie cannot be stolen via JavaScript
 * - OAuth2 Authorization Code Flow with PKCE
 * - Automatic token refresh on expiry
 * - State parameter for CSRF protection
 * 
 * Usage:
 * ```tsx
 * // In App root
 * <AuthProvider>
 *   <YourApp />
 * </AuthProvider>
 * 
 * // In any component
 * const { isAuthenticated, userEmail, logout } = useAuth();
 * ```
 */

import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useCognitoAuth } from '../hooks/useCognitoAuth';
import type { UserInfo } from '../api/auth';

// ============================================================================
// Types
// ============================================================================

/**
 * Auth context value - available to all components via useAuth()
 */
export interface AuthContextValue {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  userEmail: string | null;
  userInfo: UserInfo | null;
  error: string | null;
  
  // Actions
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider Component
 * 
 * Wraps the existing useCognitoAuth hook and provides its state/methods
 * to all child components via context.
 * 
 * Hybrid Security Model (all preserved):
 * - Access tokens in localStorage sent via Bearer header
 * - Refresh token in httpOnly cookie (XSS protection)
 * - OAuth2 Authorization Code Flow with PKCE
 * - Automatic token refresh before expiry
 * - CSRF protection via state parameter
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Use the existing secure auth hook
  const auth = useCognitoAuth();

  // Pass through all auth state and methods
  const value: AuthContextValue = {
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    userEmail: auth.userEmail,
    userInfo: auth.userInfo,
    error: auth.error,
    login: auth.login,
    logout: auth.logout,
    checkAuthStatus: auth.checkAuthStatus,
    refreshToken: auth.refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ============================================================================
// Hook
// ============================================================================

/**
 * useAuth Hook
 * 
 * Access authentication state and methods from any component.
 * Must be used within an AuthProvider.
 * 
 * @throws Error if used outside of AuthProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isAuthenticated, userEmail, logout } = useAuth();
 *   
 *   if (!isAuthenticated) {
 *     return <div>Please log in</div>;
 *   }
 *   
 *   return (
 *     <div>
 *       <p>Welcome, {userEmail}</p>
 *       <button onClick={logout}>Logout</button>
 *     </div>
 *   );
 * }
 * ```
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider. ' +
      'Make sure your component tree is wrapped with <AuthProvider>.'
    );
  }
  
  return context;
};
