import type { CustomAppDefinition } from '../../types/custom-app';
import { InstallationLauncherComponent } from './InstallationLauncher';

export const InstallationLauncherApp: CustomAppDefinition = {
  id: 'installation-launcher',
  name: 'CalWin Oppstarter',
  icon: 'box',
  component: InstallationLauncherComponent,
  description: 'Start CalWin installasjoner med ikonbasert grensesnitt',
  version: '1.0.0',
  category: 'System',
  author: 'CalWin Solutions',
  windowOptions: {
    minWidth: 500,
    minHeight: 400,
    defaultWidth: 950,
    defaultHeight: 540,
    resizable: true,
    maximizable: true,
  },
  permissions: {
    canReadWorkspace: true,
    canAccessAPI: true,
    canAccessAllInstallations: true,
  },
};
