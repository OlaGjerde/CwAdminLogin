// Centralized logger that strips debug logs in production when not explicitly enabled.
// Usage: import { logDebug, logWarn } from '../utils/logger';

interface ViteEnv { DEV?: boolean; VITE_DEBUG_LOG?: string; }
const env: ViteEnv = (import.meta as unknown as { env?: ViteEnv }).env || {};
const enabled = ((): boolean => {
  if (env.DEV) return true;
  const flag = env.VITE_DEBUG_LOG;
  if (flag) {
    const v = flag.toLowerCase();
    if (v === '1' || v === 'true' || v === 'yes') return true;
  }
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
