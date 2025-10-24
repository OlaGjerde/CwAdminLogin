import axios from 'axios';
import { CW_AUTH_ENDPOINT, INSTALLATIONS_ENDPOINT, AUTH_ENDPOINTS, COGNITO_REDIRECT_URI } from '../config';
import { logDebug, logError } from '../utils/logger';
import { setTokens, clearTokens } from '../utils/tokenStorage';

/**
 * Configure axios to send cookies with all requests
 * This is required for refresh token cookie (httpOnly)
 */
axios.defaults.withCredentials = true;

/**
 * Backend API functions for authenticated operations
 * 
 * Hybrid Authentication Approach:
 * - Access Token: Returned in response body → Stored in localStorage → Sent via Bearer header
 * - ID Token: Returned in response body → Stored in localStorage
 * - Refresh Token: Stored in httpOnly cookie by backend (never exposed to JS)
 */

// ============================================================================
// Hybrid Auth API - DTOs
// ============================================================================

export interface CodeExchangeRequest {
  code: string;
  redirectUri: string;
  codeVerifier: string;  // PKCE code verifier
}

/**
 * Response DTO for ExchangeToken endpoint (OAuth2 callback)
 * Backend returns tokens in response body (NOT in cookies anymore)
 * Note: Backend uses PascalCase (C# convention)
 */
export interface OAuth2ExchangeResponseDTO {
  AccessToken: string;    // Store in localStorage (PascalCase from backend)
  IdToken: string;        // Store in localStorage (PascalCase from backend)
  TokenType: string;      // Should be "Bearer" (PascalCase from backend)
  ExpiresIn?: number;     // Seconds until expiry (nullable - Cognito can return null)
  // Note: refreshToken is in httpOnly cookie, NOT in response
}

/**
 * Response DTO for RefreshToken endpoint
 * Backend returns new access token in response body
 * Note: Backend uses PascalCase (C# convention)
 */
export interface AuthTokenResponseDTO {
  AccessToken: string;    // New access token to store (PascalCase from backend)
  IdToken: string;        // New ID token (PascalCase from backend)
  ExpiresIn?: number;     // Seconds until expiry (nullable - Cognito can return null)
}

// Type aliases for backward compatibility
export type CodeExchangeResponse = OAuth2ExchangeResponseDTO;
export type TokenRefreshResponseDTO = AuthTokenResponseDTO;

/**
 * Response DTO for logout endpoint
 * Contains Cognito logout URL for completing the logout flow
 */
export interface LogoutResponseDTO {
  LogoutUrl: string;  // PascalCase to match .NET backend
}

// Type alias for backward compatibility
export type LogoutResponse = LogoutResponseDTO;

/**
 * Response DTO for /api/auth/Me endpoint
 * Contains authenticated user information from JWT claims
 * Note: Backend returns PascalCase property names
 */
export interface CurrentUserResponseDTO {
  Username: string;
  Email: string | null;
  Groups: string[];
  UserId: string;
  IsAuthenticated: boolean;
}

// Type alias for backward compatibility
export type UserInfo = CurrentUserResponseDTO;

/**
 * Exchange OAuth authorization code for tokens
 * Backend returns tokens in response body (accessToken, idToken) and sets refresh token cookie
 * 
 * @returns Token data including accessToken and idToken to store in localStorage
 */
export async function exchangeCodeForTokens(code: string, codeVerifier: string): Promise<OAuth2ExchangeResponseDTO> {
  logDebug('Sending token exchange request:', {
    url: AUTH_ENDPOINTS.EXCHANGE_CODE,
    code: code.substring(0, 20) + '...',
    redirectUri: COGNITO_REDIRECT_URI,
    codeVerifier: codeVerifier.substring(0, 20) + '...',
  });
  
  try {
    const response = await axios.post<OAuth2ExchangeResponseDTO>(
      AUTH_ENDPOINTS.EXCHANGE_CODE,
      {
        code,
        redirectUri: COGNITO_REDIRECT_URI,
        codeVerifier,
      } as CodeExchangeRequest,
      {
        timeout: 30000, // 30 second timeout for token exchange (Cognito can be slow)
      }
    );
    
    logDebug('Token exchange response received:', {
      tokenType: response.data.TokenType,
      expiresIn: response.data.ExpiresIn,
      hasAccessToken: !!response.data.AccessToken,
      hasIdToken: !!response.data.IdToken,
    });
    
    // Store tokens in localStorage (default to 3600 seconds = 1 hour if null)
    const expiresIn = response.data.ExpiresIn ?? 3600;
    setTokens(response.data.AccessToken, response.data.IdToken, expiresIn);
    logDebug('Tokens stored in localStorage');
    
    return response.data;
  } catch (error) {
    logError('Token exchange request failed:', error);
    // Log more details for debugging
    if (axios.isAxiosError(error)) {
      logError('Error details:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
    }
    throw error;
  }
}

/**
 * Refresh access and ID tokens using refresh token cookie
 * Backend reads refresh token from httpOnly cookie and returns new tokens in response body
 * 
 * @returns New token data including accessToken and idToken to store in localStorage
 */
export async function refreshToken(): Promise<AuthTokenResponseDTO> {
  logDebug('Refreshing tokens using httpOnly refresh token cookie');
  
  const response = await axios.post<AuthTokenResponseDTO>(AUTH_ENDPOINTS.REFRESH_TOKEN);
  
  logDebug('Token refresh response received:', {
    expiresIn: response.data.ExpiresIn,
    hasAccessToken: !!response.data.AccessToken,
    hasIdToken: !!response.data.IdToken,
  });
  
  // Store new tokens in localStorage (default to 3600 seconds = 1 hour if null)
  const expiresIn = response.data.ExpiresIn ?? 3600;
  setTokens(response.data.AccessToken, response.data.IdToken, expiresIn);
  logDebug('Refreshed tokens stored in localStorage');
  
  return response.data;
}

/**
 * Logout - clears auth cookies and localStorage tokens, returns Cognito logout URL
 * Frontend should redirect to the returned URL to complete logout
 */
export async function logout(): Promise<LogoutResponseDTO> {
  // Clear tokens from localStorage first
  clearTokens();
  logDebug('Tokens cleared from localStorage');
  
  // Call backend to clear refresh token cookie and get Cognito logout URL
  const response = await axios.post<LogoutResponseDTO>(AUTH_ENDPOINTS.LOGOUT);
  logDebug('Backend logout complete, refresh token cookie cleared');
  
  return response.data;
}

/**
 * Get current authenticated user information from JWT claims
 * Returns user details including username, email, groups, and authentication status
 */
export async function getCurrentUser(): Promise<CurrentUserResponseDTO> {
  logDebug('Calling /Me endpoint...');
  logDebug('All cookies:', document.cookie);
  const response = await axios.get<CurrentUserResponseDTO>(AUTH_ENDPOINTS.ME);
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
  return axios.get(INSTALLATIONS_ENDPOINT, {
    validateStatus: s => s < 500
  });
}

/**
 * Create one-time token for installation launch
 * Note: Authorization header is no longer needed - cookies are sent automatically
 */
export async function createOneTimeToken(installationId: string) {
  return axios.post(`${CW_AUTH_ENDPOINT}/desktop/CreateOneTimeToken`, null, {
    params: { installationId },
    validateStatus: s => s < 500
  });
}
