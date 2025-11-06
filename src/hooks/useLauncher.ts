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
      let explicitFailure = false;
      
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
      
      // Listen for focus return (app might have launched and returned focus quickly)
      const onFocus = () => {
        // If we get focus back quickly, the app might still be starting
        // Don't mark as failure immediately
      };
      
      // Monitor console for protocol handler errors (Chrome/Edge specific)
      const originalConsoleError = console.error;
      console.error = function(...args: unknown[]) {
        const message = args.join(' ');
        if (message.includes('Failed to launch') && message.includes('because the scheme does not have a registered handler')) {
          explicitFailure = true;
        }
        originalConsoleError.apply(console, args);
      };
      
      window.addEventListener('blur', onBlur);
      document.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('focus', onFocus);
      
      // Create and click anchor
      const anchor = document.createElement('a');
      anchor.href = uri;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      
      // Check if protocol handler responded after timeout
      // Increased timeout to 4 seconds to account for slower app startup
      setTimeout(() => {
        window.removeEventListener('blur', onBlur);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('focus', onFocus);
        console.error = originalConsoleError; // Restore original console.error
        
        try {
          document.body.removeChild(anchor);
        } catch { /* ignore */ }
        
        // If we got an explicit failure message, definitely failed
        if (explicitFailure) {
          resolve(false);
          return;
        }
        
        // If we detected blur or visibility change, assume success
        resolve(protocolHandlerDetected);
      }, 6000); // Increased to 6000ms (6 seconds) for slower systems and remote access
      
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
