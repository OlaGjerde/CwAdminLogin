# Standardize All Error Responses to ProblemDetails

## Current Analysis

Looking at your controller, here are the error response patterns:

### ✅ Already Using ProblemDetails Correctly:
1. `VerifyEmail` - All errors return `ProblemDetails` ✅
2. `LoginUser` - All errors return `ProblemDetails` ✅
3. `LoginUserVerifyMFA` - All errors return `ProblemDetails` ✅
4. `GetNewToken` - All errors return `ProblemDetails` ✅
5. `ExchangeCodeForTokens` - All errors return `ProblemDetails` ✅
6. `GetCurrentUser` - All errors return `ProblemDetails` ✅

### ❌ NOT Using ProblemDetails:
**None!** Your controller already uses `ProblemDetails` for all error responses! 🎉

---

## Verification Checklist

Let me verify each method's error handling:

### 1. VerifyEmail ✅
```csharp
// 404 - No DTO needed
return NotFound();

// 400 - ProblemDetails ✅
return BadRequest(new ProblemDetails { Title = "...", Detail = "..." });

// 502 - ProblemDetails ✅
return StatusCode(StatusCodes.Status502BadGateway, new ProblemDetails { ... });

// 500 - ProblemDetails ✅
return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails { ... });
```

### 2. LoginUser ✅
```csharp
// 404 - No DTO needed
return NotFound();

// 400 - ProblemDetails ✅
return BadRequest(new ProblemDetails { Title = "...", Detail = "..." });

// 502 - ProblemDetails ✅
return StatusCode(StatusCodes.Status502BadGateway, new ProblemDetails { ... });

// 500 - ProblemDetails ✅
return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails { ... });
```

### 3. LoginUserVerifyMFA ✅
```csharp
// 400 - ProblemDetails ✅
return BadRequest(new ProblemDetails { Title = "..." });

// 502 - ProblemDetails ✅
return StatusCode(StatusCodes.Status502BadGateway, new ProblemDetails { ... });

// 500 - ProblemDetails ✅
return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails { ... });
```

### 4. GetNewToken ✅
```csharp
// 401 - ProblemDetails ✅
return Unauthorized(new ProblemDetails { Title = "...", Detail = "...", Status = ... });

// 400 - ProblemDetails ✅
return BadRequest(new ProblemDetails { Title = "...", Detail = "...", Status = ... });

// 502 - ProblemDetails ✅
return StatusCode(StatusCodes.Status502BadGateway, new ProblemDetails { ... });

// 503 - ProblemDetails ✅
return StatusCode(StatusCodes.Status503ServiceUnavailable, new ProblemDetails { ... });

// 500 - ProblemDetails ✅
return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails { ... });
```

### 5. ExchangeCodeForTokens ✅
```csharp
// 400 - ProblemDetails ✅
return BadRequest(new ProblemDetails { Title = "...", Detail = "..." });

// 502 - ProblemDetails ✅
return StatusCode(StatusCodes.Status502BadGateway, new ProblemDetails { ... });

// 503 - ProblemDetails ✅
return StatusCode(StatusCodes.Status503ServiceUnavailable, new ProblemDetails { ... });

// 500 - ProblemDetails ✅
return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails { ... });
```

### 6. GetCurrentUser ✅
```csharp
// 401 - ProblemDetails ✅
return Unauthorized(new ProblemDetails { Title = "...", Status = ... });
```

---

## Only Non-ProblemDetails Responses

Your controller has **NO** issues! All error responses use `ProblemDetails`. 

The only non-ProblemDetails responses are:
1. `NotFound()` - Returns 404 with empty body (standard REST practice) ✅
2. Success responses - Return DTOs (correct!) ✅

---

## Best Practices Recommendations

While your error handling is already excellent, here are some minor improvements:

### 1. **Always Set Status Property in ProblemDetails**

Some of your `ProblemDetails` set the `Status` property, others don't. Be consistent:

**Current (inconsistent):**
```csharp
// Some set Status:
return BadRequest(new ProblemDetails 
{ 
    Title = "...", 
    Detail = "...", 
    Status = StatusCodes.Status400BadRequest  // ✅ Good
});

// Others don't:
return BadRequest(new ProblemDetails 
{ 
    Title = "...", 
    Detail = "..." 
    // ❌ Status not set
});
```

**Recommended (always set Status):**
```csharp
return BadRequest(new ProblemDetails 
{ 
    Title = "Invalid request",
    Detail = "Request body is required.",
    Status = StatusCodes.Status400BadRequest  // ✅ Always set
});
```

### 2. **Create Helper Methods for Common Error Responses**

To reduce duplication and ensure consistency:

```csharp
/// <summary>
/// Creates a standardized ProblemDetails for validation errors
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
/// Creates a standardized ProblemDetails for AWS service errors
/// </summary>
private ProblemDetails CreateAwsServiceError(string detail)
{
    return new ProblemDetails
    {
        Title = "AWS service error",
        Detail = detail,
        Status = StatusCodes.Status502BadGateway
    };
}

/// <summary>
/// Creates a standardized ProblemDetails for internal errors
/// </summary>
private ProblemDetails CreateInternalError(string detail)
{
    return new ProblemDetails
    {
        Title = "Internal server error",
        Detail = detail,
        Status = StatusCodes.Status500InternalServerError
    };
}
```

**Usage:**
```csharp
// Before:
return BadRequest(new ProblemDetails
{
    Title = "Invalid request",
    Detail = "Code is required."
});

// After:
return BadRequest(CreateValidationError("Code is required."));
```

### 3. **Add Instance Property for Request Tracing**

```csharp
private ProblemDetails CreateValidationError(string detail)
{
    return new ProblemDetails
    {
        Title = "Validation failed",
        Detail = detail,
        Status = StatusCodes.Status400BadRequest,
        Instance = HttpContext.Request.Path  // ✅ Helps with debugging
    };
}
```

---

## Updated Helper Methods (Recommended)

Add these to your controller:

```csharp
#region Error Response Helpers

/// <summary>
/// Creates a standardized ProblemDetails for validation errors (400)
/// </summary>
private ProblemDetails CreateValidationError(string detail)
{
    return new ProblemDetails
    {
        Title = "Validation failed",
        Detail = detail,
        Status = StatusCodes.Status400BadRequest,
        Instance = HttpContext.Request.Path
    };
}

/// <summary>
/// Creates a standardized ProblemDetails for authentication errors (401)
/// </summary>
private ProblemDetails CreateAuthenticationError(string detail)
{
    return new ProblemDetails
    {
        Title = "Authentication failed",
        Detail = detail,
        Status = StatusCodes.Status401Unauthorized,
        Instance = HttpContext.Request.Path
    };
}

/// <summary>
/// Creates a standardized ProblemDetails for AWS/Cognito service errors (502)
/// </summary>
private ProblemDetails CreateServiceError(string detail)
{
    return new ProblemDetails
    {
        Title = "External service error",
        Detail = detail,
        Status = StatusCodes.Status502BadGateway,
        Instance = HttpContext.Request.Path
    };
}

/// <summary>
/// Creates a standardized ProblemDetails for HTTP transport errors (503)
/// </summary>
private ProblemDetails CreateServiceUnavailableError(string detail)
{
    return new ProblemDetails
    {
        Title = "Service temporarily unavailable",
        Detail = detail,
        Status = StatusCodes.Status503ServiceUnavailable,
        Instance = HttpContext.Request.Path
    };
}

/// <summary>
/// Creates a standardized ProblemDetails for internal server errors (500)
/// </summary>
private ProblemDetails CreateInternalError(string detail)
{
    return new ProblemDetails
    {
        Title = "Internal server error",
        Detail = detail,
        Status = StatusCodes.Status500InternalServerError,
        Instance = HttpContext.Request.Path
    };
}

#endregion
```

---

## Example Refactored Method

**Before (ExchangeCodeForTokens validation):**
```csharp
if (request == null)
{
    return BadRequest(new ProblemDetails
    {
        Title = "Invalid request",
        Detail = "Request body is required."
    });
}

if (string.IsNullOrWhiteSpace(request.Code))
{
    return BadRequest(new ProblemDetails
    {
        Title = "Invalid request",
        Detail = "Code is required."
    });
}

if (string.IsNullOrWhiteSpace(request.RedirectUri))
{
    return BadRequest(new ProblemDetails
    {
        Title = "Invalid request",
        Detail = "RedirectUri is required."
    });
}
```

**After (with helper methods):**
```csharp
if (request == null)
    return BadRequest(CreateValidationError("Request body is required."));

if (string.IsNullOrWhiteSpace(request.Code))
    return BadRequest(CreateValidationError("Code is required."));

if (string.IsNullOrWhiteSpace(request.RedirectUri))
    return BadRequest(CreateValidationError("RedirectUri is required."));
```

**Benefits:**
- ✅ Less code duplication
- ✅ Consistent error format
- ✅ Always includes Status and Instance
- ✅ Easier to maintain
- ✅ Can add logging in one place

---

## Optional: Validation Helper Method

You can create a validation helper to further reduce duplication:

```csharp
/// <summary>
/// Validates CodeExchangeRequestDTO and returns error if invalid
/// </summary>
private ActionResult? ValidateCodeExchangeRequest(CodeExchangeRequestDTO? request)
{
    if (request == null)
        return BadRequest(CreateValidationError("Request body is required."));

    if (string.IsNullOrWhiteSpace(request.Code))
        return BadRequest(CreateValidationError("Code is required."));

    if (string.IsNullOrWhiteSpace(request.RedirectUri))
        return BadRequest(CreateValidationError("RedirectUri is required."));

    if (string.IsNullOrWhiteSpace(request.CodeVerifier))
        return BadRequest(CreateValidationError("CodeVerifier is required for PKCE flow."));

    return null;  // No error
}
```

**Usage:**
```csharp
public async Task<ActionResult<AuthTokenResponseDTO>> ExchangeCodeForTokens([FromBody] CodeExchangeRequestDTO request)
{
    // Validate request
    var validationError = ValidateCodeExchangeRequest(request);
    if (validationError != null)
        return validationError;

    // Continue with business logic...
}
```

---

## Summary

### ✅ Current State:
**Your controller already uses ProblemDetails for ALL error responses!** No changes required for compliance.

### 🎯 Recommended Improvements (Optional):
1. Always set `Status` property in ProblemDetails
2. Add `Instance` property for better debugging
3. Create helper methods to reduce duplication
4. Consider validation helper methods

### 📋 Implementation Checklist:

**Option 1: Minimal (Just Add Status to All)**
- [ ] Add `Status` property to all ProblemDetails that don't have it
- [ ] Test all error endpoints

**Option 2: Recommended (Add Helpers)**
- [ ] Add error helper methods to controller
- [ ] Refactor error returns to use helpers
- [ ] Add `Instance` property for tracing
- [ ] Test all error endpoints

**Option 3: Full Refactor (Cleanest)**
- [ ] Add all helper methods (error + validation)
- [ ] Extract validation logic into helper methods
- [ ] Refactor all error handling
- [ ] Add comprehensive logging
- [ ] Test all endpoints

---

## Conclusion

**Good News:** You're already following best practices! All your error responses use `ProblemDetails`. 🎉

The recommendations above are **optional improvements** for consistency and maintainability, not required changes for ProblemDetails compliance.

Your current error handling is **production-ready as-is!** ✅
