# Auth Context Usage Guide

## Overview

The AuthContext system provides global access to authentication state throughout your app without props drilling, while maintaining all the security benefits of the cookie-based auth system.

---

## Quick Start

### Basic Usage in Components

```tsx
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { isAuthenticated, userEmail, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }
  
  return (
    <div>
      <p>Welcome, {userEmail}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Protecting Components

```tsx
import { useRequireAuth } from './hooks/useRequireAuth';
import { LoadIndicator } from 'devextreme-react/load-indicator';

function ProtectedDashboard() {
  const { isLoading } = useRequireAuth();
  
  if (isLoading) {
    return <LoadIndicator />;
  }
  
  // User is guaranteed to be authenticated here
  return <div>Protected content</div>;
}
```

---

## API Reference

### `useAuth()` Hook

Returns the current authentication state and methods.

#### Return Value

```typescript
interface AuthContextValue {
  // State
  isAuthenticated: boolean;      // Whether user is logged in
  isLoading: boolean;            // Whether auth check is in progress
  userEmail: string | null;      // Current user's email
  userInfo: UserInfo | null;     // Full user info from JWT
  error: string | null;          // Any auth error message
  
  // Actions
  login: () => Promise<void>;              // Redirect to Cognito login
  logout: () => Promise<void>;             // Logout and clear session
  checkAuthStatus: () => Promise<void>;    // Manually check auth
  refreshToken: () => Promise<boolean>;    // Manually refresh token
}
```

#### Example

```tsx
function UserProfile() {
  const { 
    isAuthenticated, 
    isLoading, 
    userEmail, 
    userInfo, 
    error,
    logout 
  } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!isAuthenticated) return <LoginPrompt />;

  return (
    <div>
      <h2>{userEmail}</h2>
      <p>User ID: {userInfo?.UserId}</p>
      <p>Groups: {userInfo?.Groups.join(', ')}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

---

### `useRequireAuth()` Hook

Protects components by ensuring user is authenticated. Automatically redirects to login if not.

#### Return Value

```typescript
interface UseRequireAuthResult {
  isLoading: boolean;          // Whether auth check is in progress
  isAuthenticated: boolean;    // Always true after loading
  userEmail: string | null;    // Current user's email
}
```

#### Example

```tsx
function AdminPanel() {
  const { isLoading, userEmail } = useRequireAuth();
  
  if (isLoading) {
    return (
      <div>
        <LoadIndicator />
        <p>Checking authentication...</p>
      </div>
    );
  }
  
  // At this point, user is guaranteed to be authenticated
  return (
    <div>
      <h1>Admin Panel</h1>
      <p>Welcome, {userEmail}</p>
      {/* Admin content */}
    </div>
  );
}
```

---

## Common Patterns

### 1. Conditional Rendering Based on Auth

```tsx
function Header() {
  const { isAuthenticated, userEmail, login, logout } = useAuth();
  
  return (
    <header>
      <h1>My App</h1>
      {isAuthenticated ? (
        <div>
          <span>Welcome, {userEmail}</span>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button onClick={login}>Login</button>
      )}
    </header>
  );
}
```

### 2. Protecting Entire Pages

```tsx
function DashboardPage() {
  const { isLoading } = useRequireAuth();
  
  if (isLoading) {
    return <FullPageLoader />;
  }
  
  // User is authenticated
  return <DashboardContent />;
}
```

### 3. Accessing User Info

```tsx
function UserGreeting() {
  const { userInfo } = useAuth();
  
  if (!userInfo) return null;
  
  return (
    <div>
      <p>Hello, {userInfo.Username}!</p>
      {userInfo.Groups.includes('Admin') && (
        <p>You have admin privileges</p>
      )}
    </div>
  );
}
```

### 4. Manual Token Refresh

```tsx
function ApiCallComponent() {
  const { refreshToken } = useAuth();
  
  const handleApiCall = async () => {
    try {
      const response = await fetch('/api/data');
      return await response.json();
    } catch (error) {
      if (error.response?.status === 401) {
        // Manually refresh if needed
        const refreshed = await refreshToken();
        if (refreshed) {
          // Retry the API call
          const response = await fetch('/api/data');
          return await response.json();
        }
      }
      throw error;
    }
  };
  
  return <button onClick={handleApiCall}>Fetch Data</button>;
}
```

### 5. Error Handling

```tsx
function AuthErrorHandler() {
  const { error, login } = useAuth();
  
  if (!error) return null;
  
  return (
    <div className="error-banner">
      <p>Authentication Error: {error}</p>
      <button onClick={login}>Try Again</button>
    </div>
  );
}
```

---

## Migration Guide

### Before (Props Drilling)

```tsx
// App.tsx
function App() {
  const { isAuthenticated, userEmail, logout } = useCognitoAuth();
  
  return (
    <MainLayout
      isAuthenticated={isAuthenticated}
      userEmail={userEmail}
      onLogout={logout}
    >
      <Dashboard 
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
      />
    </MainLayout>
  );
}

// Dashboard.tsx
function Dashboard({ isAuthenticated, userEmail }) {
  return <div>Welcome {userEmail}</div>;
}
```

### After (Context)

```tsx
// App.tsx
function App() {
  return (
    <MainLayout>
      <Dashboard />
    </MainLayout>
  );
}

// Dashboard.tsx
function Dashboard() {
  const { userEmail } = useAuth();
  return <div>Welcome {userEmail}</div>;
}
```

---

## Security Notes

### What's Preserved ✅

- **httpOnly Cookies**: Tokens still stored securely
- **OAuth2 + PKCE**: Same secure authentication flow
- **Automatic Refresh**: Token refresh still automatic
- **CSRF Protection**: State parameter validation intact
- **Backend Control**: Backend still manages tokens

### What Changed ✅

- **Access Pattern**: Use `useAuth()` instead of passing props
- **Global State**: Auth state available everywhere
- **No Props Drilling**: Cleaner component hierarchy

---

## Troubleshooting

### Error: "useAuth must be used within an AuthProvider"

**Cause**: Component is not wrapped in `<AuthProvider>`

**Solution**: Make sure your app is wrapped in main.tsx:
```tsx
// main.tsx
<AuthProvider>
  <App />
</AuthProvider>
```

### Infinite Redirect Loop

**Cause**: Component calling `login()` repeatedly

**Solution**: Use `useRequireAuth()` instead of manually checking:
```tsx
// ❌ Don't do this
const { isAuthenticated, login } = useAuth();
if (!isAuthenticated) login();

// ✅ Do this instead
const { isLoading } = useRequireAuth();
```

### Fast Refresh Warning

**Cause**: AuthContext.tsx exports both component and hook

**Solution**: This is a dev-only warning and can be ignored. It doesn't affect functionality.

---

## Advanced Usage

### Custom Auth Hook with Additional Logic

```tsx
// useAdminAuth.ts
import { useAuth } from './contexts/AuthContext';
import { useEffect } from 'react';

export function useAdminAuth() {
  const auth = useAuth();
  
  useEffect(() => {
    if (auth.isAuthenticated && !auth.userInfo?.Groups.includes('Admin')) {
      // Redirect non-admins
      window.location.href = '/unauthorized';
    }
  }, [auth.isAuthenticated, auth.userInfo]);
  
  return auth;
}
```

### Combining with Other Contexts

```tsx
function Dashboard() {
  const { userEmail } = useAuth();
  const { currentWorkspace } = useWorkspace();
  
  return (
    <div>
      <p>User: {userEmail}</p>
      <p>Workspace: {currentWorkspace?.name}</p>
    </div>
  );
}
```

---

## Best Practices

1. **Use `useRequireAuth()` for protected pages** - Automatic redirect handling
2. **Use `useAuth()` for conditional rendering** - Show/hide based on auth state
3. **Don't call `login()` in render** - Use `useRequireAuth()` instead
4. **Check `isLoading` before rendering** - Prevent flash of wrong content
5. **Handle errors gracefully** - Show user-friendly error messages

---

## Examples

See the `src/App.tsx` file for a complete example of using the AuthContext system.
