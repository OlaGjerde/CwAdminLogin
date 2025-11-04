# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AWS Login Manager - A React/TypeScript web application for managing AWS Cognito authentication and CalWin workspace installations. Features a window-based workbench UI with draggable/resizable windows, custom apps, and per-installation user settings.

## Development Commands

### Core Development
```bash
# Install dependencies
npm install

# Start dev server (localhost:5173 with backend proxies)
npm run dev

# Build for production (auto-bumps patch version, generates build info, compiles TS, runs Vite build)
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

### Version Management
```bash
# Bump patch version (0.10.80 -> 0.10.81)
npm run bump:patch

# Manual bump: node scripts/version-bump.cjs [major|minor|patch]
```

### Deployment
```bash
# Deploy to AWS S3 + invalidate CloudFront (dev environment)
npm run deploy
```

## Architecture

### Authentication Flow
- **OAuth2 + PKCE** via AWS Cognito Hosted UI (`login.calwincloud.com`)
- Backend handles token exchange, sets **httpOnly cookies** (access_token, refresh_token)
- Frontend never touches raw tokens - all auth via cookies
- Automatic token refresh via `useCognitoAuth` hook
- Environment-aware config in `src/config.ts` (local/dev/test/prod)

**Key files:**
- `src/hooks/useCognitoAuth.ts` - Main auth hook
- `src/contexts/auth/AuthProvider.tsx` - Auth context provider
- `src/api/axiosConfig.ts` - Axios with cookie-based auth
- `src/api/authApi.ts` - Auth API endpoints

### State Management (React Context)
1. **AuthContext** (`src/contexts/auth/`) - User authentication state
   - Provides: `isAuthenticated`, `userInfo`, `userEmail`, `logout()`
   - Use: `const { userInfo, logout } = useAuth()`

2. **WorkspaceContext** (`src/contexts/WorkspaceContext.tsx`) - Workspace/window management
   - Manages open apps, window states (position/size/z-index)
   - Auto-selects single installation on load
   - Persists selected workspace to localStorage

3. **AppSettingsContext** (`src/contexts/AppSettingsContext.tsx`) - User app settings
   - Per-installation settings (window sizes, positions, scrolling, app order)
   - Auto-saves window drag/resize positions
   - Admin features: copy settings across installations, reset all

### Custom Apps System
Apps are registered in `src/registry/custom-apps.ts` and live in `src/custom-apps/`.

**App structure:**
```typescript
export const MyApp: CustomAppDefinition = {
  id: 'my-app',
  name: 'My App Name',
  icon: 'home', // DevExtreme icon or custom SVG component
  component: MyAppComponent,
  windowOptions: {
    defaultWidth: 600,
    defaultHeight: 500,
    minWidth: 300,
    minHeight: 400,
    resizable: true,
    maximizable: true,
    enableOverflow: true, // Scrolling
  },
  permissions: {
    canReadWorkspace: true,
    canAccessAPI: true,
    canAccessAllInstallations: false,
  }
}
```

**Component props:**
```typescript
const MyAppComponent: React.FC<CustomAppProps> = ({
  workspace,       // Current installation (NormalizedInstallation | null)
  installations,   // All installations
  windowControl,   // { close(), minimize(), toggleMaximize(), resize(), move() }
  instanceId       // Unique instance ID
}) => {
  const { userInfo, logout } = useAuth(); // Preferred auth access
  // ...
}
```

**Creating new apps:** See `src/custom-apps/README.md` for detailed guide.

### Window Management
- Windows are rendered in `src/components/WindowContainer.tsx`
- Draggable/resizable with z-index stacking
- Settings auto-saved on drag/resize (via AppSettingsContext)
- User settings override app defaults

### Environment Configuration
Runtime environment detection based on hostname (in `src/config.ts`):
- **local:** `localhost:5173` → proxies to `localhost:7059/7060` backends
- **dev:** `dev.calwincloud.com` → `auth.calwincloud.com` + `adminapi-dev.calwincloud.com`
- **test:** `test.calwincloud.com` → test admin API
- **prod:** `www.calwincloud.com` → prod admin API

### API Structure
- **Auth API** (`/api/auth/*`) - Cookie-based auth endpoints (login, callback, refresh, logout, me)
- **Admin API** (`/api/installation/*`, `/api/desktop/*`) - Installation management, one-time tokens
- Axios interceptors in `src/api/axiosConfig.ts` handle automatic token refresh and retries

### Build System
- **Vite** with React SWC plugin
- Custom CSP plugin (`vite-csp-plugin.ts`)
- Pre-build hooks:
  1. Bump version (`scripts/version-bump.cjs`)
  2. Generate build info (`scripts/gen-build-info.cjs`) → `src/build-info.json`
- Build footer shows version/commit/timestamp (see `src/components/BuildFooter.tsx`)

## Key Patterns

### Adding a New Custom App
1. Create `src/custom-apps/MyApp/` with `index.ts` + `MyApp.tsx`
2. Export `CustomAppDefinition` from `index.ts`
3. Register in `src/registry/custom-apps.ts`
4. Use `useAuth()` hook for auth (not `authTokens` prop)

### Modifying Auth Flow
- Authentication is **cookie-based** (httpOnly) - frontend has no access to raw tokens
- Backend at `/api/auth/callback` handles OAuth callback + token exchange
- To add auth logic, modify `src/hooks/useCognitoAuth.ts`

### Environment-Specific Changes
- Update `src/config.ts` → `envConfigs` object
- Ensure correct backend URLs for dev/test/prod
- Cookie domain must match environment (`.calwincloud.com` for cloud, empty for localhost)

### Protocol Handlers
- CalWin desktop app uses custom protocols: `calwin://`, `calwintest://`, `calwindev://`
- One-time tokens generated via `ADMIN_API.CREATE_ONE_TIME_TOKEN`
- Fallback installer URL: `INSTALLER_DOWNLOAD_URL`

## Norwegian UI
All user-facing text is in Norwegian. Common translations:
- Innstillinger = Settings
- Logg ut = Logout
- Velg arbeidsområde = Select workspace
- Standardvindustørrelse = Default window size
- Bredde/Høyde = Width/Height
- Aktiver scrolling = Enable scrolling
- Lagret = Saved

## Important Notes

- **Never commit secrets** - Use environment variables or AWS Secrets Manager
- **httpOnly cookies only** - Frontend should never handle raw tokens
- **TypeScript strict mode** - Fix type errors before committing
- **DevExtreme 25.1** - Use DevExtreme components for UI consistency
- **Per-installation settings** - Settings are isolated per workspace ID
- **Auto-version bumping** - `npm run build` automatically increments patch version
- remeber all this