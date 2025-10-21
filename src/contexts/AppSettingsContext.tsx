/**
 * App Settings Context
 * 
 * Manages user-configurable app settings including:
 * - App order in taskbar
 * - Default window sizes and positions
 * - Auto-save position preferences
 * - Overflow scrolling preferences
 * 
 * Settings are persisted to localStorage and can be configured
 * to be global or per-workspace via APP_SETTINGS_CONFIG.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type { 
  AppSettings, 
  AppSettingsState, 
  AppSettingsUpdate 
} from '../types/app-settings';
import { APP_SETTINGS_VERSION, DEFAULT_APP_SETTINGS } from '../types/app-settings';
import { APP_SETTINGS_CONFIG } from '../config';
import { logDebug, logError, logInfo } from '../utils/logger';

/**
 * Context value interface
 */
interface AppSettingsContextValue {
  /** Get settings for a specific app */
  getAppSettings: (appId: string) => AppSettings | undefined;
  
  /** Update settings for a specific app */
  updateAppSettings: (appId: string, updates: AppSettingsUpdate) => void;
  
  /** Reorder apps (updates order field for multiple apps) */
  reorderApps: (orderedAppIds: string[]) => void;
  
  /** Reset all settings to defaults */
  resetAllSettings: () => void;
  
  /** Get all app settings (for UI display) */
  getAllSettings: () => Record<string, AppSettings>;
  
  /** Admin: Copy current installation's settings to other installations */
  copySettingsToInstallations: (targetInstallationIds: string[]) => void;
  
  /** Admin: Get list of all installations that have settings */
  getInstallationsWithSettings: () => string[];
  
  /** Check if settings are loaded */
  isLoaded: boolean;
  
  /** Current installation ID */
  currentInstallationId: string | null;
}

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

interface AppSettingsProviderProps {
  children: React.ReactNode;
  /** Current workspace ID (only used if perWorkspaceSettings is true) */
  workspaceId?: string | null;
}

/**
 * Get storage key based on configuration and workspace
 */
function getStorageKey(workspaceId?: string | null): string {
  const baseKey = APP_SETTINGS_CONFIG.storageKey;
  
  if (APP_SETTINGS_CONFIG.perWorkspaceSettings && workspaceId) {
    return `${baseKey}-${workspaceId}`;
  }
  
  return baseKey;
}

/**
 * Load settings from localStorage
 */
function loadSettings(workspaceId?: string | null): AppSettingsState {
  try {
    const storageKey = getStorageKey(workspaceId);
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      const parsed = JSON.parse(stored) as AppSettingsState;
      
      // Version check for future migrations
      if (parsed.version !== APP_SETTINGS_VERSION) {
        logInfo('App settings version mismatch, using defaults', {
          stored: parsed.version,
          current: APP_SETTINGS_VERSION
        });
        return createDefaultState();
      }
      
      logDebug('Loaded app settings from localStorage', {
        key: storageKey,
        appCount: Object.keys(parsed.settings).length
      });
      
      return parsed;
    }
  } catch (error) {
    logError('Failed to load app settings from localStorage:', error);
  }
  
  return createDefaultState();
}

/**
 * Save settings to localStorage
 */
function saveSettings(state: AppSettingsState, workspaceId?: string | null): void {
  try {
    const storageKey = getStorageKey(workspaceId);
    const updated = {
      ...state,
      lastUpdated: Date.now()
    };
    
    localStorage.setItem(storageKey, JSON.stringify(updated));
    
    logDebug('Saved app settings to localStorage', {
      key: storageKey,
      appCount: Object.keys(updated.settings).length
    });
  } catch (error) {
    logError('Failed to save app settings to localStorage:', error);
  }
}

/**
 * Create default empty state
 */
function createDefaultState(installationId?: string | null): AppSettingsState {
  return {
    version: APP_SETTINGS_VERSION,
    installationId: installationId || undefined,
    settings: {},
    lastUpdated: Date.now()
  };
}

/**
 * AppSettingsProvider Component
 */
export const AppSettingsProvider: React.FC<AppSettingsProviderProps> = ({
  children,
  workspaceId
}) => {
  const [state, setState] = useState<AppSettingsState>(() => loadSettings(workspaceId));
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings when workspace changes (if per-workspace mode)
  useEffect(() => {
    if (APP_SETTINGS_CONFIG.perWorkspaceSettings) {
      const loaded = loadSettings(workspaceId);
      setState(loaded);
      logInfo('Switched to workspace settings', { workspaceId });
    }
    setIsLoaded(true);
  }, [workspaceId]);

  // Save settings whenever state changes
  useEffect(() => {
    if (isLoaded) {
      saveSettings(state, workspaceId);
    }
  }, [state, workspaceId, isLoaded]);

  /**
   * Get settings for a specific app
   */
  const getAppSettings = useCallback((appId: string): AppSettings | undefined => {
    return state.settings[appId];
  }, [state.settings]);

  /**
   * Update settings for a specific app
   */
  const updateAppSettings = useCallback((appId: string, updates: AppSettingsUpdate) => {
    setState(prev => {
      const existing = prev.settings[appId];
      const currentOrder = existing?.order ?? Object.keys(prev.settings).length;
      
      const updated: AppSettings = {
        ...DEFAULT_APP_SETTINGS,
        ...existing,
        appId,
        order: currentOrder,
        ...updates,
      };
      
      logDebug('Updated app settings', { appId, updates });
      
      return {
        ...prev,
        settings: {
          ...prev.settings,
          [appId]: updated
        }
      };
    });
  }, []);

  /**
   * Reorder apps by updating order field
   */
  const reorderApps = useCallback((orderedAppIds: string[]) => {
    setState(prev => {
      const updated = { ...prev.settings };
      
      // Update order for each app
      orderedAppIds.forEach((appId, index) => {
        if (updated[appId]) {
          updated[appId] = {
            ...updated[appId],
            order: index
          };
        } else {
          // Create default settings if app doesn't exist yet
          updated[appId] = {
            appId,
            order: index,
            ...DEFAULT_APP_SETTINGS
          };
        }
      });
      
      logInfo('Reordered apps', { order: orderedAppIds });
      
      return {
        ...prev,
        settings: updated
      };
    });
  }, []);

  /**
   * Reset all settings to defaults
   */
  const resetAllSettings = useCallback(() => {
    logInfo('Resetting all app settings to defaults');
    const defaultState = createDefaultState(workspaceId);
    setState(defaultState);
    saveSettings(defaultState, workspaceId);
  }, [workspaceId]);

  /**
   * Get all settings
   */
  const getAllSettings = useCallback((): Record<string, AppSettings> => {
    return state.settings;
  }, [state.settings]);

  /**
   * Admin: Copy current installation's settings to other installations
   */
  const copySettingsToInstallations = useCallback((targetInstallationIds: string[]) => {
    if (!workspaceId) {
      logError('Cannot copy settings: No current workspace');
      return;
    }

    targetInstallationIds.forEach(targetId => {
      if (targetId === workspaceId) {
        logDebug('Skipping copy to self:', targetId);
        return;
      }

      const copiedState: AppSettingsState = {
        ...state,
        installationId: targetId,
        lastUpdated: Date.now()
      };

      try {
        const storageKey = getStorageKey(targetId);
        localStorage.setItem(storageKey, JSON.stringify(copiedState));
        logInfo('Copied settings to installation', { from: workspaceId, to: targetId });
      } catch (error) {
        logError('Failed to copy settings to installation', { targetId, error });
      }
    });
  }, [workspaceId, state]);

  /**
   * Admin: Get list of all installations that have settings
   */
  const getInstallationsWithSettings = useCallback((): string[] => {
    const installations: string[] = [];
    const baseKey = APP_SETTINGS_CONFIG.storageKey;

    // Scan localStorage for all installation settings
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(baseKey)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored) as AppSettingsState;
            if (parsed.installationId) {
              installations.push(parsed.installationId);
            }
          }
        } catch (error) {
          logError('Error reading installation settings', { key, error });
        }
      }
    }

    return installations;
  }, []);

  const contextValue: AppSettingsContextValue = useMemo(() => ({
    getAppSettings,
    updateAppSettings,
    reorderApps,
    resetAllSettings,
    getAllSettings,
    copySettingsToInstallations,
    getInstallationsWithSettings,
    isLoaded,
    currentInstallationId: workspaceId || null
  }), [
    getAppSettings, 
    updateAppSettings, 
    reorderApps, 
    resetAllSettings, 
    getAllSettings, 
    copySettingsToInstallations,
    getInstallationsWithSettings,
    isLoaded,
    workspaceId
  ]);

  return (
    <AppSettingsContext.Provider value={contextValue}>
      {children}
    </AppSettingsContext.Provider>
  );
};

/**
 * Hook to access app settings context
 * Must be used within AppSettingsProvider
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useAppSettings = (): AppSettingsContextValue => {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within AppSettingsProvider');
  }
  return context;
};
