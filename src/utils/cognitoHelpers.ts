/**
 * AWS Cognito OAuth2 Helper Utilities
 * Implements Authorization Code flow with PKCE (RFC 7636)
 */

import { 
  COGNITO_DOMAIN, 
  COGNITO_CLIENT_ID, 
  COGNITO_REDIRECT_URI,
  FRONTEND_URL
} from '../config';
import { logError } from './logger';

// ============================================================================
// PKCE (Proof Key for Code Exchange) Implementation
// ============================================================================

/**
 * Generate a cryptographically random code verifier (43-128 characters)
 * Used in PKCE flow to prevent authorization code interception attacks
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

/**
 * Generate code challenge from verifier using SHA-256
 * This is sent to Cognito during authorization request
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(digest));
}

/**
 * Base64 URL encode (RFC 4648 Section 5)
 * Standard Base64 but with URL-safe characters
 */
function base64URLEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// ============================================================================
// State Management for OAuth2 Flow
// ============================================================================

const STORAGE_KEY_VERIFIER = 'cognito_code_verifier';
const STORAGE_KEY_STATE = 'cognito_state';

/**
 * Generate random state parameter for CSRF protection
 * Now includes code_verifier for backend PKCE validation
 */
export function generateState(codeVerifier?: string, redirectUrl?: string): string {
  const randomState = base64URLEncode(crypto.getRandomValues(new Uint8Array(16)));
  
  // If code_verifier is provided, encode it in the state along with redirect URL
  if (codeVerifier) {
    const stateData = {
      state: randomState,
      code_verifier: codeVerifier,
      redirect_url: redirectUrl || window.location.origin
    };
    // Base64 encode the JSON to pass as state parameter
    return btoa(JSON.stringify(stateData))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
  
  return randomState;
}

/**
 * Store PKCE verifier and state in sessionStorage
 * These will be needed when Cognito redirects back
 */
export function storePKCEData(verifier: string, state: string): void {
  sessionStorage.setItem(STORAGE_KEY_VERIFIER, verifier);
  sessionStorage.setItem(STORAGE_KEY_STATE, state);
}

/**
 * Retrieve and validate stored PKCE data
 */
export function retrievePKCEData(): { verifier: string; state: string } | null {
  const verifier = sessionStorage.getItem(STORAGE_KEY_VERIFIER);
  const state = sessionStorage.getItem(STORAGE_KEY_STATE);
  
  if (!verifier || !state) {
    return null;
  }
  
  return { verifier, state };
}

/**
 * Clear PKCE data after successful token exchange
 */
export function clearPKCEData(): void {
  sessionStorage.removeItem(STORAGE_KEY_VERIFIER);
  sessionStorage.removeItem(STORAGE_KEY_STATE);
}

// ============================================================================
// Cognito Authorization URL Builder
// ============================================================================

export interface CognitoAuthParams {
  codeChallenge: string;
  state: string;
  responseType?: 'code';
  scope?: string;
}

/**
 * Build Cognito Hosted UI authorization URL
 * @param params PKCE parameters (challenge and state)
 * @returns Full authorization URL to redirect user to
 */
export function buildCognitoAuthUrl(params: CognitoAuthParams): string {
  const url = new URL(`${COGNITO_DOMAIN}/oauth2/authorize`);
  
  url.searchParams.append('client_id', COGNITO_CLIENT_ID);
  url.searchParams.append('response_type', params.responseType || 'code');
  // Using only 'openid email' - 'profile' scope might not be enabled in Cognito App Client
  url.searchParams.append('scope', params.scope || 'openid email');
  url.searchParams.append('redirect_uri', COGNITO_REDIRECT_URI);
  url.searchParams.append('state', params.state);
  url.searchParams.append('code_challenge', params.codeChallenge);
  url.searchParams.append('code_challenge_method', 'S256');
  
  return url.toString();
}

// ============================================================================
// Token Exchange
// ============================================================================

export interface CognitoTokenResponse {
  access_token: string;
  id_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

/**
 * Exchange authorization code for tokens
 * @param code Authorization code from Cognito callback
 * @param codeVerifier Original PKCE verifier
 * @returns Token response from Cognito
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<CognitoTokenResponse> {
  const tokenUrl = `${COGNITO_DOMAIN}/oauth2/token`;
  
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: COGNITO_CLIENT_ID,
    code: code,
    redirect_uri: COGNITO_REDIRECT_URI,
    code_verifier: codeVerifier,
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
    throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

// ============================================================================
// JWT Decoding (without validation - validation happens on backend)
// ============================================================================

export interface CognitoJWTPayload {
  sub: string; // User UUID
  email?: string;
  email_verified?: boolean;
  'cognito:username'?: string;
  'cognito:groups'?: string[];
  iat: number; // Issued at
  exp: number; // Expiration
  iss: string; // Issuer
  aud: string; // Audience (client ID)
  token_use: 'id' | 'access';
}

/**
 * Decode JWT token (without cryptographic validation)
 * NOTE: This is only for displaying user info. Backend validates tokens.
 */
export function decodeJWT(token: string): CognitoJWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    // Decode the payload (middle part)
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    logError('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Check if JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload) return true;
  
  // Check if token expires within the next 5 minutes
  const expirationTime = payload.exp * 1000; // Convert to milliseconds
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  return (expirationTime - now) < fiveMinutes;
}

/**
 * Get user email from ID token
 */
export function getUserEmail(idToken: string): string | null {
  const payload = decodeJWT(idToken);
  return payload?.email || payload?.['cognito:username'] || null;
}

// ============================================================================
// Logout URL Builder
// ============================================================================

/**
 * Build Cognito logout URL
 * This will clear the Cognito session and redirect back to app
 */
export function buildCognitoLogoutUrl(): string {
  const url = new URL(`${COGNITO_DOMAIN}/logout`);
  
  url.searchParams.append('client_id', COGNITO_CLIENT_ID);
  // Redirect to frontend with logout flag after Cognito logout
  url.searchParams.append('logout_uri', `${FRONTEND_URL}?logout=true`);
  
  return url.toString();
}

// ============================================================================
// URL Parameter Parsing
// ============================================================================

export interface CallbackParams {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

/**
 * Parse OAuth2 callback parameters from URL
 */
export function parseCallbackParams(urlString: string = window.location.href): CallbackParams {
  const url = new URL(urlString);
  const params = url.searchParams;
  
  return {
    code: params.get('code') || undefined,
    state: params.get('state') || undefined,
    error: params.get('error') || undefined,
    error_description: params.get('error_description') || undefined,
  };
}

/**
 * Check if current URL is an OAuth callback
 */
export function isOAuthCallback(): boolean {
  const params = parseCallbackParams();
  return !!(params.code || params.error);
}

/**
 * Clear OAuth parameters from URL without page reload
 */
export function clearOAuthParams(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  url.searchParams.delete('error');
  url.searchParams.delete('error_description');
  
  // Use replaceState to avoid page reload
  window.history.replaceState({}, document.title, url.pathname + url.search);
}
