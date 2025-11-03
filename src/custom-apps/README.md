# Custom Apps Directory

This directory contains all custom applications for the workbench system.

## Creating a New Custom App

### 1. Create Your App Directory Structure

```
src/custom-apps/YourAppName/
├── index.ts          # Export your CustomAppDefinition
├── YourAppName.tsx   # Main React component
├── YourAppName.css   # App-specific styles (optional)
├── components/       # Internal components (optional)
└── types.ts          # App-specific types (optional)
```

### 2. Create Your App Component

Create `YourAppName.tsx`:

```typescript
import React from 'react';
import type { CustomAppProps } from '../../types/custom-app';
import './YourAppName.css';

export const YourAppComponent: React.FC<CustomAppProps> = ({
  workspace,
  authTokens,
  installations,
  windowControl,
  instanceId
}) => {
  // Your app logic here
  
  return (
    <div className="your-app-container">
      <h1>Your App</h1>
      <p>Current Workspace: {workspace?.name}</p>
      {/* Your app UI here */}
    </div>
  );
};
```

### 3. Create Your App Definition

Create `index.ts`:

```typescript
import type { CustomAppDefinition } from '../../types/custom-app';
import { YourAppComponent } from './YourAppName';

export const YourApp: CustomAppDefinition = {
  id: 'your-app',
  name: 'Your App Name',
  icon: 'home', // DevExtreme icon name or custom SVG component
  component: YourAppComponent,
  description: 'Description of your app',
  version: '1.0.0',
  category: 'Utilities', // Optional: System, Productivity, Utilities, etc.
  author: 'Your Name', // Optional: Developer or company name
  windowOptions: {
    minWidth: 300,
    minHeight: 400,
    defaultWidth: 600,
    defaultHeight: 500,
    resizable: true,
    maximizable: true,
    enableOverflow: true, // Enable scrolling (default: true)
  },
  permissions: {
    canReadWorkspace: true,
    canAccessAPI: true,
    canAccessAllInstallations: false,
  }
};
```

### 4. Register Your App

Add your app to `src/registry/custom-apps.ts`:

```typescript
import { YourApp } from '../custom-apps/YourAppName';

export const customAppRegistry: CustomAppDefinition[] = [
  YourApp,
  // ... other apps
];
```

## Available Props in CustomAppProps

- **workspace**: Current selected workspace/installation (NormalizedInstallation | null)
- **authTokens**: ⚠️ DEPRECATED - Authentication tokens (now using httpOnly cookies instead)
- **installations**: All available installations (NormalizedInstallation[])
- **windowControl**: API to control your app window
  - `close()`: Close the window
  - `minimize()`: Minimize the window
  - `toggleMaximize()`: Toggle maximize/restore
  - `resize(width, height)`: Resize the window
  - `move(x, y)`: Move the window
- **instanceId**: Unique ID for this app instance

## Using the useAuth() Hook

Instead of relying on `authTokens` prop, you can use the `useAuth()` hook to access authentication state:

```typescript
import { useAuth } from '../../contexts/AuthContext';

export const YourAppComponent: React.FC<CustomAppProps> = ({ workspace }) => {
  // Access auth state directly - no props needed!
  const { userInfo, userEmail, logout, isAuthenticated } = useAuth();

  return (
    <div>
      <p>Logged in as: {userEmail}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
};
```

Available from `useAuth()`:
- `isAuthenticated`: boolean - Whether user is logged in
- `userInfo`: object | null - User information from Cognito
- `userEmail`: string | null - User's email address
- `logout()`: function - Logout the user

## Window Options

Configure how your app window behaves:

- `minWidth`, `minHeight`: Minimum window dimensions
- `defaultWidth`, `defaultHeight`: Initial window size
- `resizable`: Can users resize the window (default: true)
- `maximizable`: Can users maximize the window (default: true)
- `enableOverflow`: Enable scrolling in window body (default: true)
- `initialPosition`: Starting position { x, y } (default: centered)

## App Permissions

Configure what your app can access (for future security features):

- `canReadWorkspace`: Can read workspace/installation data
- `canAccessAPI`: Can make API calls to the backend
- `canAccessAllInstallations`: Can access all installations or just the current one

## Additional Metadata

You can add additional metadata to your app definition:

- `category`: Organize apps by category (e.g., "System", "Productivity", "Utilities")
- `author`: Developer or company name
- `version`: Semantic version string (e.g., "1.0.0")
- `description`: Brief description of what the app does

## Icons

You can use:
- **DevExtreme icons**: String icon names (e.g., 'home', 'user', 'settings')
- **Custom SVG**: React component that accepts `className` and `size` props

## Best Practices

1. **Keep it simple**: Start with basic functionality
2. **Use DevExtreme components**: Maintain consistent UI/UX
3. **Handle errors gracefully**: Add error boundaries
4. **Responsive design**: Apps should work at different sizes
5. **Clean up**: Remove event listeners and clean up state
6. **Type safety**: Use TypeScript types properly

## Example Apps

Check out these example apps for reference:

- **ExampleTodoApp/** - Simple todo list demonstrating basic app structure
- **InstallationLauncher/** - CalWin launcher with icon-based interface (System app)
- **SelectedInstallationLauncher/** - Quick launch window for selected installation
- **UserProfileApp/** - User profile viewer demonstrating `useAuth()` hook usage

## Real-World Examples

### InstallationLauncher (CalWin Launcher)
A full-featured system app that displays all CalWin installations with icons and launch functionality.

```typescript
export const InstallationLauncherApp: CustomAppDefinition = {
  id: 'installation-launcher',
  name: 'CalWin Launcher',
  icon: 'box',
  component: InstallationLauncherComponent,
  description: 'Launch CalWin installations with an icon-based interface',
  version: '1.0.0',
  category: 'System',
  author: 'CalWin Solutions',
  windowOptions: {
    minWidth: 500,
    minHeight: 400,
    defaultWidth: 950,
    defaultHeight: 540,
    resizable: true,
    maximizable: true,
  },
  permissions: {
    canReadWorkspace: true,
    canAccessAPI: true,
    canAccessAllInstallations: true,
  },
};
```

### UserProfileApp
Demonstrates how to use the `useAuth()` hook to access authentication state:

```typescript
// Inside the component
const { userInfo, userEmail, logout, isAuthenticated } = useAuth();
```

## Need Help?

Refer to the main documentation or check existing custom apps for examples.

---

## App Settings System

The workbench includes a powerful **App Settings** system that allows users to customize app behavior and appearance.

### What Users Can Configure

1. **Window Size & Position**
   - Set default width and height for each app
   - Set default X/Y position on screen
   - Changes apply when app is opened
   - Manual drag/resize is auto-saved

2. **Behavior Settings**
   - Enable/disable overflow scrolling per app
   - Auto-save window position on drag/resize

3. **App Ordering**
   - Reorder apps in the taskbar
   - First app (Start CalWin) is always locked in first position

4. **Admin Features** (for users in "Administrator" Cognito group)
   - Copy settings to other installations
   - Reset all settings to defaults

### How Settings Work

Settings are stored in localStorage with per-installation isolation:
- Key format: `calwin-app-settings-{installationId}`
- Each installation has independent settings
- Settings persist through logout/login

### Auto-Save Behavior

When a user manually drags or resizes a window:
1. The new position/size is applied immediately
2. Settings are updated in real-time (on every move/resize)
3. Final save happens on drag/resize end
4. Next time the app opens, it uses the saved position/size

This means users can:
- Set defaults in the Settings UI
- Fine-tune by dragging/resizing windows
- Everything is saved automatically

### Accessing Settings in Your App

Your app automatically gets its settings applied by the workbench. The `windowOptions` in your app definition serve as **fallback defaults** when no user settings exist.

```typescript
// Your app definition
windowOptions: {
  minWidth: 300,          // Hard minimum (cannot go below this)
  minHeight: 400,         // Hard minimum
  defaultWidth: 600,      // Used if no user settings exist
  defaultHeight: 500,     // Used if no user settings exist
  resizable: true,
  maximizable: true,
  enableOverflow: true,   // User can override this per-app
}
```

### Settings UI

Users access settings via the **Innstillinger** (Settings) icon in the taskbar (bottom-right corner). The Settings app provides:

- List of all apps with current settings
- Expandable panels for detailed configuration
- "Kopier" (Copy) button to copy settings to other installations (admin only)
- "Tilbakestill alle" (Reset All) button to restore defaults
- Visual feedback when settings are saved ("Lagret!" message)

### Developer Considerations

1. **Min/Max Sizes**: Always set reasonable `minWidth` and `minHeight` to prevent tiny windows
2. **Default Sizes**: Choose defaults that work well on most screens (600x500 is a good starting point)
3. **Overflow**: Set `enableOverflow: true` if your app content can scroll, `false` for fixed layouts
4. **Testing**: Test your app at different window sizes to ensure responsive design

### Norwegian UI Text

All UI elements use Norwegian:
- "Innstillinger" = Settings
- "Standardvindustørrelse" = Default Window Size
- "Bredde/Høyde" = Width/Height
- "Oppførsel" = Behavior
- "Aktiver scrolling" = Enable scrolling
- "Lagret!" = Saved!

