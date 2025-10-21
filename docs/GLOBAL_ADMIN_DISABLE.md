# Global Admin Disable Feature

**Branch**: `feature/global-admin-disable`  
**Commit**: `7fdb144`  
**Date**: 2025-10-21

## Problem

Admin users could toggle apps enabled/disabled, but it only affected their own settings. The toggle was stored in their personal localStorage, not globally for all users.

## Solution

Implemented a **global disabled apps list** that admin users can control, which affects ALL users across the application.

## Architecture

### Storage

- **Key**: `app-settings-global-disabled`
- **Value**: `string[]` (array of disabled app IDs)
- **Scope**: Shared across all users via localStorage
- **Protection**: First app (`selected-installation-launcher` / "Start CalWin") cannot be globally disabled

### Data Flow

```
Admin Toggle
    ↓
toggleGlobalAppDisabled(appId, disabled)
    ↓
localStorage['app-settings-global-disabled'] = [...disabledApps]
    ↓
ALL Users: WorkbenchArea checks isAppGloballyDisabled(appId)
    ↓
If globally disabled: Hide app from taskbar
```

## Implementation Details

### 1. Config.ts - Utility Functions

```typescript
// Get globally disabled apps
getGloballyDisabledApps(): string[]

// Set globally disabled apps (admin only)
setGloballyDisabledApps(appIds: string[]): void

// Check if app is globally disabled
isAppGloballyDisabled(appId: string): boolean

// Toggle global disabled state (admin only)
toggleGlobalAppDisabled(appId: string, disabled: boolean): void
```

### 2. AppSettingsContext - Context Methods

Added three new methods to the context:

```typescript
interface AppSettingsContextValue {
  // ... existing methods
  
  /** Admin: Check if an app is globally disabled for ALL users */
  isAppGloballyDisabled: (appId: string) => boolean;
  
  /** Admin: Toggle global disabled state for an app (affects ALL users) */
  toggleGlobalAppDisabled: (appId: string, disabled: boolean) => void;
  
  /** Admin: Get list of all globally disabled app IDs */
  getGloballyDisabledApps: () => string[];
}
```

### 3. WorkbenchArea - Filter Logic

Updated app filtering to check global disabled state:

```typescript
allApps.filter(app => {
  // Exclude app-settings
  if (app.id === 'app-settings') return false;
  
  // First app always enabled
  if (app.id === 'selected-installation-launcher') return true;
  
  // ⭐ Check global disabled (affects ALL users)
  if (isAppGloballyDisabled(app.id)) {
    return false;
  }
  
  // Check user's personal settings
  const settings = getAppSettings(app.id);
  return settings?.enabled ?? true;
})
```

### 4. AppSettingsApp - Admin Toggle

Updated toggle handler to use global disable for admin:

```typescript
const handleToggleEnabled = useCallback((appId: string, enabled: boolean) => {
  if (isAdmin) {
    // Admin: Toggle global (affects ALL users)
    toggleGlobalAppDisabled(appId, !enabled);
  } else {
    // Regular user: Toggle personal setting
    updateAppSettings(appId, { enabled });
  }
  showSavedFeedback();
}, [isAdmin, toggleGlobalAppDisabled, updateAppSettings]);
```

Updated UI to show correct state for admin:

```typescript
// For admin: show global disabled state
// For users: show personal enabled setting
const isEnabled = isAdmin 
  ? !isAppGloballyDisabled(app.id)
  : settings.enabled;
```

### 5. UI Changes

**Admin Notice** (appears for admin users only):
```
ℹ️ Admin Mode: When you disable an app, it will be hidden for ALL users.
```

**Checkbox Label** (for admin users):
- Before: "Enabled"
- After: "Enabled (All Users)"

## User Experience

### For Admin Users

1. Open Settings
2. See yellow admin notice at top
3. Toggle "Enabled (All Users)" checkbox
4. App is immediately hidden/shown for ALL users
5. See "✓ Saved!" confirmation

### For Regular Users

1. If admin disables an app → App disappears from taskbar
2. If admin enables an app → App appears in taskbar
3. Personal settings (size, position) remain unchanged
4. Cannot override admin's global disable

## Protection

The first app (`selected-installation-launcher` / "Start CalWin") is protected:
- Cannot be globally disabled by admin
- Always appears first in taskbar
- Always enabled for all users

## Testing Checklist

- [ ] Admin can disable an app
- [ ] Disabled app disappears for ALL users (including admin)
- [ ] Admin can re-enable app
- [ ] Re-enabled app appears for ALL users
- [ ] First app cannot be globally disabled
- [ ] Regular users cannot see or modify global settings
- [ ] Personal settings (size, position) persist when app is disabled/enabled
- [ ] "Saved!" indicator appears on toggle
- [ ] Admin notice displays correctly

## Files Modified

1. `src/config.ts` - Added global disable utility functions
2. `src/contexts/AppSettingsContext.tsx` - Added global disable methods
3. `src/components/WorkbenchArea.tsx` - Added global disable check in filter
4. `src/custom-apps/AppSettingsApp/AppSettingsApp.tsx` - Updated toggle logic and UI
5. `src/custom-apps/AppSettingsApp/AppSettingsApp.css` - Added admin notice styles

## Migration

No migration needed. Existing installations will:
- Have empty global disabled list (all apps enabled)
- Preserve all existing per-user settings
- Work exactly as before until admin changes settings

## Future Enhancements

Consider moving global disabled apps to backend:
- Store in database instead of localStorage
- Sync across devices/browsers
- Add audit log for admin changes
- Add per-installation global settings
