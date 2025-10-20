# Refactored ExchangeCodeForTokens Method

## Summary of Improvements

### 1. **Cleaner Summary**
- More concise and focused documentation
- Removed verbose error code listings (already in `[ProducesResponseType]`)
- Better structured for readability

### 2. **Validation Extracted**
- Created `ValidateCodeExchangeRequest()` helper method
- Reduces code duplication
- Makes the main method more readable

### 3. **Error Handling Improved**
- Added specific error types for better categorization
- More descriptive error messages
- Consistent error response structure

### 4. **Proper DTO Response**
- Returns `CodeExchangeResponseDTO` instead of anonymous object
- Type-safe and consistent with API standards

### 5. **Code Organization**
- Clear separation of concerns
- Better flow: validate → call Cognito → parse → set cookies → respond
- Removed unnecessary comments

---

## Refactored Code

```csharp
/// <summary>
/// Exchanges OAuth2 authorization code for tokens via Cognito's token endpoint.
/// Sets access, ID, and refresh tokens as secure httpOnly cookies.
/// Supports PKCE flow (code_verifier required).
/// </summary>
/// <param name="request">Authorization code, redirect URI, and PKCE code verifier</param>
/// <returns>Success response with token expiry or ProblemDetails on error</returns>
[HttpPost("ExchangeCodeForTokens")]
[ProducesResponseType(StatusCodes.Status200OK, Type = typeof(CodeExchangeResponseDTO))]
[ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(ProblemDetails))]
[ProducesResponseType(StatusCodes.Status502BadGateway, Type = typeof(ProblemDetails))]
[ProducesResponseType(StatusCodes.Status503ServiceUnavailable, Type = typeof(ProblemDetails))]
public async Task<ActionResult<CodeExchangeResponseDTO>> ExchangeCodeForTokens(
    [FromBody] CodeExchangeRequestDTO request)
{
    // Validate request
    var validationError = ValidateCodeExchangeRequest(request);
    if (validationError != null)
        return validationError;

    try
    {
        // Exchange code for tokens with Cognito
        var tokenResponse = await ExchangeCodeWithCognito(request);
        
        // Set tokens as httpOnly cookies
        SetTokenCookies(tokenResponse);

        return Ok(new CodeExchangeResponseDTO
        {
            Success = true,
            ExpiresIn = tokenResponse.ExpiresIn ?? 3600,
            Message = "Authentication successful"
        });
    }
    catch (CognitoException ex)
    {
        return BadRequest(new ProblemDetails
        {
            Title = "Cognito token exchange failed",
            Detail = ex.Message,
            Status = StatusCodes.Status400BadRequest
        });
    }
    catch (JsonException ex)
    {
        return StatusCode(StatusCodes.Status502BadGateway, new ProblemDetails
        {
            Title = "Invalid Cognito response format",
            Detail = $"Failed to parse response: {ex.Message}",
            Status = StatusCodes.Status502BadGateway
        });
    }
    catch (HttpRequestException ex)
    {
        return StatusCode(StatusCodes.Status503ServiceUnavailable, new ProblemDetails
        {
            Title = "Cognito service unavailable",
            Detail = ex.Message,
            Status = StatusCodes.Status503ServiceUnavailable
        });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Unexpected error during token exchange");
        return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails
        {
            Title = "Internal server error",
            Detail = "An unexpected error occurred during authentication",
            Status = StatusCodes.Status500InternalServerError
        });
    }
}

/// <summary>
/// Validates the code exchange request parameters
/// </summary>
private ActionResult? ValidateCodeExchangeRequest(CodeExchangeRequestDTO? request)
{
    if (request == null)
        return BadRequest(CreateValidationError("Request body is required"));

    if (string.IsNullOrWhiteSpace(request.Code))
        return BadRequest(CreateValidationError("Authorization code is required"));

    if (string.IsNullOrWhiteSpace(request.RedirectUri))
        return BadRequest(CreateValidationError("Redirect URI is required"));

    if (string.IsNullOrWhiteSpace(request.CodeVerifier))
        return BadRequest(CreateValidationError("Code verifier is required for PKCE flow"));

    return null;
}

/// <summary>
/// Exchanges authorization code with Cognito token endpoint
/// </summary>
private async Task<OAuth2TokenResponse> ExchangeCodeWithCognito(CodeExchangeRequestDTO request)
{
    var tokenEndpoint = $"{cognitoDomain}/oauth2/token";
    var httpClient = _httpClientFactory.CreateClient();

    var formData = new Dictionary<string, string>
    {
        ["grant_type"] = "authorization_code",
        ["client_id"] = ClientId,
        ["code"] = request.Code,
        ["redirect_uri"] = request.RedirectUri,
        ["code_verifier"] = request.CodeVerifier
        // Note: client_secret intentionally omitted (public client with PKCE)
    };

    var content = new FormUrlEncodedContent(formData);
    var response = await httpClient.PostAsync(tokenEndpoint, content);
    var responseContent = await response.Content.ReadAsStringAsync();

    if (!response.IsSuccessStatusCode)
    {
        throw new CognitoException($"Token exchange failed: {responseContent}");
    }

    var tokenResponse = JsonSerializer.Deserialize<OAuth2TokenResponse>(responseContent)
        ?? throw new JsonException("Cognito returned empty or malformed response");

    return tokenResponse;
}

/// <summary>
/// Creates a standardized validation error response
/// </summary>
private ProblemDetails CreateValidationError(string detail)
{
    return new ProblemDetails
    {
        Title = "Validation failed",
        Detail = detail,
        Status = StatusCodes.Status400BadRequest
    };
}

/// <summary>
/// Custom exception for Cognito-specific errors
/// </summary>
public class CognitoException : Exception
{
    public CognitoException(string message) : base(message) { }
}
```

---

## Additional DTO Required

Create `CodeExchangeResponseDTO.cs`:

```csharp
/// <summary>
/// Response DTO for successful code exchange
/// </summary>
public class CodeExchangeResponseDTO
{
    /// <summary>
    /// Indicates if the code exchange was successful
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Token expiration time in seconds
    /// </summary>
    public int ExpiresIn { get; set; }

    /// <summary>
    /// Optional success message
    /// </summary>
    public string? Message { get; set; }
}
```

---

## Key Improvements Explained

### 1. **Single Responsibility Principle**
Each method has one clear purpose:
- `ExchangeCodeForTokens` - Main orchestration
- `ValidateCodeExchangeRequest` - Input validation
- `ExchangeCodeWithCognito` - External API communication
- `CreateValidationError` - Error response creation

### 2. **Better Error Context**
```csharp
// Before: Generic "Failed to exchange code"
// After: Specific error types with context
throw new CognitoException($"Token exchange failed: {responseContent}");
```

### 3. **Cleaner Syntax**
```csharp
// Before:
var formData = new Dictionary<string, string>
{
    { "grant_type", "authorization_code" },
    { "client_id", ClientId }
};

// After: Dictionary initializer syntax
var formData = new Dictionary<string, string>
{
    ["grant_type"] = "authorization_code",
    ["client_id"] = ClientId
};
```

### 4. **Null-Coalescing Throw**
```csharp
// Before:
tokenResponse = JsonSerializer.Deserialize<OAuth2TokenResponse>(responseContent);
if (tokenResponse == null) { throw... }

// After: Inline null check with throw expression
var tokenResponse = JsonSerializer.Deserialize<OAuth2TokenResponse>(responseContent)
    ?? throw new JsonException("Cognito returned empty response");
```

### 5. **Logging for Production**
```csharp
_logger.LogError(ex, "Unexpected error during token exchange");
```
Captures full exception details for diagnostics while returning safe message to client.

---

## Benefits

✅ **Readability**: Main method reads like plain English
✅ **Maintainability**: Changes to validation logic isolated in one place
✅ **Testability**: Each helper method can be unit tested independently
✅ **Type Safety**: Proper DTO instead of anonymous objects
✅ **Error Handling**: Specific exception types for different failure scenarios
✅ **Production Ready**: Includes logging and safe error messages

---

## Migration Steps

1. ✅ Create `CodeExchangeResponseDTO` class
2. ✅ Create `CognitoException` class (or use existing exception if available)
3. ✅ Add private helper methods to controller
4. ✅ Replace existing method with refactored version
5. ✅ Update frontend to handle new response structure (already matches!)
6. ✅ Test thoroughly

---

## Frontend Compatibility

The frontend already expects this response structure from `src/api/auth.ts`:

```typescript
export interface CodeExchangeResponse {
  success: boolean;
  expiresIn: number;
  message?: string;
}
```

✅ **No frontend changes needed!** The refactored backend matches the existing contract.
