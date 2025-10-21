import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { 
  WorkspaceContextValue, 
  WorkspaceState, 
  WindowState,
  WindowControlAPI,
  OpenAppInstance
} from '../types/workspace';
import type { NormalizedInstallation } from '../types/installations';
import { getCustomAppById } from '../registry/custom-apps';
import { logDebug, logError } from '../utils/logger';

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const SELECTED_WORKSPACE_KEY = 'calwin-selected-workspace';

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
  // Try to restore previously selected workspace from localStorage
  const getInitialWorkspace = (): NormalizedInstallation | null => {
    if (initialWorkspace) return initialWorkspace;
    
    try {
      const saved = localStorage.getItem(SELECTED_WORKSPACE_KEY);
      if (saved) {
        const savedId = JSON.parse(saved);
        const workspace = availableWorkspaces.find(w => w.id === savedId);
        if (workspace) {
          logDebug('Restored workspace from localStorage:', workspace.name);
          return workspace;
        }
      }
    } catch (error) {
      logError('Failed to restore workspace from localStorage:', error);
    }
    
    return null;
  };

  const [state, setState] = useState<WorkspaceState>({
    currentWorkspace: getInitialWorkspace(),
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

  // Restore workspace from localStorage when installations become available
  React.useEffect(() => {
    if (availableWorkspaces.length > 0 && !state.currentWorkspace) {
      try {
        const saved = localStorage.getItem(SELECTED_WORKSPACE_KEY);
        if (saved) {
          const savedId = JSON.parse(saved);
          const workspace = availableWorkspaces.find(w => w.id === savedId);
          if (workspace) {
            logDebug('Restoring workspace after installations loaded:', workspace.name);
            setState(prev => ({
              ...prev,
              currentWorkspace: workspace
            }));
          }
        }
      } catch (error) {
        logError('Failed to restore workspace:', error);
      }
    }
  }, [availableWorkspaces, state.currentWorkspace]);

  // Switch to a different workspace (or null to clear selection)
  const switchWorkspace = useCallback((installation: NormalizedInstallation | null) => {
    logDebug('Switching workspace to:', installation?.name || 'none (cleared)');
    
    // Persist to localStorage
    try {
      if (installation) {
        localStorage.setItem(SELECTED_WORKSPACE_KEY, JSON.stringify(installation.id));
      } else {
        localStorage.removeItem(SELECTED_WORKSPACE_KEY);
      }
    } catch (error) {
      logError('Failed to persist workspace to localStorage:', error);
    }
    
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
      logDebug('Opening app:', appId, 'Instance:', instanceId);
      
      // Get app definition to read window options
      const appDef = getCustomAppById(appId);
      const windowOptions = appDef?.windowOptions || {};
      
      // Use window options from app definition with fallbacks
      // Note: WorkbenchArea will apply settings overrides when rendering
      const defaultWidth = windowOptions.defaultWidth || 600;
      const defaultHeight = windowOptions.defaultHeight || 500;
      const defaultX = 100;
      const defaultY = 100;
      
      const newApp: OpenAppInstance = {
        instanceId,
        appId,
        windowState: {
          x: defaultX,
          y: defaultY,
          width: defaultWidth,
          height: defaultHeight,
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
      
      minimize: () => {
        const app = state.openApps.find(a => a.instanceId === instanceId);
        if (app) {
          // Toggle minimize state
          updateWindowState(instanceId, { 
            isMinimized: !app.windowState.isMinimized 
          });
        }
      },
      
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
// eslint-disable-next-line react-refresh/only-export-components
export const useWorkspace = (): WorkspaceContextValue => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
};
