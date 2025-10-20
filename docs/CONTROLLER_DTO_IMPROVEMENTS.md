# Controller DTO and Return Type Improvements

## Summary of Changes Needed

### ✅ Already Using DTOs Correctly:
1. `VerifyEmail` - Uses `VerifyEmailResultDTO` ✅
2. `LoginUser` - Uses `LoginUserRequestDTO` and `LoginUserResponseDTO` ✅
3. `LoginUserVerifyMFA` - Uses request/response DTOs ✅
4. `GetNewToken` - Uses `AuthTokenResponseDTO` ✅
5. `ExchangeCodeForTokens` - Uses `AuthTokenResponseDTO` ✅
6. `GetCurrentUser` - Uses `CurrentUserResponseDTO` ✅

### ❌ Needs DTO:
1. **`Logout`** - Returns anonymous object `new { logoutUrl }`

---

## Required Changes

### 1. Create LogoutResponseDTO ✅

**File: `LogoutResponseDTO.cs`**

```csharp
namespace CwAdmin.Auth.DTO
{
    /// <summary>
    /// Response DTO for logout endpoint
    /// Contains Cognito logout URL for completing the logout flow
    /// </summary>
    public class LogoutResponseDTO
    {
        /// <summary>
        /// Cognito hosted UI logout URL
        /// Frontend should redirect to this URL to complete logout
        /// </summary>
        public string LogoutUrl { get; set; } = string.Empty;
    }
}
```

### 2. Update Logout Method

**Before:**
```csharp
[HttpPost("Logout")]
[ProducesResponseType(StatusCodes.Status200OK)]
public IActionResult Logout()
{
    // ... cookie deletion ...
    
    return Ok(new { logoutUrl });
}
```

**After:**
```csharp
/// <summary>
/// Logs out the current user by clearing authentication cookies and returning Cognito logout URL.
/// Frontend should redirect to the returned URL to complete the Cognito session logout.
/// </summary>
/// <returns>Logout URL for Cognito hosted UI logout</returns>
[HttpPost("Logout")]
[ProducesResponseType(StatusCodes.Status200OK, Type = typeof(LogoutResponseDTO))]
public ActionResult<LogoutResponseDTO> Logout()
{
    Console.WriteLine("Logout endpoint called");

    // Clear all auth cookies
    ClearAuthCookies();
    Console.WriteLine("Cookies deleted");

    // Build complete Cognito logout URL
    var logoutUrl = $"{cognitoDomain}/logout?client_id={ClientId}&logout_uri={Uri.EscapeDataString(logoutUri)}";

    Console.WriteLine($"Logout URI: {logoutUri}");
    Console.WriteLine($"Complete logout URL: {logoutUrl}");

    return Ok(new LogoutResponseDTO { LogoutUrl = logoutUrl });
}
```

---

## Complete Updated Controller Code

Here's the full updated `Logout` method with proper DTO:

```csharp
/// <summary>
/// Logs out the current user by clearing authentication cookies and returning Cognito logout URL.
/// Frontend should redirect to the returned URL to complete the Cognito session logout.
/// </summary>
/// <returns>Logout URL for Cognito hosted UI logout</returns>
[HttpPost("Logout")]
[ProducesResponseType(StatusCodes.Status200OK, Type = typeof(LogoutResponseDTO))]
public ActionResult<LogoutResponseDTO> Logout()
{
    Console.WriteLine("Logout endpoint called");

    // Clear all auth cookies using helper method
    ClearAuthCookies();
    Console.WriteLine("Cookies deleted");

    // Build complete Cognito logout URL
    var logoutUrl = $"{cognitoDomain}/logout?client_id={ClientId}&logout_uri={Uri.EscapeDataString(logoutUri)}";

    Console.WriteLine($"Logout URI: {logoutUri}");
    Console.WriteLine($"Complete logout URL: {logoutUrl}");

    return Ok(new LogoutResponseDTO { LogoutUrl = logoutUrl });
}
```

---

## Frontend Update

The frontend already has the correct interface! Just needs to be updated to match property name:

**File: `src/api/auth.ts`**

**Before:**
```typescript
export interface LogoutResponse {
  success: boolean;
  logoutUrl: string;
}
```

**After:**
```typescript
/**
 * Response DTO for logout endpoint
 * Contains Cognito logout URL for completing the logout flow
 */
export interface LogoutResponseDTO {
  logoutUrl: string;
}

// Alias for backward compatibility
export type LogoutResponse = LogoutResponseDTO;
```

**Update the logout function:**
```typescript
/**
 * Logout - clears auth cookies and returns Cognito logout URL
 * Frontend should redirect to the returned URL
 */
export async function logout(): Promise<LogoutResponseDTO> {
  const response = await axios.post<LogoutResponseDTO>(AUTH_ENDPOINTS.LOGOUT);
  return response.data;
}
```

---

## Additional Improvements

### 1. Use ILogger Instead of Console.WriteLine

**Add ILogger to constructor:**
```csharp
public class CwAuthController(
    IConfiguration _configuration, 
    IHttpClientFactory _httpClientFactory, 
    IAmazonCognitoIdentityProvider _cognitoClient,
    ILogger<CwAuthController> _logger) : ControllerBase
```

**Replace Console.WriteLine:**
```csharp
// Instead of:
Console.WriteLine("Logout endpoint called");

// Use:
_logger.LogInformation("Logout endpoint called");

// Instead of:
Console.WriteLine($"Email from id_token: {email}");

// Use:
_logger.LogDebug("Email from id_token: {Email}", email);
```

### 2. Improve ClearAuthCookies to be DRY

**Current code duplicates cookie options. Better version:**

```csharp
/// <summary>
/// Clears all authentication cookies.
/// </summary>
private void ClearAuthCookies()
{
    var cookieOptions = new CookieOptions
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Lax,
        Path = "/"
    };

    Response.Cookies.Delete("access_token", cookieOptions);
    Response.Cookies.Delete("id_token", cookieOptions);
    Response.Cookies.Delete("refresh_token", cookieOptions);
}
```

Then in `Logout()`:
```csharp
public ActionResult<LogoutResponseDTO> Logout()
{
    _logger.LogInformation("Logout endpoint called");

    // Clear all auth cookies using helper method
    ClearAuthCookies();
    _logger.LogInformation("Authentication cookies cleared");

    // Build complete Cognito logout URL
    var logoutUrl = $"{cognitoDomain}/logout?client_id={ClientId}&logout_uri={Uri.EscapeDataString(logoutUri)}";

    _logger.LogDebug("Logout URL: {LogoutUrl}", logoutUrl);

    return Ok(new LogoutResponseDTO { LogoutUrl = logoutUrl });
}
```

---

## Summary of All DTOs in Controller

| Method | Request DTO | Response DTO | Status |
|--------|------------|--------------|--------|
| `VerifyEmail` | - | `VerifyEmailResultDTO` | ✅ |
| `LoginUser` | `LoginUserRequestDTO` | `LoginUserResponseDTO` | ✅ |
| `LoginUserVerifyMFA` | `LoginUserVerifyMFARequestDTO` | `LoginUserVerifyMFAResponseDTO` | ✅ |
| `GetNewToken` | - | `AuthTokenResponseDTO` | ✅ |
| `ExchangeCodeForTokens` | `CodeExchangeRequestDTO` | `AuthTokenResponseDTO` | ✅ |
| `Logout` | - | `LogoutResponseDTO` | ⏳ **NEEDS UPDATE** |
| `GetCurrentUser` | - | `CurrentUserResponseDTO` | ✅ |

---

## Checklist

### Backend:
- [ ] Create `LogoutResponseDTO.cs`
- [ ] Update `Logout()` method return type to `ActionResult<LogoutResponseDTO>`
- [ ] Update return statement to use DTO: `new LogoutResponseDTO { LogoutUrl = logoutUrl }`
- [ ] Add `[ProducesResponseType(StatusCodes.Status200OK, Type = typeof(LogoutResponseDTO))]`
- [ ] Optional: Add ILogger to constructor
- [ ] Optional: Replace Console.WriteLine with _logger calls
- [ ] Update `Logout()` to call `ClearAuthCookies()` method (already done!)

### Frontend:
- [ ] Rename `LogoutResponse` → `LogoutResponseDTO`
- [ ] Remove `success` property (not in backend response)
- [ ] Add type alias for backward compatibility
- [ ] Update `logout()` function to use `LogoutResponseDTO`

---

## Complete Updated Logout Method (Final Version)

```csharp
/// <summary>
/// Logs out the current user by clearing authentication cookies and returning Cognito logout URL.
/// Frontend should redirect to the returned URL to complete the Cognito session logout.
/// </summary>
/// <returns>Logout URL for Cognito hosted UI logout</returns>
[HttpPost("Logout")]
[ProducesResponseType(StatusCodes.Status200OK, Type = typeof(LogoutResponseDTO))]
public ActionResult<LogoutResponseDTO> Logout()
{
    _logger.LogInformation("Logout endpoint called");

    // Clear all auth cookies
    ClearAuthCookies();
    _logger.LogInformation("Authentication cookies cleared");

    // Build complete Cognito logout URL
    var logoutUrl = $"{cognitoDomain}/logout?client_id={ClientId}&logout_uri={Uri.EscapeDataString(logoutUri)}";
    _logger.LogDebug("Cognito logout URL generated: {LogoutUrl}", logoutUrl);

    return Ok(new LogoutResponseDTO { LogoutUrl = logoutUrl });
}
```

---

## Result

After these changes, **ALL** endpoints will use proper DTOs with type-safe responses! 🎉
