import React, { useState, useCallback } from 'react';
import type { CustomAppProps } from '../../types/custom-app';
import type { NormalizedInstallation } from '../../types/installations';
import { Button } from 'devextreme-react/button';
import { TextBox } from 'devextreme-react/text-box';
import { ScrollView } from 'devextreme-react/scroll-view';
import './InstallationLauncher.css';

export const InstallationLauncherComponent: React.FC<CustomAppProps> = ({
  installations,
  authTokens,
}) => {
  const [searchText, setSearchText] = useState('');
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

  // Get icon for app type
  const getAppTypeIcon = (appType?: number): string => {
    switch (appType) {
      case 0: return 'globe'; // Production
      case 1: return 'coffee'; // Test
      case 2: return 'preferences'; // Development
      default: return 'box';
    }
  };

  // Get color for app type
  const getAppTypeColor = (appType?: number): string => {
    switch (appType) {
      case 0: return '#28a745'; // Green - Production
      case 1: return '#ffc107'; // Yellow - Test
      case 2: return '#17a2b8'; // Blue - Development
      default: return '#6c757d'; // Gray
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
      
      // Get access token
      if (!authTokens?.accessToken) {
        console.error('No access token available');
        alert('Ikke tilgjengelig tilgangstoken. Vennligst logg inn på nytt.');
        return;
      }

      // Import required modules
      const { API_BASE } = await import('../../config');
      const { PROTOCOL_CALWIN, PROTOCOL_CALWIN_TEST, PROTOCOL_CALWIN_DEV } = await import('../../config');

      // Generate launch token
      const response = await fetch(`${API_BASE}/api/LaunchToken/GenerateLaunchToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authTokens.accessToken}`,
        },
        body: JSON.stringify({
          accessToken: authTokens.accessToken,
          installationId: installation.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate launch token: ${response.status}`);
      }

      const token = await response.text();
      
      if (!token) {
        throw new Error('No launch token received');
      }

      // Determine protocol based on app type
      const protocol = installation.appType === 0 
        ? PROTOCOL_CALWIN 
        : installation.appType === 1 
        ? PROTOCOL_CALWIN_TEST 
        : PROTOCOL_CALWIN_DEV;
      
      const uri = `${protocol}${encodeURIComponent(token)}`;
      console.log('🔗 Launch URI:', uri);
      
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
  }, [authTokens, launching]);

  return (
    <div className="installation-launcher">
      {/* Header with search */}
      <div className="launcher-header">
        <div className="launcher-title">
          <i className="dx-icon-box"></i>
          <h2>CalWin Installasjoner</h2>
        </div>
        <div className="launcher-search">
          <TextBox
            placeholder="Søk etter installasjon..."
            value={searchText}
            onValueChanged={(e) => setSearchText(e.value || '')}
            mode="search"
            width="100%"
          />
        </div>
        <div className="launcher-stats">
          <span>{filteredInstallations.length} installasjon(er)</span>
        </div>
      </div>

      {/* Installation grid */}
      <ScrollView className="launcher-content">
        {Object.keys(groupedInstallations).length === 0 ? (
          <div className="launcher-empty">
            <i className="dx-icon-search"></i>
            <p>Ingen installasjoner funnet</p>
            {searchText && (
              <Button
                text="Nullstill søk"
                onClick={() => setSearchText('')}
                stylingMode="outlined"
              />
            )}
          </div>
        ) : (
          Object.entries(groupedInstallations).map(([typeName, installs]) => (
            <div key={typeName} className="launcher-group">
              <div className="launcher-group-header">
                <h3>{typeName}</h3>
                <span className="launcher-group-count">{installs.length}</span>
              </div>
              <div className="launcher-grid">
                {installs.map((installation) => (
                  <div
                    key={installation.id}
                    className={`launcher-card ${launching === installation.id ? 'launching' : ''}`}
                  >
                    <div
                      className="launcher-card-icon"
                      style={{ backgroundColor: getAppTypeColor(installation.appType) }}
                    >
                      <i className={`dx-icon-${getAppTypeIcon(installation.appType)}`}></i>
                    </div>
                    <div className="launcher-card-content">
                      <h4 className="launcher-card-title">{installation.name}</h4>
                      <p className="launcher-card-type">{typeName}</p>
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
