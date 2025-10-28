/**
 * User Profile Component
 * 
 * Example custom app demonstrating the use of useAuth() hook
 * in a custom application component.
 * 
 * This shows how ANY component in the app can easily access
 * authentication state without needing props passed down.
 */

import React from 'react';
import type { CustomAppProps } from '../../types/custom-app';
import { useAuth } from '../../contexts';
import { Button } from 'devextreme-react/button';
import './UserProfileApp.css';

export const UserProfileAppComponent: React.FC<CustomAppProps> = ({
  workspace,
}) => {
  // ⭐ Access auth state directly - no props needed!
  const { userInfo, userEmail, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="user-profile-app">
        <div className="profile-section">
          <p>Not authenticated</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-profile-app">
      <div className="profile-header">
        <h2>👤 User Profile</h2>
      </div>

      <div className="profile-section">
        <h3>Account Information</h3>
        <div className="profile-field">
          <label>Email:</label>
          <span>{userEmail || 'N/A'}</span>
        </div>
        <div className="profile-field">
          <label>Username:</label>
          <span>{userInfo?.Username || 'N/A'}</span>
        </div>
        <div className="profile-field">
          <label>User ID:</label>
          <span className="user-id">{userInfo?.UserId || 'N/A'}</span>
        </div>
      </div>

      <div className="profile-section">
        <h3>Groups & Permissions</h3>
        {userInfo?.Groups && userInfo.Groups.length > 0 ? (
          <div className="groups-list">
            {userInfo.Groups.map((group) => (
              <span key={group} className="group-badge">
                {group}
              </span>
            ))}
          </div>
        ) : (
          <p className="no-groups">No groups assigned</p>
        )}
      </div>

      {workspace && (
        <div className="profile-section">
          <h3>Current Workspace</h3>
          <div className="profile-field">
            <label>Installation:</label>
            <span>{workspace.name}</span>
          </div>
          <div className="profile-field">
            <label>Installation ID:</label>
            <span className="user-id">{workspace.id}</span>
          </div>
          {workspace.appType !== undefined && (
            <div className="profile-field">
              <label>App Type:</label>
              <span>{workspace.appType}</span>
            </div>
          )}
        </div>
      )}

      <div className="profile-actions">
        <Button
          text="Sign Out"
          icon="runner"
          onClick={logout}
          type="danger"
          stylingMode="contained"
          width="100%"
        />
      </div>

      <div className="profile-footer">
        <small>
          This component demonstrates using <code>useAuth()</code> in a custom app.
          No auth props needed - just call the hook!
        </small>
      </div>
    </div>
  );
};
