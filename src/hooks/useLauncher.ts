import { useCallback, useState } from 'react';
import { logError } from '../utils/logger';

export interface LaunchState {
  launching: boolean;
  launchMessage: string | null;
}

export interface UseLauncherResult extends LaunchState {
  launchWithFallback: (appUri: string, onFailure?: () => void) => Promise<void>;
}

// Attempt to open a URI using anchor click with protocol handler detection
function tryLaunchUri(uri: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      let protocolHandlerDetected = false;
      
      // Listen for window blur (indicates protocol handler opened)
      const onBlur = () => {
        protocolHandlerDetected = true;
      };
      
      // Listen for visibility change (some browsers)
      const onVisibilityChange = () => {
        if (document.hidden) {
          protocolHandlerDetected = true;
        }
      };
      
      window.addEventListener('blur', onBlur);
      document.addEventListener('visibilitychange', onVisibilityChange);
      
      // Create and click anchor
      const anchor = document.createElement('a');
      anchor.href = uri;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      
      // Check if protocol handler responded after timeout
      setTimeout(() => {
        window.removeEventListener('blur', onBlur);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        
        try {
          document.body.removeChild(anchor);
        } catch { /* ignore */ }
        
        resolve(protocolHandlerDetected);
      }, 1800); // Wait 1.8 seconds for protocol handler to respond
      
    } catch (err) {
      logError('Failed to launch URI:', err);
      resolve(false);
    }
  });
}

export function useLauncher(): UseLauncherResult {
  const [launching, setLaunching] = useState(false);
  const [launchMessage, setLaunchMessage] = useState<string | null>(null);

  const launchWithFallback = useCallback(async (appUri: string, onFailure?: () => void) => {
    setLaunching(true);
    setLaunchMessage(null); // Don't show "opening" message
    try {
      const opened = await tryLaunchUri(appUri);
      if (opened) {
        // Protocol handler detected - clear and hide loading
        setLaunching(false);
        setLaunchMessage(null);
        return;
      }
      // Protocol handler not detected - show installer download (silent flag)
      setLaunchMessage('Ikke installert'); // Simplified message for detection only
      setLaunching(false);
      if (onFailure) onFailure();
    } catch {
      // Silent error - just show installer link
      setLaunchMessage('Ikke installert');
      setLaunching(false);
      if (onFailure) onFailure();
    }
  }, []);

  return { launching, launchMessage, launchWithFallback };
}
