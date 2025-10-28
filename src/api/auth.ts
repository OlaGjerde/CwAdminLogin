import axios from 'axios';
import { AUTH_API, ADMIN_SERVICE_BASE, AUTH_SERVICE_BASE, COGNITO_REDIRECT_URI, TOKEN_CONFIG } from '../config';
import { logDebug } from '../utils/logger';
import { authClient } from './axiosConfig';

/**
 * Configure axios to send cookies with all requests
 * This is required for cookie-based authentication
 */
axios.defaults.withCredentials = true;

/**
 * Backend API functions for authenticated operations
 * Note: Authentication is now handled by httpOnly cookies set by the backend.
 * The browser automatically sends these cookies with each request.
 */

// ============================================================================
// Cookie-Based Auth API
// ============================================================================

export interface TokenExchangeRequestDTO {
  Code: string;         // PascalCase to match backend
  RedirectUri: string;  // PascalCase to match backend
  CodeVerifier?: string;  // Optional in backend
}

// Access token memory cache
let _accessToken: string | null = null;

/**
 * Get current access token from cookie
 * If no token exists, will try to refresh it once
 */
// Track token refresh attempts
let isRefreshing = false;
let refreshAttempts = 0;
const MAX_REFRESH_ATTEMPTS = 3;

export async function getAccessToken(): Promise<string | null> {
  try {
    // If we already have a token, return it
    if (_accessToken) {
      return _accessToken;
    }

    // If we're already refreshing, wait a bit and try again
    if (isRefreshing) {
      if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
        logDebug('Max refresh attempts reached, giving up');
        return null;
      }
      refreshAttempts++;
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      return getAccessToken();
    }

    // Try to get a new token
    isRefreshing = true;
    const me = await getCurrentUser();
    if (me.IsAuthenticated) {
      // We have valid authentication, try to refresh the token
      await authClient.post(AUTH_API.REFRESH_TOKEN);
      _accessToken = 'temp-token'; // The actual token is in the cookie
      return _accessToken;
    }
    return null;
  } catch (error) {
    logDebug('Failed to get access token:', error);
    _accessToken = null;
    return null;
  } finally {
    isRefreshing = false;
    refreshAttempts = 0;
  }
}

/**
 * Response DTO for authentication token operations
 * Used by both ExchangeCodeForTokens and GetNewToken endpoints
 */
export interface AuthTokenResponseDTO {
  AccessToken?: string;    // Optional access token
  IdToken?: string;       // Optional ID token
  ExpiresIn?: number;     // Optional in backend
  Success: boolean;       // Required in backend
  Message?: string;       // Optional message
}

// Type aliases for backward compatibility
export type CodeExchangeResponse = AuthTokenResponseDTO;
export type TokenRefreshResponseDTO = AuthTokenResponseDTO;

/**
 * Response DTO for OAuth2 token operations
 */
export interface OAuth2TokenResponseDTO {
  access_token?: string;   // Snake case for OAuth2 standard
  id_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
}

/**
 * Response DTO for logout endpoint
 * Contains Cognito logout URL for completing the logout flow
 */
export interface LogoutResponseDTO {
  LogoutUrl: string;      // PascalCase to match .NET backend
}

// Type alias for backward compatibility
export type LogoutResponse = LogoutResponseDTO;

/**
 * Response DTO for /api/auth/Me endpoint
 * Contains authenticated user information from JWT claims
 */
export interface CurrentUserResponseDTO {
  Username: string;       // Has default empty string in backend
  Email: string | null;   // Nullable in backend
  Groups: string[];       // Backend uses List<string> with default new()
  UserId: string | null;  // Nullable in backend
  IsAuthenticated: boolean;
}

// Type alias for backward compatibility
export type UserInfo = CurrentUserResponseDTO;

/**
 * Exchange OAuth authorization code for tokens (sets httpOnly cookies)
 * Returns token expiry information. Actual tokens are set as httpOnly cookies.
 */
export async function exchangeCodeForTokens(code: string, codeVerifier: string): Promise<AuthTokenResponseDTO> {
  logDebug('Sending token exchange request:', {
    url: `${AUTH_API.BASE}${AUTH_API.EXCHANGE_CODE}`,
    code: code.substring(0, 20) + '...',
    redirectUri: COGNITO_REDIRECT_URI,
    codeVerifier: codeVerifier.substring(0, 20) + '...',
  });

  // Make sure we're sending credentials with the request
  const response = await axios.post<AuthTokenResponseDTO>(
    `${AUTH_API.BASE}${AUTH_API.EXCHANGE_CODE}`,
    {
      Code: code,
      RedirectUri: COGNITO_REDIRECT_URI,
      CodeVerifier: codeVerifier,
    } as TokenExchangeRequestDTO,
    {
      withCredentials: true,  // Essential for cookie handling
      headers: {
        'Content-Type': 'application/json',
      }
    }
  );  // Debug response and cookies after request
  logDebug('Token exchange response:', response.data);
  
  // Enhanced cookie debugging
  logDebug('Cookie Debug Information:');
  logDebug('Current endpoint path:', window.location.pathname);
  logDebug('Refresh token endpoint:', AUTH_API.REFRESH_TOKEN);
  
  // Debug cookie security and path
  const setCookieHeader = response.headers['set-cookie'];
  if (setCookieHeader) {
    // Parse all cookie attributes
    const cookieStr = setCookieHeader.toString();
    logDebug('Cookie attributes:');
    logDebug('- Path:', cookieStr.match(/Path=([^;]+)/) ? cookieStr.match(/Path=([^;]+)/)![1] : 'not set');
    logDebug('- Domain:', cookieStr.match(/Domain=([^;]+)/) ? cookieStr.match(/Domain=([^;]+)/)![1] : 'not set');
    logDebug('- SameSite:', cookieStr.match(/SameSite=([^;]+)/) ? cookieStr.match(/SameSite=([^;]+)/)![1] : 'not set');
    logDebug('- Secure:', cookieStr.includes('Secure') ? 'yes' : 'no');
    logDebug('- HttpOnly:', cookieStr.includes('HttpOnly') ? 'yes' : 'no');
    
    // Check if path matches the backend config
    const path = cookieStr.match(/Path=([^;]+)/)?.[1];
    if (path === '/api/auth/getnewtoken/') {
      logDebug('⚠️ WARNING: Cookie path is too restrictive. Should be "/" instead of "/api/auth/getnewtoken/"');
    }
  }
  
  // Test accessing cookies at different paths
  logDebug('Cookie visibility test:');
  logDebug('- Root path cookies:', document.cookie);
  
  // Check if the refresh endpoint matches the cookie path
  const refreshEndpoint = AUTH_API.REFRESH_TOKEN;
  logDebug('Refresh endpoint check:', {
    endpoint: refreshEndpoint,
    shouldMatchPath: '/api/auth/getnewtoken/',
    matches: refreshEndpoint.toLowerCase() === '/api/auth/getnewtoken/'.toLowerCase()
  });
  
  // Log current path for comparison
  logDebug('Current path:', window.location.pathname);
  logDebug('API endpoint path:', AUTH_API.EXCHANGE_CODE);
  
  // For debugging on different environments
  logDebug('Current origin:', window.location.origin);
  logDebug('AUTH_SERVICE_BASE:', AUTH_SERVICE_BASE);
  
  return response.data;
}

/**
 * Refresh access and ID tokens using refresh token cookie
 * Returns token expiry information. New tokens are set as httpOnly cookies.
 */
export async function refreshToken(): Promise<AuthTokenResponseDTO> {
  const now = new Date();
  logDebug('📍 Starting token refresh request', {
    endpoint: `${AUTH_API.BASE}${AUTH_API.REFRESH_TOKEN}`,
    currentPath: window.location.pathname,
    timestamp: now.toISOString()
  });

  try {
    const response = await axios.post<AuthTokenResponseDTO>(
      `${AUTH_API.BASE}${AUTH_API.REFRESH_TOKEN}`,
      null,
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Calculate and log token expiry details
    const expiresIn = response.data.ExpiresIn || TOKEN_CONFIG.DEFAULT_EXPIRY;
    const expiryTime = new Date(now.getTime() + expiresIn * 1000);
    const refreshTime = new Date(expiryTime.getTime() - TOKEN_CONFIG.REFRESH_GRACE_PERIOD * 1000);
    
    logDebug('🕒 Token Lifetime Information:', {
      issuedAt: now.toISOString(),
      expiresIn: `${expiresIn} seconds`,
      expiresAt: expiryTime.toISOString(),
      willRefreshAt: refreshTime.toISOString(),
      gracePeriod: `${TOKEN_CONFIG.REFRESH_GRACE_PERIOD} seconds`
    });
    
    logDebug('🔑 Token refresh response:', {
      status: response.status,
      success: response.data.Success,
      message: response.data.Message,
      expiresIn: response.data.ExpiresIn,
      cookiePath: '/api/auth/', // Log the configured cookie path
      timestamp: new Date().toISOString()
    });

    // Check response headers for cookie information
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader) {
      logDebug('🍪 Set-Cookie details:', {
        path: setCookieHeader.toString().match(/Path=([^;]+)/) ?? 'not set',
        secure: setCookieHeader.toString().includes('Secure'),
        httpOnly: setCookieHeader.toString().includes('HttpOnly'),
        sameSite: setCookieHeader.toString().match(/SameSite=([^;]+)/) ?? 'not set'
      });
    }

    return response.data;
  } catch (error) {
    logDebug('❌ Token refresh failed', {
      error,
      endpoint: AUTH_API.REFRESH_TOKEN,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

/**
 * Logout - clears auth cookies and returns Cognito logout URL
 * Frontend should redirect to the returned URL to complete logout
 */
export async function logout(): Promise<LogoutResponseDTO> {
  const response = await axios.post<LogoutResponseDTO>(`${AUTH_API.BASE}${AUTH_API.LOGOUT}`);
  return response.data;
}

/**
 * Get current authenticated user information from JWT claims
 * Returns user details including username, email, groups, and authentication status
 */
export async function getCurrentUser(): Promise<CurrentUserResponseDTO> {
  logDebug('Calling /Me endpoint...');
  logDebug('All cookies:', document.cookie);
  const response = await axios.get<CurrentUserResponseDTO>(`${AUTH_API.BASE}${AUTH_API.ME}`);
  logDebug('/Me response:', response.data);
  return response.data;
}

// ============================================================================
// Installation & Desktop API (uses cookie-based auth automatically)
// ============================================================================

/**
 * Fetch user's installations from backend
 * Note: Authorization header is no longer needed - cookies are sent automatically
 */
export async function fetchInstallations() {
  return axios.get(`${ADMIN_SERVICE_BASE}/api/auth/installations`, {
    validateStatus: s => s < 500
  });
}

/**
 * Create one-time token for installation launch
 * Note: Authorization header is no longer needed - cookies are sent automatically
 */
export async function createOneTimeToken(installationId: string) {
  return axios.post(`${ADMIN_SERVICE_BASE}/api/desktop/CreateOneTimeToken`, null, {
    params: { installationId },
    validateStatus: s => s < 500
  });
}
