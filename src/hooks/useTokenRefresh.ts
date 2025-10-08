import { useEffect } from 'react';
import { refreshTokens } from '../api/auth';
import { logDebug, logWarn } from '../utils/logger';
import { REFRESH_MARGIN_SECONDS } from '../config';
import { obfuscate } from '../utils/tokens';
import { decodeJwt } from '../utils/jwt';

interface Params {
  stayLoggedIn: boolean;
  tokens: { accessToken: string; refreshToken: string } | null;
  setRawTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  onDebug?: (msg: string) => void;
}

/**
 * Handles scheduling and executing access token refresh based on exp claim.
 * Returns nothing; side-effects only.
 */
export function useTokenRefresh({ stayLoggedIn, tokens, setRawTokens, logout, onDebug }: Params) {
  useEffect(() => {
    if (!stayLoggedIn || !tokens?.accessToken || !tokens.refreshToken) return;
    let canceled = false;
    const rawAccess = (() => { try { return atob(tokens.accessToken); } catch { return null; } })();
    const rawRefresh = (() => { try { return atob(tokens.refreshToken); } catch { return null; } })();
    if (!rawAccess || !rawRefresh) return;

    const payload = decodeJwt(rawAccess);
    if (!payload?.exp) return;
    const nowSec = Math.floor(Date.now() / 1000);
    let delayMs = (payload.exp - REFRESH_MARGIN_SECONDS - nowSec) * 1000;
    if (delayMs < 5000) delayMs = 5000;

    const nowIso = new Date().toISOString();
    logDebug('[tokenRefresh] scheduled', { delayMs, now: nowIso, exp: payload.exp });
    onDebug?.(`Token refresh scheduled in ${(delayMs/1000).toFixed(0)}s (exp=${payload.exp})`);
    const timer = setTimeout(async () => {
      if (canceled) return;
      const fireIso = new Date().toISOString();
      logDebug('[tokenRefresh] firing', { at: fireIso });
      onDebug?.('Token refresh firing');
      try {
        const resp = await refreshTokens(rawRefresh);
        const dataObj = resp.data as Record<string, unknown> & { Cognito?: Record<string, unknown> };
        const at = (dataObj['AccessToken'] || dataObj['accessToken'] || dataObj.Cognito?.['AccessToken']) as string | undefined;
        const rt = (dataObj['RefreshToken'] || dataObj['refreshToken'] || dataObj.Cognito?.['RefreshToken']) as string | undefined;
        if (at && rt) {
          setRawTokens(at, rt);
          try {
            localStorage.setItem('cw_tokens', JSON.stringify({ a: obfuscate(at), r: obfuscate(rt), ts: Date.now() }));
          } catch { /* ignore */ }
          logDebug('[tokenRefresh] success new access fragment', at.slice(0,12)+'...');
          onDebug?.('Token refresh success');
        } else if (resp.status === 401 || resp.status === 403) {
          try {
            localStorage.removeItem('cw_stay');
            localStorage.removeItem('cw_tokens');
            localStorage.removeItem('cw_user');
          } catch { /* ignore */ }
          logout();
          logWarn(`[tokenRefresh] ${resp.status} logout`);
          onDebug?.(`Token refresh failed: ${resp.status}, logging out`);
        }
      } catch (err) {
        const anyErr = err as { response?: { status?: number } } | undefined;
        const status = anyErr?.response?.status;
        if (status === 401 || status === 403) {
          try {
            localStorage.removeItem('cw_stay');
            localStorage.removeItem('cw_tokens');
            localStorage.removeItem('cw_user');
          } catch { /* ignore */ }
          logout();
          logWarn(`[tokenRefresh] ${status} in catch -> logout`);
          onDebug?.(`Token refresh error: ${status}, logging out`);
        } else {
          logWarn('[tokenRefresh] error', err);
          onDebug?.('Token refresh error');
        }
      }
    }, delayMs);

    return () => { 
      canceled = true; 
      clearTimeout(timer); 
      logDebug('[tokenRefresh] cleanup');
      onDebug?.('Token refresh cleanup');
    };
  }, [stayLoggedIn, tokens, setRawTokens, logout, onDebug]);
}
