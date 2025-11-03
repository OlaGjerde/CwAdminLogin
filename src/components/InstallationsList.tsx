import React from 'react';
import { PROTOCOL_CALWIN, PROTOCOL_CALWIN_TEST, PROTOCOL_CALWIN_DEV } from '../config';
import type { NormalizedInstallation } from '../types/installations';

interface Props {
  installations: NormalizedInstallation[];
  tokens: { accessToken: string; refreshToken: string } | null;
  installationLoading: Record<string, boolean>;
  setInstallationLoading: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  generateLaunchToken: (rawAccessToken: string, installationId: string) => Promise<string | null>;
  launchWithFallback: (uri: string, onFail: () => void) => void;
  setError: (v: string | null) => void;
  setInstallationFallbackId: (v: string | null) => void;
  setInstallationFallbackUrl: (v: string | null) => void;
}

export const InstallationsList: React.FC<Props> = ({
  installations,
  tokens,
  installationLoading,
  setInstallationLoading,
  generateLaunchToken,
  launchWithFallback,
  setError,
  setInstallationFallbackId,
  setInstallationFallbackUrl,
}) => {
  if (!installations.length) return null;
  return (
    <div style={{ marginTop: 32 }}>
      <div className="CwAdminLogin-login-subtitle" style={{ marginBottom: 8 }}>Available Installations</div>
      <ul className="CwAdminLogin-installation-list" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        {installations.map(inst => {
          const loading = installationLoading[inst.id];
          const disabled = loading || !tokens;
          const iconText = (inst.name && inst.name.replace(/[^A-Za-z0-9]/g,'').slice(0,2).toUpperCase()) || 'IN';
          const handleClick = async (e: React.MouseEvent) => {
            e.preventDefault();
            if (!tokens || loading) return;
            setInstallationLoading(prev => ({ ...prev, [inst.id]: true }));
            try {
              const rawAccessToken = atob(tokens.accessToken);
              const token = await generateLaunchToken(rawAccessToken, inst.id);
              if (token) {
                const protocol = inst.appType === 0 ? PROTOCOL_CALWIN : inst.appType === 1 ? PROTOCOL_CALWIN_TEST : PROTOCOL_CALWIN_DEV;
                const uri = `${protocol}${encodeURIComponent(token)}`;
                const installerUrl = '';
                launchWithFallback(uri, () => {
                  setInstallationFallbackId(inst.id);
                  setInstallationFallbackUrl(installerUrl);
                });
              } else {
                setError('Error generating one-time token.');
              }
            } catch {
              setError('Unexpected error during token generation.');
            } finally {
              setInstallationLoading(prev => ({ ...prev, [inst.id]: false }));
            }
          };
          return (
            <li key={inst.id} style={{ width: '100%', maxWidth: 520 }}>
              <button
                className="CwAdminLogin-app-card"
                style={disabled ? { opacity: 0.6, cursor: 'default' } : undefined}
                onClick={handleClick}
                disabled={disabled}
                aria-label={disabled ? `Cannot open ${inst.name}` : `Open ${inst.name}`}
              >
                <div className="CwAdminLogin-app-card-icon">{iconText}</div>
                <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                  <div className="CwAdminLogin-app-card-title" style={{ fontWeight: 600 }}>{inst.name}</div>
                  {loading && <div style={{ fontSize: 12, opacity: 0.65 }}>Generating token...</div>}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
