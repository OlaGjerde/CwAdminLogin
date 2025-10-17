import axios from 'axios';
import { CW_AUTH_ENDPOINT, INSTALLATIONS_ENDPOINT, AUTH_ENDPOINTS, COGNITO_REDIRECT_URI } from '../config';

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

export interface CodeExchangeResponse {
  success: boolean;
  expiresIn: number;
}

export interface LogoutResponse {
  success: boolean;
  logoutUrl: string;
}

export interface UserInfo {
  username: string;
  email: string;
  groups: string[];
  userId: string;
  isAuthenticated: boolean;
}

/**
 * Exchange OAuth authorization code for tokens (sets httpOnly cookies)
 */
export async function exchangeCodeForTokens(code: string, codeVerifier: string): Promise<CodeExchangeResponse> {
  console.log('🔄 Sending token exchange request:', {
    url: AUTH_ENDPOINTS.EXCHANGE_CODE,
    code: code.substring(0, 20) + '...',
    redirectUri: COGNITO_REDIRECT_URI,
    codeVerifier: codeVerifier.substring(0, 20) + '...',
  });
  
  const response = await axios.post<CodeExchangeResponse>(
    AUTH_ENDPOINTS.EXCHANGE_CODE,
    {
      code,
      redirectUri: COGNITO_REDIRECT_URI,
      codeVerifier,
    } as CodeExchangeRequest
  );
  
  console.log('✅ Token exchange response:', response.data);
  console.log('🍪 Cookies after exchange:', document.cookie);
  
  // ⭐ Log ALL response headers to see if Set-Cookie is there
  console.log('📋 ALL Response Headers:');
  Object.entries(response.headers).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  
  // ⭐ Specifically check for Set-Cookie (won't be visible in JS, but good to try)
  console.log('🍪 Set-Cookie header (if accessible):', response.headers['set-cookie']);
  
  return response.data;
}

/**
 * Refresh access token using refresh_token cookie
 */
export async function refreshToken(): Promise<CodeExchangeResponse> {
  const response = await axios.post<CodeExchangeResponse>(AUTH_ENDPOINTS.REFRESH_TOKEN);
  return response.data;
}

/**
 * Logout - clears auth cookies and returns Cognito logout URL
 */
export async function logout(): Promise<LogoutResponse> {
  const response = await axios.post<LogoutResponse>(AUTH_ENDPOINTS.LOGOUT);
  return response.data;
}

/**
 * Get current user info (checks authentication status)
 */
export async function getCurrentUser(): Promise<UserInfo> {
  console.log('🔍 Calling /Me endpoint...');
  console.log('🍪 All cookies:', document.cookie);
  const response = await axios.get<UserInfo>(AUTH_ENDPOINTS.ME);
  console.log('✅ /Me response:', response.data);
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
