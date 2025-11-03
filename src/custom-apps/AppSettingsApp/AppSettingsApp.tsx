/**
 * App Settings Component
 * 
 * Main UI for configuring app settings:
 * - Reorder apps via drag-and-drop
 * - Configure per-app settings (size, position, etc.)
 * - Admin: Enable/disable apps
 * - Admin: Copy settings to other installations
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { CustomAppProps } from '../../types/custom-app';
import type { AppSettingsUpdate } from '../../types/app-settings';
import { useAppSettings } from '../../contexts/AppSettingsContext';
import { useAuth } from '../../contexts';
import { customAppRegistry } from '../../registry/custom-apps';
import { isUserAdmin } from '../../config';
import { Button } from 'devextreme-react/button';
import { ScrollView } from 'devextreme-react/scroll-view';
import { Popup } from 'devextreme-react/popup';
import { List } from 'devextreme-react/list';
import { CheckBox } from 'devextreme-react/check-box';
import { NumberBox } from 'devextreme-react/number-box';
// import { Sortable } from 'devextreme-react/sortable'; // TODO: Add drag-and-drop reordering
import { logInfo } from '../../utils/logger';
import './AppSettingsApp.css';

interface AppSettingsItemProps {
  appId: string;
  appName: string;
  appIcon: string | React.ComponentType;
  isFirst: boolean;
  order: number;
  defaultWidth?: number;
  defaultHeight?: number;
  defaultX?: number;
  defaultY?: number;
  enableOverflow: boolean;
  onUpdateSettings: (appId: string, updates: AppSettingsUpdate) => void;
  onExpand: (appId: string) => void;
  isExpanded: boolean;
}

const AppSettingsItem: React.FC<AppSettingsItemProps> = ({
  appId,
  appName,
  appIcon,
  isFirst,
  defaultWidth,
  defaultHeight,
  defaultX,
  defaultY,
  enableOverflow,
  onUpdateSettings,
  onExpand,
  isExpanded,
}) => {
  return (
    <div className={`app-settings-item ${isFirst ? 'locked' : ''}`}>
      <div className="app-settings-item-header">
        <div className="app-settings-item-left">
          {!isFirst && <span className="app-settings-drag-handle">☰</span>}
          {isFirst && <span className="app-settings-lock-icon">🔒</span>}
          <span className="app-settings-item-icon">
            {typeof appIcon === 'string' ? (
              <i className={`dx-icon dx-icon-${appIcon}`} />
            ) : (
              React.createElement(appIcon as React.ComponentType)
            )}
          </span>
          <span className="app-settings-item-name">{appName}</span>
          {isFirst && <span className="app-settings-locked-badge">Locked</span>}
        </div>
        
        <div className="app-settings-item-right">
          <Button
            icon={isExpanded ? 'chevronup' : 'chevrondown'}
            onClick={() => onExpand(appId)}
            stylingMode="text"
            hint="Configure settings"
          />
        </div>
      </div>
      
      {isExpanded && (
        <div className="app-settings-item-details">
          <div className="app-settings-detail-grid">
            {/* Window Size */}
            <div className="app-settings-detail-section">
              <h4>Standard vindustørrelse</h4>
              <div className="app-settings-input-group">
                <NumberBox
                  label="Bredde (px)"
                  value={defaultWidth || 600}
                  min={300}
                  max={2000}
                  showSpinButtons={true}
                  onValueChanged={(e) => {
                    if (e.value) {
                      onUpdateSettings(appId, {
                        defaultSize: {
                          width: e.value,
                          height: defaultHeight || 500
                        }
                      });
                    }
                  }}
                />
                <NumberBox
                  label="Høyde (px)"
                  value={defaultHeight || 500}
                  min={200}
                  max={2000}
                  showSpinButtons={true}
                  onValueChanged={(e) => {
                    if (e.value) {
                      onUpdateSettings(appId, {
                        defaultSize: {
                          width: defaultWidth || 600,
                          height: e.value
                        }
                      });
                    }
                  }}
                />
              </div>
            </div>

            {/* Window Position */}
            <div className="app-settings-detail-section">
              <h4>Standard vindusposisjon</h4>
              <div className="app-settings-input-group">
                <NumberBox
                  label="X-posisjon (px)"
                  value={defaultX || 100}
                  min={0}
                  max={2000}
                  showSpinButtons={true}
                  onValueChanged={(e) => {
                    if (e.value !== null && e.value !== undefined) {
                      onUpdateSettings(appId, {
                        defaultPosition: {
                          x: e.value,
                          y: defaultY || 100
                        }
                      });
                    }
                  }}
                />
                <NumberBox
                  label="Y-posisjon (px)"
                  value={defaultY || 100}
                  min={0}
                  max={2000}
                  showSpinButtons={true}
                  onValueChanged={(e) => {
                    if (e.value !== null && e.value !== undefined) {
                      onUpdateSettings(appId, {
                        defaultPosition: {
                          x: defaultX || 100,
                          y: e.value
                        }
                      });
                    }
                  }}
                />
              </div>
            </div>

            {/* Behavior Options */}
            <div className="app-settings-detail-section full-width">
              <h4>Oppførsel</h4>
              <CheckBox
                value={enableOverflow}
                text="Aktiver innholdsskrolling (overflow)"
                onValueChanged={(e) => onUpdateSettings(appId, { enableOverflow: e.value })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AppSettingsComponent: React.FC<CustomAppProps> = ({
  workspace,
  installations,
}) => {
  const { userInfo } = useAuth();
  const isAdmin = isUserAdmin(userInfo);
  const {
    getAllSettings,
    updateAppSettings,
    resetAllSettings,
    copySettingsToInstallations,
    currentInstallationId,
  } = useAppSettings();

  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [selectedInstallations, setSelectedInstallations] = useState<string[]>([]);

  const allSettings = getAllSettings();

  // Get all apps with their settings
  const appsWithSettings = useMemo(() => {
    return customAppRegistry
      .map((app) => {
        const settings = allSettings[app.id] || {
          appId: app.id,
          order: 999,
          enabled: true,
          autoSavePosition: true,
          enableOverflow: true,
        };
        return {
          app,
          settings,
        };
      })
      .sort((a, b) => {
        // Always keep selected-installation-launcher (Start CalWin) first
        if (a.app.id === 'selected-installation-launcher') return -1;
        if (b.app.id === 'selected-installation-launcher') return 1;
        
        // Sort others by order
        return a.settings.order - b.settings.order;
      });
  }, [allSettings]);

  // Separate first app (Start CalWin) from others
  const firstApp = appsWithSettings.find(item => item.app.id === 'selected-installation-launcher');
  const otherApps = appsWithSettings.filter(item => item.app.id !== 'selected-installation-launcher');

  const handleExpand = useCallback((appId: string) => {
    setExpandedAppId(prev => prev === appId ? null : appId);
  }, []);

  const handleResetAll = useCallback(() => {
    if (confirm('Er du sikker på at du vil tilbakestille alle innstillinger til standardverdier?')) {
      logInfo('Resetting all app settings');
      resetAllSettings();
      setExpandedAppId(null);
    }
  }, [resetAllSettings]);

  const handleCopyToInstallations = useCallback(() => {
    if (selectedInstallations.length === 0) {
      alert('Vennligst velg minst én installasjon');
      return;
    }

    if (confirm(`Kopier innstillinger til ${selectedInstallations.length} installasjon(er)?`)) {
      logInfo('Copying settings to installations', { targets: selectedInstallations });
      copySettingsToInstallations(selectedInstallations);
      setShowCopyModal(false);
      setSelectedInstallations([]);
      alert('Innstillinger kopiert!');
    }
  }, [selectedInstallations, copySettingsToInstallations]);

  const availableInstallations = useMemo(() => {
    return installations.filter(inst => inst.id !== currentInstallationId);
  }, [installations, currentInstallationId]);

  const handleInstallationToggle = useCallback((installationId: string) => {
    setSelectedInstallations(prev => 
      prev.includes(installationId)
        ? prev.filter(id => id !== installationId)
        : [...prev, installationId]
    );
  }, []);

  return (
    <div className="app-settings-container">
      <ScrollView height="100%" width="100%">
        <div className="app-settings-content">
          {/* Header */}
          <div className="app-settings-header">
            <h2>⚙️ Innstillinger</h2>
            <p className="app-settings-subtitle">
              Konfigurer applikasjonene for {workspace?.name || 'denne installasjonen'}
            </p>
          </div>

          {/* Actions */}
          <div className="app-settings-actions">
            {isAdmin && availableInstallations.length > 0 && (
              <Button
                text="Kopier til andre installasjoner"
                icon="copy"
                onClick={() => setShowCopyModal(true)}
                type="default"
                stylingMode="outlined"
              />
            )}
            <Button
              text="Tilbakestill alle innstillinger"
              icon="revert"
              onClick={handleResetAll}
              type="danger"
              stylingMode="outlined"
            />
          </div>

          {/* First App (Locked) */}
          {firstApp && (
            <div className="app-settings-section">
              <h3>Hovedapplikasjon (Alltid først)</h3>
              <p className="app-settings-section-description">
                "Start CalWin" vises alltid først og kan ikke deaktiveres eller flyttes.
              </p>
              <AppSettingsItem
                appId={firstApp.app.id}
                appName={firstApp.app.name}
                appIcon={firstApp.app.icon}
                isFirst={true}
                order={0}
                defaultWidth={firstApp.settings.defaultSize?.width}
                defaultHeight={firstApp.settings.defaultSize?.height}
                defaultX={firstApp.settings.defaultPosition?.x}
                defaultY={firstApp.settings.defaultPosition?.y}
                enableOverflow={firstApp.settings.enableOverflow}
                onUpdateSettings={updateAppSettings}
                onExpand={handleExpand}
                isExpanded={expandedAppId === firstApp.app.id}
              />
            </div>
          )}

          {/* Other Apps */}
          {otherApps.length > 0 && (
            <div className="app-settings-section">
              <h3>Andre applikasjoner</h3>
              <div className="app-settings-list">
                {otherApps.map(({ app, settings }) => (
                  <AppSettingsItem
                    key={app.id}
                    appId={app.id}
                    appName={app.name}
                    appIcon={app.icon}
                    isFirst={false}
                    order={settings.order}
                    defaultWidth={settings.defaultSize?.width}
                    defaultHeight={settings.defaultSize?.height}
                    defaultX={settings.defaultPosition?.x}
                    defaultY={settings.defaultPosition?.y}
                    enableOverflow={settings.enableOverflow}
                    onUpdateSettings={updateAppSettings}
                    onExpand={handleExpand}
                    isExpanded={expandedAppId === app.id}
                  />
                ))}
              </div>
              <p className="app-settings-hint">
                💡 Dra-og-slipp rekkefølge kommer snart
              </p>
            </div>
          )}
        </div>
      </ScrollView>

      {/* Copy to Installations Modal */}
      {isAdmin && (
        <Popup
          visible={showCopyModal}
          onHiding={() => setShowCopyModal(false)}
          dragEnabled={false}
          hideOnOutsideClick={true}
          showTitle={true}
          title="Kopier innstillinger til installasjoner"
          width={500}
          height={450}
        >
          <div className="copy-modal-content">
            <p>Velg installasjoner å kopiere innstillinger til:</p>
            
            <List
              dataSource={availableInstallations}
              height={250}
              selectionMode="none"
              itemRender={(installation) => (
                <div className="installation-list-item">
                  <CheckBox
                    value={selectedInstallations.includes(installation.id)}
                    onValueChanged={() => handleInstallationToggle(installation.id)}
                  />
                  <span style={{ marginLeft: 8 }}>{installation.name}</span>
                </div>
              )}
            />

            <div className="copy-modal-actions">
              <Button
                text="Kopier"
                icon="check"
                type="success"
                onClick={handleCopyToInstallations}
                disabled={selectedInstallations.length === 0}
              />
              <Button
                text="Avbryt"
                onClick={() => setShowCopyModal(false)}
                stylingMode="outlined"
              />
            </div>
          </div>
        </Popup>
      )}
    </div>
  );
};
