// Centralized logger that strips debug logs in production when not explicitly enabled.
// Usage: import { logDebug, logWarn } from '../utils/logger';

interface ViteEnv { DEV?: boolean; VITE_DEBUG_LOG?: string; }
const env: ViteEnv = (import.meta as unknown as { env?: ViteEnv }).env || {};
const enabled = ((): boolean => {
  const flag = env.VITE_DEBUG_LOG;
  if (flag != null) {
    const v = String(flag).toLowerCase();
    return v === '1' || v === 'true' || v === 'yes' || v === 'on';
  }
  // Default: disabled unless explicitly enabled via VITE_DEBUG_LOG
  return false;
})();

export function logDebug(...args: unknown[]) {
  if (enabled) console.log(...args);
}

export function logWarn(...args: unknown[]) {
  if (enabled) console.warn(...args);
}

export function logError(...args: unknown[]) {
  if (enabled) console.error(...args);
}

export const debugLoggingEnabled = enabled;
