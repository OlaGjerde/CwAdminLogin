import React from 'react';
import { Button } from 'devextreme-react/button';
import { APPINSTALLER_URLS, PROTOCOL_CALWIN, PROTOCOL_CALWIN_TEST, PROTOCOL_CALWIN_DEV } from '../config';

interface Props {
  appTypes: number[] | undefined;
  tokens: { accessToken: string; refreshToken: string };
  launching: boolean;
  launchMessage: string | null;
  downloadAvailableUrl: string | null;
  downloadAvailableType: number | null;
  requestLaunch: (appUri: string, downloadUrl: string, type?: number) => void;
  clearPerTypeFallback: (type: number) => void;
  setShowDownloadModal: (v: boolean) => void;
  fallbackRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>;
}

export const AppGrid: React.FC<Props> = ({
  appTypes,
  tokens,
  launching,
  launchMessage,
  downloadAvailableUrl,
  downloadAvailableType,
  requestLaunch,
  clearPerTypeFallback,
  setShowDownloadModal,
  fallbackRefs
}) => {
  const appTypeMap: Record<number, string> = {
    0: 'CalWin Prod',
    1: 'CalWin Test',
    2: 'CalWin Dev'
  };

  const protocolMap: Record<number, string> = {
    0: PROTOCOL_CALWIN,
    1: PROTOCOL_CALWIN_TEST,
    2: PROTOCOL_CALWIN_DEV
  };

  return (
    <div className="CwAdminLogin-login-app-list">
      <div className="CwAdminLogin-login-title">CalWin Apps</div>
      {launching && (
        <div className="CwAdminLogin-login-launch-banner">
          <div className="CwAdminLogin-login-launch-spinner" aria-hidden />
          <div className="CwAdminLogin-login-launch-message">{launchMessage}</div>
        </div>
      )}
      <div className="CwAdminLogin-app-grid">
        {appTypes?.map(type => {
          const appName = appTypeMap[type] || `AppType${type}`;
            const protocol = protocolMap[type] || PROTOCOL_CALWIN_DEV;
            const appProtocolUrl = `${protocol}?accessToken=${encodeURIComponent(tokens.accessToken)}&refreshToken=${encodeURIComponent(tokens.refreshToken)}`;
            const appinstallerFileUrl = APPINSTALLER_URLS[type] || APPINSTALLER_URLS[2];
            const onClick = (e: React.MouseEvent) => {
              e.preventDefault();
              if (launching) return;
              requestLaunch(appProtocolUrl, appinstallerFileUrl, type);
            };
            return (
              <div key={type} className="CwAdminLogin-app-item">
                <button
                  className="CwAdminLogin-app-card"
                  onClick={onClick}
                  disabled={launching}
                  aria-label={`Open ${appName}`}
                >
                  <div className="CwAdminLogin-app-card-icon">{appName.replace(/[^A-Za-z0-9]/g,'').slice(0,2).toUpperCase() || 'CW'}</div>
                  <div className="CwAdminLogin-app-card-body">
                    <div className="CwAdminLogin-app-card-title">{appName}</div>
                  </div>
                </button>
                {downloadAvailableUrl && downloadAvailableType === type && (
                  <div style={{ marginTop: 10 }} ref={r => { fallbackRefs.current[type] = r; }}>
                    <div className="CwAdminLogin-login-download-fallback" role="region" aria-live="polite">
                      <div style={{ marginBottom: 8 }}>Kan ikke installere via protokoll? Last ned installasjonsprogrammet manuelt:</div>
                      <div className="CwAdminLogin-download-actions">
                        <Button
                          text="Last ned .appinstaller"
                          type="default"
                          onClick={() => {
                            window.location.href = downloadAvailableUrl;
                            clearPerTypeFallback(type);
                          }}
                        />
                        <Button
                          text="Vis installasjonsinstruksjoner"
                          type="normal"
                          onClick={() => setShowDownloadModal(true)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
        })}
      </div>
    </div>
  );
};
