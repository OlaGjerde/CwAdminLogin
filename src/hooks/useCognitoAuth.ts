/**
 * AWS Cognito Authentication Hook (Cookie-Based)
 * Manages OAuth2 Authorization Code flow with httpOnly cookies
 * 
 * Security: Tokens are stored in httpOnly cookies by the backend,
 * never exposed to JavaScript, protecting against XSS attacks.
 */

import { useCallback, useEffect, useState } from 'react';
import { logDebug, logError } from '../utils/logger';
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
    isLoading: true, // ⭐ Start with loading to prevent auto-redirect before auth check
    userInfo: null,
    error: null,
  });

  /**
   * Initiate login flow - redirect to Cognito Hosted UI
   */
  const login = useCallback(async () => {
    try {
      logDebug('🔐 Initiating Cognito login flow');
      
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
      
      logDebug('🌐 Redirecting to Cognito:', authUrl);
      
      // Redirect to Cognito
      window.location.href = authUrl;
    } catch (error) {
      logError('❌ Login initiation failed:', error);
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
    logDebug('🔄 Processing OAuth callback');
    
    const params = parseCallbackParams();
    
    // Check if we're already processing this code (prevent double execution in StrictMode)
    const processingCode = sessionStorage.getItem('cognito_processing_code');
    if (processingCode === params.code) {
      logDebug('⏭️ Already processing this code, skipping duplicate execution');
      return;
    }
    
    // Mark this code as being processed
    if (params.code) {
      sessionStorage.setItem('cognito_processing_code', params.code);
    }
    
    // Check for errors from Cognito
    if (params.error) {
      logError('❌ Cognito returned error:', params.error);
      logError('❌ Error description:', params.error_description);
      
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
      logError('❌ No authorization code in callback');
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
      logError('❌ No PKCE data found - possible CSRF attack or session expired');
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
      logError('❌ State mismatch - possible CSRF attack');
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
      logDebug('🔄 Exchanging authorization code for tokens (backend will set cookies)');
      
      // Retrieve PKCE code_verifier from sessionStorage
      const codeVerifier = sessionStorage.getItem('cognito_code_verifier');
      if (!codeVerifier) {
        logError('❌ Code verifier not found in session storage');
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
      
      logDebug('✅ Tokens received and cookies set by backend');
      
      // Get user information from backend (wait for it before setting authenticated)
      try {
        const userInfo = await getCurrentUser();
        logDebug('✅ User info received:', userInfo.email);
        
        // Update state with authentication and user info together
        setState({
          isAuthenticated: true,
          isLoading: false,
          userInfo,
          error: null,
        });
        
        logDebug('✅ Authentication complete for:', userInfo.email);
      } catch (getUserError: unknown) {
        logError('❌ Failed to get user info after token exchange:', getUserError);
        
        type ErrorResponse = { response?: { status?: number; data?: unknown; headers?: Record<string, string> } };
        const err = getUserError as ErrorResponse;
        
        // If 401, cookies might not be set correctly by backend
        if (err.response?.status === 401) {
          logError('🚨 CRITICAL: Token exchange succeeded but /Me returned 401!');
          logError('🚨 This means backend is NOT reading cookies correctly.');
          logError('🚨 Check if CookieToHeaderMiddleware is added BEFORE UseAuthentication()');
          logError('Response headers:', err.response?.headers);
          
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
      logError('❌ Token exchange failed:', exchangeError);
      
      // Enhanced error logging
      if (exchangeError && typeof exchangeError === 'object' && 'response' in exchangeError) {
        const axiosError = exchangeError as { response?: { data?: unknown; status?: number; headers?: unknown } };
        logError('Response status:', axiosError.response?.status);
        logError('Response data:', axiosError.response?.data);
        logError('Response headers:', axiosError.response?.headers);
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
      logDebug('🔍 Checking authentication status...');
      // Don't set loading here - use initial state
      
      const userInfo = await getCurrentUser();
      
      setState({
        isAuthenticated: true,
        isLoading: false,
        userInfo,
        error: null,
      });
      
      logDebug('✅ User is authenticated:', userInfo.email);
    } catch (error: unknown) {
      type ErrorResponse = { response?: { status?: number } };
      const err = error as ErrorResponse;
      // 401 means not authenticated - this is NORMAL, not an error
      if (err.response?.status === 401) {
        logDebug('ℹ️ User is not authenticated (expected)');
        setState({
          isAuthenticated: false,
          isLoading: false,
          userInfo: null,
          error: null, // NO ERROR - just not authenticated yet
        });
      } else {
        logError('❌ Failed to check auth status:', error);
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
    logDebug('🚪 Logging out - clearing cookies and Cognito session');
    
    try {
      // Call backend logout endpoint (clears cookies and returns Cognito logout URL)
      const response = await apiLogout();
      
      logDebug('✅ Backend cookies cleared');
      
      // Preserve workspace selection in localStorage
      const workspaceSelection = localStorage.getItem('calwin-selected-workspace');
      
      // Clear all localStorage except workspace selection
      try {
        const itemCount = localStorage.length;
        localStorage.clear();
        logDebug(`✅ localStorage cleared (${itemCount} items removed)`);
      } catch (e) {
        logError('❌ Failed to clear localStorage:', e);
      }
      
      // Restore workspace selection
      if (workspaceSelection) {
        try {
          localStorage.setItem('calwin-selected-workspace', workspaceSelection);
          logDebug('✅ Workspace selection preserved after logout');
        } catch (e) {
          logError('❌ Failed to restore workspace selection:', e);
        }
      }
      
      // Clear sessionStorage
      try {
        sessionStorage.clear();
        logDebug('✅ sessionStorage cleared');
      } catch (e) {
        logError('❌ Failed to clear sessionStorage:', e);
      }
      
      logDebug('🔄 Redirecting to Cognito logout:', response.logoutUrl);
      
      // Redirect to Cognito logout - this will:
      // 1. Clear Cognito session
      // 2. Redirect back to our app
      window.location.href = response.logoutUrl;
    } catch (error) {
      logError('❌ Logout failed:', error);
      // Even if logout fails, redirect to login page
      window.location.href = '/';
    }
  }, []);

  /**
   * Refresh access token (calls backend which uses refresh_token cookie)
   */
  const handleRefreshToken = useCallback(async (): Promise<boolean> => {
    try {
      logDebug('🔄 Refreshing access token...');
      await refreshToken();
      logDebug('✅ Token refreshed successfully');
      return true;
    } catch (error: unknown) {
      type ErrorResponse = { response?: { status?: number } };
      const err = error as ErrorResponse;
      logError('❌ Token refresh failed:', error);
      
      // If refresh fails with 401, user needs to re-authenticate
      if (err.response?.status === 401) {
        logDebug('� Refresh token invalid, logging out');
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
      // ⭐ Check if returning from logout
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('logout') === 'true') {
        logDebug('🚪 Returned from Cognito logout - staying logged out');
        // Clear the logout flag from URL
        window.history.replaceState({}, document.title, window.location.pathname);
        // Set state to logged out
        setState({
          isAuthenticated: false,
          isLoading: false,
          userInfo: null,
          error: null,
        });
        return; // ⭐ Don't check auth status!
      }
      
      // Parse OAuth callback parameters
      const params = parseCallbackParams();
      
      // Only process callback if we have BOTH code AND state (valid OAuth callback)
      if (params.code && params.state) {
        logDebug('🔍 Detected valid OAuth callback');
        await handleCallback();
      } else if (params.error) {
        // Handle OAuth error callback
        logDebug('🔍 Detected OAuth error callback');
        await handleCallback();
      } else if (params.code) {
        // Code without state - likely stale/invalid, clear it
        logDebug('⚠️ Found code without state - clearing stale OAuth params');
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
      logDebug('⏰ Periodic token refresh check');
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
