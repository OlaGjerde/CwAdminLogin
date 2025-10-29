/**
 * Shared Axios Configuration
 * 
 * Configures axios instances for different services with shared interceptors
 * and error handling. Implements cookie-based authentication with automatic
 * token refresh and proper CORS handling.
 */

import axios from 'axios';
import type { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { logDebug, logError } from '../utils/logger';
import { 
  AUTH_SERVICE_BASE, 
  ADMIN_SERVICE_BASE, 
  AUTH_API
} from '../config';
import { refreshTokens } from './auth';

// Track if we're currently refreshing to prevent multiple calls
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

// Base configuration for all clients
const baseConfig = {
  withCredentials: true, // Required for cookie handling
  headers: {
    'Content-Type': 'application/json',
  },
};

// Create axios instances for each service
export const authClient = axios.create({
  ...baseConfig,
  baseURL: AUTH_SERVICE_BASE,
});

export const adminClient = axios.create({
  ...baseConfig,
  baseURL: ADMIN_SERVICE_BASE,
});

// Token refresh promise handler
const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

// Shared request interceptor
const requestInterceptor = (config: InternalAxiosRequestConfig) => {
  // Log auth-related requests
  if (config.url?.includes('/api/auth/')) {
    logDebug(`🔒 Auth Request: ${config.method?.toUpperCase()} ${config.url}`);
  }
  return config;
};

// Shared response interceptor
const responseInterceptor = (response: AxiosResponse) => {
  // Log auth-related responses
  if (response.config.url?.includes('/api/auth/')) {
    logDebug(`🔒 Auth Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
  }
  return response;
};

// Shared error interceptor with token refresh logic
const errorInterceptor = async (error: AxiosError) => {
  const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
  
  // Handle 401 errors (unauthorized)
  if (error.response?.status === 401 && !originalRequest._retry) {
    if (isRefreshing) {
      // Wait for token refresh
      try {
        await new Promise<string>((resolve) => {
          subscribeTokenRefresh(resolve);
        });
        return axios(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    // Start token refresh
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      await refreshTokens();
      isRefreshing = false;
      onTokenRefreshed('refreshed');
      return axios(originalRequest);
    } catch (refreshError) {
      isRefreshing = false;
      refreshSubscribers = [];
      // Redirect to login or handle refresh failure
      window.location.href = '/login';
      return Promise.reject(refreshError);
    }
  }

  // Log errors
  if (error.response && error.config?.url?.includes('/api/auth/')) {
    logError(`❌ Auth Error: ${error.response.status} ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
  } else if (!error.response && !error.request) {
    logError('Critical configuration error:', error.message);
  }

  return Promise.reject(error);
};

// Apply shared interceptors to both clients
[authClient, adminClient].forEach((client: AxiosInstance) => {
  client.interceptors.request.use(requestInterceptor);
  client.interceptors.response.use(responseInterceptor, errorInterceptor);
});

// Health check functions
export async function checkAuthServiceHealth(): Promise<boolean> {
  try {
    await authClient.get(AUTH_API.BASE + '/health');
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