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
  // Cookie-based Cognito auth hook
  const {
    isAuthenticated,
    isLoading,
    userEmail,
    error: authError,
    login,
    logout,
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
  }, [isAuthenticated, isLoading, userEmail, authError]);

  // Refresh installations when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshIfStale().catch((err) => {
        console.error('Failed to fetch installations:', err);
      });
    }
  }, [isAuthenticated, refreshIfStale]);

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

  // Show error OR login prompt if not authenticated
  if (!isAuthenticated) {
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
          {authError ? (
            <>
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
            </>
          ) : (
            <>
              <div style={{ 
                fontSize: '48px', 
                color: '#5cb85c',
                marginBottom: '20px'
              }}>🔐</div>
              <h2 style={{ marginBottom: '15px', color: '#333' }}>
                Vennligst logg inn
              </h2>
              <p style={{ 
                color: '#666', 
                marginBottom: '25px',
                lineHeight: '1.5'
              }}>
                Du må logge inn for å fortsette
              </p>
            </>
          )}
          <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
            <Button
              text={authError ? "Prøv på nytt" : "Logg inn"}
              icon={authError ? "refresh" : "key"}
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
                console.log('✅ Cleared all storage - reloading...');
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

  return (
    <WorkspaceProvider 
      availableWorkspaces={installations}
      initialWorkspace={null}
    >
      <AppContent
        userEmail={userEmail}
        logout={logout}
        installations={installations}
      />
    </WorkspaceProvider>
  );
}

// Separate component that uses workspace context
interface AppContentProps {
  userEmail: string | null;
  logout: () => void;
  installations: NormalizedInstallation[];
}

const AppContent = React.memo(function AppContent(props: AppContentProps) {
  const { state, switchWorkspace } = useWorkspace();
  
  const { userEmail } = props;
  const authTokens = { accessToken: '', refreshToken: '' };

  const handleInstallationChange = useCallback((installation: NormalizedInstallation) => {
    console.log('=== handleInstallationChange called ===');
    console.log('Installation:', installation);
    switchWorkspace(installation);
  }, [switchWorkspace]);

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

          <div className="app-content">
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
