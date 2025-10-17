# Quick Deployment Checklist for dev.calwincloud.com

## Before Building

- [ ] **Update AWS Cognito:**
  - Add `https://dev.calwincloud.com` to **Allowed callback URLs**
  - Add `https://dev.calwincloud.com` to **Allowed sign-out URLs**
  - Location: AWS Console → Cognito → User Pools → App Client settings

- [ ] **Verify `.env.production` file exists** with:
  ```
  VITE_COGNITO_REDIRECT_URI=https://dev.calwincloud.com
  ```

## Build & Test

- [ ] **Build the app:**
  ```bash
  yarn build
  ```

- [ ] **Verify build succeeded:**
  - Check that `dist/` folder was created
  - Check that `dist/index.html` exists

- [ ] **(Optional) Test locally:**
  ```bash
  yarn preview
  ```
  - App should load at `http://localhost:4173`
  - OAuth won't work (wrong domain) but check for errors

## CloudFront Setup

- [ ] **S3 Bucket:**
  - Created with block public access
  - Files from `dist/` uploaded

- [ ] **CloudFront Distribution:**
  - Origin: S3 bucket
  - SSL Certificate: For `dev.calwincloud.com`
  - CNAME: `dev.calwincloud.com`
  - Default Root Object: `index.html`

- [ ] **Error Pages (Critical!):**
  - 403 → `/index.html` (200 response)
  - 404 → `/index.html` (200 response)

- [ ] **Security Headers:**
  - CloudFront Function OR Lambda@Edge configured
  - CSP headers added (see `CLOUDFRONT_DEPLOYMENT.md`)

## DNS

- [ ] **DNS Record Created:**
  - Type: A (Alias) or CNAME
  - Name: `dev`
  - Points to: CloudFront distribution domain

- [ ] **Wait for DNS propagation:** (1-10 minutes)

## Verification

- [ ] **Test URL:** `https://dev.calwincloud.com` loads

- [ ] **Check Security Headers:**
  ```bash
  curl -I https://dev.calwincloud.com | grep -i "content-security-policy"
  ```

- [ ] **Test OAuth Login:**
  - Click "Logg inn via Cognito"
  - Redirects to Cognito ✓
  - Logs in successfully ✓
  - Redirects back to `https://dev.calwincloud.com` ✓
  - Loads installations ✓

- [ ] **Test Features:**
  - Installation Launcher opens ✓
  - Can launch desktop apps ✓
  - No console errors ✓

## Troubleshooting

If OAuth fails:
- Check Cognito callback URLs include `https://dev.calwincloud.com`
- Check browser console for redirect URI errors
- Verify `.env.production` was used in build

If routes don't work (404 errors):
- Check CloudFront error pages configured
- Both 403 and 404 should return `/index.html` with 200 status

If CSP errors:
- Check CloudFront Function/Lambda@Edge is attached
- Verify headers in browser DevTools → Network tab

## Done! 🎉

Your app is now live at: **https://dev.calwincloud.com**

---

## Quick Update Workflow

When making changes:

```bash
# 1. Make your code changes
# 2. Build
yarn build

# 3. Upload to S3 (replace bucket name)
aws s3 sync dist/ s3://your-bucket-name/ --delete

# 4. Invalidate CloudFront cache (replace distribution ID)
aws cloudfront create-invalidation --distribution-id XXXXX --paths "/*"

# 5. Wait 1-2 minutes, then refresh https://dev.calwincloud.com
```
