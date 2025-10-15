import type { CustomAppDefinition } from '../../types/custom-app';
import { ExampleTodoAppComponent } from './ExampleTodoApp';

/**
 * Example Todo App
 * 
 * This is an example custom app demonstrating how to create
 * a simple todo list application for the workbench system.
 * 
 * Developers can use this as a template for their own apps.
 */
export const ExampleTodoApp: CustomAppDefinition = {
  id: 'example-todo-app',
  name: 'Todo List',
  icon: 'checklist',
  component: ExampleTodoAppComponent,
  description: 'Simple todo list manager (example app)',
  version: '1.0.0',
  author: 'System',
  category: 'Productivity',
  windowOptions: {
    minWidth: 300,
    minHeight: 400,
    defaultWidth: 400,
    defaultHeight: 500,
    resizable: true,
    maximizable: true
  },
  permissions: {
    canReadWorkspace: true,
    canAccessAPI: false,
    canAccessAllInstallations: false
  }
};
