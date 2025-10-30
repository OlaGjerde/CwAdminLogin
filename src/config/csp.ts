/**
 * Content Security Policy Configuration
 * Centralized CSP directives for development and production
 */

export interface CSPConfig {
  dev: string;
  prod: string;
}

/**
 * API domains that need to be whitelisted in connect-src
 */
const API_DOMAINS = [
  // Auth API (all environments use same domain)
  'https://auth.calwincloud.com',
  // Admin API (environment-specific)
  'https://adminapi-dev.calwincloud.com',
  'https://adminapi-test.calwincloud.com',
  'https://adminapi.calwincloud.com',
  // Cognito
  'https://calwincloud.auth.eu-north-1.amazoncognito.com',
  // Media servers
  'https://calwinmedia.calwincloud.com',
  'https://calwinmedia-test.calwincloud.com',
  'https://calwinmedia-dev.calwincloud.com',
  // Frontend domains
  'https://dev.calwincloud.com',
  'https://test.calwincloud.com',
  'https://www.calwincloud.com',
];

/**
 * Cognito domains for form-action (OAuth redirects)
 */
const COGNITO_DOMAINS = [
  'https://login.calwincloud.com',
  'https://calwincloud.auth.eu-north-1.amazoncognito.com',
];

/**
 * Development CSP Policy (More Relaxed)
 * - Allows 'unsafe-inline' for Vite HMR
 * - Allows WebSocket for dev server
 */
const devDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'", // unsafe-inline needed for Vite HMR
  "style-src 'self' 'unsafe-inline' https://cdn3.devexpress.com",
  "img-src 'self' data: https:",
  "font-src 'self' data: https://cdn3.devexpress.com",
  `connect-src 'self' ${API_DOMAINS.join(' ')} ws://localhost:5173`, // ws for HMR
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  `form-action 'self' ${COGNITO_DOMAINS.join(' ')}`,
];

/**
 * Production CSP Policy (Stricter)
 * - Removes 'unsafe-inline' for scripts where possible
 * - Adds upgrade-insecure-requests
 * - No WebSocket needed
 */
const prodDirectives = [
  "default-src 'self'",
  "script-src 'self'", // No unsafe-inline in production
  "style-src 'self' 'unsafe-inline' https://cdn3.devexpress.com",
  "img-src 'self' data: https:",
  "font-src 'self' data: https://cdn3.devexpress.com",
  `connect-src 'self' ${API_DOMAINS.join(' ')}`,
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  `form-action 'self' ${COGNITO_DOMAINS.join(' ')}`,
  "upgrade-insecure-requests", // Force HTTPS
];

export const CSP_POLICIES: CSPConfig = {
  dev: devDirectives.join('; '),
  prod: prodDirectives.join('; '),
};

/**
 * Get CSP policy based on environment
 * @param isDev - Whether to use development or production CSP policy
 */
export function getCSPPolicy(isDev: boolean): string {
  return isDev ? CSP_POLICIES.dev : CSP_POLICIES.prod;
}

/**
 * Additional Security Headers (recommended)
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};
