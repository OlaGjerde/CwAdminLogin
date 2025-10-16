import React from 'react';
import { TextBox } from 'devextreme-react/text-box';
import type { KeyDownEvent } from 'devextreme/ui/text_box';
import { Button } from 'devextreme-react/button';
import { getCognitoForgotPasswordUrl } from '../config';

interface Props {
  userName?: string;
  userEmail?: string;
  password: string;
  setPassword: (v: string) => void;
  showLoginPassword: boolean;
  setShowLoginPassword: (v: boolean) => void;
  submitLogin: () => void;
  isLoginSubmitting: boolean;
  error: string | null;
  info: string | null;
}

export const PasswordForm: React.FC<Props> = React.memo(({ userName, userEmail, password, setPassword, showLoginPassword, setShowLoginPassword, submitLogin, isLoginSubmitting, error, info }) => {
  // Debug: Track re-renders
  const renderCount = React.useRef(0);
  React.useEffect(() => {
    renderCount.current++;
    console.log(`🔄 PasswordForm RE-RENDER #${renderCount.current}`, {
      userName,
      password: password ? '***' : '',
      showLoginPassword,
      isLoginSubmitting,
      error,
      info,
      submitLogin_type: typeof submitLogin,
      submitLogin_string: submitLogin.toString().substring(0, 100)
    });
  });

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    const forgotPasswordUrl = getCognitoForgotPasswordUrl(userEmail);
    window.location.href = forgotPasswordUrl;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    submitLogin();
  };

  const handleKeyDown = (e: KeyDownEvent) => {
    if (e.event?.key === 'Enter') {
      e.event.preventDefault();
      e.event.stopPropagation();
      handleSubmit();
    }
  };

  return (
    <form autoComplete="on" onSubmit={handleSubmit}>
      <div className="CwAdminLogin-login-title">Hei {userName}</div>
      <div className="CwAdminLogin-login-subtitle">Vennligst skriv inn passordet ditt:</div>
      <div style={{ position: 'relative', width: '100%', maxWidth: 350 }}>
        <TextBox
          value={password}
          mode={showLoginPassword ? 'text' : 'password'}
          onValueChanged={e => setPassword(e.value)}
          onKeyDown={handleKeyDown}
          placeholder={'Password'}
          inputAttr={{ autoComplete: 'current-password', name: 'current-password', id: 'login-password' }}
          className="CwAdminLogin-login-input"
        />
        <button
          type="button"
          aria-label={showLoginPassword ? 'Skjul passord' : 'Vis passord'}
          className="CwAdminLogin-eye-btn"
          onClick={() => setShowLoginPassword(!showLoginPassword)}
        >
          {showLoginPassword ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5.05 0-9.29-3.23-11-8 1.01-2.76 2.86-5.05 5.22-6.58m3.07-1.29A10.94 10.94 0 0 1 12 4c5.05 0 9.29 3.23 11 8-.65 1.78-1.69 3.37-3 4.64M1 1l22 22"/><path d="M14.12 14.12A3 3 0 0 1 9.88 9.88"/></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
          )}
        </button>
      </div>
      <div style={{ width: '100%', maxWidth: 350, marginTop: 8, textAlign: 'right' }}>
        <a 
          href="#" 
          onClick={handleForgotPassword}
          style={{ 
            fontSize: '13px', 
            color: '#1976d2', 
            textDecoration: 'none',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
          onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
        >
          Glemt passord?
        </a>
      </div>
      {error && <div className="CwAdminLogin-login-error" role="alert" aria-live="assertive">{error}</div>}
      <div className="CwAdminLogin-login-button">
        <Button text={isLoginSubmitting ? 'Logger inn…' : 'Login'} type="success" useSubmitBehavior={true} disabled={isLoginSubmitting} aria-busy={isLoginSubmitting} />
      </div>
      {error && <div className="CwAdminLogin-login-error">{error}</div>}
      {info && <div className="CwAdminLogin-login-info">{info}</div>}
    </form>
  );
});
