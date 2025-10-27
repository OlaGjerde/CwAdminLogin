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

export interface TokenExchangeRequestDTO {
  Code: string;         // PascalCase to match backend
  RedirectUri: string;  // PascalCase to match backend
  CodeVerifier?: string;  // Optional in backend
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
    url: AUTH_ENDPOINTS.EXCHANGE_CODE,
    code: code.substring(0, 20) + '...',
    redirectUri: COGNITO_REDIRECT_URI,
    codeVerifier: codeVerifier.substring(0, 20) + '...',
  });

  // Make sure we're sending credentials with the request
  const response = await axios.post<AuthTokenResponseDTO>(
    AUTH_ENDPOINTS.EXCHANGE_CODE,
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
  console.log('Token exchange response:', response.data);
  console.log('Cookies after token exchange:', document.cookie);
  
  // Verify authentication by calling /Me endpoint
  try {
    await getCurrentUser();
  } catch (error) {
    console.error('Failed to get user info:', error);
  }
  
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
