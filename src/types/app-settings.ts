/**
 * App Settings Types
 * 
 * Types for user-configurable app settings including:
 * - App order in taskbar
 * - Default window size and position
 * - Auto-save position preference
 * - Overflow scrolling preference
 */

/**
 * Settings for an individual app
 */
export interface AppSettings {
  /** App identifier */
  appId: string;
  
  /** Order in taskbar (lower = first). First app is always 0 and locked. */
  order: number;
  
  /** Default window size (optional - falls back to app definition) */
  defaultSize?: {
    width: number;
    height: number;
  };
  
  /** Default window position (optional - falls back to auto-center) */
  defaultPosition?: {
    x: number;
    y: number;
  };
  
  /** Auto-save window position when user moves it */
  autoSavePosition: boolean;
  
  /** Enable overflow scrolling in window body */
  enableOverflow: boolean;
}

/**
 * Complete app settings state stored in localStorage
 */
export interface AppSettingsState {
  /** Version for migration support */
  version: string;
  
  /** Map of appId to settings */
  settings: Record<string, AppSettings>;
  
  /** Timestamp of last update */
  lastUpdated: number;
}

/**
 * Partial updates for app settings
 */
export type AppSettingsUpdate = Partial<Omit<AppSettings, 'appId'>>;

/**
 * Default settings for new apps
 */
export const DEFAULT_APP_SETTINGS: Omit<AppSettings, 'appId' | 'order'> = {
  autoSavePosition: true,
  enableOverflow: true,
};

/**
 * Current settings version for migration
 */
export const APP_SETTINGS_VERSION = '1.0';
