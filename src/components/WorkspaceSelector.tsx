import React from 'react';
import { SelectBox } from 'devextreme-react/select-box';
import type { NormalizedInstallation } from '../types/installations';
import './WorkspaceSelector.css';
import { logDebug } from '../utils/logger';

interface WorkspaceSelectorProps {
  /** Currently selected workspace */
  currentWorkspace: NormalizedInstallation | null;
  /** Available workspaces */
  workspaces: NormalizedInstallation[];
  /** Callback when workspace is changed */
  onWorkspaceChange: (workspace: NormalizedInstallation) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Callback to auto-open launcher window */
  onAutoOpenLauncher?: () => void;
}

export const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({
  currentWorkspace,
  workspaces,
  onWorkspaceChange,
  isLoading = false,
  onAutoOpenLauncher
}) => {
  // Debug logging
  React.useEffect(() => {
    logDebug('WorkspaceSelector - workspaces:', workspaces);
    logDebug('WorkspaceSelector - currentWorkspace:', currentWorkspace);
    logDebug('WorkspaceSelector - workspaces.length:', workspaces.length);
  }, [workspaces, currentWorkspace]);

  const handleWorkspaceChange = (e: { value?: string }) => {
    logDebug('WorkspaceSelector handleWorkspaceChange called with value:', e.value);
    logDebug('Current workspace ID:', currentWorkspace?.id);
    
    if (!e.value) return;
    
    const selected = workspaces.find(w => w.id === e.value);
    logDebug('Found selected workspace:', selected);
    
    if (selected) {
      logDebug('Calling onWorkspaceChange with:', selected.name);
      onWorkspaceChange(selected);
      
      // Auto-open the launcher window when installation is selected
      if (onAutoOpenLauncher) {
        logDebug('Auto-opening launcher window');
        // Small delay to ensure workspace is set first
        setTimeout(() => {
          onAutoOpenLauncher();
        }, 100);
      }
    } else {
      logDebug('ERROR: Selected workspace not found in workspaces array!');
    }
  };

  return (
    <div className="workspace-selector">
      <label className="workspace-selector-label">Select Installation:</label>
      <SelectBox
        dataSource={workspaces}
        value={currentWorkspace?.id}
        displayExpr="name"
        valueExpr="id"
        onValueChanged={handleWorkspaceChange}
        placeholder="Select a CalWin installation..."
        disabled={isLoading || workspaces.length === 0}
        stylingMode="outlined"
        width={300}
        showClearButton={false}
      />
      {workspaces.length === 0 && (
        <span className="workspace-selector-empty">No CalWin installations available</span>
      )}
    </div>
  );
};
