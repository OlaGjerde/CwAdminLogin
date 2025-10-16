# Testing Plan - AWS Cognito Migration

## Phase 9: Final Testing Checklist

### Build & Compilation ✅
- [✅] TypeScript compilation passes
- [✅] Production build succeeds
- [✅] No console errors during build
- [✅] Bundle size acceptable (1.06 MB JS, 676 KB CSS)

### Authentication Flow Testing
#### Initial Load
- [ ] Fresh user redirected to Cognito login
- [ ] OAuth parameters properly generated (code_challenge, state)
- [ ] PKCE data stored in sessionStorage
- [ ] Redirect to auth.calwincloud.com works

#### Login Process
- [ ] Cognito login page displays correctly
- [ ] Username/password authentication works
- [ ] MFA handled by Cognito (if enabled)
- [ ] Authorization code returned in URL
- [ ] Code exchange for tokens succeeds
- [ ] Tokens stored in localStorage
- [ ] User authenticated after callback
- [ ] PKCE data cleared from sessionStorage

#### Token Management
- [ ] Access token retrieved correctly
- [ ] ID token contains user email
- [ ] Token expiration check works
- [ ] Automatic refresh triggers before expiration
- [ ] Refresh token used correctly
- [ ] Failed refresh triggers logout
- [ ] New tokens saved to localStorage

#### Session Persistence
- [ ] Tokens loaded from localStorage on page load
- [ ] User stays authenticated after refresh
- [ ] Expired tokens trigger auto-refresh
- [ ] Invalid tokens trigger re-login

#### Logout
- [ ] Logout button works
- [ ] Tokens cleared from localStorage
- [ ] PKCE data cleared from sessionStorage
- [ ] Redirect to Cognito logout page
- [ ] Redirect back to app after logout
- [ ] User must re-authenticate

### UI/UX Testing
#### Loading States
- [ ] LoadIndicator displays during auth check
- [ ] Loading screen has proper styling
- [ ] Loading message displays: "Sjekker autentisering"
- [ ] Loading card centered and responsive

#### Error States
- [ ] Error screen displays on auth failure
- [ ] Warning icon (⚠️) visible
- [ ] Error message displays clearly
- [ ] "Prøv på nytt" button present
- [ ] Retry button triggers re-login
- [ ] Error card styled correctly

#### Authenticated State
- [ ] User email displays in UI
- [ ] Logout button accessible
- [ ] Installations load after auth
- [ ] Workspace selector functional
- [ ] Launch buttons work

### Security Testing
#### PKCE Implementation
- [ ] Code verifier is 43 characters (32 bytes base64url)
- [ ] Code challenge uses SHA-256
- [ ] Code challenge method is S256
- [ ] Verifier stored securely in sessionStorage
- [ ] Verifier cleared after token exchange

#### State Parameter
- [ ] State parameter is random (32 chars)
- [ ] State stored in sessionStorage
- [ ] State validated on callback
- [ ] Invalid state rejected
- [ ] State cleared after use

#### Token Security
- [ ] Access token is JWT format
- [ ] ID token is JWT format
- [ ] Tokens not exposed in URLs
- [ ] Tokens stored in localStorage (acceptable for SPA)
- [ ] No tokens logged to console (production)
- [ ] Expired tokens not used

### Error Handling
#### Network Errors
- [ ] Failed token exchange shows error
- [ ] Network timeout handled gracefully
- [ ] Retry mechanism available

#### Invalid Tokens
- [ ] Expired tokens trigger refresh
- [ ] Malformed tokens rejected
- [ ] Missing tokens trigger login

#### OAuth Errors
- [ ] Invalid state parameter handled
- [ ] Missing callback code handled
- [ ] Authorization errors displayed

### Cross-Browser Testing
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

### Responsive Design
- [ ] Mobile viewport (320px - 480px)
- [ ] Tablet viewport (768px - 1024px)
- [ ] Desktop viewport (1920px+)

### Performance Testing
- [ ] Initial load time acceptable
- [ ] OAuth redirect fast
- [ ] Token refresh doesn't block UI
- [ ] No memory leaks
- [ ] No excessive re-renders

### Integration Testing
#### Installations API
- [ ] fetchInstallations works with Cognito tokens
- [ ] Access token passed correctly
- [ ] API errors handled

#### Launch Functionality
- [ ] generateLaunchToken works
- [ ] Protocol handlers trigger
- [ ] Fallback mechanism works

### Console Logs Review
- [ ] Appropriate logging in development
- [ ] No sensitive data logged
- [ ] Emoji logs helpful for debugging
- [ ] Consider removing for production (optional)

### Documentation Verification
- [ ] COGNITO_AUTH.md accurate
- [ ] README.md up to date
- [ ] CHANGELOG.md complete
- [ ] Code comments clear
- [ ] Configuration values correct

## Test Results

### Automated Tests
```bash
# Build test
npm run build
# Expected: Success, no errors

# Type check (if available)
npm run type-check
# Expected: No TypeScript errors

# Lint (if available)
npm run lint
# Expected: No lint errors
```

### Manual Testing Notes

#### Test Environment
- Browser: _____________
- OS: _____________
- Cognito Domain: auth.calwincloud.com
- Client ID: 656e5ues1tvo5tk9e00u5f0ft3
- Region: eu-north-1

#### Test Results
- Date: _____________
- Tester: _____________
- Results: _____________

## Known Issues

1. **Fast Refresh Warning**: WorkspaceContext.tsx exports both component and hook
   - Impact: Development only (Fast Refresh limitation)
   - Resolution: Not critical, can be addressed later

2. **Stale TypeScript Errors**: useAuthFlow.ts shows errors in IDE
   - Impact: IDE only, file already deleted
   - Resolution: Clear TypeScript cache or restart IDE

3. **Bundle Size Warning**: Main chunk is 1.06 MB
   - Impact: Initial load time
   - Resolution: Code splitting can be added later if needed

## Production Readiness Checklist

- [ ] All critical tests pass
- [ ] No blocking issues
- [ ] Documentation complete
- [ ] CHANGELOG updated
- [ ] README updated
- [ ] Security review passed
- [ ] Performance acceptable
- [ ] Error handling robust
- [ ] User experience smooth

## Sign-off

- Developer: _____________
- Date: _____________
- Status: _____________
- Notes: _____________
