/**
 * App Settings Custom App
 * 
 * Allows users to configure app behavior:
 * - Reorder apps in taskbar (except first app)
 * - Set default window sizes and positions
 * - Configure auto-save and overflow settings
 * 
 * Admin-only features:
 * - Enable/disable apps (except first app)
 * - Copy settings to other installations
 */

import type { CustomAppDefinition } from '../../types/custom-app';
import { AppSettingsComponent } from './AppSettingsApp';

export const AppSettingsApp: CustomAppDefinition = {
  id: 'app-settings',
  name: 'Innstillinger',
  icon: 'preferences',
  component: AppSettingsComponent,
  description: 'Konfigurer applikasjonsinnstillinger og preferanser',
  version: '1.0.0',
  category: 'System',
  author: 'CalWin Solutions',
  windowOptions: {
    minWidth: 600,
    minHeight: 600,
    defaultWidth: 800,
    defaultHeight: 750,
    resizable: true,
    maximizable: true,
    enableOverflow: true,
  },
  permissions: {
    canReadWorkspace: true,
    canAccessAPI: false,
    canAccessAllInstallations: false,
  },
};
