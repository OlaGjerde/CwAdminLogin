import { useEffect } from 'react';
import { refreshTokens } from '../api/auth';
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

    const timer = setTimeout(async () => {
      if (canceled) return;
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
        } else if (resp.status === 401) {
          try {
            localStorage.removeItem('cw_stay');
            localStorage.removeItem('cw_tokens');
            localStorage.removeItem('cw_user');
          } catch { /* ignore */ }
          logout();
        }
      } catch {
        // transient error ignored; next successful token update will reschedule
      }
    }, delayMs);

    return () => { canceled = true; clearTimeout(timer); };
  }, [stayLoggedIn, tokens, setRawTokens, logout]);
}
