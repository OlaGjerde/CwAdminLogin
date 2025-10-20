# Troubleshooting: CloudFront AccessDenied Error

## Error: AccessDenied on https://dev.calwincloud.com/

This error typically occurs when CloudFront can't access your S3 bucket due to permission issues.

---

## Common Causes & Solutions

### 1. ✅ S3 Bucket Policy Missing or Incorrect

CloudFront needs permission to read from your S3 bucket. You need a bucket policy that allows CloudFront to access the objects.

#### Solution: Update S3 Bucket Policy

Go to **S3 Console** → Your Bucket → **Permissions** tab → **Bucket Policy**

**For Origin Access Control (OAC) - RECOMMENDED:**

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowCloudFrontServicePrincipal",
            "Effect": "Allow",
            "Principal": {
                "Service": "cloudfront.amazonaws.com"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*",
            "Condition": {
                "StringEquals": {
                    "AWS:SourceArn": "arn:aws:cloudfront::YOUR-ACCOUNT-ID:distribution/YOUR-DISTRIBUTION-ID"
                }
            }
        }
    ]
}
```

**Replace:**
- `YOUR-BUCKET-NAME` - Your S3 bucket name (e.g., `dev-calwincloud-frontend`)
- `YOUR-ACCOUNT-ID` - Your AWS account ID (12 digits)
- `YOUR-DISTRIBUTION-ID` - Your CloudFront distribution ID (e.g., `E1ABCDEFGHIJKL`)

---

### 2. ✅ Origin Access Control (OAC) Not Configured

CloudFront might not be configured to use Origin Access Control to access your S3 bucket.

#### Solution: Configure Origin Access Control

**Step 1: Create OAC (if not already created)**
1. Go to **CloudFront Console**
2. Click **Origin access** in the left menu
3. Click **Create origin access control**
4. Name: `dev-calwincloud-oac`
5. Description: "OAC for dev.calwincloud.com"
6. Signing behavior: **Sign requests (recommended)**
7. Click **Create**

**Step 2: Update CloudFront Distribution**
1. Go to your CloudFront distribution
2. Click **Origins** tab
3. Select your S3 origin
4. Click **Edit**
5. Scroll to **Origin access**
6. Select **Origin access control settings (recommended)**
7. Choose your OAC from dropdown (or create new)
8. Click **Save changes**

**Step 3: Copy the Bucket Policy**
After saving, CloudFront will show a **blue banner** with:
> "Policy update required: The S3 bucket policy needs to be updated. Copy the policy below and add it to the bucket."

Click **Copy policy** and paste it into your S3 bucket policy!

---

### 3. ✅ S3 Block Public Access Settings

Even with a bucket policy, if "Block Public Access" settings are too restrictive, it can cause issues.

#### Solution: Verify Block Public Access Settings

Go to **S3 Console** → Your Bucket → **Permissions** tab → **Block public access**

**Recommended settings for CloudFront:**
```
Block all public access: ✅ ON (safe - CloudFront uses OAC, not public access)
  ├─ Block public access to buckets and objects granted through new access control lists (ACLs): ✅ ON
  ├─ Block public access to buckets and objects granted through any access control lists (ACLs): ✅ ON
  ├─ Block public access to buckets and objects granted through new public bucket or access point policies: ✅ ON
  └─ Block public access to buckets and objects granted through any public bucket or access point policies: ✅ ON
```

This is **correct** because CloudFront uses OAC (not public access) to read from S3.

---

### 4. ✅ CloudFront Default Root Object Not Set

CloudFront might not know to serve `index.html` when accessing the root URL.

#### Solution: Set Default Root Object

1. Go to **CloudFront Console** → Your Distribution
2. Click **General** tab
3. Click **Edit**
4. Scroll to **Default root object**
5. Enter: `index.html`
6. Click **Save changes**

---

### 5. ✅ Custom Error Pages for SPA Not Configured

Your React/Vite app is a Single Page Application (SPA). CloudFront needs to redirect 404/403 errors to `index.html`.

#### Solution: Configure Custom Error Pages

1. Go to **CloudFront Console** → Your Distribution
2. Click **Error pages** tab
3. Click **Create custom error response**

**Add TWO error responses:**

**Error Response 1 (404):**
- HTTP error code: `404: Not Found`
- Customize error response: **Yes**
- Response page path: `/index.html`
- HTTP response code: `200: OK`
- Click **Create custom error response**

**Error Response 2 (403):**
- HTTP error code: `403: Forbidden`
- Customize error response: **Yes**
- Response page path: `/index.html`
- HTTP response code: `200: OK`
- Click **Create custom error response**

This ensures SPA routing works correctly (e.g., `/login`, `/dashboard` all serve `index.html`).

---

### 6. ✅ CloudFront Cache Needs Invalidation

Old cached errors might still be served even after fixing permissions.

#### Solution: Create Cache Invalidation

1. Go to **CloudFront Console** → Your Distribution
2. Click **Invalidations** tab
3. Click **Create invalidation**
4. Object paths: `/*`
5. Click **Create invalidation**

Wait 1-2 minutes for invalidation to complete, then test again.

---

### 7. ✅ Files Not Uploaded to S3

The S3 bucket might be empty or files in wrong location.

#### Solution: Verify Files in S3

1. Go to **S3 Console** → Your Bucket
2. Check for files:
   - `index.html` (must be at root)
   - `assets/` folder (with JS/CSS files)
   - Other static files

If files are missing:
```powershell
# Re-run deployment
cd "c:\Users\OlaGjerde\CodeRoot\DevExtreme 25.1\awsManageLogin\awslogin"
yarn deploy
```

Or manually:
```powershell
# Build
yarn build

# Upload to S3
aws s3 sync dist/ s3://YOUR-BUCKET-NAME/ --delete
```

---

## Step-by-Step Debugging

### Step 1: Check S3 Bucket Directly

Try accessing S3 bucket directly (won't work if Block Public Access is on, but good test):

```
https://YOUR-BUCKET-NAME.s3.YOUR-REGION.amazonaws.com/index.html
```

**Expected Result:**
- If you get `AccessDenied` → Bucket policy issue
- If you get the file → CloudFront OAC issue
- If you get `NoSuchKey` → Files not uploaded

### Step 2: Check CloudFront Distribution Settings

1. Go to **CloudFront Console** → Your Distribution
2. Verify:
   - **Status**: Deployed ✅
   - **Distribution domain name**: Matches your Route 53 record
   - **Origin**: Points to your S3 bucket
   - **Default root object**: `index.html`
   - **Origin access**: Origin access control settings

### Step 3: Check CloudFront Error Logs

1. Go to **CloudFront Console** → Your Distribution
2. Click **Monitoring** tab
3. Check **Metrics** for errors
4. Look at **Popular objects** - is `/` being requested?

---

## Quick Fix Checklist

Run through this checklist in order:

```
□ Step 1: S3 bucket has files (index.html, assets/)
□ Step 2: S3 bucket policy updated with CloudFront OAC policy
□ Step 3: CloudFront origin uses Origin Access Control (OAC)
□ Step 4: CloudFront default root object set to "index.html"
□ Step 5: CloudFront custom error pages configured (403→200, 404→200)
□ Step 6: CloudFront cache invalidated (/* pattern)
□ Step 7: Wait 2-3 minutes for CloudFront to update
□ Step 8: Test https://dev.calwincloud.com/
```

---

## Example: Complete S3 Bucket Policy

Here's a complete example (replace the placeholders):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowCloudFrontServicePrincipal",
            "Effect": "Allow",
            "Principal": {
                "Service": "cloudfront.amazonaws.com"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::dev-calwincloud-frontend/*",
            "Condition": {
                "StringEquals": {
                    "AWS:SourceArn": "arn:aws:cloudfront::123456789012:distribution/E1ABCDEFGHIJKL"
                }
            }
        }
    ]
}
```

**How to find your values:**
- **Bucket name**: Check S3 console
- **Account ID**: Click your username (top right) → Account ID
- **Distribution ID**: CloudFront console → Your distribution → ID column

---

## Most Common Fix (90% of cases)

The issue is usually **missing bucket policy**. Follow these exact steps:

1. **Go to CloudFront** → Your Distribution → **Origins** tab
2. **Select S3 origin** → Click **Edit**
3. **Origin access**: Select "Origin access control settings"
4. **Choose or create OAC**
5. **Save** - you'll see a blue banner saying "Policy update required"
6. **Click "Copy policy"** in the banner
7. **Go to S3** → Your Bucket → **Permissions** → **Bucket policy**
8. **Paste the policy** → **Save**
9. **Wait 2 minutes**
10. **Test** https://dev.calwincloud.com/

---

## Still Not Working?

If you've tried everything above, please share:
1. Your S3 bucket name
2. Your CloudFront distribution ID
3. Screenshot of CloudFront origin settings
4. Your current S3 bucket policy (redact account ID if sensitive)

And I can help you debug further! 🎯
