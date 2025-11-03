import { useState } from 'react';
import { 
  checkAuthStatus, 
  getUserStatus, 
  logout,
  generatePKCE,
  refreshTokens
} from '../api/auth';
import { COGNITO_DOMAIN, COGNITO_CLIENT_ID, COGNITO_REDIRECT_URI } from '../config';

/**
 * Authentication Testing Component
 * Use this to test the cookie-based authentication system
 */
export function AuthTest() {
  const [status, setStatus] = useState<string>('');
  const [authInfo, setAuthInfo] = useState<any>(null);

  const handleCheckAuth = async () => {
    try {
      setStatus('Checking authentication status...');
      const result = await checkAuthStatus();
      setAuthInfo(result);
      setStatus(`✅ Auth Status: ${result.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}`);
    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCheckUserStatus = async () => {
    const email = prompt('Enter email to check:');
    if (!email) return;
    
    try {
      setStatus('Checking user status...');
      const result = await getUserStatus(email);
      setStatus(`✅ User: ${result.username} - Status: ${result.userStatus}`);
    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleLogin = async () => {
    try {
      setStatus('Generating PKCE and redirecting to Cognito...');
      
      console.log('Starting login process...');
      console.log('Cognito Domain:', COGNITO_DOMAIN);
      console.log('Client ID:', COGNITO_CLIENT_ID);
      console.log('Redirect URI:', COGNITO_REDIRECT_URI);
      
      const pkce = await generatePKCE();
      console.log('PKCE generated:', { 
        verifierLength: pkce.codeVerifier.length,
        challengeLength: pkce.codeChallenge.length 
      });
      
      // Generate random state for CSRF protection
      const state = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // Store PKCE data for callback verification
      sessionStorage.setItem('cognito_code_verifier', pkce.codeVerifier);
      sessionStorage.setItem('cognito_state', state);
      
      // Build Cognito login URL
      const loginUrl = new URL(`${COGNITO_DOMAIN}/oauth2/authorize`);
      loginUrl.searchParams.set('client_id', COGNITO_CLIENT_ID);
      loginUrl.searchParams.set('response_type', 'code');
      loginUrl.searchParams.set('redirect_uri', COGNITO_REDIRECT_URI);
      loginUrl.searchParams.set('scope', 'openid');
      loginUrl.searchParams.set('state', state);
      loginUrl.searchParams.set('code_challenge', pkce.codeChallenge);
      loginUrl.searchParams.set('code_challenge_method', 'S256');
      
      console.log('Redirecting to:', loginUrl.toString());
      
      // Redirect to Cognito
      window.location.href = loginUrl.toString();
    } catch (error) {
      console.error('Login error:', error);
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleLogout = async () => {
    try {
      setStatus('Logging out and clearing cookies...');
      setAuthInfo(null);
      
      // Small delay to show status
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // This will redirect to /login
      await logout();
    } catch (error) {
      setStatus(`❌ Logout Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRefreshToken = async () => {
    try {
      setStatus('Refreshing access token...');
      await refreshTokens();
      setStatus('✅ Token refreshed successfully! Check auth status to see new token.');
    } catch (error) {
      setStatus(`❌ Refresh Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleTestCookies = () => {
    const cookies = document.cookie;
    if (cookies) {
      setStatus(`🍪 Visible cookies: ${cookies}`);
    } else {
      setStatus('🍪 No visible cookies (httpOnly cookies are hidden from JavaScript)');
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1>🔐 Authentication System Test</h1>
      
      <div style={{ 
        background: '#f5f5f5', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3>Configuration</h3>
        <p><strong>Frontend:</strong> {window.location.origin}</p>
        <p><strong>Backend API:</strong> https://localhost:7059</p>
        <p><strong>Cognito Domain:</strong> {COGNITO_DOMAIN}</p>
        <p><strong>Client ID:</strong> {COGNITO_CLIENT_ID}</p>
        <p><strong>Redirect URI:</strong> {COGNITO_REDIRECT_URI}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Test Actions</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={handleCheckAuth} style={buttonStyle}>
            Check Auth Status
          </button>
          <button onClick={handleCheckUserStatus} style={buttonStyle}>
            Check User Status
          </button>
          <button onClick={handleLogin} style={buttonStyle}>
            Login with Cognito
          </button>
          <button onClick={handleRefreshToken} style={buttonStyle}>
            Refresh Token
          </button>
          <button onClick={handleLogout} style={buttonStyle}>
            Logout
          </button>
          <button onClick={handleTestCookies} style={buttonStyle}>
            Test Cookies
          </button>
        </div>
      </div>

      {status && (
        <div style={{ 
          background: status.includes('❌') ? '#fee' : '#efe', 
          padding: '15px', 
          borderRadius: '8px',
          marginBottom: '20px',
          whiteSpace: 'pre-wrap'
        }}>
          {status}
        </div>
      )}

      {authInfo && (
        <div style={{ 
          background: '#f0f8ff', 
          padding: '15px', 
          borderRadius: '8px'
        }}>
          <h3>Authentication Info</h3>
          <pre style={{ overflow: 'auto' }}>
            {JSON.stringify(authInfo, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ 
        marginTop: '30px', 
        padding: '15px', 
        background: '#fff3cd', 
        borderRadius: '8px'
      }}>
        <h3>⚠️ Testing Notes</h3>
        <ul style={{ margin: 0 }}>
          <li>Make sure your backend is running on <code>https://localhost:7059</code></li>
          <li>Backend must have CORS enabled for <code>http://localhost:5173</code></li>
          <li>Cookies are httpOnly - you won't see them in document.cookie</li>
          <li>Check DevTools → Application → Cookies to see httpOnly cookies</li>
          <li>Check DevTools → Network to see cookie headers in requests</li>
        </ul>
      </div>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '10px 20px',
  background: '#007bff',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 500
};
