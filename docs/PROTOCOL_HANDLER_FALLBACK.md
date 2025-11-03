# Protocol Handler Fallback - Installation Link & Toast

## Overview
The application provides two mechanisms for handling missing CalWin installations:
1. **Always-visible download link** - Permanently displayed at the bottom of the logged-in view
2. **Toast notification** - Appears temporarily when a protocol handler launch fails

## Changes Made

### 1. `src/config.ts`
**Added new constant:**
```typescript
export const INSTALLER_DOWNLOAD_URL = 'https://calwinmedia-dev.calwincloud.com/CalWin8.appinstaller';
```

- This URL is easily configurable
- Added to the default export object
- Can be changed as needed for different environments

### 2. `src/CwAdminLogin.tsx`
**Imported the new constant:**
```typescript
import { COGNITO_REDIRECT_URI, INSTALLER_DOWNLOAD_URL } from './config';
```

**Added always-visible installer link:**
- Permanently displayed at bottom of logged-in view
- Positioned above the logout button
- Contains:
  - Label: "Mangler CalWin?"
  - Download button: "📥 Installer CalWin"
  - Subtle gray styling to not be intrusive

**Added toast notification:**
- Shows when `launchMessage` contains "Ikke installert"
- Auto-dismisses after 5 seconds
- Can be manually closed with X button
- Contains:
  - Warning icon: ⚠️
  - Title: "CalWin er ikke installert"
  - Message: "Last ned installasjonsprogrammet nedenfor for å komme i gang"

### 3. `src/CwAdminLogin.css`
**Added new CSS classes:**

**For always-visible link:**
- `.CwAdminLogin-installer-link-container` - Gray container box
- `.CwAdminLogin-installer-link-label` - Label text styling
- `.CwAdminLogin-installer-download-link-small` - Compact blue download button

**For toast notification:**
- `.CwAdminLogin-toast` - Main toast container (fixed position, bottom-left)
- `.CwAdminLogin-toast-icon` - Warning emoji styling
- `.CwAdminLogin-toast-content` - Content wrapper
- `.CwAdminLogin-toast-title` - Bold title text
- `.CwAdminLogin-toast-message` - Message text
- `.CwAdminLogin-toast-close` - Close button with hover effect
- `@keyframes slideInToast` - Smooth slide-in from left animation

## User Experience Flow

### Normal Login (CalWin Not Installed)
1. User logs in successfully
2. User sees apps/installations list
3. **At bottom:** Always-visible download link "Mangler CalWin? 📥 Installer CalWin"

### When User Tries to Launch
4. User clicks on a CalWin app card or installation
5. Browser attempts to open protocol handler (e.g., `calwindev://token`)
6. **If protocol fails:**
   - Browser console shows: "Failed to launch 'calwindev://...' because the scheme does not have a registered handler"
   - `useLauncher` hook detects failure (no visibility change or blur)
   - Sets `launchMessage` to "Ikke installert. Last ned installasjonsprogram under."
7. **UI Response:**
   - Toast notification slides in from bottom-left
   - Shows: "⚠️ CalWin er ikke installert" with message
   - Auto-dismisses after 5 seconds (or can be closed manually)
   - Download link remains visible at bottom
8. User clicks download link → Downloads .appinstaller file
9. User runs installer → CalWin gets installed
10. User returns to web app and tries again → Protocol now works

## Visual Design

### Always-Visible Download Link
- **Container:** Light gray background (#f8f9fa), subtle border
- **Label:** "Mangler CalWin?" in gray text
- **Button:** Compact blue button with download icon
- **Position:** At bottom of logged-in view, above logout button
- **Style:** Subtle, non-intrusive

### Toast Notification
- **Position:** Fixed, bottom-left corner (24px from edges)
- **Background:** White with orange left border (#ff9800)
- **Shadow:** Elevated with soft drop shadow
- **Icon:** ⚠️ warning emoji (24px)
- **Title:** Bold "CalWin er ikke installert"
- **Message:** Gray text with helpful instruction
- **Close Button:** X icon with hover effect
- **Animation:** Slides in from left with fade
- **Duration:** 5 seconds auto-dismiss
- **Mobile:** Responsive, stretches full width on small screens

### Download Button (in link)
- **Color:** CalWin blue (#1976d2)
- **Hover:** Darker blue (#1565c0) with lift effect
- **Shadow:** Subtle shadow that increases on hover
- **Icon:** 📥 (download emoji)
- **Size:** Compact (6px 14px padding)

## Configuration

To change the installer URL, simply edit `src/config.ts`:

```typescript
export const INSTALLER_DOWNLOAD_URL = 'https://your-new-url.com/installer.appinstaller';
```

Options:
- Prod: `'https://calwinmedia.calwincloud.com/CalWin8.appinstaller'`
- Test: `'https://calwinmedia-test.calwincloud.com/CalWin8.appinstaller'`
- Dev: `'https://calwinmedia-dev.calwincloud.com/CalWin8.appinstaller'` (current)

## Technical Details

### Detection Method
The `useLauncher` hook in `src/hooks/useLauncher.ts` uses a heuristic approach:
- Creates hidden iframe with protocol URI
- Listens for visibility change and window blur events
- If neither event fires within timeout (1800ms), assumes failure
- Sets appropriate failure message

### Display Conditions

**Always-Visible Link:**
- Always shown when user is logged in and viewing apps

**Toast Notification:**
```tsx
{showProtocolErrorToast && (
  // Show toast
)}
```

Toast appears when:
1. A launch was attempted
2. The launch failed due to missing protocol handler
3. The specific "Ikke installert" message is detected in `launchMessage`
4. Auto-dismisses after 5 seconds or on manual close

## Browser Compatibility

The protocol handler detection works across:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (macOS/iOS)
- ✅ Opera

## Date Implemented
October 2, 2025

## Related Files
- `src/config.ts` - Installer URL configuration
- `src/CwAdminLogin.tsx` - Main component with fallback UI
- `src/CwAdminLogin.css` - Styling for installer notice
- `src/hooks/useLauncher.ts` - Protocol launch detection logic
