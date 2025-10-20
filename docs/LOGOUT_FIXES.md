# Logout Issues and Fixes

## Problem Summary

After deploying to production, two issues were identified:

1. **Logout Re-Authentication Loop**: User clicks logout → gets logged out → immediately logs back in automatically
2. **User Email Not Displayed**: Top bar shows "Bruker" instead of user's email address

---

## Issue 1: Logout Re-Authentication Loop

### Root Cause

The backend's `Logout` endpoint builds a Cognito logout URL that redirects back to the app WITHOUT the `?logout=true` parameter. This causes:

1. User clicks "Logg ut"
2. Backend clears cookies
3. Frontend redirects to Cognito logout URL
4. Cognito clears its session and redirects back to: `https://dev.calwincloud.com/`
5. Frontend `useCognitoAuth` hook runs on mount
6. Frontend doesn't see `?logout=true` parameter
7. Frontend checks auth status via `/Me` endpoint
8. Backend returns 401 (not authenticated) - correct!
9. Frontend sees "not authenticated" → triggers auto-login
10. **User gets logged back in immediately!**

### Solution: Backend Changes Required

**File**: `CwAuthController.cs` (or wherever your Logout endpoint is)

**Current Code** (assumed):
```csharp
[HttpPost("Logout")]
public IActionResult Logout()
{
    // Clear cookies
    Response.Cookies.Delete("access_token");
    Response.Cookies.Delete("id_token");
    Response.Cookies.Delete("refresh_token");
    
    // Build Cognito logout URL
    var logoutUriBase = "https://dev.calwincloud.com"; // Production
    var logoutUrl = $"{_cognitoDomain}/logout?client_id={_cognitoClientId}&logout_uri={Uri.EscapeDataString(logoutUriBase)}";
    
    return Ok(new { logoutUrl });
}
```

**Fixed Code** (ADD `?logout=true` to redirect URI):
```csharp
[HttpPost("Logout")]
[ProducesResponseType(typeof(LogoutResponseDTO), StatusCodes.Status200OK)]
public ActionResult<LogoutResponseDTO> Logout()
{
    // Clear cookies
    Response.Cookies.Delete("access_token", new CookieOptions
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.None,
        Path = "/"
    });
    Response.Cookies.Delete("id_token", new CookieOptions
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSite.None,
        Path = "/"
    });
    Response.Cookies.Delete("refresh_token", new CookieOptions
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSite.None,
        Path = "/"
    });
    
    _logger.LogInformation("Cleared authentication cookies for logout");
    
    // Build Cognito logout URL with ?logout=true parameter
    var logoutUriBase = "https://dev.calwincloud.com";
    var logoutUriWithFlag = $"{logoutUriBase}?logout=true"; // ⭐ ADD THIS!
    
    var logoutUrl = $"{_cognitoDomain}/logout?client_id={_cognitoClientId}&logout_uri={Uri.EscapeDataString(logoutUriWithFlag)}";
    
    _logger.LogInformation("Logout URL: {LogoutUrl}", logoutUrl);
    
    return Ok(new LogoutResponseDTO
    {
        LogoutUrl = logoutUrl
    });
}
```

**Key Changes**:
1. ✅ Added `?logout=true` to the redirect URI: `var logoutUriWithFlag = $"{logoutUriBase}?logout=true";`
2. ✅ Changed return type to `ActionResult<LogoutResponseDTO>` for type safety
3. ✅ Added explicit cookie deletion with proper options (especially `Path = "/"`)
4. ✅ Return `LogoutResponseDTO` object instead of anonymous object

### Frontend Changes (Already Applied)

**File**: `src/hooks/useCognitoAuth.ts`

Updated to check BOTH query parameters AND hash parameters for `logout=true` flag:

```typescript
// ⭐ Check if returning from logout (check both query param and hash)
const urlParams = new URLSearchParams(window.location.search);
const hashParams = new URLSearchParams(window.location.hash.slice(1));

if (urlParams.get('logout') === 'true' || hashParams.get('logout') === 'true') {
  logDebug('🚪 Returned from Cognito logout - staying logged out');
  // Clear the logout flag from URL
  window.history.replaceState({}, document.title, window.location.pathname);
  // Set state to logged out
  setState({
    isAuthenticated: false,
    isLoading: false,
    userInfo: null,
    error: null,
  });
  return; // ⭐ Don't check auth status!
}
```

---

## Issue 2: User Email Not Displayed

### Root Cause

The user email is correctly fetched from the backend's `/Me` endpoint, but it might be:
1. Not being returned properly by the backend
2. Being returned as `null` or empty string
3. Email claim missing from the JWT token

### Debugging Steps

1. **Check backend `/Me` endpoint response**:
   - Open DevTools → Network tab
   - Filter for `Me` request
   - Check response JSON: Does it have `email` property?
   - Example expected response:
     ```json
     {
       "username": "ola@example.com",
       "email": "ola@example.com",
       "groups": ["Developers"],
       "userId": "12345-67890-abcdef",
       "isAuthenticated": true
     }
     ```

2. **Check JWT token claims**:
   - Backend should extract email from JWT `id_token`
   - Check if `email` claim exists in the token
   - Might need to request `email` scope explicitly

3. **Check Cognito App Client Settings**:
   - AWS Cognito → App clients → Your app client
   - **Allowed OAuth Scopes**: Ensure `email` is checked ✅
   - **Readable attributes**: Ensure `email` is checked ✅

### Backend Fix (If Needed)

**File**: `CwAuthController.cs` (or wherever your `/Me` endpoint is)

Ensure the backend reads the `email` claim correctly:

```csharp
[HttpGet("Me")]
[Authorize]
[ProducesResponseType(typeof(CurrentUserResponseDTO), StatusCodes.Status200OK)]
public ActionResult<CurrentUserResponseDTO> GetCurrentUser()
{
    var username = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                   ?? User.FindFirst("cognito:username")?.Value
                   ?? User.FindFirst("username")?.Value
                   ?? "unknown";
    
    // ⭐ Try multiple claim types for email
    var email = User.FindFirst(ClaimTypes.Email)?.Value
                ?? User.FindFirst("email")?.Value
                ?? User.FindFirst("cognito:email")?.Value
                ?? null;
    
    var groups = User.FindAll("cognito:groups")
                    .Select(c => c.Value)
                    .ToList();
    
    var userId = User.FindFirst("sub")?.Value ?? "unknown";
    
    _logger.LogInformation("GetCurrentUser: username={Username}, email={Email}, groups={Groups}", 
        username, email, string.Join(",", groups));
    
    return Ok(new CurrentUserResponseDTO
    {
        Username = username,
        Email = email, // ⭐ Make sure this is populated
        Groups = groups,
        UserId = userId,
        IsAuthenticated = true
    });
}
```

### Frontend Changes (Already Applied)

**File**: `src/App.tsx`

Added a `title` attribute for debugging (hover over "Bruker" to see the email value):

```tsx
<span className="app-user-info" title={userEmail || undefined}>
  {userEmail || 'Bruker'}
</span>
```

This lets you hover over the text to see if `userEmail` has a value but isn't being displayed.

---

## Testing the Fixes

### Test Logout Flow

1. **Login** to the app at `https://dev.calwincloud.com`
2. **Verify** you see your email in the top-right corner (not "Bruker")
3. **Click** "Logg ut" button
4. **Observe**:
   - ✅ Redirected to Cognito logout page
   - ✅ Redirected back to `https://dev.calwincloud.com?logout=true`
   - ✅ Shows login page (NOT automatically logged in)
   - ✅ Console shows: `🚪 Returned from Cognito logout - staying logged out`
5. **Verify** you can login again manually

### Test Email Display

1. **Login** to the app
2. **Check** top-right corner shows your email address
3. **Open DevTools** → Console
4. **Search** for: `User is authenticated:` log message
5. **Verify** it shows your email: `✅ User is authenticated: your-email@example.com`
6. **Open DevTools** → Network tab
7. **Find** the `/Me` request
8. **Check** response has `"email": "your-email@example.com"`

If email is still "Bruker":
- Hover over "Bruker" text to see the tooltip (shows actual `userEmail` value)
- Check Network tab → `/Me` response → Is `email` field `null`?
- If `null`, backend needs to be fixed to extract email claim from JWT

---

## AWS Cognito Configuration

Ensure your Cognito App Client has the correct settings:

### App Client Settings

1. **AWS Console** → Cognito → User Pools → Your pool → App clients → Your app
2. **Allowed OAuth Flows**: ✅ Authorization code grant
3. **Allowed OAuth Scopes**: 
   - ✅ `openid`
   - ✅ `email`
   - ✅ `phone` (if needed)
   - ✅ `profile` (optional)
4. **Allowed callback URLs**: 
   - `http://localhost:5173` (development)
   - `https://dev.calwincloud.com` (production)
5. **Allowed sign-out URLs**:
   - `http://localhost:5173?logout=true` (development)
   - `https://dev.calwincloud.com?logout=true` (production) ⭐ **ADD THIS!**
6. **Readable attributes**:
   - ✅ `email`
   - ✅ `email_verified`
   - ✅ `name` (if using profile)
   - ✅ `preferred_username` (if needed)

### Important Notes

- The `logout_uri` parameter in Cognito logout URL **MUST** match one of the "Allowed sign-out URLs"
- If it doesn't match, Cognito will reject the logout and show an error
- Always URL-encode the `logout_uri` parameter: `Uri.EscapeDataString(logoutUriWithFlag)`

---

## Summary of Changes

### Backend (REQUIRED)

1. ✅ Update `Logout` endpoint to include `?logout=true` in redirect URI
2. ✅ Change return type to `ActionResult<LogoutResponseDTO>`
3. ✅ Add explicit cookie deletion with proper options
4. ✅ Verify `/Me` endpoint returns `email` field correctly

### Frontend (COMPLETED)

1. ✅ Updated `useCognitoAuth.ts` to check both query and hash parameters for `logout=true`
2. ✅ Added tooltip to email display for debugging

### AWS Cognito (REQUIRED)

1. ✅ Add `https://dev.calwincloud.com?logout=true` to "Allowed sign-out URLs"
2. ✅ Verify `email` is in "Allowed OAuth Scopes"
3. ✅ Verify `email` is in "Readable attributes"

---

## Quick Reference: Backend Code Changes

```csharp
// ❌ OLD (causes re-login loop)
var logoutUriBase = "https://dev.calwincloud.com";
var logoutUrl = $"{_cognitoDomain}/logout?client_id={_cognitoClientId}&logout_uri={Uri.EscapeDataString(logoutUriBase)}";

// ✅ NEW (prevents re-login)
var logoutUriBase = "https://dev.calwincloud.com";
var logoutUriWithFlag = $"{logoutUriBase}?logout=true"; // ADD THIS!
var logoutUrl = $"{_cognitoDomain}/logout?client_id={_cognitoClientId}&logout_uri={Uri.EscapeDataString(logoutUriWithFlag)}";
```

---

## Environment Variables

Make sure these are set correctly:

**Backend** (`appsettings.json` or environment variables):
```json
{
  "Cognito": {
    "Domain": "https://auth.calwincloud.com",
    "ClientId": "656e5ues1tvo5tk9e00u5f0ft3",
    "LogoutRedirectUri": "https://dev.calwincloud.com?logout=true"
  }
}
```

**Frontend** (`.env.production`):
```env
VITE_COGNITO_DOMAIN=https://auth.calwincloud.com
VITE_COGNITO_CLIENT_ID=656e5ues1tvo5tk9e00u5f0ft3
VITE_COGNITO_REDIRECT_URI=https://dev.calwincloud.com
```

---

## Need Help?

If issues persist after these changes:

1. Share the **backend Logout endpoint code**
2. Share the **backend /Me endpoint code**
3. Share the **Network tab screenshot** of `/Me` response
4. Share the **Console logs** when clicking logout
5. Share **Cognito App Client settings** screenshot (with sensitive data redacted)

I can help you debug further! 🎯
