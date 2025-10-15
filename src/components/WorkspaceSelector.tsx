import React from 'react';
import { SelectBox } from 'devextreme-react/select-box';
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
  return (
    <div className="workspace-selector">
      <label className="workspace-selector-label">Workspace:</label>
      <SelectBox
        dataSource={workspaces}
        value={currentWorkspace}
        displayExpr="name"
        valueExpr="id"
        onValueChanged={(e) => {
          const selected = workspaces.find(w => w.id === e.value);
          if (selected) {
            onWorkspaceChange(selected);
          }
        }}
        placeholder="Select a workspace..."
        disabled={isLoading || workspaces.length === 0}
        stylingMode="outlined"
        width={300}
        showClearButton={false}
      />
      {workspaces.length === 0 && (
        <span className="workspace-selector-empty">No workspaces available</span>
      )}
    </div>
  );
};
