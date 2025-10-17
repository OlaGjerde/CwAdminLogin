# AppInstaller Functionality - Temporarily Disabled

## Overview
All `.appinstaller` download functionality has been commented out and disabled in the codebase. The code is preserved for future use but is not active in the running application.

## Changes Made

### 1. `src/config.ts`
- **Commented out**: `APPINSTALLER_URLS` constant and its export
- **Status**: Configuration remains in file but is not accessible
- **Location**: Lines 7-11

### 2. `src/components/AppGrid.tsx`
- **Removed imports**: `APPINSTALLER_URLS` and `Button` from devextreme-react
- **Commented out props**: 
  - `downloadAvailableUrl`
  - `downloadAvailableType`
  - `clearPerTypeFallback`
  - `setShowDownloadModal`
  - `fallbackRefs`
- **Commented out UI**: Download fallback section with "Last ned .appinstaller" button
- **Status**: Component still renders app cards, but without download fallback UI

### 3. `src/components/InstallationsList.tsx`
- **Removed imports**: `APPINSTALLER_URLS` and `Button` from devextreme-react
- **Commented out props**:
  - `installationFallbackId`
  - `installationFallbackUrl`
  - `setShowDownloadModal`
- **Set placeholder**: `installerUrl` now set to empty string instead of APPINSTALLER_URLS
- **Commented out UI**: Installation-specific download fallback section
- **Status**: Installations list still works, protocol handlers still launch, but no download UI shown

### 4. `src/CwAdminLogin.tsx`
- **Removed import**: `useRef` from React
- **Commented out state**:
  - `downloadAvailableUrl`
  - `downloadAvailableType`
  - `showDownloadModal`
  - `fallbackRefs`
- **Modified**: `requestLaunch` function now ignores fallback parameters (prefixed with `_`)
- **Commented out**:
  - Download modal UI (entire modal with installation instructions)
  - Fallback scroll behavior useEffect
  - Props passed to AppGrid and InstallationsList related to fallback UI
- **Status**: Main component still functional, apps launch via protocol handlers

## What Still Works

✅ **Protocol Handlers**: Apps still launch using `calwin://`, `calwintest://`, and `calwindev://` protocols
✅ **Authentication**: Login, signup, MFA, and OAuth flows unchanged
✅ **Installations List**: Users can still see and launch installations
✅ **Token Management**: Access and refresh token handling unchanged
✅ **App Cards**: CalWin Prod, Test, and Dev cards still render and are clickable

## What's Disabled

❌ **Download Fallback UI**: No "Last ned .appinstaller" button shown
❌ **Installation Instructions Modal**: Modal with step-by-step instructions removed
❌ **Manual Download Links**: No way to manually download .appinstaller files through UI
❌ **Fallback on Protocol Failure**: When protocol handler fails, no alternative offered

## How to Re-enable

To restore appinstaller functionality:

1. **Uncomment in `src/config.ts`**:
   - Uncomment `APPINSTALLER_URLS` export
   - Add back to default export object

2. **Uncomment in `src/components/AppGrid.tsx`**:
   - Restore `APPINSTALLER_URLS` and `Button` imports
   - Restore all commented props in interface and component
   - Uncomment download fallback JSX section

3. **Uncomment in `src/components/InstallationsList.tsx`**:
   - Restore `APPINSTALLER_URLS` and `Button` imports
   - Restore all commented props
   - Restore actual APPINSTALLER_URLS usage (remove placeholder)
   - Uncomment installation fallback JSX section

4. **Uncomment in `src/CwAdminLogin.tsx`**:
   - Restore `useRef` import
   - Uncomment all state variables
   - Restore `requestLaunch` implementation
   - Uncomment fallback scroll useEffect
   - Restore all props passed to child components
   - Uncomment download modal JSX

## Notes

- All code is preserved with clear `DISABLED` comments
- Protocol handlers continue to work normally
- Users who already have the app installed won't notice any change
- New users without the app installed will see "Ikke installert" message but no download option
- This is a temporary change - code can be quickly re-enabled when needed

## Date Disabled
October 2, 2025

## Reason
Per user request to remove appinstaller functionality from running code while preserving it for future use.
