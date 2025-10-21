import React, { useEffect, useCallback } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useInstallations } from './hooks/useInstallations';
import { WorkspaceProvider, useWorkspace } from './contexts/WorkspaceContext';
import { AppSettingsProvider } from './contexts/AppSettingsContext';
import { WorkspaceSelector } from './components/WorkspaceSelector';
import { WorkbenchArea } from './components/WorkbenchArea';
// import { TokenRefreshTester } from './components/TokenRefreshTester';
import type { NormalizedInstallation } from './types/installations';
import './App.css';
import BuildFooter from './components/BuildFooter';
import 'devextreme/dist/css/dx.light.css';
import { Button } from 'devextreme-react/button';
import { LoadIndicator } from 'devextreme-react/load-indicator';
import { logDebug, logError } from './utils/logger';

function App() {
  // Auth context - now available throughout the app!
  const {
    isAuthenticated,
    isLoading,
    userEmail,
    error: authError,
    login,
  } = useAuth();

  const { installations, refreshIfStale } = useInstallations();

  // Debug logging for auth state
  useEffect(() => {
    logDebug('📊 App Auth State:', {
      isAuthenticated,
      isLoading,
      userEmail,
      hasError: !!authError,
      error: authError,
    });
  }, [isAuthenticated, isLoading, userEmail, authError]);

  // Refresh installations when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshIfStale().catch((err) => {
        logError('Failed to fetch installations:', err);
      });
    }
  }, [isAuthenticated, refreshIfStale]);

  // ⭐ Auto-redirect to Cognito login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !authError) {
      logDebug('Not authenticated - redirecting to Cognito login...');
      login();
    }
  }, [isLoading, isAuthenticated, authError, login]);

  // Show loading while checking auth status
  if (isLoading) {
    return (
      <div className="app-root" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ 
          textAlign: 'center',
          padding: '40px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          minWidth: '300px'
        }}>
          <LoadIndicator height={60} width={60} />
          <h2 style={{ marginTop: '20px', marginBottom: '10px', color: '#333' }}>
            Sjekker autentisering
          </h2>
          <p style={{ color: '#666', margin: 0 }}>Vennligst vent...</p>
        </div>
      </div>
    );
  }

  // Show error with retry button if authentication failed
  if (!isAuthenticated && authError) {
    return (
      <div className="app-root" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ 
          textAlign: 'center',
          padding: '40px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          minWidth: '400px',
          maxWidth: '500px'
        }}>
          <div style={{ 
            fontSize: '48px', 
            color: '#d9534f',
            marginBottom: '20px'
          }}>⚠️</div>
          <h2 style={{ marginBottom: '15px', color: '#d9534f' }}>
            Autentiseringsfeil
          </h2>
          <p style={{ 
            color: '#666', 
            marginBottom: '25px',
            lineHeight: '1.5'
          }}>
            {authError}
          </p>
          <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
            <Button
              text="Prøv på nytt"
              icon="refresh"
              onClick={login}
              type="default"
              stylingMode="contained"
              width="100%"
            />
            <Button
              text="Slett alt og prøv igjen"
              icon="trash"
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                logDebug('Cleared all storage - reloading...');
                window.location.href = '/';
              }}
              type="danger"
              stylingMode="outlined"
              width="100%"
            />
          </div>
        </div>
      </div>
    );
  }

  // ⭐ If not authenticated and no error, return null (login redirect is happening)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppSettingsProvider workspaceId={null}>
      <WorkspaceProvider 
        availableWorkspaces={installations}
        initialWorkspace={null}
      >
        <AppContent />
      </WorkspaceProvider>
    </AppSettingsProvider>
  );
}

// Separate component that uses workspace context
const AppContent = React.memo(function AppContent() {
  const { state, switchWorkspace, openApp } = useWorkspace();
  // ⭐ Now using AuthContext - no props needed!
  const { userEmail, logout } = useAuth();

  const handleInstallationChange = useCallback((installation: NormalizedInstallation) => {
    logDebug('=== handleInstallationChange called ===');
    logDebug('Installation:', installation);
    switchWorkspace(installation);
  }, [switchWorkspace]);

  // Auto-open the selected installation launcher when installation is selected
  const handleAutoOpenLauncher = useCallback(() => {
    logDebug('=== Auto-opening launcher ===');
    openApp('selected-installation-launcher');
  }, [openApp]);

  // Auto-open launcher when workspace becomes available (from localStorage or selection)
  // Use a ref to track if we've already auto-opened to prevent re-opening on close
  const hasAutoOpenedRef = React.useRef(false);
  
  useEffect(() => {
    if (state.currentWorkspace && !hasAutoOpenedRef.current) {
      logDebug('=== Workspace available, checking if launcher should open ===');
      
      // Check if the launcher is already open
      const launcherAlreadyOpen = state.openApps.some(
        app => app.appId === 'selected-installation-launcher'
      );
      
      if (!launcherAlreadyOpen) {
        logDebug('=== Auto-opening launcher for workspace:', state.currentWorkspace.name);
        handleAutoOpenLauncher();
        hasAutoOpenedRef.current = true; // Mark that we've auto-opened
      } else {
        logDebug('=== Launcher already open, skipping auto-open ===');
        hasAutoOpenedRef.current = true; // Also mark if it was already open
      }
    }
    
    // Reset the flag when workspace changes (but not when apps change)
    // This allows auto-open when switching to a different workspace
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentWorkspace, handleAutoOpenLauncher]); // Intentionally not including state.openApps to prevent re-opening on close

  return (
    <div className="app-root">
      <>
        <div className="app-top-bar">
            <div className="app-top-bar-left">
              <h1 className="app-title">CalWin Solutions</h1>
            </div>
            <div className="app-top-bar-center">
              <WorkspaceSelector
                currentWorkspace={state.currentWorkspace}
                workspaces={state.availableWorkspaces}
                onWorkspaceChange={handleInstallationChange}
                onAutoOpenLauncher={handleAutoOpenLauncher}
                isLoading={state.isLoading}
              />
            </div>
            <div className="app-top-bar-right">
              <span className="app-user-info" title={userEmail || undefined}>
                {userEmail || 'Bruker'}
              </span>
              <Button
                icon="runner"
                text="Logg ut"
                onClick={() => {
                  logDebug('Logout button clicked');
                  logout();
                }}
                stylingMode="outlined"
              />
            </div>
          </div>

          <div className="app-content">
            <div className="app-workbench">
              <WorkbenchArea />
            </div>
          </div>
        </>

      <BuildFooter />
      {/* <TokenRefreshTester /> */}
    </div>
  );
});

export default App
