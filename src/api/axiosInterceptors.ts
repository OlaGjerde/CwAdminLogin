/**
 * Axios Response Interceptor for Cookie-Based Authentication
 * 
 * Handles automatic token refresh when receiving 401 responses.
 * Backend sets httpOnly cookies which are automatically sent with requests.
 */

import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { refreshToken } from './auth';
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
 * 2. Interceptor calls /api/auth/RefreshToken
 * 3. Backend uses refresh_token cookie to get new access_token
 * 4. Backend sets new cookies
 * 5. Interceptor retries original request
 * 6. If refresh fails → redirect to login
 */
export function setupAxiosInterceptors() {
  logDebug('🔧 Setting up Axios interceptors for cookie-based auth');

  axios.interceptors.response.use(
    // Success handler - pass through
    response => response,

    // Error handler - check for token expiration
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Check if this is a token expiration error
      const isTokenExpired = 
        error.response?.status === 401 && 
        error.response?.headers['token-expired'] === 'true';

      if (!isTokenExpired) {
        // Not a token expiration error - pass through
        return Promise.reject(error);
      }

      // Prevent infinite retry loop
      if (originalRequest._retry) {
        logWarn('⚠️ Token refresh already attempted, redirecting to login');
        window.location.href = '/';
        return Promise.reject(error);
      }

      // Avoid refreshing on the refresh endpoint itself
      if (originalRequest.url?.includes('/api/auth/RefreshToken')) {
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
      logDebug('🔄 Token expired, attempting refresh...');

      try {
        // Call refresh endpoint - backend will use refresh_token cookie
        await refreshToken();
        
        logDebug('✅ Token refresh successful');
        
        // Process queued requests
        processQueue();
        
        // Retry original request
        logDebug('🔄 Retrying original request after token refresh');
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
