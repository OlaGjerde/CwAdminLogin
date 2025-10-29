/**
 * Centralized configuration for URLs and endpoints
 * 
 * Environment-specific configuration for:
 * - Development (localhost)
 * - Dev Cloud (dev.calwincloud.com)
 * - Test (test.calwincloud.com)
 * - Production (www.calwincloud.com)
 */

import type { CurrentUserResponseDTO } from './api/auth';

// Type alias for backward compatibility
type UserInfo = CurrentUserResponseDTO;

// Environment detection
const ENV = {
  isDev: import.meta.env.MODE === 'development',
  isTest: import.meta.env.MODE === 'test',
  isProd: import.meta.env.MODE === 'production',
  isLocal: typeof window !== 'undefined' && window.location.hostname === 'localhost'
};

// Environment-specific configurations
interface EnvConfig {
  frontendUrl: string;
  apiUrl: string;
  cognitoDomain: string;
  cookieDomain: string;
  cookieSecure: boolean;
  cookieSameSite: 'Strict' | 'Lax' | 'None';
  corsOrigins: string[];
}

const envConfigs: Record<string, EnvConfig> = {
  local: {
    frontendUrl: 'http://localhost:5173',
    apiUrl: '', // Use proxy - requests will go to same origin
    cognitoDomain: 'https://auth.calwincloud.com',
    cookieDomain: '',
    cookieSecure: false,
    cookieSameSite: 'Lax',
    corsOrigins: ['http://localhost:5173', 'https://localhost:5173']
  },
  dev: {
    frontendUrl: 'https://dev.calwincloud.com',
    apiUrl: 'https://apidev.calwincloud.com',
    cognitoDomain: 'https://login.calwincloud.com',
    cookieDomain: '.calwincloud.com',
    cookieSecure: true,
    cookieSameSite: 'None',
    corsOrigins: ['https://dev.calwincloud.com']
  },
  test: {
    frontendUrl: 'https://test.calwincloud.com',
    apiUrl: 'https://apitest.calwincloud.com',
    cognitoDomain: 'https://login.calwincloud.com',
    cookieDomain: '.calwincloud.com',
    cookieSecure: true,
    cookieSameSite: 'None',
    corsOrigins: ['https://test.calwincloud.com']
  },
  prod: {
    frontendUrl: 'https://www.calwincloud.com',
    apiUrl: 'https://api.calwincloud.com',
    cognitoDomain: 'https://login.calwincloud.com',
    cookieDomain: '.calwincloud.com',
    cookieSecure: true,
    cookieSameSite: 'None',
    corsOrigins: ['https://www.calwincloud.com']
  }
};

// Get current environment configuration
const getCurrentEnv = (): EnvConfig => {
  if (ENV.isLocal) return envConfigs.local;
  if (ENV.isDev) return envConfigs.dev;
  if (ENV.isTest) return envConfigs.test;
  return envConfigs.prod;
};

const currentEnv = getCurrentEnv();

// Service Base URLs
export const AUTH_SERVICE_BASE = currentEnv.apiUrl;
export const ADMIN_SERVICE_BASE = currentEnv.apiUrl;

// Cookie configuration
export const COOKIE_CONFIG = {
  access: {
    name: 'access_token',
    path: '/',
    maxAge: 3600, // 1 hour
    httpOnly: true,
    secure: currentEnv.cookieSecure,
    sameSite: currentEnv.cookieSameSite,
    domain: currentEnv.cookieDomain
  },
  refresh: {
    name: 'refresh_token',
    path: '/api/auth/',
    maxAge: 2592000, // 30 days
    httpOnly: true,
    secure: currentEnv.cookieSecure,
    sameSite: currentEnv.cookieSameSite,
    domain: currentEnv.cookieDomain
  }
} as const;

// Auth API configuration (cookie-based authentication)
export const AUTH_API = {
  BASE: `${AUTH_SERVICE_BASE}`,
  LOGIN: '/api/auth/LoginUser',
  CALLBACK: '/api/auth/callback',
  EXCHANGE_CODE: '/api/auth/ExchangeCodeForTokens',
  REFRESH_TOKEN: '/api/auth/GetNewToken',
  LOGOUT: '/api/auth/Logout',
  ME: '/api/auth/Me',
  GET_USER_STATUS: '/api/auth/GetUserStatus'
} as const;

// Admin API configuration
export const ADMIN_API = {
  BASE: `${ADMIN_SERVICE_BASE}`,
  INSTALLATIONS: '/api/installation/GetAuthorizedInstallations',
  CREATE_ONE_TIME_TOKEN: '/api/desktop/CreateOneTimeToken'
} as const;

// AWS Cognito Hosted UI configuration
export const COGNITO_AWS_REGION_DOMAIN = 'https://calwincloud.auth.eu-north-1.amazoncognito.com';
export const COGNITO_DOMAIN = currentEnv.cognitoDomain;
export const COGNITO_CLIENT_ID = '656e5ues1tvo5tk9e00u5f0ft3';

// Redirect URI based on environment
export const COGNITO_REDIRECT_URI = currentEnv.frontendUrl;

// CORS configuration
export const CORS_CONFIG = {
  origins: currentEnv.corsOrigins,
  credentials: true
} as const;

// Token refresh configuration
export const TOKEN_CONFIG = {
  // Grace period before token expiry (in seconds)
  // Token will be refreshed if it's within this period of expiring
  REFRESH_GRACE_PERIOD: 300, // 5 minutes
  
  // Default token expiry time (in seconds) if not provided by backend
  DEFAULT_EXPIRY: 3600, // 1 hour
} as const;

// Supported app protocols
export const PROTOCOL_CALWIN = 'calwin://';
export const PROTOCOL_CALWIN_TEST = 'calwintest://';
export const PROTOCOL_CALWIN_DEV = 'calwindev://';

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

/**
 * Check if user is an administrator
 * Admins belong to the "Administrator" Cognito group
 */
export function isUserAdmin(userInfo: UserInfo | null): boolean {
  return userInfo?.Groups?.includes('Administrator') ?? false;
}

/**
 * Cognito group name for administrators
 */
export const ADMIN_GROUP_NAME = 'Administrator';

/**
 * Helper function to read app settings from localStorage
 * Used by WorkspaceContext to apply settings when opening apps
 */
export function getAppSettingsFromStorage(workspaceId: string | number, appId: string) {
  try {
    const key = APP_SETTINGS_CONFIG.perWorkspaceSettings 
      ? `${APP_SETTINGS_CONFIG.storageKey}-${workspaceId}`
      : APP_SETTINGS_CONFIG.storageKey;
    
    const stored = localStorage.getItem(key);
    if (stored) {
      const allSettings = JSON.parse(stored);
      return allSettings[appId] || null;
    }
  } catch (error) {
    console.error('Failed to read app settings from localStorage:', error);
  }
  return null;
}

export default {
  AUTH_SERVICE_BASE,
  ADMIN_SERVICE_BASE,
  AUTH_API,
  ADMIN_API,
  PROTOCOL_CALWIN,
  PROTOCOL_CALWIN_TEST,
  PROTOCOL_CALWIN_DEV,
  INSTALLER_DOWNLOAD_URL,
  REFRESH_MARGIN_SECONDS,
  INSTALLATIONS_STALE_MS,
  INSTALLATIONS_RETRY_BASE_MS,
  INSTALLATIONS_RETRY_MAX_MS,
  INSTALLATIONS_RETRY_MAX_ATTEMPTS,
  COGNITO_DOMAIN,
  COGNITO_CLIENT_ID,
  COGNITO_REDIRECT_URI
};
