import React from 'react';
import { LoginEmailForm } from './LoginEmailForm';
import { SignupForm } from './SignupForm';
import { PasswordForm } from './PasswordForm';
import type { AuthStep, UserData } from '../hooks/useAuthFlow';
import './AuthOverlay.css';

interface AuthOverlayProps {
  step: AuthStep;
  login: string;
  setLogin: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  passwordStrength: { score: number; label: string; percent: number };
  showLoginPassword: boolean;
  setShowLoginPassword: (v: boolean) => void;
  showSignupPassword: boolean;
  setShowSignupPassword: (v: boolean) => void;
  showSignupConfirm: boolean;
  setShowSignupConfirm: (v: boolean) => void;
  isLoginSubmitting: boolean;
  isSignupSubmitting: boolean;
  stayLoggedIn: boolean;
  setStayLoggedIn: (v: boolean) => void;
  showStayInfoModal: boolean;
  setShowStayInfoModal: (v: boolean) => void;
  error: string | null;
  info: string | null;
  userData: UserData | null;
  handleVerifyEmail: (email: string) => Promise<void>;
  submitSignup: () => Promise<void>;
  submitLogin: () => Promise<void>;
  setStep: (step: AuthStep) => void;
  setError: (v: string | null) => void;
  setInfo: (v: string | null) => void;
}

export const AuthOverlay: React.FC<AuthOverlayProps> = ({
  step,
  login,
  setLogin,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  passwordStrength,
  showLoginPassword,
  setShowLoginPassword,
  showSignupPassword,
  setShowSignupPassword,
  showSignupConfirm,
  setShowSignupConfirm,
  isLoginSubmitting,
  isSignupSubmitting,
  stayLoggedIn,
  setStayLoggedIn,
  showStayInfoModal,
  setShowStayInfoModal,
  error,
  info,
  userData,
  handleVerifyEmail,
  submitSignup,
  submitLogin,
  setStep,
  setError,
  setInfo
}) => {
  const handleNext = async () => {
    await handleVerifyEmail(login);
  };

  return (
    <div className="auth-overlay">
      <div className="auth-overlay-backdrop" />
      <div className="auth-overlay-content">
        <div className="auth-overlay-box">
          <div className="auth-overlay-header">
            <h2>CalWin Admin Login</h2>
            <p>Logg inn for å få tilgang til arbeidsområdet</p>
          </div>
          
          {step === 'login' ? (
            <LoginEmailForm
              login={login}
              setLogin={setLogin}
              handleNext={handleNext}
              stayLoggedIn={stayLoggedIn}
              setStayLoggedIn={setStayLoggedIn}
              showStayInfoModal={showStayInfoModal}
              setShowStayInfoModal={setShowStayInfoModal}
              error={error}
              info={info}
            />
          ) : step === 'signup' ? (
            <SignupForm
              login={login}
              setLogin={setLogin}
              password={password}
              setPassword={setPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              passwordStrength={passwordStrength}
              showSignupPassword={showSignupPassword}
              setShowSignupPassword={setShowSignupPassword}
              showSignupConfirm={showSignupConfirm}
              setShowSignupConfirm={setShowSignupConfirm}
              isSignupSubmitting={isSignupSubmitting}
              submitSignup={submitSignup}
              backToLogin={() => {
                setStep('login');
                setError(null);
                setInfo(null);
              }}
              error={error}
              info={info}
            />
          ) : (
            <PasswordForm
              userName={userData?.Username}
              userEmail={userData?.Email}
              password={password}
              setPassword={setPassword}
              showLoginPassword={showLoginPassword}
              setShowLoginPassword={setShowLoginPassword}
              submitLogin={submitLogin}
              isLoginSubmitting={isLoginSubmitting}
              error={error}
              info={info}
            />
          )}
        </div>
      </div>
    </div>
  );
};
