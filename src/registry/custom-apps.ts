import type { CustomAppDefinition } from '../types/custom-app';

/**
 * Custom App Registry
 * 
 * This is where developers manually register their custom apps.
 * 
 * To add a new custom app:
 * 1. Create your app in src/custom-apps/YourAppName/
 * 2. Import it at the top of this file
 * 3. Add it to the customAppRegistry array below
 * 
 * Example:
 * import { TodoApp } from '../custom-apps/TodoApp';
 * import { NotesApp } from '../custom-apps/NotesApp';
 * 
 * export const customAppRegistry: CustomAppDefinition[] = [
 *   TodoApp,
 *   NotesApp,
 * ];
 */

// Import your custom apps here
// Example app (enabled by default):
//import { ExampleTodoApp } from '../custom-apps/ExampleTodoApp';

// CalWin Installation Launcher:
import { InstallationLauncherApp } from '../custom-apps/InstallationLauncher';

// Selected Installation Launcher (auto-opens when installation selected):
import { SelectedInstallationLauncherApp } from '../custom-apps/SelectedInstallationLauncher';

// User Profile App (demonstrates useAuth() in custom apps):
//import { UserProfileApp } from '../custom-apps/UserProfileApp';

// Note: AppSettingsApp is imported directly in WorkbenchArea, not in registry

// Your custom apps:
// import { YourApp } from '../custom-apps/YourApp';

/**
 * Registry of all custom apps
 * Add your custom app definitions to this array
 */
export const customAppRegistry: CustomAppDefinition[] = [
  // CalWin Installation Launcher (main app):
  InstallationLauncherApp,
  
  // Selected Installation Launcher (auto-opens when installation selected):
  SelectedInstallationLauncherApp,
  
  // User Profile (demonstrates useAuth() hook):
  //UserProfileApp,
  
  // Example todo app:
  //ExampleTodoApp,
  
  // App Settings (Note: registered but opened via Settings button, not shown in taskbar):
  // AppSettingsApp,
  
  // Add your custom apps here:
  // YourApp,
];

/**
 * Get a custom app by ID
 */
export function getCustomAppById(id: string): CustomAppDefinition | undefined {
  return customAppRegistry.find(app => app.id === id);
}

/**
 * Get all custom apps
 */
export function getAllCustomApps(): CustomAppDefinition[] {
  return [...customAppRegistry];
}

/**
 * Check if an app ID exists in the registry
 */
export function isCustomAppRegistered(id: string): boolean {
  return customAppRegistry.some(app => app.id === id);
}
