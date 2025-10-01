/**
 * AWS Cognito Hosted UI helper utilities (authorization code flow, no client secret).
 * Activation is environment driven; if required env vars are missing the helpers return null.
 */

interface HostedConfig {
  domain: string;
  clientId: string;
  redirectUri: string;
  scope?: string;
  logoutRedirectUri?: string;
}

export function getHostedConfig(): HostedConfig | null {
  const domain = import.meta.env.VITE_COGNITO_DOMAIN as string | undefined;
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined;
  const redirectUri = import.meta.env.VITE_COGNITO_REDIRECT_URI as string | undefined;
  if (!domain || !clientId || !redirectUri) return null;
  return {
    domain: domain.replace(/\/$/, ''),
    clientId,
    redirectUri,
    scope: (import.meta.env.VITE_COGNITO_SCOPE as string) || 'openid email profile',
    logoutRedirectUri: (import.meta.env.VITE_COGNITO_LOGOUT_REDIRECT as string) || redirectUri
  };
}

export function buildAuthUrl(screenHint?: 'signup' | 'login'): string | null {
  const cfg = getHostedConfig();
  if (!cfg) return null;
  const state = crypto.getRandomValues(new Uint32Array(2)).join('-');
  try { sessionStorage.setItem('cog_state', state); } catch { /* ignore */ }
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    response_type: 'code',
    scope: cfg.scope!,
    redirect_uri: cfg.redirectUri,
    state
  });
  if (screenHint === 'signup') params.append('screen_hint', 'signup');
  return `${cfg.domain}/oauth2/authorize?${params.toString()}`;
}

export interface ExchangedTokens {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
  token_type: string;
}

export async function exchangeCodeForTokens(code: string): Promise<ExchangedTokens | null> {
  const cfg = getHostedConfig();
  if (!cfg) return null;
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: cfg.clientId,
    code,
    redirect_uri: cfg.redirectUri
  });
  try {
    const resp = await fetch(`${cfg.domain}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    if (json && json.access_token) return json as ExchangedTokens;
  } catch { /* ignore */ }
  return null;
}

export function buildLogoutUrl(): string | null {
  const cfg = getHostedConfig();
  if (!cfg) return null;
  const p = new URLSearchParams({ client_id: cfg.clientId, logout_uri: cfg.logoutRedirectUri! });
  return `${cfg.domain}/logout?${p.toString()}`;
}
