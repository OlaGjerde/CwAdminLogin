# Production Migration Plan - Cookie-Based Authentication

## Overview
This document outlines all necessary changes to migrate from localhost development to production deployment for the cookie-based authentication system.

---

## 🚨 Critical Changes Required

### 1. Frontend Configuration (`src/config.ts`)

**DEVELOPMENT (Current):**
```typescript
export const AUTH_API_BASE = 'https://localhost:7059/api/cwauth';
export const INSTALLATIONS_ENDPOINT = 'https://localhost:7059/api/installations';
export const COGNITO_REDIRECT_URI = 'http://localhost:5173';
```

**PRODUCTION (Required):**
```typescript
export const AUTH_API_BASE = 'https://your-backend-domain.com/api/cwauth';
export const INSTALLATIONS_ENDPOINT = 'https://your-backend-domain.com/api/installations';
export const COGNITO_REDIRECT_URI = 'https://your-frontend-domain.com';
```

**Action Items:**
- [ ] Update backend API URLs to production domain
- [ ] Update redirect URI to production frontend domain
- [ ] Ensure both domains use HTTPS (required for SameSite=None cookies)

---

### 2. Backend CORS Configuration (`Program.cs`)

**DEVELOPMENT (Current):**
```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
            "http://localhost:5173",  // ⚠️ Development only
            "https://localhost:5173"
        )
        .AllowCredentials()
        .AllowAnyMethod()
        .AllowAnyHeader();
    });
});
```

**PRODUCTION (Required):**
```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
            "https://your-frontend-domain.com"  // ✅ Production domain
        )
        .AllowCredentials()
        .AllowAnyMethod()
        .AllowAnyHeader();
    });
});
```

**Action Items:**
- [ ] Remove localhost origins
- [ ] Add production frontend domain
- [ ] **CRITICAL:** Must match exactly with COGNITO_REDIRECT_URI
- [ ] Ensure no trailing slash in origin URL

**⚠️ Remember the CORS error we had today:**
- Backend was missing `localhost` in CORS policy
- Result: Cookies were blocked with "No 'Access-Control-Allow-Origin' header"
- **In production:** Frontend domain MUST be in CORS policy!

---

### 3. Backend Cookie Configuration (`CwAuthController.cs`)

**DEVELOPMENT (Current):**
```csharp
var cookieOptions = new CookieOptions
{
    HttpOnly = true,
    Secure = true,        // ⚠️ Requires HTTPS
    SameSite = SameSiteMode.None,  // ⚠️ Required for cross-scheme (HTTP→HTTPS)
    Domain = null,        // ⚠️ Development: no domain restriction
    Path = "/",
    Expires = DateTimeOffset.UtcNow.AddSeconds(expiresIn)
};
```

**PRODUCTION (Recommended Change):**
```csharp
var cookieOptions = new CookieOptions
{
    HttpOnly = true,
    Secure = true,
    SameSite = SameSiteMode.Lax,   // ✅ Change to Lax (both domains on HTTPS)
    Domain = ".your-domain.com",   // ✅ Set domain for subdomain sharing (optional)
    Path = "/",
    Expires = DateTimeOffset.UtcNow.AddSeconds(expiresIn)
};
```

**Why change SameSite from None to Lax?**
- **Development:** HTTP frontend (localhost:5173) → HTTPS backend (localhost:7059)
  - Cross-scheme requires `SameSite=None`
- **Production:** HTTPS frontend → HTTPS backend
  - Same scheme allows `SameSite=Lax` (more secure)
  - Prevents CSRF attacks better than `None`

**Action Items:**
- [ ] Change `SameSite = SameSiteMode.Lax` in production
- [ ] Consider setting `Domain` if using subdomains
- [ ] Keep `Secure = true` (required for HTTPS)
- [ ] Keep `HttpOnly = true` (security best practice)

---

### 4. AWS Cognito Configuration

**Cognito Hosted UI Settings:**

1. **Callback URLs** - Add production URL:
   ```
   https://your-frontend-domain.com
   ```

2. **Logout URLs** - Add production URL with logout flag:
   ```
   https://your-frontend-domain.com?logout=true
   ```

3. **Allowed OAuth Scopes** - Verify these are enabled:
   - `openid`
   - `email`
   - `profile`

**Action Items:**
- [ ] Add production callback URL in Cognito console
- [ ] Add production logout URL in Cognito console
- [ ] Test OAuth flow with production URLs
- [ ] Keep development URLs for testing (can have multiple)

---

### 5. Backend LogoutUri Configuration (`CwAuthController.cs`)

**DEVELOPMENT (Current):**
```csharp
var logoutUriBase = "http://localhost:5173";
```

**PRODUCTION (Required):**
```csharp
var logoutUriBase = "https://your-frontend-domain.com";
```

**Action Items:**
- [ ] Update logout redirect URI
- [ ] Ensure it matches Cognito logout URL configuration
- [ ] Test logout flow in production

---

## 📋 Pre-Deployment Checklist

### Frontend

- [ ] **Environment Variables**
  - Create `.env.production` with production API URLs
  - Remove hardcoded localhost URLs from `config.ts`
  
- [ ] **Build Configuration**
  - Run production build: `yarn build`
  - Test production build locally: `yarn preview`
  - Verify no console errors

- [ ] **Security Headers (vite.config.ts)**
  - CSP configured correctly
  - No `unsafe-inline` or `unsafe-eval` in production
  - All external domains whitelisted

- [ ] **SSL/HTTPS**
  - Frontend served over HTTPS
  - SSL certificate valid and trusted

### Backend

- [ ] **CORS Policy**
  - Production frontend domain added
  - No localhost origins in production
  - `AllowCredentials()` enabled

- [ ] **Cookie Configuration**
  - `SameSite = SameSiteMode.Lax` (if both HTTPS)
  - `Secure = true`
  - `HttpOnly = true`
  - Domain set appropriately

- [ ] **JWT Validation**
  - Cognito issuer URL correct
  - `ValidateAudience = false` (Cognito access tokens lack aud claim)
  - Token validation working

- [ ] **Logging**
  - Remove excessive debug logging
  - Keep error logging for production monitoring

- [ ] **SSL/HTTPS**
  - Backend API served over HTTPS
  - SSL certificate valid and trusted

### AWS Cognito

- [ ] **App Client Settings**
  - Production callback URL added
  - Production logout URL added
  - OAuth scopes enabled (openid, email, profile)
  - PKCE enabled

- [ ] **Domain Configuration**
  - Cognito hosted UI domain configured
  - Custom domain (optional)

### Testing

- [ ] **Authentication Flow**
  - Login redirects to Cognito
  - Cognito redirects back to app
  - Access token cookie set
  - ID token cookie set
  - Refresh token cookie set
  - User email displays correctly

- [ ] **Authorization**
  - Backend validates cookies
  - API calls include cookies automatically
  - Protected endpoints return 401 when not authenticated

- [ ] **Logout Flow**
  - Logout clears cookies
  - Redirects to Cognito logout
  - Cognito redirects back with `?logout=true`
  - No auto-redirect to login after logout

- [ ] **Token Refresh**
  - Refresh token works (currently manual)
  - Consider re-enabling axios interceptor for auto-refresh

- [ ] **Cross-Browser Testing**
  - Chrome
  - Firefox
  - Safari
  - Edge

---

## 🔧 Configuration Management Strategy

### Option 1: Environment Variables (Recommended)

**Frontend `.env.production`:**
```env
VITE_AUTH_API_BASE=https://api.your-domain.com/api/cwauth
VITE_INSTALLATIONS_ENDPOINT=https://api.your-domain.com/api/installations
VITE_COGNITO_REDIRECT_URI=https://app.your-domain.com
VITE_COGNITO_DOMAIN=https://auth.calwincloud.com
VITE_COGNITO_CLIENT_ID=656e5ues1tvo5tk9e00u5f0ft3
```

**Update `src/config.ts`:**
```typescript
export const AUTH_API_BASE = import.meta.env.VITE_AUTH_API_BASE || 'http://localhost:7059/api/cwauth';
export const INSTALLATIONS_ENDPOINT = import.meta.env.VITE_INSTALLATIONS_ENDPOINT || 'http://localhost:7059/api/installations';
export const COGNITO_REDIRECT_URI = import.meta.env.VITE_COGNITO_REDIRECT_URI || 'http://localhost:5173';
```

**Backend `appsettings.Production.json`:**
```json
{
  "AllowedOrigins": ["https://app.your-domain.com"],
  "Cognito": {
    "Domain": "https://auth.calwincloud.com",
    "ClientId": "656e5ues1tvo5tk9e00u5f0ft3",
    "RedirectUri": "https://app.your-domain.com",
    "LogoutUri": "https://app.your-domain.com?logout=true"
  }
}
```

### Option 2: Build-Time Configuration

Use different `config.ts` files:
- `config.development.ts`
- `config.production.ts`

Import based on environment in `vite.config.ts`.

---

## 🚀 Deployment Steps

### 1. Backend Deployment

1. **Update Configuration**
   - Edit `appsettings.Production.json`
   - Update CORS origins
   - Update cookie settings

2. **Build**
   ```bash
   dotnet publish -c Release
   ```

3. **Deploy**
   - Deploy to hosting service (Azure, AWS, etc.)
   - Ensure HTTPS is enabled
   - Configure SSL certificate

4. **Verify**
   - Test API endpoint: `https://api.your-domain.com/api/cwauth/health`
   - Check CORS headers in browser dev tools

### 2. Frontend Deployment

1. **Update Configuration**
   - Create/update `.env.production`
   - Verify all URLs point to production backend

2. **Build**
   ```bash
   yarn build
   ```

3. **Test Build**
   ```bash
   yarn preview
   ```

4. **Deploy**
   - Deploy to hosting service (Vercel, Netlify, S3+CloudFront, etc.)
   - Ensure HTTPS is enabled
   - Configure SSL certificate

5. **Verify**
   - Test frontend loads: `https://app.your-domain.com`
   - Check console for errors
   - Test authentication flow end-to-end

### 3. AWS Cognito Update

1. Open AWS Cognito console
2. Navigate to App Client Settings
3. Add production URLs:
   - Callback: `https://app.your-domain.com`
   - Logout: `https://app.your-domain.com?logout=true`
4. Save changes
5. Test OAuth flow

---

## 🐛 Common Production Issues & Solutions

### Issue 1: "Cookies blocked by browser"
**Cause:** SameSite=None requires Secure=true and HTTPS
**Solution:**
- Ensure both frontend and backend use HTTPS
- Check cookie `Secure` flag is true
- If same domain, use `SameSite=Lax` instead

### Issue 2: "CORS error - No 'Access-Control-Allow-Origin' header"
**Cause:** Frontend domain not in backend CORS policy
**Solution:**
- Add production frontend domain to CORS `WithOrigins()`
- Ensure exact match (no trailing slash)
- Verify `AllowCredentials()` is called

### Issue 3: "401 Unauthorized on API calls"
**Cause:** Cookies not being sent or backend not reading them
**Solution:**
- Check `axios.defaults.withCredentials = true` (frontend)
- Verify `CookieToHeaderMiddleware` is positioned BEFORE `UseAuthentication()` (backend)
- Check cookies are set with correct domain

### Issue 4: "Email is null in /Me endpoint"
**Cause:** Email claim not in access_token
**Solution:**
- Backend reads email from `id_token` cookie (already implemented)
- Verify `id_token` cookie is being set

### Issue 5: "Infinite redirect loop"
**Cause:** Auto-redirect triggers after logout
**Solution:**
- Use `?logout=true` flag (already implemented)
- Check `initAuth` useEffect detects logout flag

---

## 📊 Monitoring & Logging

### Frontend Monitoring
- [ ] Set up error tracking (Sentry, LogRocket, etc.)
- [ ] Monitor console errors
- [ ] Track authentication success/failure rates

### Backend Monitoring
- [ ] Log authentication attempts
- [ ] Log cookie setting/reading
- [ ] Monitor 401 error rates
- [ ] Track token refresh attempts

### Metrics to Track
- Login success rate
- Login failure rate
- Token refresh frequency
- API 401 error rate
- Cookie blocking rate (if detectable)

---

## 🔐 Security Considerations

### Production Hardening

1. **Cookie Security**
   - ✅ `HttpOnly = true` (prevents XSS)
   - ✅ `Secure = true` (HTTPS only)
   - ✅ `SameSite = Lax` (CSRF protection)
   - ✅ Short expiration times (currently 1 hour for access token)

2. **CORS Security**
   - ✅ Whitelist specific domains (no wildcards)
   - ✅ `AllowCredentials()` only with specific origins
   - ❌ Never use `AllowAnyOrigin()` with `AllowCredentials()`

3. **JWT Validation**
   - ✅ Validate issuer (Cognito URL)
   - ✅ Validate signature
   - ⚠️ `ValidateAudience = false` (Cognito limitation - acceptable)
   - ✅ Validate token expiration

4. **Rate Limiting**
   - [ ] Consider adding rate limiting to auth endpoints
   - [ ] Prevent brute force attacks

5. **CSP Headers**
   - ✅ Already configured in `vite.config.ts`
   - ✅ No `unsafe-inline` or `unsafe-eval`

---

## 📝 Rollback Plan

If production deployment fails:

1. **Frontend:**
   - Revert to previous deployment
   - Use hosting provider's rollback feature

2. **Backend:**
   - Revert to previous deployment
   - Restore previous configuration

3. **Cognito:**
   - Keep both development and production URLs configured
   - Remove production URLs if needed

4. **DNS:**
   - If DNS changes made, revert to previous values
   - Wait for DNS propagation

---

## ✅ Post-Deployment Verification

After production deployment, verify:

- [ ] Login flow works end-to-end
- [ ] Logout flow works end-to-end
- [ ] User email displays correctly
- [ ] Installation launch works
- [ ] No console errors
- [ ] Cookies are set correctly (check browser dev tools)
- [ ] API calls succeed with authentication
- [ ] Token refresh works (if re-enabled)
- [ ] No CORS errors
- [ ] SSL certificates valid
- [ ] Performance is acceptable

---

## 🎯 Next Steps After Production

### Optional Enhancements

1. **Re-enable Axios Interceptor**
   - Restore `docs/archive/axiosInterceptors.ts`
   - Implement automatic token refresh on 401
   - Test thoroughly to prevent loops

2. **Session Management**
   - Consider Redis for distributed sessions
   - Implement session timeout warnings

3. **Multi-Tab Synchronization**
   - Detect login/logout in other tabs
   - Broadcast storage events

4. **Remember Me**
   - Extend refresh token expiration
   - Implement secure "remember me" feature

5. **Better Error Messages**
   - User-friendly error pages
   - Localized error messages (Norwegian)

---

## 📞 Support & Troubleshooting

If issues occur in production:

1. Check browser console for errors
2. Check backend logs
3. Verify CORS configuration
4. Check cookie settings in browser dev tools
5. Test with different browsers
6. Review this document for common issues

---

## 🔄 Summary of Key Changes

| Component | Development | Production | Reason |
|-----------|-------------|------------|--------|
| Frontend URLs | `localhost:5173` | `app.your-domain.com` | Production domain |
| Backend URLs | `localhost:7059` | `api.your-domain.com` | Production domain |
| CORS Origins | `localhost` | Production domain | Security |
| SameSite Cookie | `None` | `Lax` | Same scheme (both HTTPS) |
| Cognito Callback | `localhost:5173` | Production URL | OAuth flow |
| SSL/HTTPS | Mixed (HTTP/HTTPS) | HTTPS only | Security & cookies |

---

**Document Version:** 1.0  
**Last Updated:** October 17, 2025  
**Author:** AI Assistant + OlaGjerde  
**Status:** Ready for Review
