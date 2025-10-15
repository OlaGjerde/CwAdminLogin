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
  windowOptions: {
    minWidth: 300,
    minHeight: 400,
    defaultWidth: 600,
    defaultHeight: 500,
    resizable: true,
    maximizable: true
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
- **authTokens**: Authentication tokens for API calls ({ accessToken, refreshToken, idToken })
- **installations**: All available installations (NormalizedInstallation[])
- **windowControl**: API to control your app window
  - `close()`: Close the window
  - `minimize()`: Minimize the window
  - `toggleMaximize()`: Toggle maximize/restore
  - `resize(width, height)`: Resize the window
  - `move(x, y)`: Move the window
- **instanceId**: Unique ID for this app instance

## Window Options

Configure how your app window behaves:

- `minWidth`, `minHeight`: Minimum window dimensions
- `defaultWidth`, `defaultHeight`: Initial window size
- `resizable`: Can users resize the window (default: true)
- `maximizable`: Can users maximize the window (default: true)
- `initialPosition`: Starting position { x, y } (default: centered)

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
- `ExampleTodoApp/` - Simple todo list
- `ExampleNotesApp/` - Note-taking app

## Need Help?

Refer to the main documentation or check existing custom apps for examples.
