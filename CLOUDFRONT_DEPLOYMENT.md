# AWS CloudFront Deployment Guide

## Prerequisites Checklist

- [x] Domain: `dev.calwincloud.com`
- [x] Cognito redirect URI updated to include production URL
- [x] Environment variables configured (`.env.production`)
- [x] CSP headers configured with production domain

---

## Step 1: Update AWS Cognito (IMPORTANT!)

Before deploying, you **must** add your production URL to Cognito's allowed callback URLs:

### In AWS Cognito Console:

1. Go to **Amazon Cognito** → **User Pools**
2. Select your User Pool
3. Go to **App clients** → Select your app client (`656e5ues1tvo5tk9e00u5f0ft3`)
4. Under **Hosted UI settings**:
   - **Allowed callback URLs:** Add `https://dev.calwincloud.com`
   - **Allowed sign-out URLs:** Add `https://dev.calwincloud.com`
5. Save changes

**Important:** Without this, OAuth login will fail with "redirect_uri_mismatch" error!

---

## Step 2: Build Your App

```bash
# Install dependencies (if not already done)
yarn install

# Build for production
yarn build
```

This creates optimized files in the `dist/` folder.

### What happens during build:
- ✅ Vite reads `.env.production` file
- ✅ Sets `VITE_COGNITO_REDIRECT_URI=https://dev.calwincloud.com`
- ✅ Code is minified and optimized
- ✅ Assets are hashed for cache busting
- ✅ Production CSP policy is applied (no 'unsafe-inline' for scripts)

---

## Step 3: Test Build Locally (Optional but Recommended)

```bash
# Preview the production build locally
yarn preview
```

This serves the `dist/` folder at `http://localhost:4173`

**Note:** OAuth won't work here because Cognito only allows `https://dev.calwincloud.com`, but you can verify:
- ✅ App loads without errors
- ✅ Assets load correctly
- ✅ No console errors (except OAuth)

---

## Step 4: CloudFront + S3 Setup

### A. Create S3 Bucket

1. Bucket name: `dev-calwincloud-com` (or similar)
2. **Block all public access:** ✅ Enabled (CloudFront will access it)
3. No static website hosting needed

### B. Upload Build Files

Upload contents of `dist/` folder to S3:

```bash
# Using AWS CLI (if you have it configured)
aws s3 sync dist/ s3://your-bucket-name/ --delete
```

Or use AWS Console:
- Upload all files from `dist/` folder
- Make sure folder structure is preserved

### C. CloudFront Distribution

1. **Origin Settings:**
   - **Origin Domain:** Your S3 bucket
   - **Origin Access:** Origin Access Control (OAC) - recommended
   - Or use Legacy Origin Access Identity (OAI)

2. **Default Cache Behavior:**
   - **Viewer Protocol Policy:** Redirect HTTP to HTTPS
   - **Allowed HTTP Methods:** GET, HEAD, OPTIONS
   - **Cache Policy:** CachingOptimized (recommended for SPA)
   - **Origin Request Policy:** None needed

3. **Distribution Settings:**
   - **Alternate Domain Names (CNAMEs):** `dev.calwincloud.com`
   - **SSL Certificate:** Request or import certificate for `dev.calwincloud.com`
   - **Default Root Object:** `index.html`

4. **Error Pages (IMPORTANT for SPA!):**
   
   Add custom error response:
   - **HTTP Error Code:** 403 (Forbidden) and 404 (Not Found)
   - **Customize Error Response:** Yes
   - **Response Page Path:** `/index.html`
   - **HTTP Response Code:** 200 (OK)
   
   This ensures React Router works correctly (all routes return index.html)

---

## Step 5: Add Security Headers via Lambda@Edge

CloudFront doesn't support response headers directly (in older setups), so use Lambda@Edge or CloudFront Functions:

### Option A: CloudFront Functions (Simpler, Recommended)

Create a CloudFront Function:

```javascript
function handler(event) {
    var response = event.response;
    var headers = response.headers;

    // CSP Header
    headers['content-security-policy'] = { 
        value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://cdn3.devexpress.com; img-src 'self' data: https:; font-src 'self' data: https://cdn3.devexpress.com; connect-src 'self' https://adminapi-dev.calwincloud.com https://auth.calwincloud.com https://calwincloud.auth.eu-north-1.amazoncognito.com https://calwinmedia.calwincloud.com https://calwinmedia-test.calwincloud.com https://calwinmedia-dev.calwincloud.com https://dev.calwincloud.com; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://auth.calwincloud.com https://calwincloud.auth.eu-north-1.amazoncognito.com; upgrade-insecure-requests;" 
    };

    // Additional Security Headers
    headers['x-content-type-options'] = { value: 'nosniff' };
    headers['x-frame-options'] = { value: 'SAMEORIGIN' };
    headers['x-xss-protection'] = { value: '1; mode=block' };
    headers['referrer-policy'] = { value: 'strict-origin-when-cross-origin' };
    headers['permissions-policy'] = { value: 'geolocation=(), microphone=(), camera=()' };

    return response;
}
```

**Attach to CloudFront:**
1. Go to **CloudFront** → **Functions**
2. Create function → Paste code above
3. Publish function
4. Associate with distribution (Viewer Response event)

### Option B: Lambda@Edge (More Powerful)

See `CSP_CONFIGURATION.md` for full Lambda@Edge setup.

---

## Step 6: DNS Configuration

Point your domain to CloudFront:

1. Go to your DNS provider (Route 53, Cloudflare, etc.)
2. Add/Update record:
   - **Type:** A (Alias) or CNAME
   - **Name:** `dev`
   - **Value:** Your CloudFront distribution domain (e.g., `d1234abcd.cloudfront.net`)
   - **TTL:** 300 (5 minutes)

**If using Route 53:**
- Use **Alias** record type
- Select your CloudFront distribution from dropdown

---

## Step 7: Verify Deployment

1. **Wait for DNS propagation** (1-10 minutes usually)

2. **Test URL:** `https://dev.calwincloud.com`

3. **Check Security Headers:**
   ```bash
   curl -I https://dev.calwincloud.com
   ```
   Should see `Content-Security-Policy` header

4. **Test OAuth Flow:**
   - Click "Logg inn via Cognito"
   - Should redirect to Cognito
   - After login, should redirect back to `https://dev.calwincloud.com`
   - Should load installations

5. **Check Console for Errors:**
   - Open DevTools (F12)
   - Check Console tab
   - Should see no CSP violations or errors

---

## Step 8: Deployment Checklist

Before going live:

- [ ] Cognito callback URLs updated with `https://dev.calwincloud.com`
- [ ] `.env.production` has correct production URL
- [ ] Build completed successfully (`yarn build`)
- [ ] Files uploaded to S3
- [ ] CloudFront distribution created
- [ ] SSL certificate attached to CloudFront
- [ ] Custom domain (CNAME) configured
- [ ] Error pages configured (403/404 → index.html)
- [ ] Security headers added (Lambda@Edge or CloudFront Function)
- [ ] DNS record points to CloudFront
- [ ] Test OAuth login flow
- [ ] Test API calls work
- [ ] Test installation launching works

---

## Automated Deployment Script (Optional)

Create `scripts/deploy.sh`:

```bash
#!/bin/bash

# Build the app
echo "Building app..."
yarn build

# Sync to S3 (replace with your bucket name)
echo "Uploading to S3..."
aws s3 sync dist/ s3://dev-calwincloud-com/ --delete

# Invalidate CloudFront cache (replace with your distribution ID)
echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"

echo "Deployment complete!"
```

Make it executable:
```bash
chmod +x scripts/deploy.sh
```

Run deployment:
```bash
./scripts/deploy.sh
```

---

## Common Issues & Solutions

### Issue: "redirect_uri_mismatch" error

**Cause:** Cognito doesn't have your production URL in callback URLs  
**Fix:** Add `https://dev.calwincloud.com` to Cognito allowed callback URLs

### Issue: React Router 404 errors (routes don't work)

**Cause:** CloudFront returns 404 for routes like `/installation-launcher`  
**Fix:** Configure CloudFront error pages (403/404 → index.html with 200 status)

### Issue: OAuth callback returns to localhost

**Cause:** Wrong `COGNITO_REDIRECT_URI` in build  
**Fix:** Check `.env.production` has correct URL, rebuild

### Issue: API calls fail with CORS errors

**Cause:** Backend not allowing `https://dev.calwincloud.com`  
**Fix:** Add domain to backend CORS allowed origins

### Issue: Assets load from wrong domain

**Cause:** Vite base path not set  
**Fix:** In `vite.config.ts`, ensure `base: '/'` (default is fine)

### Issue: CSP headers not appearing

**Cause:** Lambda@Edge or CloudFront Function not attached  
**Fix:** Verify function is associated with distribution

---

## Updating After Deployment

When you make changes:

```bash
# 1. Build new version
yarn build

# 2. Upload to S3
aws s3 sync dist/ s3://your-bucket-name/ --delete

# 3. Invalidate CloudFront cache (force refresh)
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

**Note:** CloudFront cache invalidation may take 5-15 minutes to propagate globally.

---

## Performance Optimization

### Enable Compression

In CloudFront:
- **Compress Objects Automatically:** Yes (enable Brotli + Gzip)

### Cache Settings

Recommended cache policy for SPA:
- **HTML files:** Cache for 5 minutes (`Cache-Control: max-age=300`)
- **JS/CSS files:** Cache for 1 year (Vite auto-hashes these)
- **Images:** Cache for 1 week

CloudFront's **CachingOptimized** policy handles this well.

---

## Monitoring

### CloudFront Metrics

Monitor in AWS Console:
- **Requests:** Total requests to your distribution
- **Data Transfer:** Bandwidth usage
- **Error Rate:** 4xx and 5xx errors
- **Cache Hit Ratio:** Higher is better (fewer origin requests)

### Set Up Alarms

Create CloudWatch alarms for:
- High 4xx error rate (might indicate routing issues)
- High 5xx error rate (might indicate origin issues)
- Low cache hit ratio (might need cache optimization)

---

## Cost Optimization

### CloudFront Pricing (Approximate)

- **Data Transfer Out:** ~$0.085/GB (first 10 TB)
- **HTTP/HTTPS Requests:** ~$0.0075/10,000 requests
- **Invalidations:** First 1,000 paths/month free

**Estimate for small app:**
- 10,000 users/month
- 1MB per session
- ~$1-5/month

### S3 Pricing

- **Storage:** ~$0.023/GB/month
- **Requests:** Minimal (CloudFront caches most requests)

**Estimate:** <$1/month for typical SPA

---

## Security Best Practices

✅ **Already Implemented:**
- HTTPS only (CloudFront enforces this)
- CSP headers (via Lambda@Edge/CloudFront Function)
- Additional security headers (X-Frame-Options, etc.)
- Cognito authentication

🔄 **Additional Recommendations:**
- Enable AWS CloudTrail (audit log access to S3/CloudFront)
- Enable CloudFront access logs (S3 bucket for logs)
- Set up AWS WAF (Web Application Firewall) if needed
- Regular security audits

---

## Summary

Your deployment flow:
1. ✅ Update Cognito callback URLs
2. ✅ Configure `.env.production`
3. ✅ Build: `yarn build`
4. ✅ Upload `dist/` to S3
5. ✅ Configure CloudFront
6. ✅ Add security headers (Lambda@Edge)
7. ✅ Point DNS to CloudFront
8. ✅ Test and verify

**Production URL:** `https://dev.calwincloud.com`  
**Cognito Redirects:** Configured  
**Security:** CSP + HTTPS  
**Performance:** CloudFront CDN  

You're ready to deploy! 🚀
