/**
 * Token Refresh Testing Component
 * 
 * Shows test buttons in development mode to manually trigger token refresh scenarios
 */

import React from 'react';
import { Button } from 'devextreme-react/button';
import { checkAuthStatus, refreshTokens } from '../api/auth';
import { handleApiError } from '../utils/apiErrors';
import { logDebug, logError, logWarn } from '../utils/logger';
import notify from 'devextreme/ui/notify';

export const TokenRefreshTester: React.FC = () => {
  const [testing, setTesting] = React.useState(false);

  const testManualRefresh = async () => {
    setTesting(true);
    try {
      logWarn('🧪 TEST: Manual token refresh');
      
      // Log current cookies before refresh
      logDebug('Cookies before refresh:', {
        visibleCookies: document.cookie,
        currentPath: window.location.pathname
      });
      
      await refreshTokens();
      
      // Log cookies after refresh
      logDebug('Cookies after refresh:', {
        visibleCookies: document.cookie,
        currentPath: window.location.pathname
      });
      
      notify('✅ Token refresh successful!', 'success', 3000);
      logDebug('✅ Manual refresh completed');
    } catch (error) {
      const apiError = handleApiError(error);
      logError('❌ Manual refresh failed:', apiError);
      notify(`❌ ${apiError.message}`, 'error', 3000);
    } finally {
      setTesting(false);
    }
  };

  const testGetCurrentUser = async () => {
    setTesting(true);
    try {
      logWarn('🧪 TEST: Calling /Me endpoint');
      const user = await checkAuthStatus();
      notify(`✅ User: ${user.email}`, 'success', 3000);
      logDebug('✅ /Me response:', user);
    } catch (error) {
      const apiError = handleApiError(error);
      logError('❌ /Me failed:', apiError);
      notify(`❌ ${apiError.message}`, 'error', 3000);
    } finally {
      setTesting(false);
    }
  };

  const testExpiredToken = async () => {
    setTesting(true);
    try {
      logWarn('🧪 TEST: Simulating expired token scenario');
      notify('⚠️ Check console for interceptor activity', 'info', 3000);
      
      // This will trigger a 401 if token is actually expired
      // The interceptor should catch it and refresh automatically
      await checkAuthStatus();
      
      notify('✅ Request succeeded (token was valid or refreshed)', 'success', 3000);
    } catch (error) {
      const apiError = handleApiError(error);
      logError('❌ Test failed:', apiError);
      notify(`❌ ${apiError.message}`, 'error', 3000);
    } finally {
      setTesting(false);
    }
  };

  // Only show in development mode
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      padding: '15px',
      background: 'rgba(0, 0, 0, 0.8)',
      borderRadius: '8px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      minWidth: '250px'
    }}>
      <div style={{ 
        color: '#fff', 
        fontWeight: 'bold', 
        marginBottom: '5px',
        fontSize: '12px'
      }}>
        🧪 TOKEN REFRESH TESTER
      </div>
      
      <Button
        text="Test Manual Refresh"
        type="default"
        onClick={testManualRefresh}
        disabled={testing}
        width="100%"
      />
      
      <Button
        text="Test Get User (/Me)"
        type="default"
        onClick={testGetCurrentUser}
        disabled={testing}
        width="100%"
      />
      
      <Button
        text="Test Interceptor"
        type="default"
        onClick={testExpiredToken}
        disabled={testing}
        width="100%"
      />
      
      <div style={{ 
        color: '#888', 
        fontSize: '10px',
        marginTop: '5px'
      }}>
        Open DevTools Console to see logs
      </div>
    </div>
  );
};
