import type { NormalizedInstallation } from './installations';

/**
 * Workspace state interface
 * Represents the current active workspace and its configuration
 */
export interface WorkspaceState {
  /** Currently selected installation/workspace */
  currentWorkspace: NormalizedInstallation | null;
  /** Available installations that can be used as workspaces */
  availableWorkspaces: NormalizedInstallation[];
  /** Open apps in the current workspace */
  openApps: OpenAppInstance[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
}

/**
 * Represents an instance of an opened app
 */
export interface OpenAppInstance {
  /** Unique instance ID */
  instanceId: string;
  /** Reference to the app definition */
  appId: string;
  /** Window state for this instance */
  windowState: WindowState;
  /** App-specific state data */
  appData?: Record<string, unknown>;
}

/**
 * Window state for resizable windows
 */
export interface WindowState {
  /** X position */
  x: number;
  /** Y position */
  y: number;
  /** Window width */
  width: number;
  /** Window height */
  height: number;
  /** Is window minimized */
  isMinimized: boolean;
  /** Is window maximized */
  isMaximized: boolean;
  /** Z-index for stacking */
  zIndex: number;
}

/**
 * Window control API provided to apps
 */
export interface WindowControlAPI {
  /** Close the current window */
  close: () => void;
  /** Minimize the current window */
  minimize: () => void;
  /** Maximize/restore the current window */
  toggleMaximize: () => void;
  /** Update window size */
  resize: (width: number, height: number) => void;
  /** Update window position */
  move: (x: number, y: number) => void;
}

/**
 * Workspace context value
 */
export interface WorkspaceContextValue {
  /** Current workspace state */
  state: WorkspaceState;
  /** Switch to a different workspace (or null to clear selection) */
  switchWorkspace: (installation: NormalizedInstallation | null) => void;
  /** Open an app in the workspace */
  openApp: (appId: string) => void;
  /** Close an app instance */
  closeApp: (instanceId: string) => void;
  /** Get window control API for an app instance */
  getWindowControl: (instanceId: string) => WindowControlAPI;
}
