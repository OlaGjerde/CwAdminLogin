/**
 * Token Refresh Testing Component
 * 
 * Shows test buttons in development mode to manually trigger token refresh scenarios
 */

import React from 'react';
import { Button } from 'devextreme-react/button';
import { getCurrentUser, refreshToken } from '../api/auth';
import { logDebug, logError, logWarn } from '../utils/logger';
import notify from 'devextreme/ui/notify';

export const TokenRefreshTester: React.FC = () => {
  const [testing, setTesting] = React.useState(false);

  const testManualRefresh = async () => {
    setTesting(true);
    try {
      logWarn('🧪 TEST: Manual token refresh');
      await refreshToken();
      notify('✅ Token refresh successful!', 'success', 3000);
      logDebug('✅ Manual refresh completed');
    } catch (error) {
      logError('❌ Manual refresh failed:', error);
      notify('❌ Token refresh failed!', 'error', 3000);
    } finally {
      setTesting(false);
    }
  };

  const testGetCurrentUser = async () => {
    setTesting(true);
    try {
      logWarn('🧪 TEST: Calling /Me endpoint');
      const user = await getCurrentUser();
      notify(`✅ User: ${user.Email}`, 'success', 3000);
      logDebug('✅ /Me response:', user);
    } catch (error) {
      logError('❌ /Me failed:', error);
      notify('❌ Failed to get user!', 'error', 3000);
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
      await getCurrentUser();
      
      notify('✅ Request succeeded (token was valid or refreshed)', 'success', 3000);
    } catch (error) {
      logError('❌ Test failed:', error);
      notify('❌ Test failed - check console', 'error', 3000);
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
