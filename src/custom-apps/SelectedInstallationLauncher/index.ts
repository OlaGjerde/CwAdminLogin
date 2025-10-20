import type { CustomAppDefinition } from '../../types/custom-app';
import { SelectedInstallationLauncherComponent } from './SelectedInstallationLauncher';

export const SelectedInstallationLauncherApp: CustomAppDefinition = {
  id: 'selected-installation-launcher',
  name: 'Start CalWin',
  icon: 'CW', // Default icon - will be overridden dynamically
  component: SelectedInstallationLauncherComponent,
  description: 'Launch the selected CalWin installation',
  version: '1.0.0',
  category: 'System',
  author: 'CalWin Solutions',
  windowOptions: {
    minWidth: 450,
    minHeight: 450,
    defaultWidth: 450,
    defaultHeight: 450,
    resizable: true,
    maximizable: false,
    enableOverflow: false, // No scrolling needed for this simple window
  },
  permissions: {
    canReadWorkspace: true,
    canAccessAPI: true,
  },
};

