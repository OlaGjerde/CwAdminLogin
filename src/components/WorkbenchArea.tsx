import React from 'react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { AppIcon } from './AppIcon';
import { WindowContainer } from './WindowContainer';
import type { AppDefinition, CustomAppProps } from '../types/custom-app';
import { customAppRegistry } from '../registry/custom-apps';
import './WorkbenchArea.css';

interface WorkbenchAreaProps {
  /** Authentication tokens to pass to apps */
  authTokens: { accessToken: string; refreshToken: string } | null;
  /** Available apps (system + custom) */
  availableApps?: AppDefinition[];
}

export const WorkbenchArea: React.FC<WorkbenchAreaProps> = ({
  authTokens,
  availableApps = []
}) => {
  const workspace = useWorkspace();
  const { state, openApp, closeApp, getWindowControl } = workspace;

  // Combine custom apps with any provided system apps
  const allApps = React.useMemo(() => {
    return [...customAppRegistry, ...availableApps];
  }, [availableApps]);

  // Handle app icon click
  const handleAppClick = (appId: string) => {
    console.log('App icon clicked:', appId);
    openApp(appId);
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

  return (
    <div className="workbench-area">
      {/* Open App Windows - Full Screen */}
      <div className="workbench-windows-container">
        {state.openApps.map(openApp => {
          const appDef = allApps.find(a => a.id === openApp.appId);
          if (!appDef) return null;

          const AppComponent = appDef.component;
          const windowControl = getWindowControl(openApp.instanceId);

          const appProps: CustomAppProps = {
            workspace: state.currentWorkspace,
            authTokens,
            installations: state.availableWorkspaces,
            windowControl,
            instanceId: openApp.instanceId
          };

          return (
            <WindowContainer
              key={openApp.instanceId}
              title={appDef.name}
              windowState={openApp.windowState}
              minWidth={appDef.windowOptions?.minWidth}
              minHeight={appDef.windowOptions?.minHeight}
              resizable={appDef.windowOptions?.resizable ?? true}
              maximizable={appDef.windowOptions?.maximizable ?? true}
              onClose={() => closeApp(openApp.instanceId)}
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
        {allApps.length === 0 ? (
          <div className="workbench-empty-state">
            <i className="dx-icon dx-icon-box" style={{ fontSize: 32, color: '#ccc' }} />
            <p>No apps available</p>
          </div>
        ) : (
          allApps.map(app => (
            <AppIcon
              key={app.id}
              app={app}
              onClick={() => handleAppClick(app.id)}
              disabled={false}
            />
          ))
        )}
      </div>
    </div>
  );
};
