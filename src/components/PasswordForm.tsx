import React from 'react';
import { TextBox } from 'devextreme-react/text-box';
import { Button } from 'devextreme-react/button';

interface Props {
  userName?: string;
  password: string;
  setPassword: (v: string) => void;
  showLoginPassword: boolean;
  setShowLoginPassword: (v: boolean) => void;
  submitLogin: () => void;
  isLoginSubmitting: boolean;
  error: string | null;
  info: string | null;
}

export const PasswordForm: React.FC<Props> = ({ userName, password, setPassword, showLoginPassword, setShowLoginPassword, submitLogin, isLoginSubmitting, error, info }) => {
  return (
    <form autoComplete="on" onSubmit={(e) => { e.preventDefault(); submitLogin(); }}>
      <div className="CwAdminLogin-login-title">Hei {userName}</div>
      <div className="CwAdminLogin-login-subtitle">Vennligst skriv inn passordet ditt for å fortsette</div>
      <div style={{ position: 'relative', width: '100%', maxWidth: 350 }}>
        <TextBox
          value={password}
          mode={showLoginPassword ? 'text' : 'password'}
          onValueChanged={e => setPassword(e.value)}
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
      {error && <div className="CwAdminLogin-login-error" role="alert" aria-live="assertive">{error}</div>}
      <div className="CwAdminLogin-login-button">
        <Button text={isLoginSubmitting ? 'Logger inn…' : 'Login'} type="success" useSubmitBehavior={true} disabled={isLoginSubmitting} aria-busy={isLoginSubmitting} />
      </div>
      {error && <div className="CwAdminLogin-login-error">{error}</div>}
      {info && <div className="CwAdminLogin-login-info">{info}</div>}
    </form>
  );
};
