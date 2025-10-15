import { useState, useEffect } from 'react';
import { useAuthFlow } from './hooks/useAuthFlow';
import { useInstallations } from './hooks/useInstallations';
import { useTokenRefresh } from './hooks/useTokenRefresh';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { WorkspaceSelector } from './components/WorkspaceSelector';
import { WorkbenchArea } from './components/WorkbenchArea';
import { AuthOverlay } from './components/AuthOverlay';
import NewsFeed from './NewsFeed';
import './App.css';
import BuildFooter from './components/BuildFooter';
import 'devextreme/dist/css/dx.light.css';
import { exchangeCodeForTokens, extractTokens } from './api/auth';
import { COGNITO_REDIRECT_URI } from './config';
import { Button } from 'devextreme-react/button';

function App() {
  // Form inputs for auth
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{ score: number; label: string; percent: number }>({ score: 0, label: 'Svært svakt', percent: 0 });
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const [isSignupSubmitting, setIsSignupSubmitting] = useState(false);
  const [lastLoginAttempt, setLastLoginAttempt] = useState(0);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [showStayInfoModal, setShowStayInfoModal] = useState(false);

  // Auth hooks
  const {
    step, setStep, userData, tokens, error, info, setError, setInfo,
    handleVerifyEmail, handleSignUp, handleLogin, logout, setRawTokens
  } = useAuthFlow();
  
  const { installations, refreshIfStale } = useInstallations();
  useTokenRefresh({ 
    stayLoggedIn, 
    tokens, 
    setRawTokens, 
    logout 
  });

  // Evaluate password strength
  useEffect(() => {
    if (step !== 'signup') return;
    const evaluate = (pwd: string) => {
      if (!pwd) return { score: 0, label: 'Svært svakt', percent: 0 };
      let score = 0;
      const len = pwd.length;
      if (len >= 8) score++;
      if (len >= 12) score++;
      if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
      if (/[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score++;
      if (score > 4) score = 4;
      const labels = ['Svært svakt', 'Svakt', 'Ok', 'Sterkt', 'Veldig sterkt'];
      const label = labels[score] || labels[0];
      const percent = (score / 4) * 100;
      return { score, label, percent };
    };
    setPasswordStrength(evaluate(password));
  }, [password, step]);

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (code && !sessionStorage.getItem(`oauth_processed_${code}`)) {
        sessionStorage.setItem(`oauth_processed_${code}`, 'true');
        
        try {
          setInfo('Behandler pålogging fra Cognito...');
          const response = await exchangeCodeForTokens(code, COGNITO_REDIRECT_URI);
          const tokenPair = extractTokens(response.data);
          
          if (tokenPair) {
            setRawTokens(tokenPair.accessToken, tokenPair.refreshToken);
            setInfo('Pålogging vellykket!');
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            setError('Kunne ikke hente tokens fra Cognito');
          }
        } catch (err) {
          const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Feil ved OAuth-callback';
          setError(errorMessage);
        }
      }
    };
    
    handleOAuthCallback();
  }, [setInfo, setError, setRawTokens]);

  // Refresh installations when logged in
  useEffect(() => {
    if (tokens?.accessToken) {
      refreshIfStale(tokens.accessToken);
    }
  }, [tokens, refreshIfStale]);

  const submitSignup = async () => {
    if (isSignupSubmitting) return;
    setIsSignupSubmitting(true);
    try {
      await handleSignUp(login, password, confirmPassword);
    } finally {
      setIsSignupSubmitting(false);
    }
  };

  const submitLogin = async () => {
    const now = Date.now();
    if (now - lastLoginAttempt < 900) return;
    setLastLoginAttempt(now);
    if (isLoginSubmitting) return;
    setIsLoginSubmitting(true);
    try {
      await handleLogin(login, password);
    } finally {
      setIsLoginSubmitting(false);
    }
  };

  // Show auth overlay if not logged in
  const showAuth = !tokens;

  return (
    <WorkspaceProvider 
      availableWorkspaces={installations}
      initialWorkspace={installations[0] || null}
    >
      <div className="app-root">
        {showAuth && (
          <AuthOverlay
            step={step}
            login={login}
            setLogin={setLogin}
            password={password}
            setPassword={setPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            passwordStrength={passwordStrength}
            showLoginPassword={showLoginPassword}
            setShowLoginPassword={setShowLoginPassword}
            showSignupPassword={showSignupPassword}
            setShowSignupPassword={setShowSignupPassword}
            showSignupConfirm={showSignupConfirm}
            setShowSignupConfirm={setShowSignupConfirm}
            isLoginSubmitting={isLoginSubmitting}
            isSignupSubmitting={isSignupSubmitting}
            stayLoggedIn={stayLoggedIn}
            setStayLoggedIn={setStayLoggedIn}
            showStayInfoModal={showStayInfoModal}
            setShowStayInfoModal={setShowStayInfoModal}
            error={error}
            info={info}
            userData={userData}
            handleVerifyEmail={handleVerifyEmail}
            submitSignup={submitSignup}
            submitLogin={submitLogin}
            setStep={setStep}
            setError={setError}
            setInfo={setInfo}
          />
        )}

        {!showAuth && (
          <>
            {/* Top Bar with Workspace Selector */}
            <div className="app-top-bar">
              <div className="app-top-bar-left">
                <h1 className="app-title">CalWin Workspace</h1>
              </div>
              <div className="app-top-bar-center">
                <WorkspaceSelector
                  currentWorkspace={installations[0] || null}
                  workspaces={installations}
                  onWorkspaceChange={() => {}}
                />
              </div>
              <div className="app-top-bar-right">
                <span className="app-user-info">{userData?.Email || userData?.Username}</span>
                <Button
                  icon="runner"
                  text="Logg ut"
                  onClick={logout}
                  stylingMode="outlined"
                />
              </div>
            </div>

            {/* Main Content Area */}
            <div className="app-content">
              {/* Left: Workbench Area */}
              <div className="app-workbench">
                <WorkbenchArea authTokens={tokens} />
              </div>

              {/* Right: NewsFeed */}
              <div className="app-newsfeed">
                <NewsFeed />
              </div>
            </div>
          </>
        )}

        <BuildFooter />
      </div>
    </WorkspaceProvider>
  );
}

export default App
