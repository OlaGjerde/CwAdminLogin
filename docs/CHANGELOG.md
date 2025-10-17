# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Major Changes - AWS Cognito Migration

This release represents a complete migration from custom authentication forms to AWS Cognito Hosted UI.

#### Added
- **AWS Cognito Integration** (Phase 2-3)
  - `src/utils/cognitoHelpers.ts`: Complete OAuth2 + PKCE implementation (294 lines)
  - `src/hooks/useCognitoAuth.ts`: React hook for Cognito authentication (356 lines)
  - PKCE (Proof Key for Code Exchange) for enhanced security
  - State parameter for CSRF protection
  - JWT token decoding and validation
  - Token expiration checking

- **Token Persistence & Auto-Refresh** (Phase 6)
  - localStorage integration for token persistence
  - Automatic token refresh every 60 seconds
  - 5-minute expiration buffer for proactive refresh
  - Session restoration across page reloads
  - Graceful logout on refresh failure

- **Enhanced UI/UX** (Phase 7)
  - Professional loading screen with DevExtreme LoadIndicator
  - Improved error display with visual feedback
  - Clean card-based layouts with shadows
  - Responsive design with proper spacing
  - Better color scheme and typography
  - "Retry" button for error recovery

- **Documentation** (Phase 6)
  - `COGNITO_AUTH.md`: Comprehensive authentication guide (211 lines)
  - `CHANGELOG.md`: Project change tracking
  - Updated `README.md` with Cognito information
  - JSDoc comments throughout codebase

#### Removed
- **Custom Authentication Forms** (Phase 1, 5)
  - Deleted `src/components/LoginEmailForm.tsx` (194 lines)
  - Deleted `src/components/PasswordForm.tsx` (111 lines)
  - Deleted `src/components/SignupForm.tsx`
  - Deleted `src/components/AuthOverlay.tsx` (133 lines)
  - Deleted `src/CwAdminLogin.css`
  - Deleted `src/CwAdminLogin.tsx` (540 lines)
  - Deleted `src/hooks/useAuthFlow.ts` (200+ lines)
  - Deleted `src/hooks/useTokenRefresh.ts` (80+ lines)
  - **Total removed: 1,783 lines of custom auth code**

- **Obsolete Auth Functions** (Phase 5)
  - Removed from `src/api/auth.ts`: verifyEmail, signUp, login, respondToMfa, extractTokens, refreshTokens, exchangeCodeForTokens
  - Reduced from 108 lines to 26 lines (-76%)

#### Changed
- **Simplified App.tsx** (Phase 4, 7)
  - Removed 12 useState hooks for form state management
  - Removed password strength checking
  - Removed auth step management
  - Integrated single useCognitoAuth hook
  - Enhanced loading and error states
  - Net reduction: 162 lines

- **Security Improvements**
  - OAuth2 Authorization Code flow (industry standard)
  - PKCE prevents authorization code interception
  - State parameter prevents CSRF attacks
  - Tokens stored securely in localStorage
  - PKCE data in sessionStorage (cleared after use)
  - Automatic logout on token refresh failure

- **User Experience**
  - Eliminated form flickering issues
  - Removed complex password strength requirements
  - No more manual MFA code entry (handled by Cognito)
  - Seamless session persistence
  - Professional loading states
  - Better error messaging

#### Technical Details
- **OAuth2 Configuration**
  - Cognito Domain: `auth.calwincloud.com`
  - Client ID: `656e5ues1tvo5tk9e00u5f0ft3`
  - Region: `eu-north-1`
  - Response Type: `code` (Authorization Code flow)
  - Grant Type: `authorization_code`
  - Code Challenge Method: `S256` (SHA-256)

- **Code Statistics**
  - Files deleted: 8
  - Files created: 3
  - Net code reduction: **-1,395 lines**
  - Migration commits: 7 of 10 completed

#### Migration Phases
- ✅ Phase 1: Removed custom auth forms (b34eafd)
- ✅ Phase 2: Created Cognito utilities (5e3d52f)
- ✅ Phase 3: Created useCognitoAuth hook (655f8bc)
- ✅ Phase 4: Simplified App.tsx (0f66638)
- ✅ Phase 5: Removed obsolete hooks (ad5563e)
- ✅ Phase 6: Token persistence & docs (859b432)
- ✅ Phase 7: Enhanced UI/UX (1fada1e)
- 🔄 Phase 8: Code cleanup & optimization (in progress)
- ⏳ Phase 9: Final testing
- ⏳ Phase 10: Finalize & merge preparation

### Benefits
- **Security**: Industry-standard OAuth2 + PKCE implementation
- **Maintainability**: 1,395 fewer lines to maintain
- **User Experience**: Professional UI, no form flickering
- **Reliability**: AWS-managed authentication infrastructure
- **Scalability**: Cognito handles all auth complexity

---

## Previous Versions

### Pre-Cognito (before Migration)
- Custom authentication forms with email/password
- Manual MFA code entry
- Custom token management
- Password strength requirements
- Form state management with multiple hooks
