import React, { useEffect, useCallback } from 'react';
import { useAuth } from './contexts';
import { useInstallations } from './hooks/useInstallations';
import { WorkspaceProvider, useWorkspace } from './contexts/WorkspaceContext';
import { WorkspaceSelector } from './components/WorkspaceSelector';
import { WorkbenchArea } from './components/WorkbenchArea';
import { UserDropdown } from './components/UserDropdown';
import { InstallPromptWindow } from './components/InstallPromptWindow';
import type { NormalizedInstallation } from './types/installations';
import './App.css';
import BuildFooter from './components/BuildFooter';
import 'devextreme/dist/css/dx.light.css';
import { Button } from 'devextreme-react/button';
import { LoadIndicator } from 'devextreme-react/load-indicator';
import { logDebug, logError } from './utils/logger';
import { INSTALLER_DOWNLOAD_URL } from './config';

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
      // Check if we just came from OAuth callback to prevent immediate redirect loop
      const urlParams = new URLSearchParams(window.location.search);
      const hasOAuthParams = urlParams.has('code') || urlParams.has('state');
      
      if (!hasOAuthParams) {
        logDebug("Not authenticated - redirecting to Cognito login...");
        login();
      } else {
        logDebug("OAuth params detected, waiting for auth check to complete...");
      }
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
            Authentication Error
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
              text="Try Again"
              icon="refresh"
              onClick={login}
              type="default"
              stylingMode="contained"
              width="100%"
            />
            <Button
              text="Clear All and Retry"
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
  const { userEmail, logout, userInfo } = useAuth();
  const [isStartingCalWin, setIsStartingCalWin] = React.useState(false);
  const [displayName, setDisplayName] = React.useState<string | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = React.useState(false);

  const handleInstallationChange = useCallback((installation: NormalizedInstallation) => {
    logDebug("=== handleInstallationChange called ===");
    logDebug("Installation:", installation);
    switchWorkspace(installation);
  }, [switchWorkspace]);

  const handleAutoOpenLauncher = useCallback(() => {
    logDebug("=== Auto-opening launcher ===");
    openApp("selected-installation-launcher");
  }, [openApp]);

  // Fetch user info from Auth API
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (userInfo?.UserId) {
        try {
          const { getCurrentUserAttributes } = await import('./api/auth');
          const attributes = await getCurrentUserAttributes();
          // Set display name from user attributes (prefer given_name, fallback to name or email)
          const name = attributes.Attributes.given_name 
                    || attributes.Attributes.name 
                    || attributes.Attributes.email 
                    || userEmail;
          setDisplayName(name || null);
          logDebug('User attributes fetched:', attributes);
        } catch (error) {
          logError('Failed to fetch user attributes:', error);
          // Fallback to email if user attributes fetch fails
          setDisplayName(userEmail);
        }
      } else {
        setDisplayName(userEmail);
      }
    };

    fetchUserInfo();
  }, [userInfo, userEmail]);

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
          {/* Start CalWin button with loading effect */}
          <div className="button-with-loading">
            <Button
              text={isStartingCalWin ? "Starting CalWin..." : "Start CalWin"}
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
                  let explicitFailure = false;
                  const launchTime = Date.now();
                  
                  // Monitor console for protocol handler errors
                  const originalConsoleError = console.error;
                  console.error = function(...args: unknown[]) {
                    const message = args.join(' ');
                    if (message.includes('Failed to launch') && message.includes('because the scheme does not have a registered handler')) {
                      logDebug(" Protocol handler not registered - detected from console error");
                      explicitFailure = true;
                    }
                    originalConsoleError.apply(console, args);
                  };
                  
                  // Function to handle successful launch
                  const handleAppLaunch = () => {
                    const timeSinceLaunch = Date.now() - launchTime;
                    logDebug(`App launch detected after ${timeSinceLaunch}ms`);
                    launched = true;
                    document.removeEventListener('visibilitychange', handleAppLaunch);
                    window.removeEventListener('blur', handleAppLaunch);
                    window.removeEventListener('focus', handleFocus);
                  };
                  
                  // Track if window regains focus quickly (indicates protocol failed)
                  const handleFocus = () => {
                    const timeSinceLaunch = Date.now() - launchTime;
                    logDebug(`Window regained focus after ${timeSinceLaunch}ms`);
                    // If focus returns very quickly (< 500ms), likely a failure
                    if (timeSinceLaunch < 500 && !launched) {
                      explicitFailure = true;
                    }
                  };
                  
                  // Try to detect if app launches
                  document.addEventListener('visibilitychange', handleAppLaunch);
                  window.addEventListener('blur', handleAppLaunch);
                  window.addEventListener('focus', handleFocus);
                  
                  // Click the link to launch
                  anchor.click();
                  document.body.removeChild(anchor);
                  
                  // Check after a delay if the app was launched
                  // Increased timeout to 4 seconds to give slower systems time to start the app
                  setTimeout(() => {
                    // Clean up event listeners
                    document.removeEventListener('visibilitychange', handleAppLaunch);
                    window.removeEventListener('blur', handleAppLaunch);
                    window.removeEventListener('focus', handleFocus);
                    console.error = originalConsoleError; // Restore original console.error
                    
                    // If we got an explicit failure (console error or quick focus return), show prompt
                    if (explicitFailure) {
                      logDebug("Protocol handler definitely failed. Showing install prompt.");
                      setShowInstallPrompt(true);
                      setIsStartingCalWin(false);
                      return;
                    }
                    
                    if (!launched && document.hasFocus()) {
                      // Window still has focus and no blur detected - protocol probably failed
                      logDebug("Protocol handler may not be installed. Showing install prompt.");
                      setShowInstallPrompt(true);
                    } else if (launched) {
                      logDebug("App launched successfully - no install prompt needed.");
                    } else {
                      logDebug("Window lost focus - assuming app launched successfully.");
                    }
                    
                    // Clear loading state
                    setIsStartingCalWin(false);
                  }, 4000); // Increased from 2000ms to 4000ms for slower systems
                
                } catch (error) {
                  logError(" Launch failed:", error);
                  
                  // Show install prompt window
                  setShowInstallPrompt(true);
                  
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
        </div>
        <div className="app-top-bar-right">
          <UserDropdown
            userEmail={userEmail}
            displayName={displayName}
            onLogout={logout}
          />
        </div>
      </div>

      <div className="app-content">
        <div className="app-workbench">
          <WorkbenchArea />
        </div>
      </div>

      <BuildFooter />
      
      {/* Install prompt window - shown when protocol handler fails */}
      {showInstallPrompt && (
        <InstallPromptWindow
          installerUrl={INSTALLER_DOWNLOAD_URL}
          onClose={() => setShowInstallPrompt(false)}
        />
      )}
    </div>
  );
});

export default App;
