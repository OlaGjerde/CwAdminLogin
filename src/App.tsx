import { useState, useEffect } from 'react';
import { useAuthFlow, type AuthStep, type UserData, type TokensEncoded } from './hooks/useAuthFlow';
import { useInstallations } from './hooks/useInstallations';
import { useTokenRefresh } from './hooks/useTokenRefresh';
import { WorkspaceProvider, useWorkspace } from './contexts/WorkspaceContext';
import { WorkspaceSelector } from './components/WorkspaceSelector';
import { WorkbenchArea } from './components/WorkbenchArea';
import { AuthOverlay } from './components/AuthOverlay';
import type { NormalizedInstallation } from './types/installations';
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
      // Only fetch installations when we have valid tokens
      refreshIfStale(tokens.accessToken).catch((err) => {
        console.error('Failed to fetch installations:', err);
      });
    }
  }, [tokens?.accessToken, refreshIfStale]);

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
      <AppContent
        showAuth={showAuth}
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
        tokens={tokens}
        logout={logout}
        installations={installations}
      />
    </WorkspaceProvider>
  );
}

// Separate component that uses workspace context
interface AppContentProps {
  showAuth: boolean;
  step: AuthStep;
  login: string;
  setLogin: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  passwordStrength: { score: number; label: string; percent: number };
  showLoginPassword: boolean;
  setShowLoginPassword: (value: boolean) => void;
  showSignupPassword: boolean;
  setShowSignupPassword: (value: boolean) => void;
  showSignupConfirm: boolean;
  setShowSignupConfirm: (value: boolean) => void;
  isLoginSubmitting: boolean;
  isSignupSubmitting: boolean;
  stayLoggedIn: boolean;
  setStayLoggedIn: (value: boolean) => void;
  showStayInfoModal: boolean;
  setShowStayInfoModal: (value: boolean) => void;
  error: string | null;
  info: string | null;
  userData: UserData | null;
  handleVerifyEmail: (code: string) => Promise<void>;
  submitSignup: () => Promise<void>;
  submitLogin: () => Promise<void>;
  setStep: (step: AuthStep) => void;
  setError: (error: string | null) => void;
  setInfo: (info: string | null) => void;
  tokens: TokensEncoded | null;
  logout: () => void;
  installations: NormalizedInstallation[];
}

function AppContent(props: AppContentProps) {
  const { state, switchWorkspace } = useWorkspace();

  // Persist selected workspace to localStorage
  useEffect(() => {
    if (state.currentWorkspace) {
      localStorage.setItem('selectedWorkspaceId', state.currentWorkspace.id);
    }
  }, [state.currentWorkspace]);

  // Restore selected workspace from localStorage
  useEffect(() => {
    const savedWorkspaceId = localStorage.getItem('selectedWorkspaceId');
    if (savedWorkspaceId && props.installations.length > 0) {
      const savedWorkspace = props.installations.find(w => w.id === savedWorkspaceId);
      if (savedWorkspace && state.currentWorkspace?.id !== savedWorkspaceId) {
        switchWorkspace(savedWorkspace);
      }
    }
  }, [props.installations, state.currentWorkspace, switchWorkspace]);

  return (
    <div className="app-root">
      {props.showAuth && (
        <AuthOverlay
          step={props.step}
          login={props.login}
          setLogin={props.setLogin}
          password={props.password}
          setPassword={props.setPassword}
          confirmPassword={props.confirmPassword}
          setConfirmPassword={props.setConfirmPassword}
          passwordStrength={props.passwordStrength}
          showLoginPassword={props.showLoginPassword}
          setShowLoginPassword={props.setShowLoginPassword}
          showSignupPassword={props.showSignupPassword}
          setShowSignupPassword={props.setShowSignupPassword}
          showSignupConfirm={props.showSignupConfirm}
          setShowSignupConfirm={props.setShowSignupConfirm}
          isLoginSubmitting={props.isLoginSubmitting}
          isSignupSubmitting={props.isSignupSubmitting}
          stayLoggedIn={props.stayLoggedIn}
          setStayLoggedIn={props.setStayLoggedIn}
          showStayInfoModal={props.showStayInfoModal}
          setShowStayInfoModal={props.setShowStayInfoModal}
          error={props.error}
          info={props.info}
          userData={props.userData}
          handleVerifyEmail={props.handleVerifyEmail}
          submitSignup={props.submitSignup}
          submitLogin={props.submitLogin}
          setStep={props.setStep}
          setError={props.setError}
          setInfo={props.setInfo}
        />
      )}

      {!props.showAuth && (
        <>
          {/* Top Bar with Workspace Selector */}
          <div className="app-top-bar">
            <div className="app-top-bar-left">
              <h1 className="app-title">CalWin Workspace</h1>
            </div>
            <div className="app-top-bar-center">
              <WorkspaceSelector
                currentWorkspace={state.currentWorkspace}
                workspaces={state.availableWorkspaces}
                onWorkspaceChange={switchWorkspace}
                isLoading={state.isLoading}
              />
            </div>
            <div className="app-top-bar-right">
              <span className="app-user-info">{props.userData?.Email || props.userData?.Username}</span>
              <Button
                icon="runner"
                text="Logg ut"
                onClick={props.logout}
                stylingMode="outlined"
              />
            </div>
          </div>

          {/* Main Content Area */}
          <div className="app-content">
            {/* Workbench Area - Full Width */}
            <div className="app-workbench">
              <WorkbenchArea authTokens={props.tokens} />
            </div>
          </div>
        </>
      )}

      <BuildFooter />
    </div>
  );
}

export default App
