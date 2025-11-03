/**
 * User Profile App
 * 
 * Example custom app that demonstrates using useAuth() hook
 * to access authentication state directly without props.
 */

import type { CustomAppDefinition } from '../../types/custom-app';
import { UserProfileAppComponent } from './UserProfileApp';

export const UserProfileApp: CustomAppDefinition = {
  id: 'user-profile',
  name: 'User Profile',
  icon: 'user',
  component: UserProfileAppComponent,
  description: 'View your user profile and authentication details',
  version: '1.0.0',
  author: 'System',
  category: 'System',
  windowOptions: {
    minWidth: 400,
    minHeight: 500,
    defaultWidth: 650,
    defaultHeight: 700,
    resizable: true,
    maximizable: true
  },
  permissions: {
    canReadWorkspace: true,
    canAccessAPI: false,
    canAccessAllInstallations: false
  }
};
