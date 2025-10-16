import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useCognitoAuth } from './hooks/useCognitoAuth';
import { useInstallations } from './hooks/useInstallations';
import { useLauncher } from './hooks/useLauncher';
import { WorkspaceProvider, useWorkspace } from './contexts/WorkspaceContext';
import { WorkspaceSelector } from './components/WorkspaceSelector';
import { WorkbenchArea } from './components/WorkbenchArea';
import type { NormalizedInstallation } from './types/installations';
import { PROTOCOL_CALWIN, PROTOCOL_CALWIN_TEST, PROTOCOL_CALWIN_DEV } from './config';
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

  const { installations, refreshIfStale, generateLaunchToken } = useInstallations();
  const { launchWithFallback } = useLauncher();

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
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      console.log('🔐 Not authenticated - initiating login flow');
      login();
    }
  }, [isAuthenticated, isLoading, login]);

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

  // Show error if authentication failed
  if (authError) {
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
        generateLaunchToken={generateLaunchToken}
        launchWithFallback={launchWithFallback}
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
  generateLaunchToken: (rawAccessToken: string, installationId: string) => Promise<string | null>;
  launchWithFallback: (appUri: string, onFailure?: () => void) => Promise<void>;
}

const AppContent = React.memo(function AppContent(props: AppContentProps) {
  const { state, switchWorkspace } = useWorkspace();
  
  // Destructure the props we need for the callback
  const { getAccessToken, generateLaunchToken, launchWithFallback, userEmail } = props;
  
  // Create authTokens object for WorkbenchArea
  const authTokens = React.useMemo(() => {
    const accessToken = getAccessToken();
    return accessToken ? { accessToken, refreshToken: '' } : null;
  }, [getAccessToken]);
  
  // Prevent multiple simultaneous launches
  const [isLaunching, setIsLaunching] = useState(false);

  // Debug: Track AppContent re-renders
  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current++;
    console.log(`🔄 AppContent RE-RENDER #${renderCount.current}`, {
      isLaunching,
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

  // Handle installation selection - launch the desktop app
  const handleInstallationChange = useCallback(async (installation: NormalizedInstallation) => {
    if (isLaunching) {
      console.log('Already launching, ignoring duplicate request');
      return;
    }
    
    setIsLaunching(true);
    console.log('=== handleInstallationChange called ===');
    console.log('Installation:', installation);
    console.log('Installation ID:', installation.id);
    console.log('Installation AppType:', installation.appType);

    // Get access token from Cognito
    const accessToken = getAccessToken();
    if (!accessToken) {
      console.error('No access token available');
      // Still switch workspace even if we can't launch
      switchWorkspace(installation);
      setIsLaunching(false);
      return;
    }

    try {
      console.log('Generating launch token...');
      const token = await generateLaunchToken(accessToken, installation.id);
      console.log('Launch token received:', token ? 'YES' : 'NO');
      console.log('Launch token value:', token);
      
      if (token) {
        // Determine protocol based on app type
        const protocol = installation.appType === 0 
          ? PROTOCOL_CALWIN 
          : installation.appType === 1 
          ? PROTOCOL_CALWIN_TEST 
          : PROTOCOL_CALWIN_DEV;
        
        console.log('Selected protocol:', protocol);
        
        const uri = `${protocol}${encodeURIComponent(token)}`;
        console.log('Launching with URI:', uri);
        
        // Launch first, then switch workspace
        await launchWithFallback(uri, () => {
          console.log('Launch failed - protocol handler not installed');
        });
        
        console.log('Launch completed, now switching workspace');
      } else {
        console.error('Failed to generate launch token - token is null');
      }
    } catch (err) {
      console.error('Error launching installation:', err);
    }
    
    // Switch workspace AFTER launch attempt
    console.log('Switching workspace context');
    switchWorkspace(installation);
    
    // Reset workspace selection after a delay so user can relaunch
    setTimeout(() => {
      console.log('Resetting workspace selection to allow relaunch');
      switchWorkspace(null); // Reset to null to allow reselection
      setIsLaunching(false);
    }, 2000);
  }, [getAccessToken, generateLaunchToken, launchWithFallback, switchWorkspace, isLaunching]);

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
                onClick={props.logout}
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
