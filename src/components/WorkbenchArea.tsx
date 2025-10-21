import React from 'react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { AppIcon } from './AppIcon';
import { WindowContainer } from './WindowContainer';
import type { AppDefinition, CustomAppProps } from '../types/custom-app';
import { customAppRegistry } from '../registry/custom-apps';
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

  // Combine custom apps with any provided system apps
  const allApps = React.useMemo(() => {
    const apps = [...customAppRegistry, ...availableApps];
    // Sort apps: selected-installation-launcher first, then others
    return apps.sort((a, b) => {
      if (a.id === 'selected-installation-launcher') return -1;
      if (b.id === 'selected-installation-launcher') return 1;
      return 0;
    });
  }, [availableApps]);

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
              windowState={openApp.windowState}
              minWidth={appDef.windowOptions?.minWidth}
              minHeight={appDef.windowOptions?.minHeight}
              resizable={appDef.windowOptions?.resizable ?? true}
              maximizable={appDef.windowOptions?.maximizable ?? true}
              enableOverflow={appDef.windowOptions?.enableOverflow ?? true}
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
        {/* Regular Apps */}
        {allApps.length === 0 ? (
          <div className="workbench-empty-state">
            <i className="dx-icon dx-icon-box" style={{ fontSize: 32, color: '#ccc' }} />
            <p>No apps available</p>
          </div>
        ) : (
          allApps.map(app => {
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
      </div>
    </div>
  );
};
