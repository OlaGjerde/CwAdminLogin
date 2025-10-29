import React, { useEffect, useCallback } from 'react';
import { useAuth } from './contexts';
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
import { logDebug, logError } from './utils/logger';
import { INSTALLER_DOWNLOAD_URL } from './config';
import notify from 'devextreme/ui/notify';

function App() {
  const {
    isAuthenticated,
    isLoading,
    userEmail,
    error: authError,
    login,
  } = useAuth();

  const { installations, refreshIfStale } = useInstallations();

  useEffect(() => {
    logDebug(" App Auth State:", {
      isAuthenticated,
      isLoading,
      userEmail,
      hasError: !!authError,
      error: authError,
    });
  }, [isAuthenticated, isLoading, userEmail, authError]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshIfStale().catch(() => {
        // Silent fail - error is handled in useInstallations
      });
    }
  }, [isAuthenticated, refreshIfStale]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !authError) {
      logDebug("Not authenticated - redirecting to Cognito login...");
      login();
    }
  }, [isLoading, isAuthenticated, authError, login]);

  if (isLoading) {
    return (
      <div className="app-root" style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh",
        backgroundColor: "#f5f5f5"
      }}>
        <div style={{ 
          textAlign: "center",
          padding: "40px",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          minWidth: "300px"
        }}>
          <LoadIndicator height={60} width={60} />
          <h2 style={{ marginTop: "20px", marginBottom: "10px", color: "#333" }}>
            Sjekker autentisering
          </h2>
          <p style={{ color: "#666", margin: 0 }}>Vennligst vent...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && authError) {
    return (
      <div className="app-root" style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh",
        backgroundColor: "#f5f5f5"
      }}>
        <div style={{ 
          textAlign: "center",
          padding: "40px",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          minWidth: "400px",
          maxWidth: "500px"
        }}>
          <div style={{ 
            fontSize: "48px", 
            color: "#d9534f",
            marginBottom: "20px"
          }}></div>
          <h2 style={{ marginBottom: "15px", color: "#d9534f" }}>
            Autentiseringsfeil
          </h2>
          <p style={{ 
            color: "#666", 
            marginBottom: "25px",
            lineHeight: "1.5"
          }}>
            {authError}
          </p>
          <div style={{ display: "flex", gap: "10px", flexDirection: "column" }}>
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
                logDebug("Cleared all storage - reloading...");
                window.location.href = "/";
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

  if (!isAuthenticated) {
    // Not logged in - show nothing (auto-login will trigger)
    return null;
  }

  return (
    <WorkspaceProvider 
      availableWorkspaces={installations}
      initialWorkspace={null}
    >
      <AppContent />
    </WorkspaceProvider>
  );
}

const AppContent = React.memo(function AppContent() {
  const { state, switchWorkspace, openApp } = useWorkspace();
  const { userEmail, logout } = useAuth();
  const [isStartingCalWin, setIsStartingCalWin] = React.useState(false);

  const handleInstallationChange = useCallback((installation: NormalizedInstallation) => {
    logDebug("=== handleInstallationChange called ===");
    logDebug("Installation:", installation);
    switchWorkspace(installation);
  }, [switchWorkspace]);

  const handleAutoOpenLauncher = useCallback(() => {
    logDebug("=== Auto-opening launcher ===");
    openApp("selected-installation-launcher");
  }, [openApp]);

  const hasAutoOpenedRef = React.useRef(false);
  
  useEffect(() => {
    if (state.currentWorkspace && !hasAutoOpenedRef.current) {
      logDebug("=== Workspace available, checking if launcher should open ===");
      
      const launcherAlreadyOpen = state.openApps.some(
        app => app.appId === "selected-installation-launcher"
      );
      
      if (!launcherAlreadyOpen) {
        logDebug("=== Auto-opening launcher for workspace:", state.currentWorkspace.name);
        handleAutoOpenLauncher();
        hasAutoOpenedRef.current = true;
      } else {
        logDebug("=== Launcher already open, skipping auto-open ===");
        hasAutoOpenedRef.current = true;
      }
    }
  }, [state.currentWorkspace, state.openApps, handleAutoOpenLauncher]);

  return (
    <div className="app-root">
      <div className="app-top-bar">
        <div className="app-top-bar-left">
          <img src="/Calwin_circle_color_RGB_300ppi.png" alt="CalWin Logo" className="app-logo" />
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
          <div className="app-top-bar-actions">
            {/* Start CalWin button with loading effect */}
            <div className="button-with-loading">
              <Button
                text={isStartingCalWin ? "Starter CalWin..." : "Start CalWin"}
                icon={isStartingCalWin ? undefined : "runner"}
                type={isStartingCalWin ? "success" : "normal"}
                stylingMode="contained" 
                disabled={!state.currentWorkspace || isStartingCalWin}
                onClick={async () => {
                logDebug("Start CalWin button clicked");
                if (!state.currentWorkspace) {
                  logError("No workspace selected");
                  return;
                }
                
                // Set loading state
                setIsStartingCalWin(true);
                
                try {
                  const { createOneTimeToken } = await import("./api/adminApi");
                  const { PROTOCOL_CALWIN, PROTOCOL_CALWIN_TEST, PROTOCOL_CALWIN_DEV } = await import("./config");
                  
                  logDebug("Generating launch token...");
                  const token = await createOneTimeToken(state.currentWorkspace.id);
                  
                  if (!token) {
                    throw new Error("No launch token received from server");
                  }
                  
                  logDebug("Launch token received");
                  
                  const protocol = state.currentWorkspace.appType === 0 
                    ? PROTOCOL_CALWIN 
                    : state.currentWorkspace.appType === 1 
                      ? PROTOCOL_CALWIN_TEST 
                      : PROTOCOL_CALWIN_DEV;
                  
                  const uri = `${protocol}${encodeURIComponent(token)}`;
                  logDebug(" Launching with URI:", uri);
                  
                  // Launch the protocol directly - we'll use a timeout to detect if it failed
                  const anchor = document.createElement("a");
                  anchor.href = uri;
                  anchor.style.display = "none";
                  document.body.appendChild(anchor);
                  
                  // Set up detection for app launch
                  let launched = false;
                  
                  // Function to handle successful launch
                  const handleAppLaunch = () => {
                    launched = true;
                    document.removeEventListener('visibilitychange', handleAppLaunch);
                    window.removeEventListener('blur', handleAppLaunch);
                  };
                  
                  // Try to detect if app launches
                  document.addEventListener('visibilitychange', handleAppLaunch);
                  window.addEventListener('blur', handleAppLaunch);
                  
                  // Click the link to launch
                  anchor.click();
                  document.body.removeChild(anchor);
                  
                  // Check after a delay if the app was launched
                  setTimeout(() => {
                    if (!launched) {
                      // If we're still here and no launch detected, protocol probably failed
                      logDebug("Protocol handler may not be installed. Showing download prompt.");
                      
                      // Clean up event listeners
                      document.removeEventListener('visibilitychange', handleAppLaunch);
                      window.removeEventListener('blur', handleAppLaunch);
                      
                      // Use DevExtreme notification
                      notify({
                        message: "CalWin er ikke installert på denne enheten. Vennligst klikk på 'Download CalWin' knappen til høyre for å laste ned og installere programmet først.",
                        type: "warning",
                        displayTime: 7000,
                        width: "auto"
                      });
                    }
                    
                    // Clear loading state
                    setIsStartingCalWin(false);
                  }, 500);
                
                } catch (error) {
                  logError(" Launch failed:", error);
                  
                  // Show error using DevExtreme notification
                  notify({
                    message: "Det oppstod en feil ved forsøk på å starte CalWin. Vennligst prøv igjen, eller klikk på 'Download CalWin' knappen til høyre for å laste ned og installere programmet på nytt.",
                    type: "error",
                    displayTime: 7000,
                    width: "auto"
                  });
                  
                  // Clear loading state
                  setIsStartingCalWin(false);
                }
              }}
            />
              {isStartingCalWin && (
                <LoadIndicator
                  className="dx-button-spinner"
                  width={16}
                  height={16}
                  visible={true}
                />
              )}
            </div>
            <Button
              text="Download CalWin"
              icon="download"
              type="normal"
              stylingMode="contained"
              disabled={!state.currentWorkspace}
              onClick={() => {
                logDebug("Download CalWin button clicked");
                window.open(INSTALLER_DOWNLOAD_URL, "_blank");
              }}
            />
          </div>
          <span className="app-user-info" title={userEmail || undefined}>
            {userEmail || "Bruker"}
          </span>
          <Button
            icon="runner"
            text="Logg ut"
            onClick={() => {
              logDebug("Logout button clicked");
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

      <BuildFooter />
    </div>
  );
});

export default App;
