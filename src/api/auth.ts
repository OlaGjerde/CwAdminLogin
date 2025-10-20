import axios from 'axios';
import { CW_AUTH_ENDPOINT, INSTALLATIONS_ENDPOINT, AUTH_ENDPOINTS, COGNITO_REDIRECT_URI } from '../config';
import { logDebug } from '../utils/logger';

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

export interface CodeExchangeRequest {
  code: string;
  redirectUri: string;
  codeVerifier: string;  // PKCE code verifier
}

/**
 * Unified response DTO for authentication token operations
 * Used by both ExchangeCodeForTokens and GetNewToken endpoints
 */
export interface AuthTokenResponseDTO {
  success: boolean;
  expiresIn: number;
  message?: string;
}

// Type aliases for backward compatibility and clarity
export type CodeExchangeResponse = AuthTokenResponseDTO;
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
 * Exchange OAuth authorization code for tokens (sets httpOnly cookies)
 * Returns token expiry information. Actual tokens are set as httpOnly cookies.
 */
export async function exchangeCodeForTokens(code: string, codeVerifier: string): Promise<AuthTokenResponseDTO> {
  logDebug('Sending token exchange request:', {
    url: AUTH_ENDPOINTS.EXCHANGE_CODE,
    code: code.substring(0, 20) + '...',
    redirectUri: COGNITO_REDIRECT_URI,
    codeVerifier: codeVerifier.substring(0, 20) + '...',
  });
  
  const response = await axios.post<AuthTokenResponseDTO>(
    AUTH_ENDPOINTS.EXCHANGE_CODE,
    {
      code,
      redirectUri: COGNITO_REDIRECT_URI,
      codeVerifier,
    } as CodeExchangeRequest
  );
  
  logDebug('Token exchange response:', response.data);
  logDebug('Cookies after exchange:', document.cookie);
  
  // ⭐ Log ALL response headers to see if Set-Cookie is there
  logDebug('ALL Response Headers:');
  Object.entries(response.headers).forEach(([key, value]) => {
    logDebug(`  ${key}: ${value}`);
  });
  
  // ⭐ Specifically check for Set-Cookie (won't be visible in JS, but good to try)
  logDebug('Set-Cookie header (if accessible):', response.headers['set-cookie']);
  
  return response.data;
}

/**
 * Refresh access and ID tokens using refresh token cookie
 * Returns token expiry information. New tokens are set as httpOnly cookies.
 */
export async function refreshToken(): Promise<AuthTokenResponseDTO> {
  const response = await axios.post<AuthTokenResponseDTO>(AUTH_ENDPOINTS.REFRESH_TOKEN);
  return response.data;
}

/**
 * Logout - clears auth cookies and returns Cognito logout URL
 * Frontend should redirect to the returned URL to complete logout
 */
export async function logout(): Promise<LogoutResponseDTO> {
  const response = await axios.post<LogoutResponseDTO>(AUTH_ENDPOINTS.LOGOUT);
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
