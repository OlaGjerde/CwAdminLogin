import type { ComponentType } from 'react';
import type { NormalizedInstallation } from './installations';
import type { WindowControlAPI } from './workspace';

/**
 * Authentication tokens available to custom apps
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
}

/**
 * Props provided to custom app components
 */
export interface CustomAppProps {
  /** Current workspace/installation */
  workspace: NormalizedInstallation | null;
  /** Authentication tokens for API calls - DEPRECATED: Now using httpOnly cookies */
  authTokens?: AuthTokens | null;
  /** All available installations */
  installations: NormalizedInstallation[];
  /** Window control API */
  windowControl: WindowControlAPI;
  /** Unique instance ID for this app */
  instanceId: string;
}

/**
 * Window options for custom apps
 */
export interface WindowOptions {
  /** Minimum width in pixels */
  minWidth?: number;
  /** Minimum height in pixels */
  minHeight?: number;
  /** Default width in pixels */
  defaultWidth?: number;
  /** Default height in pixels */
  defaultHeight?: number;
  /** Can the window be resized */
  resizable?: boolean;
  /** Can the window be maximized */
  maximizable?: boolean;
  /** Initial position (undefined = centered) */
  initialPosition?: {
    x: number;
    y: number;
  };
}

/**
 * App icon definition
 * Can be either a DevExtreme icon name or a custom SVG component
 */
export type AppIcon = string | ComponentType<{ className?: string; size?: number }>;

/**
 * App permissions (for future use)
 */
export interface AppPermissions {
  /** Can read workspace data */
  canReadWorkspace?: boolean;
  /** Can make API calls */
  canAccessAPI?: boolean;
  /** Can access all installations or just current */
  canAccessAllInstallations?: boolean;
}

/**
 * Complete custom app definition
 * Developers export this from their custom app
 */
export interface CustomAppDefinition {
  /** Unique app identifier */
  id: string;
  /** Display name */
  name: string;
  /** App icon (DevExtreme icon name or custom SVG component) */
  icon: AppIcon;
  /** React component for the app */
  component: ComponentType<CustomAppProps>;
  /** Optional description */
  description?: string;
  /** Optional version */
  version?: string;
  /** Window configuration */
  windowOptions?: WindowOptions;
  /** App permissions */
  permissions?: AppPermissions;
  /** Category for organization (future use) */
  category?: string;
  /** Author information */
  author?: string;
}

/**
 * System app definition (for built-in apps)
 * Similar to CustomAppDefinition but may have additional system privileges
 */
export interface SystemAppDefinition extends Omit<CustomAppDefinition, 'id'> {
  id: string;
  /** Is this a system app (cannot be removed) */
  isSystem: true;
  /** Launch external app instead of internal component */
  externalLaunchUrl?: string;
}

/**
 * Union type for all app types
 */
export type AppDefinition = CustomAppDefinition | SystemAppDefinition;
