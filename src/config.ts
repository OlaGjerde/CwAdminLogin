/**
 * Centralized configuration for URLs and endpoints
 * 
 * Build-time configuration based on Vite mode:
 * - Development (yarn dev): Uses localhost
 * - Production (yarn build): Uses AWS deployment
 */

// Detect if running in production build
const IS_PRODUCTION = import.meta.env.PROD;

// Base API URLs - different for dev vs production
export const API_BASE = IS_PRODUCTION
  ? 'https://adminapi-dev.calwincloud.com'  // Production AWS ECS Fargate
  : 'https://localhost:7059';                // Local development

export const CW_AUTH_ENDPOINT = `${API_BASE}/api`;

// Auth API endpoints (cookie-based authentication)
export const AUTH_API_BASE = `${API_BASE}/api/auth`;
export const AUTH_ENDPOINTS = {
  EXCHANGE_CODE: `${AUTH_API_BASE}/ExchangeCodeForTokens`,
  REFRESH_TOKEN: `${AUTH_API_BASE}/GetNewToken`,
  LOGOUT: `${AUTH_API_BASE}/Logout`,
  ME: `${AUTH_API_BASE}/Me`,
} as const;

// AWS Cognito Hosted UI configuration
export const COGNITO_AWS_REGION_DOMAIN = 'https://calwincloud.auth.eu-north-1.amazoncognito.com';
export const COGNITO_DOMAIN = 'https://auth.calwincloud.com'; // Custom domain
export const COGNITO_CLIENT_ID = '656e5ues1tvo5tk9e00u5f0ft3';

// Redirect URI - different for dev vs production
export const COGNITO_REDIRECT_URI = IS_PRODUCTION
  ? 'https://dev.calwincloud.com'  // Production AWS S3
  : window.location.origin;        // Local development (dynamic)

// Supported app protocols
export const PROTOCOL_CALWIN = 'calwin://';
export const PROTOCOL_CALWIN_TEST = 'calwintest://';
export const PROTOCOL_CALWIN_DEV = 'calwindev://';

export const INSTALLATIONS_ENDPOINT = `${CW_AUTH_ENDPOINT}/installation/GetAuthorizedInstallations`;

// Installer download URL for when protocol handler is not registered
export const INSTALLER_DOWNLOAD_URL = 'https://calwinmedia-dev.calwincloud.com/CalWin8.appinstaller';

// Refresh scheduling margin (seconds before access token exp when we attempt refresh)
export const REFRESH_MARGIN_SECONDS = 120;

/**
 * App Settings Configuration
 * Controls how user app settings are stored and applied
 */
export const APP_SETTINGS_CONFIG = {
  /**
   * Settings are PER-INSTALLATION (each installation has own settings)
   * This allows different configurations for different workspaces
   */
  perWorkspaceSettings: true,
  
  /**
   * localStorage key for storing app settings
   */
  storageKey: 'calwin-app-settings',
} as const;

// Installations caching & retry configuration
export const INSTALLATIONS_STALE_MS = 40_000; // 40s default
export const INSTALLATIONS_RETRY_BASE_MS = 2_000; // initial backoff
export const INSTALLATIONS_RETRY_MAX_MS = 30_000; // cap
export const INSTALLATIONS_RETRY_MAX_ATTEMPTS = 6; // ~ up to ~2min worst case


export function getCognitoSignupUrl(email?: string): string {
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
  return url;
}

/**
 * Build Cognito Hosted UI URL for forgot password
 */
export function getCognitoForgotPasswordUrl(email?: string): string {
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
  return url;
}

export default {
  API_BASE,
  CW_AUTH_ENDPOINT,
  // APPINSTALLER_URLS, // DISABLED
  PROTOCOL_CALWIN,
  PROTOCOL_CALWIN_TEST,
  PROTOCOL_CALWIN_DEV,
  INSTALLATIONS_ENDPOINT,
  INSTALLER_DOWNLOAD_URL,
  REFRESH_MARGIN_SECONDS
  , INSTALLATIONS_STALE_MS
  , INSTALLATIONS_RETRY_BASE_MS
  , INSTALLATIONS_RETRY_MAX_MS
  , INSTALLATIONS_RETRY_MAX_ATTEMPTS
  , COGNITO_DOMAIN
  , COGNITO_CLIENT_ID
  , COGNITO_REDIRECT_URI
};
