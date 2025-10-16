import React, { useEffect, useCallback, useRef } from 'react';
import { useCognitoAuth } from './hooks/useCognitoAuth';
import { useInstallations } from './hooks/useInstallations';
import { WorkspaceProvider, useWorkspace } from './contexts/WorkspaceContext';
import { WorkspaceSelector } from './components/WorkspaceSelector';
import { WorkbenchArea } from './components/WorkbenchArea';
import type { NormalizedInstallation } from './types/installations';
import './App.css';
import BuildFooter from './components/BuildFooter';
import 'devextreme/dist/css/dx.light.css';
import { Button } from 'devextreme-react/button';
import { LoadIndicator } from 'devextreme-react/load-indicator';

function App() {
  // New Cognito auth hook - handles everything!
  const {
    isAuthenticated,
    isLoading,
    userEmail,
    error: authError,
    login,
    logout,
    getAccessToken,
  } = useCognitoAuth();

  const { installations, refreshIfStale } = useInstallations();

  // Debug logging for auth state
  useEffect(() => {
    console.log('📊 App Auth State:', {
      isAuthenticated,
      isLoading,
      userEmail,
      hasError: !!authError,
      error: authError,
    });
    
    // Safety check: if authenticated but error still showing, this is a bug
    if (isAuthenticated && authError) {
      console.warn('⚠️ WARNING: Authenticated but error still set!', authError);
    }
  }, [isAuthenticated, isLoading, userEmail, authError]);

  // Debug logging for installations
  useEffect(() => {
    console.log('Installations count:', installations.length);
    console.log('Installations data:', installations);
  }, [installations]);

  // Refresh installations when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const accessToken = getAccessToken();
      if (accessToken) {
        refreshIfStale(accessToken).catch((err) => {
          console.error('Failed to fetch installations:', err);
        });
      }
    }
  }, [isAuthenticated, getAccessToken, refreshIfStale]);

  // If not authenticated and not loading, redirect to Cognito
  // BUT: Don't redirect if there's an error (user needs to see it and manually retry)
  // ALSO: Don't redirect if user just logged out manually
  // ALSO: Don't redirect if we're processing an OAuth callback
  useEffect(() => {
    const userLoggedOut = sessionStorage.getItem('user_logged_out');
    const urlParams = new URLSearchParams(window.location.search);
    const hasOAuthCallback = urlParams.has('code') || urlParams.has('error');
    
    if (!isAuthenticated && !isLoading && !authError && !userLoggedOut && !hasOAuthCallback) {
      console.log('🔐 Not authenticated - initiating login flow');
      login();
    } else if (userLoggedOut) {
      console.log('🚫 User logged out - not auto-logging in');
    } else if (hasOAuthCallback) {
      console.log('🔄 OAuth callback detected - waiting for processing');
    }
  }, [isAuthenticated, isLoading, authError, login]);

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

  // Show error if authentication failed (but not while loading or already authenticated)
  if (authError && !isLoading && !isAuthenticated) {
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
          <Button
            text="Prøv på nytt"
            icon="refresh"
            onClick={login}
            type="default"
            stylingMode="contained"
            width="100%"
          />
        </div>
      </div>
    );
  }

  // Don't render the app if not authenticated - prevents flash of content before redirect
  // BUT: Allow rendering during OAuth callback processing (code/error in URL)
  if (!isAuthenticated) {
    const urlParams = new URLSearchParams(window.location.search);
    const hasOAuthCallback = urlParams.has('code') || urlParams.has('error');
    
    if (!hasOAuthCallback) {
      return null;
    }
    // If we have OAuth callback, continue to render (processing will happen in background)
  }

  return (
    <WorkspaceProvider 
      availableWorkspaces={installations}
      initialWorkspace={null}
    >
      <AppContent
        userEmail={userEmail}
        logout={logout}
        installations={installations}
        getAccessToken={getAccessToken}
      />
    </WorkspaceProvider>
  );
}

// Separate component that uses workspace context
interface AppContentProps {
  userEmail: string | null;
  logout: () => void;
  installations: NormalizedInstallation[];
  getAccessToken: () => string | null;
}

const AppContent = React.memo(function AppContent(props: AppContentProps) {
  const { state, switchWorkspace } = useWorkspace();
  
  // Destructure the props we need for the callback
  const { getAccessToken, userEmail } = props;
  
  // Create authTokens object for WorkbenchArea
  const authTokens = React.useMemo(() => {
    const accessToken = getAccessToken();
    return accessToken ? { accessToken, refreshToken: '' } : null;
  }, [getAccessToken]);

  // Debug: Track AppContent re-renders
  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current++;
    console.log(`🔄 AppContent RE-RENDER #${renderCount.current}`, {
      hasAccessToken: !!getAccessToken()
    });
  });

  // Debug workspace state
  useEffect(() => {
    console.log('WorkspaceContext state:', state);
    console.log('Current workspace:', state.currentWorkspace);
    console.log('Available workspaces:', state.availableWorkspaces);
  }, [state]);

  // Note: We don't persist or restore workspace selection anymore
  // User must explicitly select an installation each time they want to launch

  // Handle installation selection - just switch workspace, don't launch
  const handleInstallationChange = useCallback((installation: NormalizedInstallation) => {
    console.log('=== handleInstallationChange called ===');
    console.log('Installation:', installation);
    console.log('Installation ID:', installation.id);
    console.log('Installation AppType:', installation.appType);

    // Just switch workspace - user will launch via the Start Installation button
    console.log('Switching workspace context (no auto-launch)');
    switchWorkspace(installation);
  }, [switchWorkspace]);

  // Authenticated - show workspace
  return (
    <div className="app-root">
      <>
        {/* Top Bar with Installation Selector */}
        <div className="app-top-bar">
            <div className="app-top-bar-left">
              <h1 className="app-title">CalWin Solutions</h1>
            </div>
            <div className="app-top-bar-center">
              <WorkspaceSelector
                currentWorkspace={state.currentWorkspace}
                workspaces={state.availableWorkspaces}
                onWorkspaceChange={handleInstallationChange}
                isLoading={state.isLoading}
              />
            </div>
            <div className="app-top-bar-right">
              <span className="app-user-info">{userEmail || 'Bruker'}</span>
              <Button
                icon="runner"
                text="Logg ut"
                onClick={() => {
                  console.log('🔘 Logout button clicked');
                  props.logout();
                }}
                stylingMode="outlined"
              />
            </div>
          </div>

          {/* Main Content Area */}
          <div className="app-content">
            {/* Workbench Area - Full Width */}
            <div className="app-workbench">
              <WorkbenchArea authTokens={authTokens} />
            </div>
          </div>
        </>

      <BuildFooter />
    </div>
  );
});

export default App
