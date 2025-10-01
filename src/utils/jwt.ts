// Utility helpers for decoding JWT safely without throwing.
export interface JwtPayload { exp?: number; iat?: number; [k: string]: unknown }

export function decodeJwt(jwt: string): JwtPayload | null {
  const parts = jwt.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(json) as JwtPayload;
  } catch { return null; }
}
