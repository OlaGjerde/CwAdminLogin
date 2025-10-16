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
import { COGNITO_DOMAIN, COGNITO_CLIENT_ID } from '../config';

// ============================================================================
// Token Persistence
// ============================================================================

const STORAGE_KEY_TOKENS = 'cognito_tokens';

function saveTokens(tokens: CognitoTokenResponse): void {
  try {
    localStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify(tokens));
  } catch (error) {
    console.error('Failed to save tokens to localStorage:', error);
  }
}

function loadTokens(): CognitoTokenResponse | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_TOKENS);
    if (!stored) return null;
    return JSON.parse(stored) as CognitoTokenResponse;
  } catch (error) {
    console.error('Failed to load tokens from localStorage:', error);
    return null;
  }
}

function clearStoredTokens(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_TOKENS);
  } catch (error) {
    console.error('Failed to clear tokens from localStorage:', error);
  }
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<CognitoTokenResponse | null> {
  try {
    const tokenUrl = `${COGNITO_DOMAIN}/oauth2/token`;
    
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: COGNITO_CLIENT_ID,
      refresh_token: refreshToken,
    });
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token refresh failed:', response.status, errorText);
      return null;
    }
    
    const data = await response.json();
    
    // Refresh token response might not include a new refresh_token
    // If not provided, keep the old one
    return {
      access_token: data.access_token,
      id_token: data.id_token,
      refresh_token: data.refresh_token || refreshToken,
      token_type: data.token_type || 'Bearer',
      expires_in: data.expires_in,
    };
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}

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
      
      // Clear any previous errors
      setState((prev) => ({
        ...prev,
        error: null,
        isLoading: true,
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
        // Check if it's a scope issue
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
      
      // Save tokens to localStorage
      saveTokens(tokens);
      
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
    
    // Clear stored tokens
    clearStoredTokens();
    
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
   * On mount: Check if we're handling an OAuth callback or have stored tokens
   */
  useEffect(() => {
    const checkAuth = async () => {
      if (isOAuthCallback()) {
        console.log('🔍 Detected OAuth callback');
        await handleCallback();
      } else {
        // No callback - check if we have existing tokens in localStorage
        console.log('🔍 No OAuth callback, checking for stored tokens...');
        const storedTokens = loadTokens();
        
        if (storedTokens) {
          // Check if access token is expired
          if (isTokenExpired(storedTokens.access_token)) {
            console.log('🔄 Access token expired, attempting refresh...');
            // Try to refresh
            const refreshedTokens = await refreshAccessToken(storedTokens.refresh_token);
            
            if (refreshedTokens) {
              console.log('✅ Token refreshed successfully');
              saveTokens(refreshedTokens);
              const email = getUserEmail(refreshedTokens.id_token);
              
              setState({
                isAuthenticated: true,
                isLoading: false,
                tokens: refreshedTokens,
                userEmail: email,
                error: null,
              });
            } else {
              console.log('❌ Token refresh failed, clearing session');
              clearStoredTokens();
              setState((prev) => ({
                ...prev,
                isLoading: false,
              }));
            }
          } else {
            // Tokens are still valid
            console.log('✅ Found valid stored tokens');
            const email = getUserEmail(storedTokens.id_token);
            
            setState({
              isAuthenticated: true,
              isLoading: false,
              tokens: storedTokens,
              userEmail: email,
              error: null,
            });
          }
        } else {
          console.log('ℹ️ No stored tokens found');
          setState((prev) => ({
            ...prev,
            isLoading: false,
          }));
        }
      }
    };
    
    checkAuth();
  }, [handleCallback]);

  /**
   * Set up automatic token refresh before expiration
   */
  useEffect(() => {
    if (!state.isAuthenticated || !state.tokens) {
      return;
    }

    // Check token expiration every minute
    const checkInterval = setInterval(async () => {
      if (state.tokens && isTokenExpired(state.tokens.access_token)) {
        console.log('🔄 Access token expired, refreshing...');
        const refreshedTokens = await refreshAccessToken(state.tokens.refresh_token);
        
        if (refreshedTokens) {
          console.log('✅ Token auto-refreshed');
          saveTokens(refreshedTokens);
          const email = getUserEmail(refreshedTokens.id_token);
          
          setState({
            isAuthenticated: true,
            isLoading: false,
            tokens: refreshedTokens,
            userEmail: email,
            error: null,
          });
        } else {
          console.log('❌ Auto-refresh failed, logging out');
          logout();
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkInterval);
  }, [state.isAuthenticated, state.tokens, logout]);

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
