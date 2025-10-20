# Production Deployment - Quick Checklist

## 🎯 Pre-Deployment Checklist

### Frontend ✅ COMPLETE
- [x] Production config created (`src/config.ts`)
- [x] Build-time environment detection (`IS_PRODUCTION`)
- [x] Production URLs configured:
  - API Base: `https://adminapi-dev.calwincloud.com`
  - Cognito Redirect: `https://dev.calwincloud.com`
- [x] TypeScript errors fixed
- [x] Production build tested successfully
- [x] Deployment scripts created (`.sh` and `.ps1`)

### Backend ✅ DEPLOYED & VERIFIED
- [x] ~~Update CORS in `Program.cs`~~ - Already configured with wildcard `*.calwincloud.com`
- [x] Update Cookie Settings in `CwAuthController.cs`:
  - Changed `SameSite = SameSiteMode.Lax` in ExchangeCodeForTokens
  - Changed `SameSite = SameSiteMode.Lax` in RefreshToken
  - Changed `SameSite = SameSiteMode.Lax` in Logout (cookie deletion)
- [x] Update Logout URI in `appsettings.json`:
  - Changed to `https://dev.calwincloud.com`
- [x] Built and published to Docker container
- [x] Deployed to AWS ECS Fargate at `https://adminapi-dev.calwincloud.com`
- [x] Backend health verified: `/api/ping` returns 200 OK ✅

### AWS Cognito ✅ CONFIGURED
- [x] Added Callback URL: `https://dev.calwincloud.com`
- [x] Added Sign Out URL: `https://dev.calwincloud.com?logout=true`
- [x] OAuth scopes verified: `openid`, `email`

---

## 📋 Deployment Order

### Option 1: Backend First (Recommended)
```
1. Deploy Backend → AWS ECS Fargate
2. Test backend API: https://adminapi-dev.calwincloud.com/api/health
3. Update AWS Cognito URLs
4. Deploy Frontend → AWS S3
5. Test full flow: https://dev.calwincloud.com
```

### Option 2: Both Together
```
1. Deploy Backend
2. Deploy Frontend
3. Update Cognito
4. Test everything
```

---

## 🚀 Frontend Deployment Steps

### Using PowerShell (Windows):
```powershell
cd "c:\Users\OlaGjerde\CodeRoot\DevExtreme 25.1\awsManageLogin\awslogin"

# Edit deployment script first - update S3_BUCKET and CLOUDFRONT_DIST_ID
# Then run:
.\scripts\deploy-production.ps1
```

### Manual Deployment:
```powershell
# 1. Build
yarn build

# 2. Upload to S3 (update YOUR-BUCKET-NAME)
aws s3 sync dist/ s3://YOUR-BUCKET-NAME/ --delete

# 3. Invalidate CloudFront (update YOUR-DIST-ID)
aws cloudfront create-invalidation --distribution-id YOUR-DIST-ID --paths "/*"
```

---

## 🔧 Backend Changes Summary

### ✅ Changes Completed

**CORS Configuration:**
Your CORS is already production-ready! Using wildcard policy:
```csharp
return host == "calwincloud.com"
    || host.EndsWith(".calwincloud.com", StringComparison.OrdinalIgnoreCase);
```
This already covers `dev.calwincloud.com` ✅

**Cookie Settings - Changed in 3 methods:**

1. **`ExchangeCodeForTokens` method** - All 3 cookies (access_token, id_token, refresh_token):
```csharp
var cookieOptions = new CookieOptions
{
    HttpOnly = true,
    Secure = true,
    SameSite = SameSiteMode.Lax,  // ✅ Changed from None to Lax
    Path = "/",
    MaxAge = TimeSpan.FromSeconds(expiresInSeconds)
};
```

2. **`RefreshToken` method** - All 3 cookies (access_token, id_token, refresh_token):
```csharp
var cookieOptions = new CookieOptions
{
    HttpOnly = true,
    Secure = true,
    SameSite = SameSiteMode.Lax,  // ✅ Changed from None to Lax
    Path = "/",
    MaxAge = TimeSpan.FromSeconds(expiresInSeconds)
};
```

3. **`Logout` method** - Cookie deletion for all 3 cookies:
```csharp
Response.Cookies.Delete("access_token", new CookieOptions
{
    Path = "/",
    Secure = true,
    SameSite = SameSiteMode.Lax  // ✅ Changed from None to Lax
});
// (Same for id_token and refresh_token)
```

**Logout URI - Updated in `appsettings.json`:**
```json
"AWS": {
  "Cognito": {
    "LogoutUri": "https://dev.calwincloud.com"  // ✅ Changed from localhost
  }
}
```

---

## ✅ Testing After Deployment

### 1. Basic Access
- [ ] Visit https://dev.calwincloud.com
- [ ] Should redirect to https://auth.calwincloud.com
- [ ] No console errors

### 2. Login Flow
- [ ] Login with valid credentials at Cognito
- [ ] Redirects back to https://dev.calwincloud.com
- [ ] No errors in console
- [ ] User email displays in UI

### 3. Cookie Verification
Open DevTools → Application → Cookies → https://adminapi-dev.calwincloud.com
- [ ] `access_token` cookie exists (HttpOnly, Secure, SameSite=Lax)
- [ ] `id_token` cookie exists (HttpOnly, Secure, SameSite=Lax)
- [ ] `refresh_token` cookie exists (HttpOnly, Secure, SameSite=Lax)

### 4. API Calls
Open DevTools → Network → Filter by XHR/Fetch
- [ ] Calls to `adminapi-dev.calwincloud.com` return 200
- [ ] No 401 errors
- [ ] No CORS errors
- [ ] Cookies automatically sent with requests

### 5. Functionality
- [ ] Installation dropdown loads installations
- [ ] Can launch installations (calwin://, calwintest://, calwindev://)
- [ ] Custom apps work (if any)

### 6. Logout
- [ ] Click logout button
- [ ] Redirects to Cognito logout
- [ ] All cookies cleared
- [ ] Returns to login page with `?logout=true`
- [ ] Can log in again successfully

---

## 🐛 Quick Troubleshooting

### CORS Error
```
❌ No 'Access-Control-Allow-Origin' header present
```
**Fix**: Add `https://dev.calwincloud.com` to backend CORS policy

### Cookies Not Set
```
❌ Cookies not appearing in DevTools
```
**Fix**: Verify both domains use HTTPS, check `Secure=true` and `SameSite=Lax`

### 401 Unauthorized
```
❌ API calls return 401
```
**Fix**: Check cookies are being sent, verify `CookieToHeaderMiddleware` is before `UseAuthentication()`

### Infinite Redirect Loop
```
❌ Login redirects back to login
```
**Fix**: Add `https://dev.calwincloud.com` to Cognito Callback URLs

---

## 📞 Need Help?

**Documentation:**
- Full Backend Guide: `docs/BACKEND_PRODUCTION_CONFIG.md`
- Migration Plan: `docs/PRODUCTION_MIGRATION_PLAN.md`
- Testing Guide: `docs/CSP_TESTING_GUIDE.md`

**Key Files:**
- Frontend Config: `src/config.ts`
- Deployment Script (PS): `scripts/deploy-production.ps1`
- Deployment Script (Bash): `scripts/deploy-production.sh`

---

**Last Updated**: October 20, 2025  
**Status**: Frontend Ready ✅ | Backend Pending ⏳ | Cognito Pending ⏳
