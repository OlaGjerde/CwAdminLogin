import React from 'react';
import { PROTOCOL_CALWIN, PROTOCOL_CALWIN_TEST, PROTOCOL_CALWIN_DEV } from '../config';

interface Props {
  appTypes: number[] | undefined;
  tokens: { accessToken: string; refreshToken: string };
  launching: boolean;
  launchMessage: string | null;
  requestLaunch: (appUri: string, downloadUrl: string, type?: number) => void;
}

export const AppGrid: React.FC<Props> = ({
  appTypes,
  tokens,
  launching,
  launchMessage,
  requestLaunch,
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
      {(launching || launchMessage) && (
        <div className={`CwAdminLogin-login-launch-banner ${launchMessage?.includes('Ikke installert') ? 'error' : ''}`}>
          {launching && !launchMessage?.includes('Ikke installert') && (
            <div className="CwAdminLogin-login-launch-spinner" aria-hidden />
          )}
          <div className="CwAdminLogin-login-launch-message">{launchMessage}</div>
        </div>
      )}
      <div className="CwAdminLogin-app-grid">
        {appTypes?.map(type => {
          const appName = appTypeMap[type] || `AppType${type}`;
            const protocol = protocolMap[type] || PROTOCOL_CALWIN_DEV;
            const appProtocolUrl = `${protocol}?accessToken=${encodeURIComponent(tokens.accessToken)}&refreshToken=${encodeURIComponent(tokens.refreshToken)}`;
            const appinstallerFileUrl = '';
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
              </div>
            );
        })}
      </div>
    </div>
  );
};
