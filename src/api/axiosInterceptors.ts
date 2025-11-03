/**
 * Axios Response Interceptor for Cookie-Based Authentication
 * 
 * Handles automatic token refresh when receiving 401 responses.
 * Backend sets httpOnly cookies which are automatically sent with requests.
 */

import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { refreshTokens } from './auth';
import { AUTH_API } from '../config';
import { logDebug, logError, logWarn } from '../utils/logger';

// Track if a refresh is in progress to prevent multiple concurrent refresh attempts
let isRefreshing = false;

// Queue of failed requests waiting for token refresh
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (error?: unknown) => void;
}> = [];

/**
 * Process queued requests after token refresh completes
 */
const processQueue = (error: Error | null = null) => {
  failedQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve();
    }
  });

  failedQueue = [];
};

/**
 * Setup Axios response interceptor for automatic token refresh
 * 
 * How it works:
 * 1. API call fails with 401 and "token-expired: true" header
 * 2. Interceptor calls /api/auth/refresh
 * 3. Backend uses refresh_token cookie to get new access_token
 * 4. Backend sets new cookies
 * 5. Interceptor retries original request
 * 6. If refresh fails → redirect to login
 */
export function setupAxiosInterceptors() {
  logDebug('🔧 Setting up Axios interceptors for cookie-based auth');
  
  // Log when access token is being used
  axios.interceptors.request.use((config) => {
    if (config.url?.includes('/api/')) {
      logDebug('🔑 Using Access Token for request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        timestamp: new Date().toISOString()
      });
    }
    return config;
  });

  // Add request interceptor for CORS credentials
  axios.interceptors.request.use(
    (config) => {
      config.withCredentials = true;  // Always send credentials
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  axios.interceptors.response.use(
    // Success handler - pass through
    response => response,

    // Error handler - check for token expiration
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Enhanced token expiration check with detailed logging
      const isTokenExpired = error.response?.status === 401;
      const isAuthEndpoint = originalRequest.url?.includes('/api/auth/');
      
      logDebug('� Auth Interceptor: Token Check', {
        timestamp: new Date().toISOString(),
        requestUrl: originalRequest.url,
        status: error.response?.status,
        isTokenExpired,
        isAuthEndpoint,
        failedRequestMethod: originalRequest.method,
        headers: {
          tokenExpired: error.response?.headers['token-expired'],
          ...error.response?.headers
        }
      });

      // Don't attempt refresh for auth endpoints to prevent loops
      if (isTokenExpired && isAuthEndpoint) {
        logWarn('⚠️ Auth endpoint returned 401, skipping refresh');
        return Promise.reject(error);
      }

      if (!isTokenExpired) {
      logDebug('📝 Not a token expiration error - passing through');
      return Promise.reject(error);
      }

      // Prevent infinite retry loop
      if (originalRequest._retry) {
        logWarn('⚠️ Token refresh already attempted, redirecting to login');
        window.location.href = '/';
        return Promise.reject(error);
      }

      logDebug('🔄 Starting token refresh process', {
        timestamp: new Date().toISOString(),
        originalUrl: originalRequest.url,
        requestMethod: originalRequest.method
      });

      // Avoid refreshing on the refresh endpoint itself
      if (originalRequest.url?.includes('/api/auth/refresh')) {
        logWarn('⚠️ Refresh endpoint returned 401, redirecting to login');
        window.location.href = '/';
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      // If already refreshing, queue this request
      if (isRefreshing) {
        logDebug('🔄 Token refresh in progress, queueing request');
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            logDebug('✅ Retrying queued request after refresh');
            return axios(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      // Start refresh process
      isRefreshing = true;
      logDebug('🔄 Auth Interceptor: Token Refresh Started', {
        timestamp: new Date().toISOString(),
        triggeringRequest: {
          url: originalRequest.url,
          method: originalRequest.method
        },
        queueStatus: {
          isRefreshing,
          queuedRequests: failedQueue.length
        }
      });

      try {
        logDebug('📡 Auth Interceptor: Calling Refresh Token API', {
          timestamp: new Date().toISOString(),
          endpoint: AUTH_API.REFRESH_TOKEN
        });

        // Call refresh endpoint - backend will use refresh_token cookie
        await refreshTokens();
        
        logDebug('✅ Token refresh successful', {
          cookies: document.cookie, // Will only show non-httpOnly cookies
          path: window.location.pathname
        });
        
        // Process queued requests
        processQueue();
        logDebug('📋 Processed queued requests:', {
          processedCount: failedQueue.length
        });
        
        // Retry original request
        logDebug('🔄 Retrying original request:', {
          method: originalRequest.method,
          url: originalRequest.url
        });
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear queue and redirect to login
        logError('❌ Token refresh failed:', refreshError);
        processQueue(refreshError as Error);
        
        // Redirect to login
        logWarn('🚪 Redirecting to login due to refresh failure');
        window.location.href = '/';
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
  );

  logDebug('✅ Axios interceptors configured');
}
