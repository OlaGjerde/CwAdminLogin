/**
 * Token Storage Utility - Hybrid Authentication Approach
 * 
 * Access Token: Stored in localStorage (sent via Bearer header)
 * ID Token: Stored in localStorage (for user info)
 * Refresh Token: Stored in httpOnly cookie (managed by backend)
 * 
 * Security Notes:
 * - Access tokens are short-lived (5-15 min) to minimize XSS risk
 * - Refresh token in httpOnly cookie cannot be accessed by JavaScript
 * - Always use HTTPS in production
 * - Implement CSP to prevent XSS attacks
 */

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'calwin_access_token',
  ID_TOKEN: 'calwin_id_token',
  TOKEN_EXPIRES_AT: 'calwin_token_expires_at',
} as const;

/**
 * Store access token in localStorage
 */
export function setAccessToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  } catch (error) {
    console.error('Failed to store access token:', error);
  }
}

/**
 * Get access token from localStorage
 */
export function getAccessToken(): string | null {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    // Return null if token is null, undefined, empty string, or the literal string "undefined"
    if (!token || token === 'undefined' || token === 'null') {
      return null;
    }
    return token;
  } catch (error) {
    console.error('Failed to retrieve access token:', error);
    return null;
  }
}

/**
 * Store ID token in localStorage
 */
export function setIdToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ID_TOKEN, token);
  } catch (error) {
    console.error('Failed to store ID token:', error);
  }
}

/**
 * Get ID token from localStorage
 */
export function getIdToken(): string | null {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.ID_TOKEN);
    // Return null if token is null, undefined, empty string, or the literal string "undefined"
    if (!token || token === 'undefined' || token === 'null') {
      return null;
    }
    return token;
  } catch (error) {
    console.error('Failed to retrieve ID token:', error);
    return null;
  }
}

/**
 * Store token expiration timestamp (milliseconds since epoch)
 */
export function setTokenExpiry(expiresIn: number): void {
  try {
    const expiresAt = Date.now() + (expiresIn * 1000);
    localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES_AT, expiresAt.toString());
  } catch (error) {
    console.error('Failed to store token expiry:', error);
  }
}

/**
 * Get token expiration timestamp
 */
export function getTokenExpiry(): number | null {
  try {
    const expiresAt = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
    return expiresAt ? parseInt(expiresAt, 10) : null;
  } catch (error) {
    console.error('Failed to retrieve token expiry:', error);
    return null;
  }
}

/**
 * Check if access token is expired or about to expire
 * @param marginSeconds - Number of seconds before expiry to consider token expired (default: 60)
 * Standard margin is 60 seconds (1 minute) to align with backend best practices
 */
export function isTokenExpired(marginSeconds: number = 60): boolean {
  const expiresAt = getTokenExpiry();
  if (!expiresAt) {
    return true; // No expiry means no token
  }
  
  const now = Date.now();
  const expiryWithMargin = expiresAt - (marginSeconds * 1000);
  
  return now >= expiryWithMargin;
}

/**
 * Store all tokens at once (convenience function)
 */
export function setTokens(accessToken: string, idToken: string, expiresIn: number): void {
  // Validate tokens before storing - don't store undefined/null as strings
  if (!accessToken || accessToken === 'undefined' || accessToken === 'null') {
    console.error('Attempted to store invalid access token:', accessToken);
    return;
  }
  if (!idToken || idToken === 'undefined' || idToken === 'null') {
    console.error('Attempted to store invalid ID token:', idToken);
    return;
  }
  
  setAccessToken(accessToken);
  setIdToken(idToken);
  setTokenExpiry(expiresIn);
}

/**
 * Clear all tokens from localStorage
 * Note: Refresh token (in httpOnly cookie) must be cleared by calling backend logout endpoint
 */
export function clearTokens(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.ID_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
  } catch (error) {
    console.error('Failed to clear tokens:', error);
  }
}

/**
 * Check if user has valid tokens
 */
export function hasValidTokens(): boolean {
  const accessToken = getAccessToken();
  return accessToken !== null && !isTokenExpired();
}

/**
 * Get time until token expires (in seconds)
 * Returns null if no token or already expired
 */
export function getTimeUntilExpiry(): number | null {
  const expiresAt = getTokenExpiry();
  if (!expiresAt) {
    return null;
  }
  
  const now = Date.now();
  const timeLeft = Math.floor((expiresAt - now) / 1000);
  
  return timeLeft > 0 ? timeLeft : null;
}
