import { useCallback, useState } from 'react';

export interface LaunchState {
  launching: boolean;
  launchMessage: string | null;
}

export interface UseLauncherResult extends LaunchState {
  launchWithFallback: (appUri: string, onFailure?: () => void) => Promise<void>;
}

// Attempt to open a URI and heuristically detect success via visibility / blur.
// Reduced timeout to prevent hanging protocol dialogs
function tryLaunchUri(uri: string, timeout = 500): Promise<boolean> {
  return new Promise((resolve) => {
    let handled = false;
    const onVisibilityChange = () => { if (document.hidden) handled = true; };
    const onBlur = () => { handled = true; };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    
    // Use a simpler approach - just set location directly
    try {
      window.location.href = uri;
      // Assume it worked if no error thrown
      handled = true;
    } catch {
      // Fallback: try opening in a new window
      try {
        const win = window.open(uri, '_blank');
        if (win) {
          win.close();
          handled = true;
        }
      } catch { /* ignore */ }
    }
    
    setTimeout(() => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      resolve(handled);
    }, timeout);
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
