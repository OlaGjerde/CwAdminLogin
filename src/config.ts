// Centralized configuration for URLs and endpoints
//export const API_BASE = 'https://adminapi-dev.calwincloud.com';
export const API_BASE = 'https://localhost:7059';
export const CW_AUTH_ENDPOINT = `${API_BASE}/api`;
// Per-type installer URLs. Keys correspond to app type numbers (0,1,2).
// Update these URLs to the correct installer files for each environment as needed.
export const APPINSTALLER_URLS: Record<number, string> = {
  0: 'https://calwinmedia.calwincloud.com/CalWin8.appinstaller',
  1: 'https://calwinmedia-test.calwincloud.com/CalWin8.appinstaller',
  2: 'https://calwinmedia-dev.calwincloud.com/CalWin8.appinstaller'
};
// AWS Cognito Hosted UI configuration
// TODO: Replace these with your actual Cognito User Pool and App Client details
export const COGNITO_DOMAIN = 'https://calwincloud.auth.eu-north-1.amazoncognito.com'; // e.g., https://calwin-dev.auth.eu-north-1.amazoncognito.com
export const COGNITO_CLIENT_ID = 'gfm65hj23c2v7m1ncnobrdops'; // Your Cognito App Client ID
export const COGNITO_REDIRECT_URI = window.location.origin; // Current app URL for callback
// Supported app protocols
export const PROTOCOL_CALWIN = 'calwin://';
export const PROTOCOL_CALWIN_TEST = 'calwintest://';
export const PROTOCOL_CALWIN_DEV = 'calwindev://';
export const INSTALLATIONS_ENDPOINT = `${CW_AUTH_ENDPOINT}/installation/GetAuthorizedInstallations`;
// Refresh scheduling margin (seconds before access token exp when we attempt refresh)
export const REFRESH_MARGIN_SECONDS = 120;
// Installations caching & retry configuration (override via Vite env vars if needed)
type ViteEnv = { [k: string]: string | undefined };
const env = (import.meta as unknown as { env?: ViteEnv }).env || {};
const num = (v: string | undefined) => (v != null && v !== '' && !Number.isNaN(Number(v))) ? Number(v) : undefined;
export const INSTALLATIONS_STALE_MS = num(env.VITE_INSTALLATIONS_STALE_MS) || 20_000; // 20s default
export const INSTALLATIONS_RETRY_BASE_MS = num(env.VITE_INSTALLATIONS_RETRY_BASE_MS) || 2_000; // initial backoff
export const INSTALLATIONS_RETRY_MAX_MS = num(env.VITE_INSTALLATIONS_RETRY_MAX_MS) || 30_000; // cap
export const INSTALLATIONS_RETRY_MAX_ATTEMPTS = num(env.VITE_INSTALLATIONS_RETRY_MAX_ATTEMPTS) || 6; // ~ up to ~2min worst case

/**
 * Build Cognito Hosted UI URL for signup
 * Redirects directly to the signup page
 */
export function getCognitoSignupUrl(email?: string): string {
  console.log('Redirect URI being used:', COGNITO_REDIRECT_URI);
  const params = new URLSearchParams({
    client_id: COGNITO_CLIENT_ID,
    response_type: 'code',
    scope: 'openid email phone', // Matches your Cognito scopes: openid, email, phone
    redirect_uri: COGNITO_REDIRECT_URI,
  });
  if (email) {
    params.set('login_hint', email);
  }
  // Use /signup to go directly to signup page
  const url = `${COGNITO_DOMAIN}/signup?${params.toString()}`;
  console.log('Full Cognito signup URL:', url);
  return url;
}

/**
 * Build Cognito Hosted UI URL for forgot password
 */
export function getCognitoForgotPasswordUrl(email?: string): string {
  console.log('Redirect URI being used:', COGNITO_REDIRECT_URI);
  const params = new URLSearchParams({
    client_id: COGNITO_CLIENT_ID,
    response_type: 'code',
    scope: 'openid email phone', // Matches your Cognito scopes: openid, email, phone
    redirect_uri: COGNITO_REDIRECT_URI,
  });
  if (email) {
    params.set('login_hint', email);
  }
  const url = `${COGNITO_DOMAIN}/forgotPassword?${params.toString()}`;
  console.log('Full Cognito forgot password URL:', url);
  return url;
}

export default {
  API_BASE,
  CW_AUTH_ENDPOINT,
  APPINSTALLER_URLS,
  PROTOCOL_CALWIN,
  PROTOCOL_CALWIN_TEST,
  PROTOCOL_CALWIN_DEV,
  INSTALLATIONS_ENDPOINT,
  REFRESH_MARGIN_SECONDS
  , INSTALLATIONS_STALE_MS
  , INSTALLATIONS_RETRY_BASE_MS
  , INSTALLATIONS_RETRY_MAX_MS
  , INSTALLATIONS_RETRY_MAX_ATTEMPTS
  , COGNITO_DOMAIN
  , COGNITO_CLIENT_ID
  , COGNITO_REDIRECT_URI
};
