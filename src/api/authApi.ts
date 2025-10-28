/**
 * Auth Service API Client
 * Handles all authentication-related API calls to the auth service
 */

import { authClient } from './axiosConfig';
import { AUTH_API, COGNITO_REDIRECT_URI } from '../config';
import type { CurrentUserResponseDTO, OAuth2TokenResponseDTO } from '../types/auth';

/**
 * Exchange authorization code for tokens
 * Tokens are stored as httpOnly cookies by the backend
 */
interface TokenExchangeRequestDTO {
  Code: string;
  RedirectUri: string;
  CodeVerifier: string;
}

export async function exchangeCodeForTokens(code: string, codeVerifier: string): Promise<void> {
  const request: TokenExchangeRequestDTO = {
    Code: code,
    CodeVerifier: codeVerifier,
    RedirectUri: COGNITO_REDIRECT_URI
  };

  await authClient.post(AUTH_API.EXCHANGE_CODE, request);
}

/**
 * Refresh access token using refresh token cookie
 */
export async function refreshToken(): Promise<void> {
  await authClient.post(AUTH_API.REFRESH_TOKEN);
}

/**
 * Logout user - clear cookies and get Cognito logout URL
 */
export interface LogoutResponse {
  LogoutUrl: string;
}

export async function logout(): Promise<LogoutResponse> {
  const response = await authClient.post<LogoutResponse>(AUTH_API.LOGOUT);
  // Clear stored tokens on logout
  _currentTokens = null;
  return response.data;
}

/**
 * Get current user information
 */
export async function getCurrentUser(): Promise<CurrentUserResponseDTO> {
  const response = await authClient.get<CurrentUserResponseDTO>(AUTH_API.ME);
  return response.data;
}

/**
 * Get the current access token from the auth response
 * This is used by the admin client to authenticate requests
 */
export async function getAccessToken(): Promise<string> {
  // Return the stored access token from memory
  if (!_currentTokens?.access_token) {
    throw new Error('No access token available - user may need to log in again');
  }
  return _currentTokens.access_token;
}

/**
 * Check auth service health
 */
export async function checkAuthHealth(): Promise<boolean> {
  try {
    await authClient.get('/health');
    return true;
  } catch {
    return false;
  }
}