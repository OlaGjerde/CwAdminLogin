import { useCallback, useState } from 'react';

export interface LaunchState {
  launching: boolean;
  launchMessage: string | null;
}

export interface UseLauncherResult extends LaunchState {
  launchWithFallback: (appUri: string, onFailure?: () => void) => Promise<void>;
}

// Attempt to open a URI and heuristically detect success via visibility / blur.
function tryLaunchUri(uri: string, timeout = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    let handled = false;
    const onVisibilityChange = () => { if (document.hidden) handled = true; };
    const onBlur = () => { handled = true; };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    try {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      iframe.src = uri;
      setTimeout(() => { try { document.body.removeChild(iframe); } catch { /* ignore */ } }, timeout + 100);
    } catch {
      try { window.location.href = uri; } catch { /* ignore */ }
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
      setLaunchMessage('Ikke installert. Last ned installasjonsprogram under.');
      if (onFailure) onFailure();
      setLaunching(false);
    } catch {
      setLaunchMessage('Kunne ikke åpne applikasjon.');
      if (onFailure) onFailure();
      setLaunching(false);
    }
  }, []);

  return { launching, launchMessage, launchWithFallback };
}
