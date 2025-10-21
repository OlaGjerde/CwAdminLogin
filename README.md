# AWS Login Manager

A modern web application for managing AWS Cognito authentication and workspace installations. Built with React, TypeScript, Vite, and DevExtreme 25.1.

## Features

- 🔐 **AWS Cognito Authentication**: Secure OAuth2 login with PKCE
- 🚀 **Workspace Management**: Launch and manage multiple workspaces
- 📱 **Modern UI**: Built with DevExtreme components with flat, clean design
- 🔄 **Automatic Token Refresh**: Seamless session management
- 📦 **Installation Manager**: View and launch installations
- ⚙️ **App Settings**: Customize window sizes, positions, and behavior per app
- 🇳🇴 **Norwegian UI**: All user-facing text in Norwegian
- 🎨 **CalWin Branding**: CalWin logo and consistent branding throughout

## User Features

### App Settings (Innstillinger)

Users can customize their workspace experience through the Settings app:

- **Window Configuration**: Set default size and position for each app
- **Auto-save**: Window positions and sizes are automatically saved when dragging/resizing
- **Behavior Control**: Enable/disable scrolling per app
- **App Ordering**: Reorder apps in the taskbar (except the first app which is locked)
- **Per-Installation Settings**: Each installation maintains its own independent settings
- **Admin Features**: 
  - Copy settings to other installations
  - Reset all settings to defaults

Settings persist through logout/login and are stored per-installation in localStorage.

### Auto-Select Workspace

When a user has only one installation available, it is automatically selected and the CalWin launcher window opens automatically.

### Flat Window Design

Windows use a clean, flat design with subtle borders instead of heavy shadows for a modern look.

## Authentication

This application uses **AWS Cognito Hosted UI** for authentication with OAuth2 Authorization Code flow + PKCE.

For detailed authentication documentation, see [COGNITO_AUTH.md](./COGNITO_AUTH.md).

### Quick Overview
- Users are redirected to `auth.calwincloud.com` for login
- Multi-factor authentication (MFA) is handled by Cognito
- Tokens are automatically refreshed in the background
- Session persists across page reloads

## Technology Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **DevExtreme 25.1** for UI components
- **AWS Cognito** for authentication
- **OAuth2 + PKCE** for secure authorization

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Development

### Prerequisites

- Node.js 18+ and Yarn
- AWS Cognito configuration (see auth documentation)

### Getting Started

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build

# Deploy to AWS (builds + deploys to S3 + CloudFront invalidation)
yarn deploy
```

### Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── WorkbenchArea    # Main workspace container
│   ├── WindowContainer  # Draggable/resizable windows
│   └── ...
├── contexts/            # React Context providers
│   ├── AuthContext      # Authentication state
│   ├── WorkspaceContext # Workspace/window management
│   └── AppSettingsContext # User app settings
├── custom-apps/         # Custom applications
│   ├── AppSettingsApp/  # Settings UI
│   ├── InstallationLauncher/ # CalWin launcher
│   └── README.md        # Guide for creating custom apps
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
└── config.ts            # Application configuration
```

### Creating Custom Apps

See [src/custom-apps/README.md](./src/custom-apps/README.md) for a complete guide on creating custom applications.

### Key Technologies

- **React Context API**: State management for auth, workspace, and settings
- **DevExtreme Components**: Button, NumberBox, CheckBox, ScrollView, Popup, List
- **localStorage**: Per-installation settings and cache
- **TypeScript**: Full type safety throughout the codebase

### Branch Strategy

- `main`: Production-ready code
- `cognito-hosted-ui`: Active development branch
- `feature/*`: Feature branches for specific work

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
