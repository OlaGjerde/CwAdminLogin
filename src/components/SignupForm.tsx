import React from 'react';
import { TextBox } from 'devextreme-react/text-box';
import { Button } from 'devextreme-react/button';

interface Props {
  login: string;
  setLogin: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  passwordStrength: { score: number; label: string; percent: number };
  showSignupPassword: boolean;
  setShowSignupPassword: (v: boolean) => void;
  showSignupConfirm: boolean;
  setShowSignupConfirm: (v: boolean) => void;
  isSignupSubmitting: boolean;
  submitSignup: () => void;
  backToLogin: () => void;
  error: string | null;
  info: string | null;
}

export const SignupForm: React.FC<Props> = ({
  login, setLogin,
  password, setPassword,
  confirmPassword, setConfirmPassword,
  passwordStrength,
  showSignupPassword, setShowSignupPassword,
  showSignupConfirm, setShowSignupConfirm,
  isSignupSubmitting,
  submitSignup,
  backToLogin,
  error,
  info
}) => {
  return (
    <form autoComplete="on" onSubmit={(e) => { e.preventDefault(); submitSignup(); }}>
      <div className="CwAdminLogin-login-title">Opprett konto</div>
      <div className="CwAdminLogin-login-subtitle">Registrer deg for e-posten {login}</div>
      <TextBox
        value={login}
        onValueChanged={e => setLogin(e.value)}
        placeholder="E-post"
        mode="email"
        inputAttr={{ autoComplete: 'username email', name: 'username', id: 'signup-email' }}
        className="CwAdminLogin-login-input"
      />
      <div style={{ position: 'relative', width: '100%', maxWidth: 350 }}>
        <TextBox
          value={password}
          mode={showSignupPassword ? 'text' : 'password'}
          onValueChanged={e => setPassword(e.value)}
          placeholder={'Passord'}
          inputAttr={{ autoComplete: 'new-password', name: 'new-password', id: 'signup-password' }}
          className="CwAdminLogin-login-input"
        />
        <button
          type="button"
          aria-label={showSignupPassword ? 'Skjul passord' : 'Vis passord'}
          className="CwAdminLogin-eye-btn"
          onClick={() => setShowSignupPassword(!showSignupPassword)}
        >
          {showSignupPassword ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5.05 0-9.29-3.23-11-8 1.01-2.76 2.86-5.05 5.22-6.58m3.07-1.29A10.94 10.94 0 0 1 12 4c5.05 0 9.29 3.23 11 8-.65 1.78-1.69 3.37-3 4.64M1 1l22 22"/><path d="M14.12 14.12A3 3 0 0 1 9.88 9.88"/></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
          )}
        </button>
        <div className="CwAdminLogin-strength" aria-live="polite">
          <div className="CwAdminLogin-strength-bar" aria-hidden="true">
            <div className="CwAdminLogin-strength-bar-fill" style={{ width: `${passwordStrength.percent}%`, backgroundColor: passwordStrength.score < 2 ? '#d32f2f' : passwordStrength.score === 2 ? '#ed6c02' : passwordStrength.score === 3 ? '#f9a825' : '#2e7d32' }} />
          </div>
          <div className="CwAdminLogin-strength-label">Styrke: {passwordStrength.label}</div>
        </div>
      </div>
      <div style={{ position: 'relative', width: '100%', maxWidth: 350 }}>
        <TextBox
          value={confirmPassword}
          mode={showSignupConfirm ? 'text' : 'password'}
          onValueChanged={e => setConfirmPassword(e.value)}
          placeholder={'Bekreft passord'}
          inputAttr={{ autoComplete: 'new-password', name: 'confirm-password', id: 'signup-confirm-password' }}
          className="CwAdminLogin-login-input"
        />
        <button
          type="button"
          aria-label={showSignupConfirm ? 'Skjul bekreftelse' : 'Vis bekreftelse'}
          className="CwAdminLogin-eye-btn"
          onClick={() => setShowSignupConfirm(!showSignupConfirm)}
        >
          {showSignupConfirm ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5.05 0-9.29-3.23-11-8 1.01-2.76 2.86-5.05 5.22-6.58m3.07-1.29A10.94 10.94 0 0 1 12 4c5.05 0 9.29 3.23 11 8-.65 1.78-1.69 3.37-3 4.64M1 1l22 22"/><path d="M14.12 14.12A3 3 0 0 1 9.88 9.88"/></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
          )}
        </button>
      </div>
      {error && <div className="CwAdminLogin-login-error" role="alert" aria-live="assertive">{error}</div>}
      <div className="CwAdminLogin-login-button" style={{ display: 'flex', gap: 8 }}>
        <Button text={isSignupSubmitting ? 'Oppretter…' : 'Opprett konto'} type="success" useSubmitBehavior={true} disabled={isSignupSubmitting} />
        <Button text="Tilbake" type="normal" onClick={backToLogin} />
      </div>
      {error && <div className="CwAdminLogin-login-error">{error}</div>}
      {info && <div className="CwAdminLogin-login-info">{info}</div>}
    </form>
  );
};
