/**
 * Axios Interceptor Setup for Cookie-Based Authentication
 * 
 * TEMPORARILY DISABLED to prevent infinite redirect loop.
 * 
 * The interceptor was causing a loop because:
 * 1. /Me returns 401 (backend not reading cookies yet)
 * 2. Interceptor tries to refresh token
 * 3. /RefreshToken also fails (no cookies)
 * 4. Interceptor redirects to / 
 * 5. Login starts again → LOOP
 * 
 * TODO: Re-enable after backend implements CookieToHeaderMiddleware
 */

/**
 * Setup Axios response interceptor for automatic token refresh
 * Currently disabled - no-op function
 */
export function setupAxiosInterceptors() {
  console.log('⚠️ Axios interceptors DISABLED - preventing loop until backend is fixed');
  console.log('📋 Backend needs to implement CookieToHeaderMiddleware');
  
  // No interceptor configured - requests will fail naturally with 401
  // User will see error screen and can manually retry
}
