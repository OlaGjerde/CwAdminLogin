# Token Refresh DTO - Backend Implementation Guide

## Overview
This document describes the proper DTO for the `GetNewToken` endpoint to ensure type safety and better API documentation.

---

## Backend: C# DTO Implementation

### 1. Create the TokenRefreshResponseDTO DTO

Create a new file (or add to your existing DTOs file):

**File: `TokenRefreshResponseDTO.cs`**

```csharp
namespace YourNamespace.Models; // Adjust namespace as needed

/// <summary>
/// Response DTO for the GetNewToken endpoint.
/// Returns success status and token expiration information.
/// </summary>
public class TokenRefreshResponseDTO
{
    /// <summary>
    /// Indicates if the token refresh was successful
    /// </summary>
    /// <example>true</example>
    public bool Success { get; set; }

    /// <summary>
    /// Token expiration time in seconds from now
    /// </summary>
    /// <example>3600</example>
    public int ExpiresIn { get; set; }

    /// <summary>
    /// Optional message providing additional context
    /// </summary>
    /// <example>Tokens refreshed successfully</example>
    public string? Message { get; set; }
}
```

---

### 2. Update GetNewToken Method

Update your `CwAuthController.cs`:

```csharp
/// <summary>
/// Refreshes the access and ID tokens using the refresh token stored in httpOnly cookie.
/// Sets new tokens as secure httpOnly cookies.
/// Returns success response on completion.
/// </summary>
/// <returns>Success response with new expiry information or <see cref="ProblemDetails"/> on error.</returns>
[HttpPost("GetNewToken")]
[ProducesResponseType(StatusCodes.Status200OK, Type = typeof(TokenRefreshResponseDTO))]
[ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(ProblemDetails))]
[ProducesResponseType(StatusCodes.Status401Unauthorized, Type = typeof(ProblemDetails))]
[ProducesResponseType(StatusCodes.Status502BadGateway, Type = typeof(ProblemDetails))]
public async Task<ActionResult<TokenRefreshResponseDTO>> GetNewToken()
{
    // Read refresh token from cookie
    if (!Request.Cookies.TryGetValue("refresh_token", out var refreshToken) || string.IsNullOrEmpty(refreshToken))
    {
        return Unauthorized(new ProblemDetails
        {
            Title = "Refresh token not found",
            Detail = "No refresh token cookie present.",
            Status = StatusCodes.Status401Unauthorized
        });
    }

    try
    {
        var tokenEndpoint = $"{cognitoDomain}/oauth2/token";
        var httpClient = _httpClientFactory.CreateClient();

        var formData = new Dictionary<string, string>
        {
            { "grant_type", "refresh_token" },
            { "client_id", ClientId },
            { "refresh_token", refreshToken }
        };

        if (!string.IsNullOrEmpty(clientSecret))
            formData.Add("client_secret", clientSecret);

        var content = new FormUrlEncodedContent(formData);
        var response = await httpClient.PostAsync(tokenEndpoint, content);
        var responseContent = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            // Invalid or expired refresh token
            if (response.StatusCode == System.Net.HttpStatusCode.BadRequest)
            {
                // Clear invalid cookies
                ClearAuthCookies();

                return Unauthorized(new ProblemDetails
                {
                    Title = "Refresh token invalid or expired",
                    Detail = "Please log in again.",
                    Status = StatusCodes.Status401Unauthorized
                });
            }

            return BadRequest(new ProblemDetails
            {
                Title = "Failed to refresh tokens",
                Detail = responseContent,
                Status = StatusCodes.Status400BadRequest
            });
        }

        // Use OAuth2TokenResponse DTO for proper deserialization
        OAuth2TokenResponse? tokenResponse = null;
        try
        {
            tokenResponse = JsonSerializer.Deserialize<OAuth2TokenResponse>(responseContent);
        }
        catch (JsonException jex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new ProblemDetails
            {
                Title = "Failed to parse Cognito response",
                Detail = jex.Message,
                Status = StatusCodes.Status502BadGateway
            });
        }

        if (tokenResponse == null)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new ProblemDetails
            {
                Title = "Invalid Cognito response",
                Detail = "Empty or malformed response."
            });
        }

        // Set new tokens as httpOnly cookies
        SetTokenCookies(tokenResponse);

        // ✅ CHANGED: Return proper DTO instead of anonymous object
        return Ok(new TokenRefreshResponseDTO 
        { 
            Success = true, 
            ExpiresIn = tokenResponse.ExpiresIn ?? 3600,
            Message = "Tokens refreshed successfully"
        });
    }
    catch (HttpRequestException ex)
    {
        return StatusCode(StatusCodes.Status503ServiceUnavailable, new ProblemDetails
        {
            Title = "HTTP request failed",
            Detail = ex.Message,
            Status = StatusCodes.Status503ServiceUnavailable
        });
    }
    catch (Exception ex)
    {
        return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails
        {
            Title = "Internal server error",
            Detail = ex.Message,
            Status = StatusCodes.Status500InternalServerError
        });
    }
}
```

---

## Frontend: TypeScript Interface

The frontend has been updated with a unified interface:

**File: `src/api/auth.ts`**

```typescript
/**
 * Unified response DTO for authentication token operations
 * Used by both ExchangeCodeForTokens and GetNewToken endpoints
 */
export interface AuthTokenResponseDTO {
  success: boolean;
  expiresIn: number;
  message?: string;
}

// Type aliases for backward compatibility and clarity
export type CodeExchangeResponse = AuthTokenResponseDTO;
export type TokenRefreshResponseDTO = AuthTokenResponseDTO;

/**
 * Exchange OAuth authorization code for tokens (sets httpOnly cookies)
 * Returns token expiry information. Actual tokens are set as httpOnly cookies.
 */
export async function exchangeCodeForTokens(code: string, codeVerifier: string): Promise<AuthTokenResponseDTO> {
  const response = await axios.post<AuthTokenResponseDTO>(AUTH_ENDPOINTS.EXCHANGE_CODE, {
    code,
    redirectUri: COGNITO_REDIRECT_URI,
    codeVerifier,
  });
  return response.data;
}

/**
 * Refresh access and ID tokens using refresh token cookie
 * Returns token expiry information. New tokens are set as httpOnly cookies.
 */
export async function refreshToken(): Promise<AuthTokenResponseDTO> {
  const response = await axios.post<AuthTokenResponseDTO>(AUTH_ENDPOINTS.REFRESH_TOKEN);
  return response.data;
}
```

---

## Benefits of Using a DTO

### 1. **Type Safety**
- ✅ Backend has strong typing with `ActionResult<TokenRefreshResponse>`
- ✅ Frontend has matching TypeScript interface
- ✅ Prevents accidental property name changes

### 2. **Better API Documentation**
- ✅ Swagger/OpenAPI generates better documentation
- ✅ XML comments on DTO properties show in API docs
- ✅ Example values help API consumers

### 3. **Maintainability**
- ✅ Single source of truth for response structure
- ✅ Easy to add new properties in the future
- ✅ Refactoring tools work better with strongly-typed DTOs

### 4. **Consistency**
- ✅ Matches pattern used in `CodeExchangeResponse`
- ✅ All auth endpoints return similar structured responses
- ✅ Frontend can handle responses uniformly

---

## Testing

After implementing the DTO, test the endpoint:

### Backend Test (Swagger/Postman)
```http
POST https://adminapi-dev.calwincloud.com/api/auth/GetNewToken
Cookie: refresh_token=<your_token>

Expected Response:
{
  "success": true,
  "expiresIn": 3600,
  "message": "Tokens refreshed successfully"
}
```

### Frontend Test (Browser Console)
```typescript
import { refreshToken } from './api/auth';

// Call the refresh endpoint
const result = await refreshToken();
console.log('Refresh result:', result);
// Expected: { success: true, expiresIn: 3600, message: "..." }
```

---

## Migration Checklist

- [ ] Create `TokenRefreshResponseDTO.cs` DTO class
- [ ] Update `GetNewToken` method signature: `Task<ActionResult<TokenRefreshResponseDTO>>`
- [ ] Replace anonymous object with `new TokenRefreshResponseDTO { ... }`
- [ ] Update `ProducesResponseType` attribute to specify DTO type
- [ ] Build and test backend
- [ ] Frontend already updated (done automatically)
- [ ] Test token refresh flow end-to-end
- [ ] Check Swagger documentation shows new DTO

---

## Summary

✅ **Frontend Updated**: `AuthTokenResponseDTO` interface created with type aliases for backward compatibility
✅ **Backend Updated**: Both `ExchangeCodeForTokens` and `GetNewToken` use `AuthTokenResponseDTO`
✅ **DRY Principle**: Single DTO for both endpoints instead of duplicating code

This change improves type safety, API documentation, and maintainability while following best practices for ASP.NET Core APIs.
