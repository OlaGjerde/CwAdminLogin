import { useCallback, useState } from 'react';

export interface LaunchState {
  launching: boolean;
  launchMessage: string | null;
}

export interface UseLauncherResult extends LaunchState {
  launchWithFallback: (appUri: string, onFailure?: () => void) => Promise<void>;
}

// Attempt to open a URI using anchor click - simple and immediate
function tryLaunchUri(uri: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const anchor = document.createElement('a');
      anchor.href = uri;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      setTimeout(() => {
        try {
          document.body.removeChild(anchor);
        } catch { /* ignore */ }
      }, 100);
      // Immediately resolve - we can't reliably detect if protocol handler succeeded
      resolve(true);
    } catch (err) {
      console.error('Failed to launch URI:', err);
      resolve(false);
    }
  });
}

export function useLauncher(): UseLauncherResult {
  const [launching, setLaunching] = useState(false);
  const [launchMessage, setLaunchMessage] = useState<string | null>(null);

  const launchWithFallback = useCallback(async (appUri: string, onFailure?: () => void) => {
    setLaunching(true);
    setLaunchMessage('Åpner applikasjon...');
    try {
      const opened = await tryLaunchUri(appUri);
      if (opened) {
        setLaunchMessage('Applikasjon åpnet.');
        setTimeout(() => { setLaunching(false); setLaunchMessage(null); }, 1200);
        return;
      }
      // Mark launching complete BEFORE invoking failure so UI can decide
      // not to show fallback while a success message is visible.
      setLaunchMessage('Ikke installert. Last ned installasjonsprogram under.');
      setLaunching(false);
      // Keep error message visible for 8 seconds
      setTimeout(() => { setLaunchMessage(null); }, 8000);
      if (onFailure) onFailure();
    } catch {
      setLaunchMessage('Kunne ikke åpne applikasjon.');
      setLaunching(false);
      // Keep error message visible for 8 seconds
      setTimeout(() => { setLaunchMessage(null); }, 8000);
      if (onFailure) onFailure();
    }
  }, []);

  return { launching, launchMessage, launchWithFallback };
}
