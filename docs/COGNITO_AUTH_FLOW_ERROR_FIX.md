# Troubleshooting: "Auth flow not enabled for this client"

## Error Details

```json
{
    "title": "Authentication error",
    "status": 400,
    "detail": "Service error: Auth flow not enabled for this client"
}
```

**This error comes from AWS Cognito, not your code!** ❌

---

## Root Cause

Your new `ExchangeCodeForTokens` method uses the **OAuth2 Authorization Code flow** with PKCE, but your Cognito App Client is not configured to allow this flow.

### What's Happening:
1. Frontend redirects to Cognito Hosted UI ✅
2. User logs in successfully ✅
3. Cognito redirects back with authorization `code` ✅
4. Frontend calls `/api/auth/ExchangeCodeForTokens` ✅
5. Backend calls Cognito's `/oauth2/token` endpoint ✅
6. **Cognito rejects the request** ❌ - App Client doesn't allow this auth flow

---

## Solution: Configure Cognito App Client

You need to enable the correct OAuth flows in your Cognito App Client settings.

### Step 1: Open AWS Console

1. Go to **AWS Console** → **Amazon Cognito**
2. Select your **User Pool** (the one with ID from your config)
3. Click **App integration** tab
4. Find your **App client** (with ClientId from your config)
5. Click **Edit** on the App client

### Step 2: Enable OAuth Flows

In the **App client settings**, ensure these are enabled:

#### ✅ OAuth 2.0 Grant Types (Required):
- [x] **Authorization code grant**
- [ ] Implicit grant (NOT needed for your setup)
- [x] **Refresh token** (optional but recommended)

#### ✅ OpenID Connect Scopes (Required):
- [x] **openid**
- [x] **email**
- [x] **profile**
- [x] **aws.cognito.signin.user.admin** (if using)

### Step 3: Verify Allowed OAuth Flows

Make sure under **Authentication flows** or **OAuth grant types**:

```
✅ Authorization code grant
✅ Refresh token (optional)
❌ Implicit grant (NOT needed)
❌ Client credentials (NOT needed)
```

### Step 4: Check App Client Type

Your app client should be configured as:
- **App client type**: Public client (or Confidential if using client_secret)
- **Authentication flows**: 
  - ✅ `ALLOW_USER_SRP_AUTH` (for direct auth)
  - ✅ `ALLOW_REFRESH_TOKEN_AUTH` (for token refresh)
  - ✅ `ALLOW_CUSTOM_AUTH` (optional)
  - ❌ `ALLOW_USER_PASSWORD_AUTH` (only if using direct password auth)

---

## AWS Console Path (Detailed)

### Old AWS Console UI:
```
Amazon Cognito 
→ Manage User Pools 
→ [Your Pool] 
→ App clients 
→ [Your App Client] 
→ Show Details
→ "Allowed OAuth Flows" section
   ✅ Authorization code grant
   ✅ Implicit grant (can be unchecked)
→ "Allowed OAuth Scopes" section
   ✅ openid
   ✅ email  
   ✅ profile
→ Save changes
```

### New AWS Console UI (2024+):
```
Amazon Cognito
→ User pools
→ [Your Pool Name]
→ App integration (tab)
→ App client list
→ [Your App Client Name]
→ Edit
→ Scroll to "Authentication flows"
   ✅ Authorization code grant
   ✅ Refresh token
→ Scroll to "OpenID Connect scopes"
   ✅ openid
   ✅ email
   ✅ profile
→ Save changes
```

---

## Verification After Changes

### 1. Test the OAuth Flow

After updating Cognito settings, test your authentication:

```bash
# Frontend should redirect to:
https://auth.calwincloud.com/login?response_type=code&client_id={YOUR_CLIENT_ID}&redirect_uri={YOUR_REDIRECT}&scope=openid+email+profile

# After login, Cognito redirects back with code:
https://dev.calwincloud.com/?code=abc123...

# Frontend calls your backend:
POST /api/auth/ExchangeCodeForTokens
{
  "code": "abc123...",
  "redirectUri": "https://dev.calwincloud.com",
  "codeVerifier": "xyz789..."
}

# Backend should now succeed! ✅
```

### 2. Check Backend Logs

If still failing, check what Cognito returns:

```csharp
// In your ExchangeCodeForTokens method, add logging:
var responseContent = await response.Content.ReadAsStringAsync();
Console.WriteLine($"Cognito response: {responseContent}");
```

Common errors:
- `"invalid_grant"` - Code expired or already used
- `"invalid_client"` - Client ID mismatch
- `"unauthorized_client"` - **Auth flow not enabled** ← Your current issue

---

## Common Mistakes

### ❌ Mistake 1: Wrong App Client
- **Problem**: Multiple app clients in same pool, editing wrong one
- **Solution**: Verify ClientId in your `appsettings.json` matches the one you're editing

### ❌ Mistake 2: Using Confidential Client without Secret
- **Problem**: App client is "Confidential" but you're not sending `client_secret`
- **Solution**: 
  - Option A: Change to "Public client" (recommended for SPA)
  - Option B: Add client_secret to your config and backend code

### ❌ Mistake 3: Implicit Flow Instead of Code Flow
- **Problem**: Old setup used Implicit flow, new code uses Authorization Code flow
- **Solution**: Enable "Authorization code grant" in Cognito

### ❌ Mistake 4: Missing PKCE Support
- **Problem**: App client doesn't support PKCE
- **Solution**: PKCE is automatically supported with "Authorization code grant" in public clients

---

## Quick Checklist

Use this to verify your Cognito configuration:

```
AWS Cognito App Client Configuration:
□ Authorization code grant - ENABLED
□ OpenID scope - ENABLED
□ Email scope - ENABLED
□ Profile scope - ENABLED
□ Callback URL - Contains https://dev.calwincloud.com
□ Sign out URL - Contains https://dev.calwincloud.com
□ App client type - Public client (or Confidential with secret configured)
□ Domain - Custom domain configured (auth.calwincloud.com)
```

---

## Alternative: Check Via AWS CLI

You can also verify your app client configuration via CLI:

```bash
aws cognito-idp describe-user-pool-client \
  --user-pool-id eu-north-1_k3gT5Cl1V \
  --client-id 656e5ues1tvo5tk9e00u5f0ft3 \
  --region eu-north-1
```

Look for:
```json
{
  "UserPoolClient": {
    "AllowedOAuthFlows": [
      "code"  // ✅ Must include "code"
    ],
    "AllowedOAuthScopes": [
      "openid",
      "email",
      "profile"
    ],
    "AllowedOAuthFlowsUserPoolClient": true  // ✅ Must be true
  }
}
```

---

## Still Not Working?

If the error persists after enabling OAuth flows:

### Check 1: Verify Your Configuration
```csharp
// In appsettings.json, verify:
"AWS": {
  "Cognito": {
    "ClientId": "656e5ues1tvo5tk9e00u5f0ft3",  // ← Matches AWS console?
    "PoolId": "eu-north-1_k3gT5Cl1V",         // ← Matches AWS console?
    "Domain": "https://auth.calwincloud.com"   // ← Matches AWS console?
  }
}
```

### Check 2: Try with Different Code
Authorization codes are **single-use** and **expire quickly** (usually 1 minute).

1. Clear browser cookies
2. Start fresh login flow
3. Complete quickly (don't wait)

### Check 3: Check Cognito Domain
```bash
# Should be accessible:
curl https://auth.calwincloud.com/.well-known/openid-configuration
```

---

## Summary

**The Issue**: Cognito App Client doesn't allow "Authorization code grant" OAuth flow

**The Fix**: 
1. Go to AWS Cognito Console
2. Edit your App Client
3. Enable "Authorization code grant"
4. Enable OpenID scopes (openid, email, profile)
5. Save changes
6. Test again

**No code changes needed!** This is purely a Cognito configuration issue. ✅

---

## Need More Help?

If you're still stuck after enabling the OAuth flow, share:
1. Screenshot of your App Client "OAuth 2.0 grant types" settings
2. Screenshot of your App Client "OpenID Connect scopes" settings
3. The full error response from Cognito

I can help you debug further!
