# AWS Cognito Authentication Flow

## Overview

This application uses **AWS Cognito Hosted UI** with OAuth2 Authorization Code flow + PKCE for authentication.

## Authentication Flow

### 1. Initial Load
- App checks for OAuth callback parameters (`code`, `state`)
- If no callback, checks localStorage for existing tokens
- If tokens exist and are valid, user is authenticated
- If tokens are expired, automatic refresh is attempted
- If no tokens or refresh fails, user is redirected to Cognito login

### 2. Login Process
1. User visits app → `useCognitoAuth` hook initiates login
2. Generate PKCE code verifier and challenge (SHA-256)
3. Generate state parameter for CSRF protection
4. Store verifier and state in sessionStorage
5. Redirect to Cognito Hosted UI: `https://auth.calwincloud.com/oauth2/authorize`
6. User authenticates with Cognito (username/password + MFA)
7. Cognito redirects back to app with authorization code
8. App exchanges code for tokens using PKCE verifier
9. Tokens saved to localStorage
10. User is authenticated!

### 3. Token Management
- **Access Token**: Short-lived (1 hour), used for API calls
- **ID Token**: Contains user information (email, sub, etc.)
- **Refresh Token**: Long-lived, used to get new access tokens

### 4. Automatic Token Refresh
- Hook checks token expiration every minute
- If access token expires within 5 minutes, automatic refresh is triggered
- New tokens are saved to localStorage
- If refresh fails, user is logged out

### 5. Logout
1. Clear tokens from localStorage
2. Clear session state
3. Redirect to Cognito logout: `https://auth.calwincloud.com/logout`
4. Cognito clears session and redirects back to app

## Security Features

### PKCE (Proof Key for Code Exchange)
- Prevents authorization code interception attacks
- Code verifier: Cryptographically random string (32 bytes, base64url encoded)
- Code challenge: SHA-256 hash of verifier
- Verifier stored in sessionStorage, sent during token exchange

### State Parameter
- Random string for CSRF protection
- Stored in sessionStorage during auth initiation
- Validated when Cognito redirects back

### Token Storage
- Tokens stored in localStorage (not sessionStorage) for persistence
- PKCE data stored in sessionStorage (cleared after use)
- Automatic cleanup on logout

## Configuration

### Environment Variables
Located in `src/config.ts`:

```typescript
COGNITO_DOMAIN = 'https://auth.calwincloud.com'
COGNITO_CLIENT_ID = '656e5ues1tvo5tk9e00u5f0ft3'
COGNITO_REDIRECT_URI = window.location.origin
```

### Cognito Settings
- **Region**: eu-north-1
- **User Pool**: calwincloud
- **App Client**: CwAdminLogin (Public client, no secret)
- **Custom Domain**: auth.calwincloud.com
- **OAuth Scopes**: openid, email, profile
- **OAuth Grant Type**: Authorization Code + PKCE
- **MFA**: Required (handled by Cognito)

## Files

### Core Authentication
- `src/hooks/useCognitoAuth.ts` - Main auth hook
- `src/utils/cognitoHelpers.ts` - PKCE, URL builders, JWT utilities
- `src/config.ts` - Configuration constants

### API Integration
- `src/api/auth.ts` - Backend API calls (installations, launch tokens)
- `src/hooks/useInstallations.ts` - Installation management

### Components
- `src/App.tsx` - Main app with auth integration
- `src/components/WorkbenchArea.tsx` - Authenticated workspace

## Usage

### In Components

```typescript
import { useCognitoAuth } from './hooks/useCognitoAuth';

function MyComponent() {
  const {
    isAuthenticated,
    isLoading,
    userEmail,
    error,
    login,
    logout,
    getAccessToken,
  } = useCognitoAuth();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!isAuthenticated) return <div>Redirecting to login...</div>;

  // Use access token for API calls
  const accessToken = getAccessToken();
  
  return (
    <div>
      <p>Welcome, {userEmail}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### API Calls

```typescript
const accessToken = getAccessToken();
if (accessToken) {
  const response = await fetch('/api/endpoint', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
}
```

## Backend Integration

The backend must accept Cognito JWT tokens:
1. Validate JWT signature using Cognito public keys
2. Verify token hasn't expired
3. Check issuer matches Cognito user pool
4. Extract user info from token claims

Backend endpoints:
- `GET /api/installation/GetAuthorizedInstallations` - Get user's installations
- `POST /api/desktop/CreateOneTimeToken` - Generate desktop app launch token

## Testing

### Test Authentication Flow
1. Clear localStorage: `localStorage.clear()`
2. Reload app
3. Should redirect to Cognito
4. Login with test credentials
5. Should redirect back and authenticate
6. Check localStorage for tokens: `localStorage.getItem('cognito_tokens')`

### Test Token Refresh
1. Authenticate
2. Wait for access token to expire (or manually expire it)
3. Make an API call
4. Should automatically refresh token

### Test Logout
1. Authenticate
2. Click logout
3. Should clear localStorage
4. Should redirect to Cognito logout
5. Should redirect back to app (unauthenticated)

## Troubleshooting

### "No PKCE data found"
- SessionStorage was cleared between auth initiation and callback
- User opened callback URL in new tab/window
- Solution: Clear sessionStorage and try again

### "State mismatch"
- Possible CSRF attack or corrupted state
- Solution: Clear sessionStorage and try again

### "Token refresh failed"
- Refresh token expired or revoked
- Solution: User must login again

### "Failed to exchange code for tokens"
- Authorization code already used
- Code expired (10 minutes)
- PKCE verifier mismatch
- Solution: Try logging in again

## Migration Notes

This replaces the previous custom authentication system:
- ✅ No more custom login forms
- ✅ No more password strength validation
- ✅ No more MFA handling code
- ✅ No more manual token refresh intervals
- ✅ Reduced codebase by ~1,800 lines
- ✅ More secure (industry-standard OAuth2 + PKCE)
- ✅ Better UX (professional Cognito UI with MFA)
