import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { 
  WorkspaceContextValue, 
  WorkspaceState, 
  WindowState,
  WindowControlAPI,
  OpenAppInstance
} from '../types/workspace';
import type { NormalizedInstallation } from '../types/installations';

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

interface WorkspaceProviderProps {
  children: React.ReactNode;
  availableWorkspaces: NormalizedInstallation[];
  initialWorkspace?: NormalizedInstallation | null;
}

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({
  children,
  availableWorkspaces,
  initialWorkspace = null
}) => {
  const [state, setState] = useState<WorkspaceState>({
    currentWorkspace: initialWorkspace,
    availableWorkspaces,
    openApps: [],
    isLoading: false,
    error: null
  });

  // Update available workspaces when they change
  React.useEffect(() => {
    setState(prev => ({
      ...prev,
      availableWorkspaces
    }));
  }, [availableWorkspaces]);

  // Switch to a different workspace
  const switchWorkspace = useCallback((installation: NormalizedInstallation) => {
    console.log('Switching workspace to:', installation.name);
    setState(prev => ({
      ...prev,
      currentWorkspace: installation,
      isLoading: true,
      // Optionally close all apps when switching workspace
      // openApps: [],
    }));

    // Simulate brief loading for smooth transition
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        isLoading: false
      }));
    }, 300);
  }, []);

  // Open an app in the workspace
  const openApp = useCallback((appId: string) => {
    setState(prev => {
      // Check if app is already open (for single-app mode)
      const existingApp = prev.openApps.find(app => app.appId === appId);
      if (existingApp) {
        // Bring to front by updating z-index
        return {
          ...prev,
          openApps: prev.openApps.map(app => ({
            ...app,
            windowState: {
              ...app.windowState,
              zIndex: app.instanceId === existingApp.instanceId 
                ? Math.max(...prev.openApps.map(a => a.windowState.zIndex)) + 1
                : app.windowState.zIndex
            }
          }))
        };
      }

      // Create new app instance
      const instanceId = `${appId}-${Date.now()}`;
      console.log('Opening app:', appId, 'Instance:', instanceId);
      
      const newApp: OpenAppInstance = {
        instanceId,
        appId,
        windowState: {
          x: 100,
          y: 100,
          width: 600,
          height: 500,
          isMinimized: false,
          isMaximized: false,
          zIndex: Math.max(0, ...prev.openApps.map(a => a.windowState.zIndex)) + 1
        }
      };

      return {
        ...prev,
        openApps: [...prev.openApps, newApp]
      };
    });
  }, []);

  // Close an app instance
  const closeApp = useCallback((instanceId: string) => {
    setState(prev => ({
      ...prev,
      openApps: prev.openApps.filter(app => app.instanceId !== instanceId)
    }));
  }, []);

  // Update window state for an app
  const updateWindowState = useCallback((instanceId: string, updates: Partial<WindowState>) => {
    setState(prev => ({
      ...prev,
      openApps: prev.openApps.map(app =>
        app.instanceId === instanceId
          ? { ...app, windowState: { ...app.windowState, ...updates } }
          : app
      )
    }));
  }, []);

  // Get window control API for a specific app instance
  const getWindowControl = useCallback((instanceId: string): WindowControlAPI => {
    return {
      close: () => closeApp(instanceId),
      
      minimize: () => updateWindowState(instanceId, { 
        isMinimized: true 
      }),
      
      toggleMaximize: () => {
        const app = state.openApps.find(a => a.instanceId === instanceId);
        if (app) {
          updateWindowState(instanceId, { 
            isMaximized: !app.windowState.isMaximized 
          });
        }
      },
      
      resize: (width: number, height: number) => {
        updateWindowState(instanceId, { width, height });
      },
      
      move: (x: number, y: number) => {
        updateWindowState(instanceId, { x, y });
      }
    };
  }, [state.openApps, closeApp, updateWindowState]);

  const contextValue: WorkspaceContextValue = useMemo(() => ({
    state,
    switchWorkspace,
    openApp,
    closeApp,
    getWindowControl
  }), [state, switchWorkspace, openApp, closeApp, getWindowControl]);

  return (
    <WorkspaceContext.Provider value={contextValue}>
      {children}
    </WorkspaceContext.Provider>
  );
};

/**
 * Hook to access workspace context
 * Must be used within WorkspaceProvider
 */
export const useWorkspace = (): WorkspaceContextValue => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
};
