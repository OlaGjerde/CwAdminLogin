import React, { useState } from 'react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { AppIcon } from './AppIcon';
import { WindowContainer } from './WindowContainer';
import type { AppDefinition, CustomAppProps } from '../types/custom-app';
import { customAppRegistry } from '../registry/custom-apps';
import { PROTOCOL_CALWIN, PROTOCOL_CALWIN_TEST, PROTOCOL_CALWIN_DEV } from '../config';
import notify from 'devextreme/ui/notify';
import './WorkbenchArea.css';

interface WorkbenchAreaProps {
  /** Available apps (system + custom) */
  availableApps?: AppDefinition[];
}

export const WorkbenchArea: React.FC<WorkbenchAreaProps> = ({
  availableApps = []
}) => {
  const workspace = useWorkspace();
  const { state, openApp, closeApp, getWindowControl } = workspace;
  const [isLaunching, setIsLaunching] = useState(false);

  // Combine custom apps with any provided system apps
  // Filter out StartInstallation app (we'll handle it separately as a button)
  const allApps = React.useMemo(() => {
    const apps = [...customAppRegistry, ...availableApps];
    return apps.filter(app => app.id !== 'start-installation');
  }, [availableApps]);

  // Handle direct launch of selected installation
  const handleLaunchInstallation = async () => {
    if (!state.currentWorkspace) {
      notify({
        message: 'No installation selected',
        type: 'warning',
        displayTime: 3000,
        position: { at: 'bottom center', my: 'bottom center', offset: '0 -120' }
      });
      return;
    }

    // ⭐ Cookie-based auth - no need to check authTokens
    // Backend will validate authentication via httpOnly cookies

    setIsLaunching(true);

    try {
      console.log('🚀 Launching installation:', state.currentWorkspace.name);
      
      // Import required modules
      const { createOneTimeToken } = await import('../api/auth');

      // Generate launch token using cookie-based auth (cookies sent automatically)
      console.log('Generating launch token...');
      const resp = await createOneTimeToken(state.currentWorkspace.id);
      
      if (resp.status !== 200) {
        throw new Error(`Failed to generate launch token: ${resp.status}`);
      }

      const data = resp.data;
      let token: string | null = null;
      
      // Handle various response formats
      if (typeof data === 'string') {
        token = data;
      } else {
        token = data.oneTimeToken || data.OneTimeToken || data.token || data.Token || data.linkToken || data.LinkToken || null;
      }
      
      if (!token) {
        throw new Error('No launch token received from server');
      }

      console.log('✅ Launch token received');

      // Determine protocol based on app type
      const protocol = state.currentWorkspace.appType === 0 
        ? PROTOCOL_CALWIN 
        : state.currentWorkspace.appType === 1 
        ? PROTOCOL_CALWIN_TEST 
        : PROTOCOL_CALWIN_DEV;
      
      const uri = `${protocol}${encodeURIComponent(token)}`;
      console.log('🔗 Launching with URI:', uri);
      
      // Try to launch via protocol handler
      const anchor = document.createElement('a');
      anchor.href = uri;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      console.log('✅ Launch initiated successfully');

    } catch (error) {
      console.error('❌ Launch failed:', error);
      notify({
        message: `Failed to launch: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error',
        displayTime: 4000,
        position: { at: 'bottom center', my: 'bottom center', offset: '0 -120' }
      });
    } finally {
      setIsLaunching(false);
    }
  };

  // Handle app icon click - restore if minimized, bring to front if open, or open new
  const handleAppClick = (appId: string) => {
    console.log('App icon clicked:', appId);
    
    // Check if app is already open
    const existingApp = state.openApps.find(app => app.appId === appId);
    
    if (existingApp) {
      // If minimized, restore it
      if (existingApp.windowState.isMinimized) {
        console.log('Restoring minimized app:', appId);
        const windowControl = getWindowControl(existingApp.instanceId);
        windowControl.minimize(); // Toggle minimize to restore
        // Also bring to front after restoring
        openApp(appId);
      } else {
        // Already visible, just bring to front
        console.log('Bringing app to front:', appId);
        openApp(appId);
      }
    } else {
      // Open new instance
      console.log('Opening new app instance:', appId);
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
            // ⭐ authTokens removed - using cookie-based auth now
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
        {/* Start CalWin Button - Only show when workspace is selected */}
        {state.currentWorkspace && (() => {
          // Get initials from installation name (first 2 letters)
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

          return (
            <AppIcon
              key="start-installation-button"
              app={{
                id: 'start-installation',
                name: 'Start CalWin',
                icon: getInstallationInitials(state.currentWorkspace.name),
                component: () => null
              }}
              onClick={handleLaunchInstallation}
              disabled={isLaunching}
              isLoading={isLaunching}
              className="start-installation"
            />
          );
        })()}
        
        {/* Regular Apps */}
        {allApps.length === 0 && !state.currentWorkspace ? (
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
