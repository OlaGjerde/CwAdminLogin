import React from 'react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAppSettings } from '../contexts/AppSettingsContext';
import { AppIcon } from './AppIcon';
import { WindowContainer } from './WindowContainer';
import type { AppDefinition, CustomAppProps } from '../types/custom-app';
import type { WindowState } from '../types/workspace';
import { customAppRegistry } from '../registry/custom-apps';
import { AppSettingsApp } from '../custom-apps/AppSettingsApp';
import './WorkbenchArea.css';
import { logDebug } from '../utils/logger';

interface WorkbenchAreaProps {
  /** Available apps (system + custom) */
  availableApps?: AppDefinition[];
}

export const WorkbenchArea: React.FC<WorkbenchAreaProps> = ({
  availableApps = []
}) => {
  const workspace = useWorkspace();
  const { state, openApp, closeApp, getWindowControl } = workspace;
  const { getAppSettings, getAllSettings } = useAppSettings();

  // Combine custom apps with any provided system apps
  const allApps = React.useMemo(() => {
    // Include AppSettingsApp for internal use (not shown in taskbar)
    const apps = [...customAppRegistry, AppSettingsApp, ...availableApps];
    
    // Get all settings
    const allSettings = getAllSettings();
    
    // Sort apps by order from settings, then by default order
    // selected-installation-launcher (Start CalWin) is always first
    return apps.sort((a, b) => {
      // Always keep selected-installation-launcher first
      if (a.id === 'selected-installation-launcher') return -1;
      if (b.id === 'selected-installation-launcher') return 1;
      
      // Sort by order from settings
      const orderA = allSettings[a.id]?.order ?? 999;
      const orderB = allSettings[b.id]?.order ?? 999;
      
      return orderA - orderB;
    });
  }, [availableApps, getAllSettings]);

  // Handle app icon click - restore if minimized, bring to front if open, or open new
  const handleAppClick = (appId: string) => {
    logDebug('App icon clicked:', appId);
    
    // Check if app is already open
    const existingApp = state.openApps.find(app => app.appId === appId);
    
    if (existingApp) {
      // If minimized, restore it
      if (existingApp.windowState.isMinimized) {
        logDebug('Restoring minimized app:', appId);
        const windowControl = getWindowControl(existingApp.instanceId);
        windowControl.minimize(); // Toggle minimize to restore
        // Also bring to front after restoring
        openApp(appId);
      } else {
        // Already visible, just bring to front
        logDebug('Bringing app to front:', appId);
        openApp(appId);
      }
    } else {
      // Open new instance
      logDebug('Opening new app instance:', appId);
      openApp(appId);
    }
  };

  // Handle window focus
  const handleWindowFocus = (instanceId: string) => {
    // Bring window to front by updating z-index
    const maxZ = Math.max(0, ...state.openApps.map(a => a.windowState.zIndex));
    const app = state.openApps.find(a => a.instanceId === instanceId);
    if (app && app.windowState.zIndex < maxZ) {
      openApp(app.appId); // This will bring it to front
    }
  };

  // Get installation initials for dynamic icon
  const getInstallationInitials = (name: string): string => {
    const cleanName = name.replace(/[^\w\s]/g, '').trim();
    const words = cleanName.split(/\s+/);
    
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    } else if (words.length === 1 && words[0].length >= 2) {
      return words[0].substring(0, 2).toUpperCase();
    } else if (words.length === 1 && words[0].length === 1) {
      return words[0][0].toUpperCase();
    }
    
    return 'CW';
  };

  // Get dynamic app definition with workspace-based icon
  const getAppWithDynamicIcon = (app: AppDefinition): AppDefinition => {
    if (app.id === 'selected-installation-launcher' && state.currentWorkspace) {
      return {
        ...app,
        icon: getInstallationInitials(state.currentWorkspace.name)
      };
    }
    return app;
  };

  return (
    <div className="workbench-area">
      {/* Open App Windows - Full Screen */}
      <div className="workbench-windows-container">
        {state.openApps.map(openApp => {
          const appDef = allApps.find(a => a.id === openApp.appId);
          if (!appDef) return null;

          const AppComponent = appDef.component;
          const windowControl = getWindowControl(openApp.instanceId);

          // Get dynamic icon for the window
          const appWithIcon = getAppWithDynamicIcon(appDef);
          
          // Get app settings for overflow and other options
          const appSettings = getAppSettings(openApp.appId);
          
          // Apply user settings to window state
          const windowStateWithSettings: WindowState = {
            ...openApp.windowState,
            // Override size if user has saved preferences
            width: appSettings?.defaultSize?.width ?? openApp.windowState.width,
            height: appSettings?.defaultSize?.height ?? openApp.windowState.height,
            // Override position if user has saved preferences
            x: appSettings?.defaultPosition?.x ?? openApp.windowState.x,
            y: appSettings?.defaultPosition?.y ?? openApp.windowState.y,
          };
          
          // Determine enableOverflow: settings > app definition > default (true)
          const enableOverflow = appSettings?.enableOverflow 
            ?? appDef.windowOptions?.enableOverflow 
            ?? true;

          const appProps: CustomAppProps = {
            workspace: state.currentWorkspace,
            // ⭐ authTokens removed - using cookie-based auth now
            installations: state.availableWorkspaces,
            windowControl,
            instanceId: openApp.instanceId
          };

          return (
            <WindowContainer
              key={openApp.instanceId}
              title={appDef.name}
              icon={typeof appWithIcon.icon === 'string' ? appWithIcon.icon : undefined}
              windowState={windowStateWithSettings}
              minWidth={appDef.windowOptions?.minWidth}
              minHeight={appDef.windowOptions?.minHeight}
              resizable={appDef.windowOptions?.resizable ?? true}
              maximizable={appDef.windowOptions?.maximizable ?? true}
              enableOverflow={enableOverflow}
              onClose={() => {
                logDebug('🔘 Close button clicked for:', openApp.instanceId);
                closeApp(openApp.instanceId);
              }}
              onMinimize={windowControl.minimize}
              onToggleMaximize={windowControl.toggleMaximize}
              onResize={windowControl.resize}
              onMove={windowControl.move}
              onFocus={() => handleWindowFocus(openApp.instanceId)}
            >
              <AppComponent {...appProps} />
            </WindowContainer>
          );
        })}
      </div>

      {/* App Icons Taskbar at Bottom */}
      <div className="workbench-apps-grid">
        {/* Regular Apps (exclude app-settings which is opened via Settings button) */}
        {allApps.filter(app => app.id !== 'app-settings').length === 0 ? (
          <div className="workbench-empty-state">
            <i className="dx-icon dx-icon-box" style={{ fontSize: 32, color: '#ccc' }} />
            <p>No apps available</p>
          </div>
        ) : (
          allApps
            .filter(app => {
              // Exclude app-settings (opened via Settings button)
              if (app.id === 'app-settings') return false;
              
              // Check if app is enabled in settings
              const settings = getAppSettings(app.id);
              
              // Start CalWin (selected-installation-launcher) is always enabled
              if (app.id === 'selected-installation-launcher') return true;
              
              // If no settings yet, app is enabled by default
              if (!settings) return true;
              
              // Apply enabled/disabled setting
              return settings.enabled;
            })
            .map(app => {
              const appWithIcon = getAppWithDynamicIcon(app);
              return (
                <AppIcon
                  key={app.id}
                  app={appWithIcon}
                  onClick={() => handleAppClick(app.id)}
                  disabled={false}
                  className={app.id === 'selected-installation-launcher' ? 'launch-installation' : ''}
                />
              );
            })
        )}
        
        {/* Spacer to push Settings button to the right */}
        <div style={{ flex: 1 }} />
        
        {/* Settings Button - Bottom Right */}
        <AppIcon
          app={{
            id: 'app-settings',
            name: 'Settings',
            icon: 'preferences',
            component: () => null,
          }}
          onClick={() => handleAppClick('app-settings')}
          disabled={false}
          className="app-settings-icon"
        />
      </div>
    </div>
  );
};
