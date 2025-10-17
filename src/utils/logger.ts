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
  // Default: enabled in development, disabled in production
  return env.DEV === true;
})();

export function logDebug(...args: unknown[]) {
  if (enabled) console.log(...args);
}

export function logWarn(...args: unknown[]) {
  if (enabled) console.warn(...args);
}

export function logError(...args: unknown[]) {
  // Always log errors, even in production
  console.error(...args);
}

export function logInfo(...args: unknown[]) {
  // Info logs only in debug mode
  if (enabled) console.info(...args);
}

export const debugLoggingEnabled = enabled;
