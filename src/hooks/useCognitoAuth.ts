/**
 * AWS Cognito Authentication Hook
 * Manages OAuth2 Authorization Code flow with PKCE
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
  buildCognitoLogoutUrl,
  exchangeCodeForTokens,
  parseCallbackParams,
  isOAuthCallback,
  clearOAuthParams,
  getUserEmail,
  isTokenExpired,
  type CognitoTokenResponse,
} from '../utils/cognitoHelpers';

// ============================================================================
// Types
// ============================================================================

export interface CognitoAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  tokens: CognitoTokenResponse | null;
  userEmail: string | null;
  error: string | null;
}

// ============================================================================
// Hook
// ============================================================================

export function useCognitoAuth() {
  const [state, setState] = useState<CognitoAuthState>({
    isAuthenticated: false,
    isLoading: true, // Start as loading to check for existing session
    tokens: null,
    userEmail: null,
    error: null,
  });

  /**
   * Initiate login flow - redirect to Cognito Hosted UI
   */
  const login = useCallback(async () => {
    try {
      console.log('🔐 Initiating Cognito login flow');
      
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
    
    // Check for errors from Cognito
    if (params.error) {
      console.error('❌ Cognito returned error:', params.error, params.error_description);
      setState((prev) => ({
        ...prev,
        error: params.error_description || params.error || 'Authentication failed',
        isLoading: false,
      }));
      clearOAuthParams();
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
      return;
    }
    
    // Exchange code for tokens
    try {
      console.log('🔄 Exchanging authorization code for tokens');
      const tokens = await exchangeCodeForTokens(params.code, pkceData.verifier);
      
      console.log('✅ Tokens received successfully');
      
      // Extract user email from ID token
      const email = getUserEmail(tokens.id_token);
      
      // Update state
      setState({
        isAuthenticated: true,
        isLoading: false,
        tokens,
        userEmail: email,
        error: null,
      });
      
      // Clean up
      clearPKCEData();
      clearOAuthParams();
      
      console.log('✅ Authentication complete for:', email);
    } catch (error) {
      console.error('❌ Token exchange failed:', error);
      setState((prev) => ({
        ...prev,
        error: 'Failed to complete authentication',
        isLoading: false,
      }));
      clearPKCEData();
      clearOAuthParams();
    }
  }, []);

  /**
   * Logout - clear tokens and redirect to Cognito logout
   */
  const logout = useCallback(() => {
    console.log('🚪 Logging out');
    
    // Clear local state
    setState({
      isAuthenticated: false,
      isLoading: false,
      tokens: null,
      userEmail: null,
      error: null,
    });
    
    // Clear PKCE data
    clearPKCEData();
    
    // Redirect to Cognito logout (which will redirect back to app)
    const logoutUrl = buildCognitoLogoutUrl();
    console.log('🌐 Redirecting to Cognito logout:', logoutUrl);
    window.location.href = logoutUrl;
  }, []);

  /**
   * Check if access token is expired
   */
  const isAccessTokenExpired = useCallback((): boolean => {
    if (!state.tokens?.access_token) return true;
    return isTokenExpired(state.tokens.access_token);
  }, [state.tokens]);

  /**
   * Get raw access token for API calls
   */
  const getAccessToken = useCallback((): string | null => {
    return state.tokens?.access_token || null;
  }, [state.tokens]);

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * On mount: Check if we're handling an OAuth callback
   */
  useEffect(() => {
    const checkAuth = async () => {
      if (isOAuthCallback()) {
        console.log('🔍 Detected OAuth callback');
        await handleCallback();
      } else {
        // No callback - check if we have existing tokens
        // For now, just set loading to false
        // In the future, we could check for stored tokens or session
        console.log('🔍 No OAuth callback detected');
        setState((prev) => ({
          ...prev,
          isLoading: false,
        }));
      }
    };
    
    checkAuth();
  }, [handleCallback]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    userEmail: state.userEmail,
    error: state.error,
    
    // Actions
    login,
    logout,
    
    // Token management
    getAccessToken,
    isAccessTokenExpired,
    tokens: state.tokens,
  };
}
