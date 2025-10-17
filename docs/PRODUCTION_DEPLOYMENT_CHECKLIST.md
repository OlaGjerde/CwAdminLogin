# Production Deployment - Quick Checklist

## 🚀 Pre-Deployment (Do this first!)

### Frontend Changes
- [ ] Update `src/config.ts` with production URLs
- [ ] Or create `.env.production` with VITE_ variables
- [ ] Run `yarn build` and test with `yarn preview`
- [ ] Check for console errors

### Backend Changes
- [ ] Update CORS to include production frontend domain
- [ ] Change `SameSite = SameSiteMode.Lax` (if both HTTPS)
- [ ] Update `logoutUriBase` to production URL
- [ ] Test with production-like configuration locally

### AWS Cognito
- [ ] Add production callback URL
- [ ] Add production logout URL (with `?logout=true`)
- [ ] Test OAuth flow

---

## 🔴 CRITICAL - Don't Forget!

1. **CORS Configuration** ⚠️
   - Backend MUST include production frontend domain
   - Must be exact match (no trailing slash)
   - We got this error today with localhost!

2. **HTTPS Required** ⚠️
   - Both frontend and backend MUST use HTTPS
   - Cookies require `Secure=true` in production

3. **SameSite Cookie Setting** ⚠️
   - Development: `SameSite=None` (HTTP→HTTPS)
   - Production: `SameSite=Lax` (HTTPS→HTTPS, more secure)

---

## 📋 Deployment Day

### Step 1: Deploy Backend
1. Update `appsettings.Production.json`
2. Build: `dotnet publish -c Release`
3. Deploy to hosting
4. Test: `https://api.your-domain.com/health`

### Step 2: Deploy Frontend
1. Update URLs in config
2. Build: `yarn build`
3. Deploy to hosting
4. Test: `https://app.your-domain.com`

### Step 3: Update Cognito
1. Add production URLs in AWS Console
2. Save changes

---

## ✅ Post-Deployment Tests

- [ ] Can you login? (redirects to Cognito)
- [ ] Does email show in top-right?
- [ ] Can you launch installation?
- [ ] Can you logout without loop?
- [ ] Are cookies visible in browser dev tools?
- [ ] No CORS errors in console?
- [ ] No 401 errors on API calls?

---

## 🐛 If Something Breaks

**CORS Error?**
→ Check backend CORS includes frontend domain

**Cookies not working?**
→ Check both domains use HTTPS
→ Check `Secure=true` in cookie settings

**401 Unauthorized?**
→ Check `CookieToHeaderMiddleware` is before `UseAuthentication()`
→ Check cookies are being sent (dev tools → Network → request headers)

**Email is null?**
→ Check backend reads from `id_token` cookie (should be fixed already)

**Infinite redirect?**
→ Check `?logout=true` flag detection in `useCognitoAuth.ts`

---

## 📞 Need Help?

See full details in: `docs/PRODUCTION_MIGRATION_PLAN.md`
