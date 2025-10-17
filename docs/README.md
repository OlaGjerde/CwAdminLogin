# CalWin Admin Login - Documentation

This directory contains all documentation files for the CalWin Admin Login application.

## Documentation Structure

### Authentication & Security
- **CSP_CONFIGURATION.md** - Content Security Policy setup
- **CSP_IMPLEMENTATION_SUMMARY.md** - CSP implementation details
- **CSP_TESTING_GUIDE.md** - How to test CSP configuration

### Production Deployment
- **PRODUCTION_MIGRATION_PLAN.md** - **📋 MAIN GUIDE** - Complete production migration checklist
  - Frontend config (URLs, environment variables)
  - Backend config (CORS, cookies, SameSite)
  - AWS Cognito setup (callback/logout URLs)
  - Logger cleanup and production readiness
  - Troubleshooting common issues

### Features & Configuration
- **PROTOCOL_HANDLER_FALLBACK.md** - Protocol handler implementation
- **APPINSTALLER_DISABLED.md** - AppInstaller feature documentation
- **TESTING_PLAN.md** - Testing strategy and plans
- **CHANGELOG.md** - Version history and changes
- **REPLACE_CONSOLE_LOGS.md** - Guide for replacing console statements with logger
- **STOP_LOOP.md** - Debugging infinite loop issues

### Archive
The `archive/` directory contains deprecated or disabled code that may be useful for reference:
- **axiosInterceptors.ts** - Token refresh interceptor (RE-ENABLED in latest version)

## Main Documentation

See [../README.md](../README.md) for the main project README.
