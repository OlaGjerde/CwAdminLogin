# AWS Login Manager

A modern web application for managing AWS Cognito authentication and workspace installations. Built with React, TypeScript, Vite, and DevExtreme 25.1.

## Features

- 🔐 **AWS Cognito Authentication**: Secure OAuth2 login with PKCE
- 🚀 **Workspace Management**: Launch and manage multiple workspaces
- 📱 **Modern UI**: Built with DevExtreme components
- 🔄 **Automatic Token Refresh**: Seamless session management
- 📦 **Installation Manager**: View and launch installations

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
