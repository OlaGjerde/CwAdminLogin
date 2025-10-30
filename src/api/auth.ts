import { AUTH_API, COGNITO_REDIRECT_URI } from '../config';
import { logError } from '../utils/logger';
import { authClient } from './axiosConfig';

/**
 * Authentication Service
 * 
 * Implements cookie-based authentication with AWS Cognito.
 * All tokens are handled as httpOnly cookies by the backend.
 * 
 * Features:
 * - Cookie-based token storage (httpOnly)
 * - Automatic token refresh
 * - Login status management
 * - User status checks
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface UserStatusResponse {
  username: string;
  userStatus: string;
}

export interface AuthenticationStatus {
  isAuthenticated: boolean;
  username?: string;
  email?: string;
  groups?: string[];
  userId?: string; // Added to match backend response
}

// ============================================================================
// Authentication Functions
// ============================================================================

/**
 * Get user status by email
 * @param email User's email address
 */
export async function getUserStatus(email: string): Promise<UserStatusResponse> {
  try {
    const response = await authClient.get<UserStatusResponse>(
      `${AUTH_API.GET_USER_STATUS}?email=${encodeURIComponent(email)}`
    );
    return response.data;
  } catch (error: unknown) {
    const err = error as { response?: { status?: number } };
    if (err.response?.status === 404) {
      throw new Error('User not found');
    } else if (err.response?.status === 400) {
      throw new Error('Multiple users found or missing attributes');
    } else if (err.response?.status === 502) {
      throw new Error('AWS service error');
    }
    throw error;
  }
}

/**
 * Refresh the access token using the refresh token cookie
 * New tokens will be set as httpOnly cookies by the backend
 */
export async function refreshTokens(): Promise<void> {
  try {
    await authClient.post(AUTH_API.REFRESH_TOKEN);
  } catch (error) {
    logError('Failed to refresh tokens:', error);
    throw error;
  }
}

/**
 * Response DTO for authentication token operations
 * Used by both ExchangeCodeForTokens and refresh endpoints
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
/**
 * Check current authentication status
 */
export async function checkAuthStatus(): Promise<AuthenticationStatus> {
  try {
    const response = await authClient.get<AuthenticationStatus>(`${AUTH_API.ME}`);
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      logError('Auth status check failed:', error.message);
    }
    return { isAuthenticated: false };
  }
}

/**
 * Logout the current user
 * Clears backend cookies and redirects to Cognito logout URL
 */
export async function logout(): Promise<LogoutResponseDTO> {
  try {
    // Call backend to clear cookies and get Cognito logout URL
    const response = await authClient.post<LogoutResponseDTO>(AUTH_API.LOGOUT);
    
    // Return the response but DON'T redirect
    // Let the caller decide what to do with the LogoutUrl
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      logError('Logout failed:', error.message);
    }
    throw error;
  }
}

/**
 * Get the OAuth2 callback URL for the current environment
 */
export function getOAuth2CallbackUrl(): string {
  return `${COGNITO_REDIRECT_URI}${AUTH_API.CALLBACK}`;
}

/**
 * Generate PKCE code verifier and challenge
 * Code verifier: 43-128 character random string (base64url encoded)
 * Code challenge: base64url(SHA256(code_verifier))
 */
export async function generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  // Generate 32 random bytes and base64url encode them
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const verifier = btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  // Generate code challenge from verifier
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  
  const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  return {
    codeVerifier: verifier,
    codeChallenge: challenge
  };
}

// Type for API errors
export class AuthError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
    this.code = code;
  }
}

// ============================================================================
// Legacy DTOs for Backward Compatibility
// ============================================================================

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
 * Response DTO for /api/auth/me endpoint
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
