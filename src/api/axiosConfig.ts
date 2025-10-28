/**
 * Shared Axios Configuration
 * 
 * Configures axios instances for different services with shared interceptors
 * and error handling. Each service gets its own axios instance with appropriate
 * base URL and CORS configuration.
 */

import axios from 'axios';
import type { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { logDebug, logError } from '../utils/logger';
import { AUTH_SERVICE_BASE, ADMIN_SERVICE_BASE } from '../config';

// Auth client config (uses cookies)
const authConfig = {
  withCredentials: true, // Required for cookie handling
  headers: {
    'Content-Type': 'application/json',
  },
};

// Admin client config (uses cookie-based auth)
const adminConfig = {
  withCredentials: true, // Required for cookie handling
  headers: {
    'Content-Type': 'application/json',
  },
};

// Create axios instances for each service
export const authClient = axios.create({
  ...authConfig,
  baseURL: AUTH_SERVICE_BASE,
});

export const adminClient = axios.create({
  ...adminConfig,
  baseURL: ADMIN_SERVICE_BASE,
});

// Shared request interceptor
const requestInterceptor = (config: InternalAxiosRequestConfig) => {
  // Only log auth-related requests
  if (config.url?.includes('/api/auth/')) {
    logDebug(`🔒 Auth Request: ${config.method?.toUpperCase()} ${config.url}`);
  }
  return config;
};

// Shared response interceptor
const responseInterceptor = (response: AxiosResponse) => {
  // Only log auth-related responses
  if (response.config.url?.includes('/api/auth/')) {
    logDebug(`🔒 Auth Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
  }
  return response;
};

// Shared error interceptor
const errorInterceptor = (error: AxiosError) => {
  // Only log auth-related errors and critical failures
  if (error.response && error.config?.url?.includes('/api/auth/')) {
    logError(`❌ Auth Error: ${error.response.status} ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
  } else if (!error.response && !error.request) {
    // Log critical configuration errors
    logError('Critical configuration error:', error.message);
  }
  return Promise.reject(error);
};

// Add Bearer token to admin requests
adminClient.interceptors.request.use(async (config) => {
  try {
    // Dynamically import to avoid circular dependency
    const { getAccessToken } = await import('./auth');
    const token = await getAccessToken();
    
    if (!token) {
      logError('❌ Admin Request Error: No access token available - user may need to log in again. Please refresh the page or log out and back in.');
      return Promise.reject(new Error('No access token available - Please log in again'));
    }
    
    // Token is managed by cookies, no need to set Authorization header
    return config;
  } catch (error) {
    logError('❌ Admin Request Error:', error instanceof Error ? error.message : 'Unknown error');
    return Promise.reject(error);
  }
}, errorInterceptor);

// Apply shared interceptors to both clients
[authClient, adminClient].forEach((client: AxiosInstance) => {
  client.interceptors.request.use(requestInterceptor);
  client.interceptors.response.use(responseInterceptor, errorInterceptor);
});

// Service health check functions
export async function checkAuthServiceHealth(): Promise<boolean> {
  try {
    await authClient.get('/health');
    return true;
  } catch {
    return false;
  }
}

export async function checkAdminServiceHealth(): Promise<boolean> {
  try {
    await adminClient.get('/health');
    return true;
  } catch {
    return false;
  }
}