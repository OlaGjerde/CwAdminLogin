import { useCallback, useState, useEffect, useRef } from 'react';
import { logDebug, logWarn } from '../utils/logger';
import { INSTALLATIONS_STALE_MS, INSTALLATIONS_RETRY_BASE_MS, INSTALLATIONS_RETRY_MAX_MS, INSTALLATIONS_RETRY_MAX_ATTEMPTS } from '../config';
import { fetchInstallations, createOneTimeToken } from '../api/auth';
import type { NormalizedInstallation, InstallationItem } from '../types/installations';

export interface UseInstallationsResult {
  installations: NormalizedInstallation[];
  loading: boolean;
  error: string | null;
  refresh: (rawAccessToken: string) => Promise<void>;
  /** Refresh only if cached value is stale (older than maxAgeMs). Returns boolean indicating whether a refresh was triggered */
  refreshIfStale: (rawAccessToken: string, maxAgeMs?: number) => Promise<boolean>;
  generateLaunchToken: (rawAccessToken: string, installationId: string) => Promise<string | null>;
}

export function useInstallations(): UseInstallationsResult {
  const [installations, setInstallations] = useState<NormalizedInstallation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedRef = useRef<number>(0);

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
  const refreshFnRef = useRef<(token: string) => void>(() => {});

  const scheduleRetry = useCallback((rawAccessToken: string) => {
    if (failureCountRef.current >= INSTALLATIONS_RETRY_MAX_ATTEMPTS) return; // give up quietly
    const attempt = failureCountRef.current; // after increment
    const base = INSTALLATIONS_RETRY_BASE_MS * Math.pow(2, Math.max(0, attempt - 1));
    const exp = Math.min(base, INSTALLATIONS_RETRY_MAX_MS);
    const jitter = exp * (0.2 * (Math.random() - 0.5)); // +/-20%
    const delay = Math.max(500, Math.round(exp + jitter));
    clearRetry();
    retryTimerRef.current = setTimeout(() => {
      if (failureCountRef.current > 0 && failureCountRef.current <= INSTALLATIONS_RETRY_MAX_ATTEMPTS) {
        refreshFnRef.current(rawAccessToken);
      }
    }, delay);
  }, [clearRetry]);

  const refresh = useCallback(async (rawAccessToken: string) => {
  const debug = import.meta.env?.MODE === 'development' || import.meta.env?.VITE_DEBUG_LOG === '1';
    if (inFlightRef.current) {
  if (debug) logDebug('[installations] skip (in-flight)');
      return;
    }
    inFlightRef.current = true;
    clearRetry();
    setLoading(true);
    setError(null);
    const started = Date.now();
  if (debug) logDebug('[installations] request start', { tokenFrag: rawAccessToken.slice(0,8), failureCount: failureCountRef.current });
    try {
      const resp = await fetchInstallations(rawAccessToken);
      if (resp.status === 401) {
        setError('Ikke autorisert.');
        failureCountRef.current = 0;
  if (debug) logWarn('[installations] 401 unauthorized');
        return;
      }
      if (!Array.isArray(resp.data)) {
        setError('Uventet format på installasjoner.');
        failureCountRef.current++;
        scheduleRetry(rawAccessToken);
  if (debug) logWarn('[installations] invalid format');
        return;
      }
      const normalized = normalize(resp.data);
      setInstallations(normalized);
      lastFetchedRef.current = Date.now();
      try {
        localStorage.setItem('cw_installations', JSON.stringify({ ts: lastFetchedRef.current, items: normalized }));
      } catch { /* ignore */ }
      failureCountRef.current = 0;
  if (debug) logDebug('[installations] success', { durationMs: Date.now() - started, count: normalized.length });
    } catch (err: unknown) {
      const msg = typeof err === 'object' && err && 'message' in err && typeof (err as { message?: unknown }).message === 'string'
        ? (err as { message: string }).message
        : '';
      const isResourceErr = /INSUFFICIENT_RESOURCES/i.test(msg);
      setError(isResourceErr ? 'Nettleseren avviste forespørselen (ressurser). Prøver igjen...' : 'Feil ved henting av installasjoner.');
      failureCountRef.current++;
      scheduleRetry(rawAccessToken);
  if (debug) logWarn('[installations] error', { msg, failureCount: failureCountRef.current });
    } finally {
      setLoading(false);
      inFlightRef.current = false;
  if (debug) logDebug('[installations] request end');
    }
  }, [clearRetry, scheduleRetry]);

  // Keep ref pointing to latest refresh implementation
  useEffect(() => { refreshFnRef.current = refresh; }, [refresh]);

  // Consider data stale after 20 seconds unless caller overrides
  const refreshIfStale = useCallback(async (rawAccessToken: string, maxAgeMs: number = INSTALLATIONS_STALE_MS) => {
  const debug = import.meta.env?.MODE === 'development' || import.meta.env?.VITE_DEBUG_LOG === '1';
    const age = Date.now() - lastFetchedRef.current;
    if (!lastFetchedRef.current || age > maxAgeMs) {
  if (debug) logDebug('[installations] stale -> refresh', { age, threshold: maxAgeMs });
      await refresh(rawAccessToken);
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

  useEffect(() => () => { clearRetry(); }, [clearRetry]);

  return { installations, loading, error, refresh, refreshIfStale, generateLaunchToken };
}
