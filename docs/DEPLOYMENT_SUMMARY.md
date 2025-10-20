# Production Deployment Summary

## 🎉 Frontend Status: ✅ READY FOR DEPLOYMENT

**Production URLs:**
- Frontend: https://dev.calwincloud.com (AWS S3)
- Backend: https://adminapi-dev.calwincloud.com (AWS ECS Fargate)

---

## ✅ What's Done - Frontend

### 1. Configuration Updated (`src/config.ts`)
- ✅ Build-time environment detection using `import.meta.env.PROD`
- ✅ Production API URL: `https://adminapi-dev.calwincloud.com`
- ✅ Production Redirect URI: `https://dev.calwincloud.com`
- ✅ Development still uses localhost for testing

### 2. Build Tested
```bash
yarn build
# ✅ Build successful
# ✅ No TypeScript errors
# ✅ Bundle size: 1.11 MB JS, 683 KB CSS
```

### 3. Deployment Scripts Created
- ✅ PowerShell script: `scripts/deploy-production.ps1`
- ✅ Bash script: `scripts/deploy-production.sh`
- Both scripts:
  - Clean previous build
  - Run `yarn build`
  - Upload to S3
  - Invalidate CloudFront cache

### 4. Documentation Created
- ✅ `docs/BACKEND_PRODUCTION_CONFIG.md` - Complete backend guide
- ✅ `docs/DEPLOYMENT_CHECKLIST.md` - Quick reference checklist
- ✅ `docs/PRODUCTION_MIGRATION_PLAN.md` - Already existing, comprehensive

---

## ⏳ What Needs to Be Done - Backend

### Critical Changes Required

#### 1. Update CORS in `Program.cs`

**Add production frontend domain:**

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
            "https://dev.calwincloud.com",  // ✅ ADD THIS LINE
            "http://localhost:5173",
            "https://localhost:5173"
        )
        .AllowCredentials()
        .AllowAnyMethod()
        .AllowAnyHeader();
    });
});
```

**Why:** Without this, you'll get CORS errors and cookies will be blocked!

---

#### 2. Update Cookie Settings in `CwAuthController.cs`

**Change in TWO methods:**
1. `ExchangeCodeForTokens`
2. `RefreshToken`

**From:**
```csharp
var cookieOptions = new CookieOptions
{
    HttpOnly = true,
    Secure = true,
    SameSite = SameSiteMode.None,  // ⚠️ Dev only (HTTP→HTTPS)
    //...
};
```

**To:**
```csharp
var cookieOptions = new CookieOptions
{
    HttpOnly = true,
    Secure = true,
    SameSite = SameSiteMode.Lax,  // ✅ Prod (HTTPS→HTTPS, more secure)
    //...
};
```

**Why:** 
- `None` is needed for dev (HTTP frontend → HTTPS backend)
- `Lax` is better for production (HTTPS → HTTPS) - provides CSRF protection

---

#### 3. Update Logout URI in `CwAuthController.cs`

**In the `Logout` action method:**

**From:**
```csharp
var logoutUriBase = "http://localhost:5173";
```

**To:**
```csharp
var logoutUriBase = "https://dev.calwincloud.com";
```

**Or make it dynamic:**
```csharp
var logoutUriBase = Request.Headers["Origin"].ToString().Contains("dev.calwincloud.com")
    ? "https://dev.calwincloud.com"
    : "http://localhost:5173";
```

---

#### 4. Build and Deploy Backend

```bash
dotnet publish -c Release
# Deploy to AWS ECS Fargate
# Ensure ASPNETCORE_ENVIRONMENT=Production
```

---

## ⏳ What Needs to Be Done - AWS Cognito

### Update Cognito App Client Settings

1. **Open AWS Cognito Console**
   - Go to your User Pool
   - Navigate to: App Integration → App clients
   - Select client ID: `656e5ues1tvo5tk9e00u5f0ft3`

2. **Add Callback URLs**
   
   **Add this:**
   ```
   https://dev.calwincloud.com
   ```
   
   **Keep existing:**
   ```
   http://localhost:5173
   https://localhost:5173
   ```

3. **Add Sign Out URLs**
   
   **Add this:**
   ```
   https://dev.calwincloud.com?logout=true
   ```
   
   **Keep existing:**
   ```
   http://localhost:5173?logout=true
   https://localhost:5173?logout=true
   ```

4. **Verify OAuth Scopes**
   - ✅ `openid`
   - ✅ `email`
   - ✅ `phone` (optional)

---

## 🚀 Deployment Steps

### Recommended Order:

#### 1. Deploy Backend First
```bash
# In backend project
dotnet publish -c Release
# Deploy to AWS ECS Fargate
# Verify: https://adminapi-dev.calwincloud.com/api/health
```

#### 2. Update AWS Cognito
- Add callback and logout URLs (see above)

#### 3. Deploy Frontend
```powershell
# In frontend project (awslogin directory)
cd "c:\Users\OlaGjerde\CodeRoot\DevExtreme 25.1\awsManageLogin\awslogin"

# Option A: Use deployment script (update S3 bucket name first!)
.\scripts\deploy-production.ps1

# Option B: Manual deployment
yarn build
aws s3 sync dist/ s3://YOUR-BUCKET-NAME/ --delete
aws cloudfront create-invalidation --distribution-id YOUR-DIST-ID --paths "/*"
```

#### 4. Test Everything
Visit https://dev.calwincloud.com and verify:
- ✅ Redirects to Cognito login
- ✅ Login works
- ✅ Redirects back to app
- ✅ User email displays
- ✅ Installations load
- ✅ No console errors
- ✅ Cookies are set (check DevTools → Application → Cookies)
- ✅ API calls succeed (check DevTools → Network)
- ✅ Logout works
- ✅ Installation launching works

---

## 📊 Configuration Summary

| Component | Development | Production |
|-----------|-------------|------------|
| **Frontend URL** | http://localhost:5173 | https://dev.calwincloud.com |
| **Backend URL** | https://localhost:7059 | https://adminapi-dev.calwincloud.com |
| **Cookie SameSite** | None (HTTP→HTTPS) | Lax (HTTPS→HTTPS) |
| **Cookie Secure** | true | true |
| **Cookie HttpOnly** | true | true |
| **CORS Origin** | localhost:5173 | dev.calwincloud.com |
| **Cognito Domain** | auth.calwincloud.com | auth.calwincloud.com |
| **Cognito Client** | 656e5ues1tvo5tk9e00u5f0ft3 | 656e5ues1tvo5tk9e00u5f0ft3 |

---

## 🧪 Testing Checklist

After deployment, verify:

### Authentication
- [ ] Visit https://dev.calwincloud.com
- [ ] Auto-redirects to https://auth.calwincloud.com
- [ ] Login with credentials
- [ ] Redirects back to app
- [ ] User email displays in UI

### Cookies (DevTools → Application → Cookies)
- [ ] `access_token` cookie set
  - Domain: `.adminapi-dev.calwincloud.com` or exact domain
  - HttpOnly: ✅
  - Secure: ✅
  - SameSite: Lax
- [ ] `id_token` cookie set (same properties)
- [ ] `refresh_token` cookie set (same properties)

### API Calls (DevTools → Network)
- [ ] Calls to `adminapi-dev.calwincloud.com` return 200
- [ ] No 401 errors
- [ ] No CORS errors
- [ ] Cookies automatically sent with requests

### Functionality
- [ ] Installation dropdown loads
- [ ] Can select installation
- [ ] Desktop app launches (calwin://, calwintest://, calwindev://)
- [ ] Custom apps work (if any)

### Logout
- [ ] Click logout button
- [ ] Redirects to Cognito logout
- [ ] All cookies cleared
- [ ] Returns to login with `?logout=true`
- [ ] No auto-redirect loop

---

## 🐛 Common Issues

### 1. CORS Error
**Error:** `No 'Access-Control-Allow-Origin' header`  
**Fix:** Add `https://dev.calwincloud.com` to backend CORS policy

### 2. Cookies Not Set
**Error:** No cookies in DevTools  
**Fix:** Verify `SameSite=Lax`, both domains use HTTPS

### 3. 401 Unauthorized
**Error:** API calls return 401  
**Fix:** Check `CookieToHeaderMiddleware` is before `UseAuthentication()` in backend

### 4. Infinite Redirect
**Error:** Login loops back to login  
**Fix:** Add `https://dev.calwincloud.com` to Cognito Callback URLs

---

## 📞 Documentation Reference

- **Full Backend Guide:** `docs/BACKEND_PRODUCTION_CONFIG.md`
- **Quick Checklist:** `docs/DEPLOYMENT_CHECKLIST.md`
- **Migration Plan:** `docs/PRODUCTION_MIGRATION_PLAN.md`
- **CSP Testing:** `docs/CSP_TESTING_GUIDE.md`

---

## 🎯 Next Steps

1. **You**: Make backend changes (CORS, cookies, logout URI)
2. **You**: Build and deploy backend to ECS Fargate
3. **You**: Update AWS Cognito URLs
4. **You**: Update S3 bucket name in deployment script
5. **You**: Run `.\scripts\deploy-production.ps1`
6. **Together**: Test and verify everything works!

---

**Status**: Frontend Ready ✅ | Backend Documented ✅ | Awaiting Your Backend Changes ⏳

Good luck with the deployment! Let me know if you need any help! 🚀
