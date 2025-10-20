# Backend Production Configuration Guide

## 🎯 Production Deployment Configuration

**Frontend**: https://dev.calwincloud.com (AWS S3)  
**Backend**: https://adminapi-dev.calwincloud.com (AWS ECS Fargate)

---

## 📋 Required Backend Changes

### 1. CORS Configuration (`Program.cs`)

**CRITICAL**: Update CORS policy to allow production frontend domain.

**Location**: `Program.cs` - CORS configuration section

**CHANGE FROM**:
```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
            "http://localhost:5173",
            "https://localhost:5173"
        )
        .AllowCredentials()
        .AllowAnyMethod()
        .AllowAnyHeader();
    });
});
```

**CHANGE TO**:
```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
            "https://dev.calwincloud.com",  // ✅ Production frontend
            "http://localhost:5173",        // Keep for local testing
            "https://localhost:5173"        // Keep for local testing
        )
        .AllowCredentials()
        .AllowAnyMethod()
        .AllowAnyHeader();
    });
});
```

**Why**: Cookies will be blocked if the frontend domain isn't in the CORS policy!

---

### 2. Cookie Configuration (`CwAuthController.cs`)

**IMPORTANT**: Change `SameSite` from `None` to `Lax` for better security.

**Location**: `CwAuthController.cs` - Cookie options in both token methods

**CHANGE FROM**:
```csharp
var cookieOptions = new CookieOptions
{
    HttpOnly = true,
    Secure = true,
    SameSite = SameSiteMode.None,  // ⚠️ Required for HTTP → HTTPS (dev only)
    Domain = null,
    Path = "/",
    Expires = DateTimeOffset.UtcNow.AddSeconds(expiresIn)
};
```

**CHANGE TO**:
```csharp
var cookieOptions = new CookieOptions
{
    HttpOnly = true,
    Secure = true,
    SameSite = SameSiteMode.Lax,  // ✅ More secure for HTTPS → HTTPS
    Domain = null,                // null = exact domain only (recommended)
    Path = "/",
    Expires = DateTimeOffset.UtcNow.AddSeconds(expiresIn)
};
```

**Why**:
- **Development**: HTTP frontend → HTTPS backend requires `SameSite=None`
- **Production**: HTTPS frontend → HTTPS backend allows `SameSite=Lax` (more secure)
- `Lax` provides better CSRF protection than `None`

**⚠️ IMPORTANT**: You'll need to update this in TWO places:
1. `ExchangeCodeForTokens` method (sets initial cookies)
2. `RefreshToken` method (sets refreshed cookies)

---

### 3. Logout Redirect URI (`CwAuthController.cs`)

**Location**: `CwAuthController.cs` - `Logout` action method

**CHANGE FROM**:
```csharp
var logoutUriBase = "http://localhost:5173";
```

**CHANGE TO**:
```csharp
// Detect if request is from production or local development
var logoutUriBase = Request.Headers["Origin"].ToString().Contains("dev.calwincloud.com")
    ? "https://dev.calwincloud.com"
    : "http://localhost:5173";
```

**OR** (simpler, production-only):
```csharp
var logoutUriBase = "https://dev.calwincloud.com";
```

**Why**: Cognito needs to redirect to the correct frontend URL after logout.

---

### 4. AWS Cognito Configuration (AWS Console)

**CRITICAL**: Add production URLs to Cognito App Client settings.

#### Steps:
1. Open AWS Cognito Console
2. Navigate to your User Pool
3. Go to **App Integration** → **App clients and analytics**
4. Select your app client (`656e5ues1tvo5tk9e00u5f0ft3`)
5. Click **Edit** under **Hosted UI**

#### Callback URLs - ADD:
```
https://dev.calwincloud.com
```

**Keep existing** (for local development):
```
http://localhost:5173
https://localhost:5173
```

#### Sign Out URLs - ADD:
```
https://dev.calwincloud.com?logout=true
```

**Keep existing** (for local development):
```
http://localhost:5173?logout=true
https://localhost:5173?logout=true
```

#### OAuth Scopes - VERIFY these are enabled:
- ✅ `openid`
- ✅ `email`
- ✅ `phone` (optional, but currently used)

---

## 🔧 Optional Backend Enhancements

### Environment-Specific Configuration (Recommended)

Create `appsettings.Production.json`:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedOrigins": [
    "https://dev.calwincloud.com",
    "http://localhost:5173",
    "https://localhost:5173"
  ],
  "Cognito": {
    "Domain": "https://auth.calwincloud.com",
    "ClientId": "656e5ues1tvo5tk9e00u5f0ft3",
    "Region": "eu-north-1",
    "ProductionRedirectUri": "https://dev.calwincloud.com",
    "ProductionLogoutUri": "https://dev.calwincloud.com?logout=true"
  },
  "CookieSettings": {
    "SameSite": "Lax",
    "Secure": true,
    "HttpOnly": true
  }
}
```

Then update `Program.cs` to read from configuration:

```csharp
// Read allowed origins from configuration
var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() 
    ?? new[] { "http://localhost:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowCredentials()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});
```

---

## 🚀 Deployment Steps

### 1. Backend Deployment to AWS ECS Fargate

1. **Build Docker Image** (if using Docker):
   ```bash
   dotnet publish -c Release
   docker build -t calwin-admin-api .
   docker tag calwin-admin-api:latest <your-ecr-repo>:latest
   docker push <your-ecr-repo>:latest
   ```

2. **Update ECS Task Definition**:
   - Update image to new version
   - Ensure HTTPS is enabled (port 443)
   - Set environment: `ASPNETCORE_ENVIRONMENT=Production`

3. **Update ECS Service**:
   - Force new deployment
   - Wait for new task to be healthy

4. **Verify**:
   - Test API health: `https://adminapi-dev.calwincloud.com/api/health`
   - Check CORS headers in browser dev tools

### 2. Frontend Deployment to AWS S3

1. **Build Production Bundle**:
   ```bash
   cd awslogin
   yarn build
   ```

2. **Upload to S3**:
   ```bash
   aws s3 sync dist/ s3://your-bucket-name/ --delete
   ```

3. **Invalidate CloudFront Cache** (if using CloudFront):
   ```bash
   aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
   ```

4. **Verify**:
   - Visit: `https://dev.calwincloud.com`
   - Should redirect to Cognito login
   - Test full authentication flow

---

## ✅ Testing Checklist

### Authentication Flow
- [ ] Visit https://dev.calwincloud.com
- [ ] Redirects to Cognito Hosted UI (auth.calwincloud.com)
- [ ] Login with valid credentials
- [ ] Redirects back to https://dev.calwincloud.com
- [ ] User email displays correctly
- [ ] Installation list loads

### Cookie Verification
- [ ] Open Browser DevTools → Application → Cookies
- [ ] Verify these cookies are set:
  - `access_token` (HttpOnly, Secure, SameSite=Lax)
  - `id_token` (HttpOnly, Secure, SameSite=Lax)
  - `refresh_token` (HttpOnly, Secure, SameSite=Lax)
- [ ] Verify domain: `.adminapi-dev.calwincloud.com` or exact domain

### API Calls
- [ ] Check Network tab → API calls to adminapi-dev.calwincloud.com
- [ ] Verify cookies are sent automatically
- [ ] Verify 200 responses (not 401)
- [ ] Check CORS headers are present

### Logout Flow
- [ ] Click logout button
- [ ] Redirects to Cognito logout endpoint
- [ ] All cookies cleared
- [ ] Redirects back to login (with `?logout=true`)
- [ ] Can log back in successfully

### Token Refresh
- [ ] Stay logged in for 60+ seconds
- [ ] Check console for token refresh logs (dev build only)
- [ ] Verify no 401 errors
- [ ] Session remains active

### Installation Launching
- [ ] Select an installation from dropdown
- [ ] Verify desktop app launches (calwin://, calwintest://, calwindev://)
- [ ] Verify installation launches with correct parameters

---

## 🐛 Common Issues & Solutions

### Issue 1: CORS Error
**Symptom**: "No 'Access-Control-Allow-Origin' header"  
**Cause**: Frontend domain not in backend CORS policy  
**Solution**: 
- Add `https://dev.calwincloud.com` to `WithOrigins()` in Program.cs
- Ensure NO trailing slash
- Restart backend

### Issue 2: Cookies Not Being Set
**Symptom**: Login succeeds but no cookies visible  
**Cause**: Cookie domain mismatch or SameSite issues  
**Solution**:
- Verify both frontend and backend use HTTPS
- Check `Secure=true` in cookie options
- Verify `SameSite=Lax` (not None) in production
- Check browser console for cookie warnings

### Issue 3: 401 Unauthorized on API Calls
**Symptom**: API calls return 401 even after login  
**Cause**: Cookies not being sent or middleware not reading them  
**Solution**:
- Verify `CookieToHeaderMiddleware` is BEFORE `UseAuthentication()`
- Check cookies are set with correct domain
- Verify `axios.defaults.withCredentials = true` in frontend

### Issue 4: Infinite Redirect Loop
**Symptom**: Login redirects back to login continuously  
**Cause**: Cognito callback URL not matching redirect URI  
**Solution**:
- Verify `https://dev.calwincloud.com` is in Cognito Callback URLs
- Check `COGNITO_REDIRECT_URI` in frontend config.ts
- Ensure exact match (no trailing slash)

### Issue 5: Logout Not Working
**Symptom**: After logout, user stays logged in  
**Cause**: Logout redirect URI not configured in Cognito  
**Solution**:
- Add `https://dev.calwincloud.com?logout=true` to Cognito Sign Out URLs
- Verify logout endpoint clears all cookies
- Check Cognito logout URL format is correct

---

## 🔐 Security Checklist

### Production Hardening
- [x] **HTTPS Only**: Both frontend and backend use HTTPS
- [x] **CORS Whitelist**: Only specific domains allowed (no wildcards)
- [x] **HttpOnly Cookies**: Prevents XSS attacks
- [x] **Secure Cookies**: Only sent over HTTPS
- [x] **SameSite=Lax**: CSRF protection
- [x] **Short Token Expiration**: Access token expires in 1 hour
- [ ] **Rate Limiting**: Consider adding to auth endpoints
- [ ] **Logging**: Monitor authentication failures
- [ ] **Alerting**: Set up alerts for unusual auth activity

### NEVER Do This in Production
- ❌ `AllowAnyOrigin()` with `AllowCredentials()` in CORS
- ❌ `SameSite=None` when both domains are HTTPS
- ❌ `Secure=false` in cookie options
- ❌ `HttpOnly=false` for auth cookies
- ❌ Hard-coded secrets in code (use environment variables)
- ❌ Excessive debug logging (use structured logging)
- ❌ `ValidateIssuer=false` in JWT validation

---

## 📊 Monitoring & Logging

### Backend Logs to Monitor
- Authentication attempts (success/failure)
- Cookie setting/reading operations
- Token refresh attempts
- CORS violations
- 401/403 responses

### Frontend Logs to Monitor
- Login redirects
- OAuth callback processing
- Token refresh triggers
- API 401 errors
- Cookie blocking warnings

### Metrics to Track
- Login success rate (%)
- Login failure rate (%)
- Token refresh frequency
- API 401 error rate (%)
- Average session duration

---

## 📝 Rollback Plan

If production deployment fails:

1. **Frontend**: 
   - Revert S3 upload
   - Invalidate CloudFront cache
   - Or restore previous S3 version

2. **Backend**:
   - Roll back ECS task definition to previous version
   - Force new deployment with old task
   - Verify old version is running

3. **Cognito**:
   - Keep both localhost and production URLs configured
   - Only remove production URLs if absolutely necessary

4. **DNS**:
   - If DNS changes made, revert A/CNAME records
   - Wait for DNS propagation (up to 48 hours)

---

## 🎯 Next Steps After Deployment

### Optional Enhancements
1. **Monitoring Dashboard**: Set up CloudWatch dashboard for backend metrics
2. **Error Tracking**: Integrate Sentry or similar for error tracking
3. **Performance**: Analyze bundle size and optimize chunks
4. **CDN**: Ensure CloudFront is optimized for SPA routing
5. **Backup**: Set up automated database backups (if applicable)

### Production Testing
1. **Load Testing**: Use tools like Apache JMeter or k6
2. **Security Scan**: Run OWASP ZAP or similar
3. **Cross-Browser**: Test on Chrome, Firefox, Safari, Edge
4. **Mobile**: Test on mobile browsers
5. **Penetration Test**: Consider professional security audit

---

## 📞 Support & Reference

### Key URLs
- **Frontend (Production)**: https://dev.calwincloud.com
- **Backend API (Production)**: https://adminapi-dev.calwincloud.com
- **Cognito Domain**: https://auth.calwincloud.com
- **Cognito Region**: eu-north-1
- **Cognito Client ID**: 656e5ues1tvo5tk9e00u5f0ft3

### Documentation References
- Frontend Production Config: `src/config.ts`
- Migration Plan: `docs/PRODUCTION_MIGRATION_PLAN.md`
- CSP Configuration: `docs/CSP_CONFIGURATION.md`
- Testing Guide: `docs/CSP_TESTING_GUIDE.md`

---

**Document Version**: 1.0  
**Last Updated**: October 20, 2025  
**Target Environment**: AWS (ECS Fargate + S3)  
**Status**: Ready for Implementation
