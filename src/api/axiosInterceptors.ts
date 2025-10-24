/**
 * Axios Interceptors for Hybrid Authentication
 * 
 * Request Interceptor: Adds Authorization: Bearer header with access token from localStorage
 * Response Interceptor: Handles automatic token refresh on 401 responses
 * 
 * Hybrid Approach:
 * - Access token from localStorage → Authorization: Bearer header
 * - Refresh token in httpOnly cookie → Sent automatically by browser
 */

import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { refreshToken } from './auth';
import { getAccessToken, isTokenExpired, clearTokens } from '../utils/tokenStorage';
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
 * Setup Axios interceptors for hybrid authentication
 * 
 * Request Interceptor:
 * - Adds Authorization: Bearer header with access token from localStorage
 * - Automatically checks if token needs refresh before sending request
 * 
 * Response Interceptor:
 * - Handles 401 errors by attempting token refresh
 * - Retries original request with new token
 * - Redirects to login if refresh fails
 */
export function setupAxiosInterceptors() {
  logDebug('Setting up Axios interceptors for hybrid auth');

  // ============================================================================
  // REQUEST INTERCEPTOR - Add Bearer Token
  // ============================================================================
  
  axios.interceptors.request.use(
    async (config) => {
      // Skip auth header for auth endpoints themselves
      const authEndpoints = ['/api/auth/ExchangeToken', '/api/auth/RefreshToken', '/api/auth/Logout'];
      const isAuthEndpoint = authEndpoints.some(endpoint => config.url?.includes(endpoint));
      
      if (!isAuthEndpoint) {
        // Get access token from localStorage first
        const accessToken = getAccessToken();
        
        // Only try to refresh if we have a token that's expired
        // Don't try to refresh if we have no token at all (user not logged in)
        if (accessToken && isTokenExpired(60)) { // 60 seconds margin (standard)
          logDebug('Token expired/expiring soon, refreshing before request');
          try {
            await refreshToken();
            logDebug('Token refreshed successfully before request');
            // Get the new token after refresh
            const newAccessToken = getAccessToken();
            if (newAccessToken) {
              config.headers.Authorization = `Bearer ${newAccessToken}`;
              logDebug(`Added refreshed Bearer token to request: ${config.method?.toUpperCase()} ${config.url}`);
            }
          } catch (error) {
            logWarn('Token refresh failed before request, proceeding anyway');
            // Still try with old token
            if (accessToken) {
              config.headers.Authorization = `Bearer ${accessToken}`;
            }
          }
        } else if (accessToken) {
          // Token exists and is valid, use it
          config.headers.Authorization = `Bearer ${accessToken}`;
          logDebug(`Added Bearer token to request: ${config.method?.toUpperCase()} ${config.url}`);
        } else {
          // No token at all - user not logged in (this is normal for initial auth check)
          logDebug(`No token for request (user not logged in): ${config.method?.toUpperCase()} ${config.url}`);
        }
      }
      
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // ============================================================================
  // RESPONSE INTERCEPTOR - Handle 401 and Token Refresh
  // ============================================================================

  axios.interceptors.response.use(
    // Success handler - pass through
    response => response,

    // Error handler - check for token expiration
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Check if this is a 401 error
      if (error.response?.status !== 401) {
        return Promise.reject(error);
      }

      // Prevent infinite retry loop
      if (originalRequest._retry) {
        logWarn('Token refresh already attempted, redirecting to login');
        window.location.href = '/';
        return Promise.reject(error);
      }

      // Avoid refreshing on the refresh endpoint itself
      if (originalRequest.url?.includes('/api/auth/RefreshToken')) {
        logWarn('Refresh endpoint returned 401, redirecting to login');
        window.location.href = '/';
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      // If already refreshing, queue this request
      if (isRefreshing) {
        logDebug('Token refresh in progress, queueing request');
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            logDebug('Retrying queued request after refresh');
            // Add new Bearer token to retried request
            const accessToken = getAccessToken();
            if (accessToken && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            }
            return axios(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      // Start refresh process
      isRefreshing = true;
      logDebug('Token expired (401), attempting refresh...');

      try {
        // Call refresh endpoint - uses refresh_token from httpOnly cookie
        await refreshToken();
        
        logDebug('Token refresh successful');
        
        // Process queued requests
        processQueue();
        
        // Retry original request with new Bearer token
        const accessToken = getAccessToken();
        if (accessToken && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        
        logDebug('Retrying original request after token refresh');
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear stale tokens and redirect to login
        logError('Token refresh failed:', refreshError);
        
        // Clear stale tokens from localStorage
        clearTokens();
        logDebug('Cleared stale tokens from localStorage');
        
        processQueue(refreshError as Error);
        
        // Redirect to login
        logWarn('Redirecting to login due to refresh failure');
        window.location.href = '/';
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
  );

  logDebug('Axios interceptors configured (hybrid auth with Bearer tokens)');
}
