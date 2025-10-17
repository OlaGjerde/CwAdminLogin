/**
 * AWS Cognito Authentication Hook (Cookie-Based)
 * Manages OAuth2 Authorization Code flow with httpOnly cookies
 * 
 * Security: Tokens are stored in httpOnly cookies by the backend,
 * never exposed to JavaScript, protecting against XSS attacks.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  storePKCEData,
  retrievePKCEData,
  clearPKCEData,
  buildCognitoAuthUrl,
  parseCallbackParams,
  clearOAuthParams,
} from '../utils/cognitoHelpers';
import {
  exchangeCodeForTokens,
  refreshToken,
  logout as apiLogout,
  getCurrentUser,
  type UserInfo,
} from '../api/auth';

// ============================================================================
// Types
// ============================================================================

export interface CognitoAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userInfo: UserInfo | null;
  error: string | null;
}

// ============================================================================
// Hook
// ============================================================================

export function useCognitoAuth() {
  const [state, setState] = useState<CognitoAuthState>({
    isAuthenticated: false,
    isLoading: false, // CHANGED: Start with FALSE to prevent immediate redirect
    userInfo: null,
    error: null,
  });

  /**
   * Initiate login flow - redirect to Cognito Hosted UI
   */
  const login = useCallback(async () => {
    try {
      console.log('🔐 Initiating Cognito login flow');
      
      // Clear any previous errors
      setState((prev) => ({
        ...prev,
        error: null,
      }));
      
      // Generate PKCE parameters
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      const state = generateState();
      
      // Store for later retrieval
      storePKCEData(verifier, state);
      
      // Build authorization URL
      const authUrl = buildCognitoAuthUrl({
        codeChallenge: challenge,
        state: state,
      });
      
      console.log('🌐 Redirecting to Cognito:', authUrl);
      
      // Redirect to Cognito
      window.location.href = authUrl;
    } catch (error) {
      console.error('❌ Login initiation failed:', error);
      setState((prev) => ({
        ...prev,
        error: 'Failed to initiate login',
        isLoading: false,
      }));
    }
  }, []);

  /**
   * Handle OAuth callback - exchange code for tokens
   */
  const handleCallback = useCallback(async () => {
    console.log('🔄 Processing OAuth callback');
    
    const params = parseCallbackParams();
    
    // Check if we're already processing this code (prevent double execution in StrictMode)
    const processingCode = sessionStorage.getItem('cognito_processing_code');
    if (processingCode === params.code) {
      console.log('⏭️ Already processing this code, skipping duplicate execution');
      return;
    }
    
    // Mark this code as being processed
    if (params.code) {
      sessionStorage.setItem('cognito_processing_code', params.code);
    }
    
    // Check for errors from Cognito
    if (params.error) {
      console.error('❌ Cognito returned error:', params.error);
      console.error('❌ Error description:', params.error_description);
      
      // Format a user-friendly error message
      let userMessage = params.error_description || params.error || 'Authentication failed';
      
      // Common Cognito errors
      if (params.error === 'access_denied') {
        userMessage = 'Tilgang nektet. Du avbrøt innloggingen eller har ikke tilgang.';
      } else if (params.error === 'invalid_request') {
        if (params.error_description?.includes('scope')) {
          userMessage = 'Konfigurasjonsfeil med tilganger (scopes). Kontakt administrator.';
        } else {
          userMessage = 'Ugyldig forespørsel. Vennligst prøv igjen.';
        }
      } else if (params.error === 'unauthorized_client') {
        userMessage = 'Klienten er ikke autorisert. Kontakt administrator.';
      } else if (params.error === 'unsupported_response_type') {
        userMessage = 'Konfigurasjonsfeil. Kontakt administrator.';
      } else if (params.error === 'invalid_scope') {
        userMessage = 'Ugyldig scope-konfigurasjon. Kontakt administrator.';
      }
      
      setState((prev) => ({
        ...prev,
        error: userMessage,
        isLoading: false,
      }));
      clearOAuthParams();
      sessionStorage.removeItem('cognito_processing_code');
      return;
    }
    
    // Validate we have a code
    if (!params.code) {
      console.error('❌ No authorization code in callback');
      setState((prev) => ({
        ...prev,
        error: 'Invalid callback - no authorization code',
        isLoading: false,
      }));
      clearOAuthParams();
      sessionStorage.removeItem('cognito_processing_code');
      return;
    }
    
    // Retrieve stored PKCE data
    const pkceData = retrievePKCEData();
    if (!pkceData) {
      console.error('❌ No PKCE data found - possible CSRF attack or session expired');
      setState((prev) => ({
        ...prev,
        error: 'Session expired - please try again',
        isLoading: false,
      }));
      clearOAuthParams();
      sessionStorage.removeItem('cognito_processing_code');
      return;
    }
    
    // Validate state parameter (CSRF protection)
    if (params.state !== pkceData.state) {
      console.error('❌ State mismatch - possible CSRF attack');
      setState((prev) => ({
        ...prev,
        error: 'Invalid state - security check failed',
        isLoading: false,
      }));
      clearPKCEData();
      clearOAuthParams();
      sessionStorage.removeItem('cognito_processing_code');
      return;
    }
    
    // Exchange code for tokens (backend sets httpOnly cookies)
    try {
      console.log('🔄 Exchanging authorization code for tokens (backend will set cookies)');
      
      // Retrieve PKCE code_verifier from sessionStorage
      const codeVerifier = sessionStorage.getItem('cognito_code_verifier');
      if (!codeVerifier) {
        console.error('❌ Code verifier not found in session storage');
        setState(prev => ({
          ...prev,
          hasError: true,
          error: 'PKCE code verifier missing',
          isLoading: false,
        }));
        clearPKCEData();
        clearOAuthParams();
        sessionStorage.removeItem('cognito_processing_code');
        return;
      }
      
      await exchangeCodeForTokens(params.code, codeVerifier);
      
      console.log('✅ Tokens received and cookies set by backend');
      
      // Wait a bit for cookies to be set properly
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get user information from backend
      try {
        const userInfo = await getCurrentUser();
        console.log('✅ User info received:', userInfo.email);
        
        // Update state
        setState({
          isAuthenticated: true,
          isLoading: false,
          userInfo,
          error: null,
        });
        
        console.log('✅ Authentication complete for:', userInfo.email);
      } catch (getUserError: unknown) {
        console.error('❌ Failed to get user info after token exchange:', getUserError);
        
        type ErrorResponse = { response?: { status?: number; data?: unknown; headers?: Record<string, string> } };
        const err = getUserError as ErrorResponse;
        
        // If 401, cookies might not be set correctly by backend
        if (err.response?.status === 401) {
          console.error('🚨 CRITICAL: Token exchange succeeded but /Me returned 401!');
          console.error('🚨 This means backend is NOT reading cookies correctly.');
          console.error('🚨 Check if CookieToHeaderMiddleware is added BEFORE UseAuthentication()');
          console.error('Response headers:', err.response?.headers);
          
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: 'Backend configuration error: Cookies not being read. Contact administrator.',
          }));
        } else {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: 'Failed to get user information after login',
          }));
        }
        
        clearPKCEData();
        clearOAuthParams();
        sessionStorage.removeItem('cognito_processing_code');
        return;
      }
      
      // Clean up
      clearPKCEData();
      clearOAuthParams();
      sessionStorage.removeItem('cognito_processing_code');
    } catch (exchangeError: unknown) {
      console.error('❌ Token exchange failed:', exchangeError);
      
      // Enhanced error logging
      if (exchangeError && typeof exchangeError === 'object' && 'response' in exchangeError) {
        const axiosError = exchangeError as { response?: { data?: unknown; status?: number; headers?: unknown } };
        console.error('Response status:', axiosError.response?.status);
        console.error('Response data:', axiosError.response?.data);
        console.error('Response headers:', axiosError.response?.headers);
      }
      
      type ErrorResponse = { response?: { data?: { detail?: string; title?: string; error?: string }; status?: number } };
      const err = exchangeError as ErrorResponse;
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.title ||
                          err.response?.data?.error ||
                          'Failed to exchange authorization code for tokens';
      
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
      clearPKCEData();
      clearOAuthParams();
      sessionStorage.removeItem('cognito_processing_code');
    }
  }, []);

  /**
   * Check authentication status by calling backend
   */
  const checkAuthStatus = useCallback(async () => {
    try {
      console.log('🔍 Checking authentication status...');
      setState(prev => ({ ...prev, isLoading: true })); // Set loading while checking
      
      const userInfo = await getCurrentUser();
      
      setState({
        isAuthenticated: true,
        isLoading: false,
        userInfo,
        error: null,
      });
      
      console.log('✅ User is authenticated:', userInfo.email);
    } catch (error: unknown) {
      type ErrorResponse = { response?: { status?: number } };
      const err = error as ErrorResponse;
      // 401 means not authenticated - this is NORMAL, not an error
      if (err.response?.status === 401) {
        console.log('ℹ️ User is not authenticated (expected)');
        setState({
          isAuthenticated: false,
          isLoading: false,
          userInfo: null,
          error: null, // NO ERROR - just not authenticated yet
        });
      } else {
        console.error('❌ Failed to check auth status:', error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Failed to check authentication status',
        }));
      }
    }
  }, []);

  /**
   * Logout - clear cookies and redirect to Cognito logout
   */
  const logout = useCallback(async () => {
    console.log('🚪 Logging out - clearing cookies and Cognito session');
    
    try {
      // Call backend logout endpoint (clears cookies and returns Cognito logout URL)
      const response = await apiLogout();
      
      console.log('✅ Backend cookies cleared');
      
      // Preserve workspace selection in localStorage
      const workspaceSelection = localStorage.getItem('calwin-selected-workspace');
      
      // Clear all localStorage except workspace selection
      try {
        const itemCount = localStorage.length;
        localStorage.clear();
        console.log(`✅ localStorage cleared (${itemCount} items removed)`);
      } catch (e) {
        console.error('❌ Failed to clear localStorage:', e);
      }
      
      // Restore workspace selection
      if (workspaceSelection) {
        try {
          localStorage.setItem('calwin-selected-workspace', workspaceSelection);
          console.log('✅ Workspace selection preserved after logout');
        } catch (e) {
          console.error('❌ Failed to restore workspace selection:', e);
        }
      }
      
      // Clear sessionStorage
      try {
        sessionStorage.clear();
        console.log('✅ sessionStorage cleared');
      } catch (e) {
        console.error('❌ Failed to clear sessionStorage:', e);
      }
      
      console.log('🔄 Redirecting to Cognito logout:', response.logoutUrl);
      
      // Redirect to Cognito logout - this will:
      // 1. Clear Cognito session
      // 2. Redirect back to our app
      window.location.href = response.logoutUrl;
    } catch (error) {
      console.error('❌ Logout failed:', error);
      // Even if logout fails, redirect to login page
      window.location.href = '/';
    }
  }, []);

  /**
   * Refresh access token (calls backend which uses refresh_token cookie)
   */
  const handleRefreshToken = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔄 Refreshing access token...');
      await refreshToken();
      console.log('✅ Token refreshed successfully');
      return true;
    } catch (error: unknown) {
      type ErrorResponse = { response?: { status?: number } };
      const err = error as ErrorResponse;
      console.error('❌ Token refresh failed:', error);
      
      // If refresh fails with 401, user needs to re-authenticate
      if (err.response?.status === 401) {
        console.log('� Refresh token invalid, logging out');
        setState({
          isAuthenticated: false,
          isLoading: false,
          userInfo: null,
          error: 'Session expired - please login again',
        });
      }
      
      return false;
    }
  }, []);

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * On mount: Check if we're handling an OAuth callback or check auth status
   */
  useEffect(() => {
    const initAuth = async () => {
      // Parse OAuth callback parameters
      const params = parseCallbackParams();
      
      // Only process callback if we have BOTH code AND state (valid OAuth callback)
      if (params.code && params.state) {
        console.log('🔍 Detected valid OAuth callback');
        await handleCallback();
      } else if (params.error) {
        // Handle OAuth error callback
        console.log('🔍 Detected OAuth error callback');
        await handleCallback();
      } else if (params.code) {
        // Code without state - likely stale/invalid, clear it
        console.log('⚠️ Found code without state - clearing stale OAuth params');
        clearOAuthParams();
        await checkAuthStatus();
      } else {
        // No callback - check authentication status via backend
        await checkAuthStatus();
      }
    };
    
    initAuth();
  }, [handleCallback, checkAuthStatus]);

  /**
   * Set up automatic token refresh
   * Check every 5 minutes and refresh if needed
   */
  useEffect(() => {
    if (!state.isAuthenticated) {
      return;
    }

    // Check and refresh token periodically
    const refreshInterval = setInterval(async () => {
      console.log('⏰ Periodic token refresh check');
      await handleRefreshToken();
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(refreshInterval);
  }, [state.isAuthenticated, handleRefreshToken]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    userEmail: state.userInfo?.email || null,
    userInfo: state.userInfo,
    error: state.error,
    
    // Actions
    login,
    logout,
    checkAuthStatus,
    refreshToken: handleRefreshToken,
  };
}
