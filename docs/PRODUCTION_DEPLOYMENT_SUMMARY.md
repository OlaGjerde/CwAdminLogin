# Production Deployment Summary

## 🎯 Target Deployment

**Production URL:** `https://dev.calwincloud.com`  
**Platform:** AWS CloudFront + S3  
**Authentication:** AWS Cognito Hosted UI  

---

## ✅ Changes Made for Production

### 1. Environment Configuration

**Created Files:**
- `.env.production` - Production environment variables
- `.env.production.example` - Template for reference

**Key Settings:**
```env
VITE_COGNITO_REDIRECT_URI=https://dev.calwincloud.com
```

### 2. Security (CSP) Configuration

**Updated:** `src/config/csp.ts`
- Added production domain to allowed domains
- Production CSP removes 'unsafe-inline' for scripts (stricter security)

### 3. Documentation

**Created:**
- `CLOUDFRONT_DEPLOYMENT.md` - Complete deployment guide
- `DEPLOYMENT_CHECKLIST.md` - Quick checklist format
- Lambda@Edge function for security headers included

### 4. Git Configuration

**Updated:** `.gitignore`
- Excludes sensitive `.env` files
- Keeps `.env.production` for deployment reference

---

## 📋 What You Need to Do

### Step 1: Update AWS Cognito (CRITICAL!)

**Before anything else, add your production URL to Cognito:**

1. Go to AWS Console → Cognito → User Pools
2. Select your pool → App clients → Your app client
3. Add to **Allowed callback URLs:**
   ```
   https://dev.calwincloud.com
   ```
4. Add to **Allowed sign-out URLs:**
   ```
   https://dev.calwincloud.com
   ```
5. Save changes

**Without this step, OAuth login will fail!**

---

### Step 2: Build Your App

```bash
# Make sure you're in the project directory
cd c:\Users\OlaGjerde\CodeRoot\DevExtreme 25.1\awsManageLogin\awslogin

# Build for production
yarn build
```

**What this does:**
- Reads `.env.production` file
- Sets redirect URI to `https://dev.calwincloud.com`
- Minifies and optimizes code
- Creates `dist/` folder with production-ready files
- Uses stricter CSP policy (no 'unsafe-inline' for scripts)

---

### Step 3: You Handle AWS Setup

**Files to upload:** Everything in the `dist/` folder

**Important CloudFront Settings:**

1. **Error Pages (Critical for SPA!):**
   - 403 Forbidden → `/index.html` (200 status)
   - 404 Not Found → `/index.html` (200 status)
   
   This ensures React Router works (all routes return index.html)

2. **Security Headers:**
   Use the CloudFront Function from `CLOUDFRONT_DEPLOYMENT.md`:
   ```javascript
   // Adds CSP and other security headers
   // See CLOUDFRONT_DEPLOYMENT.md for complete code
   ```

3. **SSL Certificate:**
   - Must be for `dev.calwincloud.com`
   - Attached to CloudFront distribution

4. **DNS:**
   - Point `dev.calwincloud.com` to your CloudFront domain

---

## 🧪 Testing Your Deployment

### 1. Check URL Loads
Visit: `https://dev.calwincloud.com`

### 2. Check Security Headers
```bash
curl -I https://dev.calwincloud.com | grep -i "content-security-policy"
```
Should see CSP header in response.

### 3. Test OAuth Flow
1. Click "Logg inn via Cognito"
2. Should redirect to `https://auth.calwincloud.com`
3. After login, should redirect back to `https://dev.calwincloud.com`
4. Should load your installations

### 4. Test Installation Launcher
1. Click Installation Launcher icon in taskbar
2. Window should open at 1690×980 pixels
3. Should display all installations
4. Click launch button → Should open desktop app

### 5. Check Browser Console
- Open DevTools (F12)
- Should see no errors
- Should see no CSP violations

---

## 🔄 Updating After Deployment

When you make code changes:

```bash
# 1. Build new version
yarn build

# 2. Upload dist/ to S3
aws s3 sync dist/ s3://your-bucket-name/ --delete

# 3. Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

---

## 📁 Project Files Overview

### Environment Files
```
.env.production          ← Production config (committed to git)
.env.production.example  ← Template for reference
```

### Configuration Files
```
src/config.ts           ← API endpoints, Cognito settings
src/config/csp.ts       ← Security policy (CSP) config
vite.config.ts          ← Build configuration
```

### Documentation
```
CLOUDFRONT_DEPLOYMENT.md    ← Full deployment guide
DEPLOYMENT_CHECKLIST.md     ← Quick checklist
CSP_CONFIGURATION.md        ← Security headers for all platforms
CSP_TESTING_GUIDE.md        ← How to test CSP
CSP_IMPLEMENTATION_SUMMARY.md ← CSP overview
```

### Build Output
```
dist/                   ← Production build (created by yarn build)
  ├── index.html        ← Entry point
  ├── assets/           ← JS, CSS, fonts (hashed filenames)
  └── ...
```

---

## 🛡️ Security Features

Your production deployment includes:

✅ **HTTPS Only** - CloudFront enforces  
✅ **Content Security Policy** - Blocks XSS attacks  
✅ **Strict CSP in Production** - No 'unsafe-inline' for scripts  
✅ **Additional Security Headers:**
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: SAMEORIGIN
  - X-XSS-Protection: enabled
  - Referrer-Policy: strict-origin-when-cross-origin  
  - Permissions-Policy: restricts APIs

✅ **AWS Cognito** - OAuth2 + PKCE authentication  
✅ **Token Refresh** - Automatic, secure  
✅ **localStorage** - For token storage (with CSP protection)

---

## 🚨 Common Issues

### "redirect_uri_mismatch"
❌ **Cause:** Cognito doesn't have production URL  
✅ **Fix:** Add `https://dev.calwincloud.com` to Cognito callback URLs

### Routes return 404
❌ **Cause:** CloudFront not configured for SPA  
✅ **Fix:** Configure error pages (403/404 → index.html)

### OAuth redirects to localhost
❌ **Cause:** Built with wrong redirect URI  
✅ **Fix:** Check `.env.production`, rebuild: `yarn build`

### CSP errors in console
❌ **Cause:** Resource not whitelisted  
✅ **Fix:** Add domain to `src/config/csp.ts`, rebuild

---

## 📊 Build Info

Your build includes:

- **React 18** - UI framework
- **TypeScript** - Type safety
- **DevExtreme 25.1** - UI components
- **Vite** - Build tool
- **AWS Cognito** - Authentication
- **Custom Apps Framework** - Installation Launcher, Todo app

**Build size:** ~500KB-2MB (minified, gzipped)  
**Load time:** <3 seconds on good connection

---

## 🎉 Ready to Deploy!

You have everything configured. Now you just need to:

1. ✅ Update Cognito callback URLs
2. ✅ Run `yarn build`
3. ✅ Upload `dist/` to AWS
4. ✅ Configure CloudFront (see CLOUDFRONT_DEPLOYMENT.md)
5. ✅ Test at `https://dev.calwincloud.com`

**Full instructions:** See `CLOUDFRONT_DEPLOYMENT.md`  
**Quick checklist:** See `DEPLOYMENT_CHECKLIST.md`

Good luck with your deployment! 🚀
