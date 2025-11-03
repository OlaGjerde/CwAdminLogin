# CalWin Admin Login - Documentation

This directory contains all documentation files for the CalWin Admin Login application.

## Documentation Structure

### Authentication & Security
- **AUTH_CONTEXT_IMPLEMENTATION.md** - Authentication context setup and implementation
- **AUTH_CONTEXT_USAGE.md** - Guide for using authentication in components
- **CSP_CONFIGURATION.md** - Content Security Policy setup
- **CSP_IMPLEMENTATION_SUMMARY.md** - CSP implementation details
- **CSP_TESTING_GUIDE.md** - How to test CSP configuration

### Production Deployment
- **PRODUCTION_MIGRATION_PLAN.md** - **📋 MAIN GUIDE** - Complete production migration checklist
  - Frontend config (URLs, environment variables)
  - Backend config (CORS, cookies, SameSite)
  - AWS Cognito setup (callback/logout URLs)
  - Troubleshooting common issues
- **BACKEND_PRODUCTION_CONFIG.md** - Backend configuration details

### Features & Configuration
- **PROTOCOL_HANDLER_FALLBACK.md** - Protocol handler implementation (calwin://)
- **CHANGELOG.md** - Version history and changes

## Main Documentation

See [../README.md](../README.md) for the main project README with:
- User features (App Settings, workspace management)
- Development guide
- Technology stack
- Custom app development

## For Developers

- **Creating Custom Apps**: See [../src/custom-apps/README.md](../src/custom-apps/README.md)
- **App Settings System**: Documented in custom-apps README
- **Authentication**: Start with AUTH_CONTEXT_USAGE.md for practical examples

