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
}

/**
 * Handles scheduling and executing access token refresh based on exp claim.
 * Returns nothing; side-effects only.
 */
export function useTokenRefresh({ stayLoggedIn, tokens, setRawTokens, logout }: Params) {
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

    if (import.meta.env?.MODE === 'development' || import.meta.env?.VITE_DEBUG_LOG === '1') {
      logDebug('[tokenRefresh] scheduled', { delayMs, now: new Date().toISOString(), exp: payload.exp });
    }
    const timer = setTimeout(async () => {
      if (canceled) return;
      if (import.meta.env?.MODE === 'development' || import.meta.env?.VITE_DEBUG_LOG === '1') {
        logDebug('[tokenRefresh] firing', { at: new Date().toISOString() });
      }
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
          if (import.meta.env?.MODE === 'development' || import.meta.env?.VITE_DEBUG_LOG === '1') {
            logDebug('[tokenRefresh] success new access fragment', at.slice(0,12)+'...');
          }
        } else if (resp.status === 401) {
          try {
            localStorage.removeItem('cw_stay');
            localStorage.removeItem('cw_tokens');
            localStorage.removeItem('cw_user');
          } catch { /* ignore */ }
          logout();
          if (import.meta.env?.MODE === 'development' || import.meta.env?.VITE_DEBUG_LOG === '1') {
            logWarn('[tokenRefresh] 401 logout');
          }
        }
      } catch (err) {
        if (import.meta.env?.MODE === 'development' || import.meta.env?.VITE_DEBUG_LOG === '1') {
          logWarn('[tokenRefresh] error', err);
        }
      }
    }, delayMs);

    return () => { 
      canceled = true; 
      clearTimeout(timer); 
      if (import.meta.env?.MODE === 'development' || import.meta.env?.VITE_DEBUG_LOG === '1') {
        logDebug('[tokenRefresh] cleanup');
      }
    };
  }, [stayLoggedIn, tokens, setRawTokens, logout]);
}
