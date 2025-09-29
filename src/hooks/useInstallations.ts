import { useCallback, useState } from 'react';
import { fetchInstallations, createOneTimeToken } from '../api/auth';
import type { NormalizedInstallation, InstallationItem } from '../types/installations';

export interface UseInstallationsResult {
  installations: NormalizedInstallation[];
  loading: boolean;
  error: string | null;
  refresh: (rawAccessToken: string) => Promise<void>;
  generateLaunchToken: (rawAccessToken: string, installationId: string) => Promise<string | null>;
}

export function useInstallations(): UseInstallationsResult {
  const [installations, setInstallations] = useState<NormalizedInstallation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalize = (data: Array<InstallationItem | string>): NormalizedInstallation[] => {
    return data.map((item, idx) => {
      if (typeof item === 'string') {
        return { id: String(idx), name: `Installation ${idx + 1}`, raw: item };
      }
      const id = item.Id !== undefined ? String(item.Id) : (item.InstallationId !== undefined ? String(item.InstallationId) : `${idx}`);
      const name = item.DisplayName || item.Name || item.Title || `Installation ${idx + 1}`;
      const appType = typeof item.AppType === 'number' ? item.AppType : (typeof item.Type === 'number' ? item.Type : undefined);
      return { id, name, appType, raw: item };
    });
  };

  const refresh = useCallback(async (rawAccessToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetchInstallations(rawAccessToken);
      if (resp.status === 401) {
        setError('Ikke autorisert.');
        return;
      }
      if (!Array.isArray(resp.data)) {
        setError('Uventet format på installasjoner.');
        return;
      }
      setInstallations(normalize(resp.data));
    } catch {
      setError('Feil ved henting av installasjoner.');
    } finally {
      setLoading(false);
    }
  }, []);

  const generateLaunchToken = useCallback(async (rawAccessToken: string, installationId: string) => {
    try {
      const resp = await createOneTimeToken(rawAccessToken, installationId);
      if (resp.status !== 200) return null;
      const data = resp.data;
      if (typeof data === 'string') return data;
      return data.oneTimeToken || data.OneTimeToken || data.token || data.Token || data.linkToken || data.LinkToken || null;
    } catch {
      return null;
    }
  }, []);

  return { installations, loading, error, refresh, generateLaunchToken };
}
