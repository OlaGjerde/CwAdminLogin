import React from 'react';
import { SelectBox } from 'devextreme-react/select-box';
import notify from 'devextreme/ui/notify';
import type { NormalizedInstallation } from '../types/installations';
import './WorkspaceSelector.css';

interface WorkspaceSelectorProps {
  /** Currently selected workspace */
  currentWorkspace: NormalizedInstallation | null;
  /** Available workspaces */
  workspaces: NormalizedInstallation[];
  /** Callback when workspace is changed */
  onWorkspaceChange: (workspace: NormalizedInstallation) => void;
  /** Loading state */
  isLoading?: boolean;
}

export const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({
  currentWorkspace,
  workspaces,
  onWorkspaceChange,
  isLoading = false
}) => {
  // Debug logging
  React.useEffect(() => {
    console.log('WorkspaceSelector - workspaces:', workspaces);
    console.log('WorkspaceSelector - currentWorkspace:', currentWorkspace);
    console.log('WorkspaceSelector - workspaces.length:', workspaces.length);
  }, [workspaces, currentWorkspace]);

  const handleWorkspaceChange = (e: { value?: string }) => {
    console.log('WorkspaceSelector handleWorkspaceChange called with value:', e.value);
    console.log('Current workspace ID:', currentWorkspace?.id);
    
    if (!e.value) return;
    
    const selected = workspaces.find(w => w.id === e.value);
    console.log('Found selected workspace:', selected);
    
    if (selected) {
      console.log('Calling onWorkspaceChange with:', selected.name);
      onWorkspaceChange(selected);
      notify({
        message: `${selected.name} selected`,
        type: 'info',
        displayTime: 3000,
        position: { at: 'bottom center', my: 'bottom center', offset: '0 -120' }
      });
    } else {
      console.log('ERROR: Selected workspace not found in workspaces array!');
    }
  };

  return (
    <div className="workspace-selector">
      <label className="workspace-selector-label">CalWin Desktop:</label>
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
