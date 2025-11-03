import React, { useCallback } from 'react';
import type { CustomAppProps } from '../../types/custom-app';
import { Button } from 'devextreme-react/button';
import './SelectedInstallationLauncher.css';
import { logDebug, logError } from '../../utils/logger';
import { useLauncher } from '../../hooks/useLauncher';
import { INSTALLER_DOWNLOAD_URL } from '../../config';

export const SelectedInstallationLauncherComponent: React.FC<CustomAppProps> = ({
  workspace,
}) => {
  // Use the launcher hook for protocol handler detection
  const { launching, launchMessage, launchWithFallback } = useLauncher();
  
  // Track if download button was clicked
  const [downloadClicked, setDownloadClicked] = React.useState(false);

  // Get initials from installation name (first 2 letters)
  const getInstallationInitials = (name: string): string => {
    const cleanName = name.replace(/[^\w\s]/g, '').trim();
    const words = cleanName.split(/\s+/);
    
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    } else if (words.length === 1 && words[0].length >= 2) {
      return words[0].substring(0, 2).toUpperCase();
    } else if (words.length === 1 && words[0].length === 1) {
      return words[0][0].toUpperCase();
    }
    
    return 'CW';
  };

  // Get gradient for app type (bluish color scheme)
  const getAppTypeGradient = (appType?: number): string => {
    switch (appType) {
      case 0: return 'linear-gradient(135deg, #4e73df 0%, #224abe 100%)'; // Deep blue - Production
      case 1: return 'linear-gradient(135deg, #36b9cc 0%, #258391 100%)'; // Cyan blue - Test
      case 2: return 'linear-gradient(135deg, #5a96e3 0%, #3867d6 100%)'; // Bright blue - Development
      default: return 'linear-gradient(135deg, #6c757d 0%, #495057 100%)'; // Gray gradient
    }
  };

  // Launch installation
  const handleLaunchInstallation = useCallback(async () => {
    if (!workspace) {
      logError('No workspace selected');
      return;
    }

    if (launching) {
      logDebug('Already launching');
      return;
    }

    try {
      logDebug('🚀 Launching installation:', workspace.name);
      
      // Import required modules (cookies sent automatically for auth)
      const { createOneTimeToken } = await import('../../api/adminApi');
      const { PROTOCOL_CALWIN, PROTOCOL_CALWIN_TEST, PROTOCOL_CALWIN_DEV } = await import('../../config');

      // Generate launch token using cookie-based auth
      logDebug('Generating launch token...');
      const token = await createOneTimeToken(workspace.id);
      
      if (!token) {
        throw new Error('No launch token received from server');
      }

      logDebug('✅ Launch token received');

      // Determine protocol based on app type
      const protocol = workspace.appType === 0 
        ? PROTOCOL_CALWIN 
        : workspace.appType === 1 
        ? PROTOCOL_CALWIN_TEST 
        : PROTOCOL_CALWIN_DEV;
      
      const uri = `${protocol}${encodeURIComponent(token)}`;
      logDebug('🔗 Launching with URI:', uri);
      
      // Use launcher hook to launch with fallback detection
      await launchWithFallback(uri);
      
    } catch (error) {
      logError('❌ Launch failed:', error);
      alert(`Failed to launch installation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [workspace, launching, launchWithFallback]);

  // Show message if no workspace is selected
  if (!workspace) {
    return (
      <div className="selected-launcher">
        <div className="selected-launcher-empty">
          <i className="dx-icon dx-icon-info" />
          <h3>No Installation Selected</h3>
          <p>Please select a CalWin installation from the dropdown above.</p>
        </div>
      </div>
    );
  }

  // Check if protocol handler is not installed (defined here after early return)
  const showInstallerLink = launchMessage && launchMessage.includes('Ikke installert');

  return (
    <div className="selected-launcher">
      <div className="selected-launcher-content">
        <div
          className={`selected-launcher-card ${launching ? 'launching' : ''} ${showInstallerLink ? 'shake' : ''}`}
          onClick={handleLaunchInstallation}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleLaunchInstallation();
            }
          }}
        >
          <div
            className="selected-launcher-card-icon"
            style={{ background: getAppTypeGradient(workspace.appType) }}
          >
            <span className="selected-launcher-card-initials">
              {getInstallationInitials(workspace.name)}
            </span>
          </div>
          <div className="selected-launcher-card-content">
            <h2 className="selected-launcher-card-title">{workspace.name}</h2>
            <p className="selected-launcher-card-type">
              {workspace.appType === 0 ? 'Production' : workspace.appType === 1 ? 'Test' : 'Development'}
            </p>
          </div>
          <div className="selected-launcher-card-actions">
            <Button
              icon="runner"
              text={launching ? 'Starting...' : 'Start CalWin'}
              onClick={(e) => {
                e.event?.stopPropagation(); // Prevent double-firing
                handleLaunchInstallation();
              }}
              disabled={launching}
              type="default"
              stylingMode="contained"
              width="100%"
              height={48}
            />
          </div>
        </div>

        {/* Download installer button when protocol handler is not installed */}
        {showInstallerLink && !downloadClicked && (
          <div style={{ marginTop: '16px', width: '100%', maxWidth: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <p className="installer-info-text">
              CalWin er ikke installert. Last ned og installer, sjekk deretter nedlastingsmappen.
            </p>
            <Button
              text="Last ned CalWin"
              icon="download"
              onClick={() => {
                logDebug('Opening installer download:', INSTALLER_DOWNLOAD_URL);
                window.open(INSTALLER_DOWNLOAD_URL, '_blank');
                setDownloadClicked(true); // Hide button after clicking
              }}
              type="default"
              stylingMode="contained"
              width="100%"
              height={48}
            />
          </div>
        )}
      </div>
    </div>
  );
};
