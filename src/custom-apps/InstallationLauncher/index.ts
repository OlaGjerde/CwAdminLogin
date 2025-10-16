import type { CustomAppDefinition } from '../../types/custom-app';
import { InstallationLauncherComponent } from './InstallationLauncher';

export const InstallationLauncherApp: CustomAppDefinition = {
  id: 'installation-launcher',
  name: 'CalWin Launcher',
  icon: 'box',
  component: InstallationLauncherComponent,
  description: 'Launch CalWin installations with an icon-based interface',
  version: '1.0.0',
  category: 'System',
  author: 'CalWin Solutions',
  windowOptions: {
    minWidth: 600,
    minHeight: 400,
    defaultWidth: 900,
    defaultHeight: 600,
    resizable: true,
    maximizable: true,
  },
  permissions: {
    canReadWorkspace: true,
    canAccessAPI: true,
    canAccessAllInstallations: true,
  },
};
