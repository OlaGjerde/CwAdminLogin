import React, { useState, useCallback } from 'react';
import type { CustomAppProps } from '../../types/custom-app';
import type { NormalizedInstallation } from '../../types/installations';
import { Button } from 'devextreme-react/button';
import { ScrollView } from 'devextreme-react/scroll-view';
import './InstallationLauncher.css';

export const InstallationLauncherComponent: React.FC<CustomAppProps> = ({
  installations,
}) => {
  // searchText state kept for future search functionality
  const [searchText] = useState('');
  const [launching, setLaunching] = useState<string | null>(null);

  // Filter installations based on search
  const filteredInstallations = installations.filter(installation =>
    installation.name.toLowerCase().includes(searchText.toLowerCase())
  );

  // Group installations by app type
  const groupedInstallations = filteredInstallations.reduce((groups, installation) => {
    const type = installation.appType ?? 0;
    const typeName = type === 0 ? 'Production' : type === 1 ? 'Test' : 'Development';
    
    if (!groups[typeName]) {
      groups[typeName] = [];
    }
    groups[typeName].push(installation);
    return groups;
  }, {} as Record<string, NormalizedInstallation[]>);

  // Get initials from installation name (first 2 letters)
  const getInstallationInitials = (name: string): string => {
    // Remove special characters and split into words
    const cleanName = name.replace(/[^\w\s]/g, '').trim();
    const words = cleanName.split(/\s+/);
    
    if (words.length >= 2) {
      // Take first letter of first two words
      return (words[0][0] + words[1][0]).toUpperCase();
    } else if (words.length === 1 && words[0].length >= 2) {
      // Take first two letters of single word
      return words[0].substring(0, 2).toUpperCase();
    } else if (words.length === 1 && words[0].length === 1) {
      // Single letter word
      return words[0][0].toUpperCase();
    }
    
    return 'CW'; // Default fallback
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
  const handleLaunchInstallation = useCallback(async (installation: NormalizedInstallation) => {
    if (launching) {
      console.log('Already launching an installation');
      return;
    }

    setLaunching(installation.id);

    try {
      console.log('🚀 Launching installation:', installation.name);
      
      // Import required modules (cookies sent automatically for auth)
      const { createOneTimeToken } = await import('../../api/auth');
      const { PROTOCOL_CALWIN, PROTOCOL_CALWIN_TEST, PROTOCOL_CALWIN_DEV } = await import('../../config');

      // Generate launch token using cookie-based auth
      console.log('Generating launch token...');
      const resp = await createOneTimeToken(installation.id);
      
      if (resp.status !== 200) {
        throw new Error(`Failed to generate launch token: ${resp.status}`);
      }

      const data = resp.data;
      let token: string | null = null;
      
      if (typeof data === 'string') {
        token = data;
      } else {
        token = data.oneTimeToken || data.OneTimeToken || data.token || data.Token || data.linkToken || data.LinkToken || null;
      }
      
      if (!token) {
        throw new Error('No launch token received from server');
      }

      console.log('✅ Launch token received');

      // Determine protocol based on app type
      const protocol = installation.appType === 0 
        ? PROTOCOL_CALWIN 
        : installation.appType === 1 
        ? PROTOCOL_CALWIN_TEST 
        : PROTOCOL_CALWIN_DEV;
      
      const uri = `${protocol}${encodeURIComponent(token)}`;
      console.log('🔗 Launching with URI:', uri);
      
      // Try to launch via protocol handler
      const anchor = document.createElement('a');
      anchor.href = uri;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      console.log('✅ Launch initiated successfully');
      
      // Show success feedback
      setTimeout(() => {
        setLaunching(null);
      }, 2000);
      
    } catch (error) {
      console.error('❌ Launch failed:', error);
      alert(`Kunne ikke starte installasjonen: ${error}`);
      setLaunching(null);
    }
  }, [launching]); // authTokens no longer needed - cookies handle auth

  return (
    <div className="installation-launcher">
      {/* Installation grid */}
      <ScrollView className="launcher-content">
        {Object.keys(groupedInstallations).length === 0 ? (
          <div className="no-installations">
            <h3>Ingen CalWin-installasjoner funnet</h3>
            <p>Vennligst legg til CalWin-installasjoner i innstillingene.</p>
          </div>
        ) : (
          Object.entries(groupedInstallations).map(([typeName, installs]) => (
            <div key={typeName} className="launcher-group">
              <div className="launcher-grid">
                {installs.map((installation) => (
                  <div
                    key={installation.id}
                    className={`launcher-card ${launching === installation.id ? 'launching' : ''}`}
                  >
                    <div
                      className="launcher-card-icon"
                      style={{ background: getAppTypeGradient(installation.appType) }}
                    >
                      <span className="launcher-card-initials">
                        {getInstallationInitials(installation.name)}
                      </span>
                    </div>
                    <div className="launcher-card-content">
                      <h4 className="launcher-card-title">{installation.name}</h4>
                    </div>
                    <div className="launcher-card-actions">
                      <Button
                        icon="runner"
                        text={launching === installation.id ? 'Starter...' : 'Start'}
                        onClick={() => handleLaunchInstallation(installation)}
                        disabled={launching !== null}
                        type="default"
                        stylingMode="contained"
                        width="100%"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </ScrollView>
    </div>
  );
};
