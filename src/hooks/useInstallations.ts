import { useCallback, useState, useEffect, useRef } from 'react';
import { logDebug, logWarn } from '../utils/logger';
import { INSTALLATIONS_STALE_MS, INSTALLATIONS_RETRY_BASE_MS, INSTALLATIONS_RETRY_MAX_MS, INSTALLATIONS_RETRY_MAX_ATTEMPTS } from '../config';
import { getAuthorizedInstallations, createOneTimeToken as apiCreateOneTimeToken } from '../api/adminApi';
import { useAuth } from '../contexts';
import { handleApiError } from '../utils/apiErrors';
import type { NormalizedInstallation, InstallationItem } from '../types/installations';

export interface UseInstallationsResult {
  installations: NormalizedInstallation[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Refresh only if cached value is stale (older than maxAgeMs). Returns boolean indicating whether a refresh was triggered */
  refreshIfStale: (maxAgeMs?: number) => Promise<boolean>;
  generateLaunchToken: (installationId: string) => Promise<string | null>;
}

export function useInstallations(): UseInstallationsResult {
  const [installations, setInstallations] = useState<NormalizedInstallation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedRef = useRef<number>(0);
  const { isAuthenticated } = useAuth();

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

  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failureCountRef = useRef(0);
  const inFlightRef = useRef(false);

  const clearRetry = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  // We keep a stable ref to the refresh function to avoid circular hook dependencies between scheduleRetry and refresh.
  const refreshFnRef = useRef<() => void>(() => {});

  const scheduleRetry = useCallback(() => {
    if (failureCountRef.current >= INSTALLATIONS_RETRY_MAX_ATTEMPTS) return; // give up quietly
    const attempt = failureCountRef.current; // after increment
    const base = INSTALLATIONS_RETRY_BASE_MS * Math.pow(2, Math.max(0, attempt - 1));
    const exp = Math.min(base, INSTALLATIONS_RETRY_MAX_MS);
    const jitter = exp * (0.2 * (Math.random() - 0.5)); // +/-20%
    const delay = Math.max(500, Math.round(exp + jitter));
    clearRetry();
    retryTimerRef.current = setTimeout(() => {
      if (failureCountRef.current > 0 && failureCountRef.current <= INSTALLATIONS_RETRY_MAX_ATTEMPTS) {
        refreshFnRef.current();
      }
    }, delay);
  }, [clearRetry]);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      logDebug('Skipping installations refresh - not authenticated');
      return;
    }

    if (inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;
    clearRetry();
    setLoading(true);
    setError(null);
    
    try {
      const data = await getAuthorizedInstallations();
      if (!Array.isArray(data)) {
        setError('Uventet format på installasjoner.');
        failureCountRef.current++;
        scheduleRetry();
        return;
      }
      const normalized = normalize(data);
      setInstallations(normalized);
      lastFetchedRef.current = Date.now();
      try {
        localStorage.setItem('cw_installations', JSON.stringify({ ts: lastFetchedRef.current, items: normalized }));
      } catch { /* ignore */ }
      failureCountRef.current = 0;
    } catch (error: unknown) {
      const apiError = handleApiError(error);
      if (apiError.code === 'NETWORK_ERROR') {
        setError('Nettverksfeil ved henting av installasjoner. Prøver igjen...');
      } else if (apiError.status === 401) {
        setError('Ikke autorisert. Vennligst logg inn på nytt.');
        return; // Don't retry on auth errors
      } else {
        setError(apiError.message);
      }
      failureCountRef.current++;
      scheduleRetry();
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [clearRetry, scheduleRetry, isAuthenticated]);

  // Keep ref pointing to latest refresh implementation
  useEffect(() => { refreshFnRef.current = refresh; }, [refresh]);

  // Consider data stale after 20 seconds unless caller overrides
  const refreshIfStale = useCallback(async (maxAgeMs: number = INSTALLATIONS_STALE_MS) => {
  const debug = import.meta.env?.MODE === 'development' || import.meta.env?.VITE_DEBUG_LOG === '1';
    const age = Date.now() - lastFetchedRef.current;
    if (!lastFetchedRef.current || age > maxAgeMs) {
  if (debug) logDebug('[installations] stale -> refresh', { age, threshold: maxAgeMs });
      await refresh();
      return true;
    }
  if (debug) logDebug('[installations] fresh, skip', { age, threshold: maxAgeMs });
    return false;
  }, [refresh]);

  // Hydrate from localStorage cache (valid up to 10 minutes)
  useEffect(() => {
    try {
      const cached = localStorage.getItem('cw_installations');
      if (cached) {
        const parsed = JSON.parse(cached) as { ts?: number; items?: NormalizedInstallation[] };
        if (parsed.items && Array.isArray(parsed.items) && typeof parsed.ts === 'number') {
          if (Date.now() - parsed.ts < 10 * 60 * 1000) {
            setInstallations(parsed.items);
            lastFetchedRef.current = parsed.ts;
          }
        }
      }
    } catch { /* ignore */ }
  }, []);

  const generateLaunchToken = useCallback(async (installationId: string) => {
    const debug = import.meta.env?.MODE === 'development' || import.meta.env?.VITE_DEBUG_LOG === '1';
    if (debug) logDebug('[installations] generating launch token', { installationId });
    
    try {
      const token = await apiCreateOneTimeToken(installationId);
      if (debug) logDebug('[installations] token generated successfully');
      return token;
    } catch (error) {
      const apiError = handleApiError(error);
      if (debug) logWarn('[installations] token generation failed', { error: apiError });
      setError(apiError.message || 'Kunne ikke generere påloggingstoken.');
      return null;
    }
  }, []);

  useEffect(() => () => { clearRetry(); }, [clearRetry]);

  return { installations, loading, error, refresh, refreshIfStale, generateLaunchToken };
}
