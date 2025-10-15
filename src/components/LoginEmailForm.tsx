import React from 'react';
import { TextBox } from 'devextreme-react/text-box';
import type { KeyDownEvent } from 'devextreme/ui/text_box';
import { Button } from 'devextreme-react/button';
import { getCognitoSignupUrl } from '../config';

interface Props {
  login: string;
  setLogin: (v: string) => void;
  handleNext: () => void;
  stayLoggedIn: boolean;
  setStayLoggedIn: (v: boolean) => void;
  showStayInfoModal: boolean;
  setShowStayInfoModal: (v: boolean) => void;
  error: string | null;
  info: string | null;
}

export const LoginEmailForm: React.FC<Props> = ({ login, setLogin, handleNext, stayLoggedIn, setStayLoggedIn, showStayInfoModal, setShowStayInfoModal, error, info }) => {
  // Show the signup link only for specific states produced by verify flow:
  // - User not found (404)
  // - UNCONFIRMED
  // - UNKNOWN
  // - Generic verification failure (fallback)
  // We infer these by matching substrings from current Norwegian messages.
  const lowerErr = (error || '').toLowerCase();
  const showSignupLink = (
    // 404 / not found wording
    lowerErr.includes('finnes ikke') ||
    lowerErr.includes('fant ikke konto') ||
    // generic verification failure (fallback)
    lowerErr.includes('kunne ikke verifisere')
  ); // UNCONFIRMED no longer triggers link; user must confirm existing account
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    handleNext();
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
      <div className="CwAdminLogin-login-title">Velkommen</div>
      <div className="CwAdminLogin-login-subtitle">Vennligst skriv inn epost for å fortsette</div>
      <TextBox
        value={login}
        onValueChanged={e => setLogin(e.value)}
        onKeyDown={handleKeyDown}
        placeholder="E-post"
        mode="email"
        inputAttr={{ autoComplete: 'username email', name: 'username', id: 'login-email' }}
        className="CwAdminLogin-login-input"
      />
      <div className="CwAdminLogin-login-button">
        <Button text="Neste" type="default" onClick={handleNext} />
      </div>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0 10px', maxWidth: 360, position: 'relative' }}
      >
        <input
          id="stay-logged-in"
          type="checkbox"
          checked={stayLoggedIn}
          onChange={e => setStayLoggedIn(e.target.checked)}
          style={{ cursor: 'pointer' }}
        />
        <label htmlFor="stay-logged-in" style={{ cursor: 'pointer', userSelect: 'none' }}>Forbli innlogget</label>
        <button
          type="button"
          tabIndex={0}
          aria-label="Mer informasjon om 'Forbli innlogget' (hold musepekeren over)"
          style={{ border: 'none', background: 'transparent', cursor: 'help', padding: 2, lineHeight: 1, display: 'flex', alignItems: 'center', position: 'relative' }}
          aria-expanded={showStayInfoModal}
          aria-haspopup="dialog"
          onMouseEnter={() => setShowStayInfoModal(true)}
          onMouseLeave={() => setShowStayInfoModal(false)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          {showStayInfoModal && (
            <div
              role="dialog"
              aria-label="Informasjon om Forbli innlogget"
              onMouseEnter={() => setShowStayInfoModal(true)}
              onMouseLeave={() => setShowStayInfoModal(false)}
              style={{
                position: 'absolute', 
                top: '100%', 
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000, 
                background: '#ffffff', 
                color: '#111', 
                fontSize: 12,
                padding: '10px 12px 12px',
                borderRadius: 8, 
                marginTop: 8,
                width: 300, 
                boxShadow: '0 4px 14px rgba(0,0,0,.18)', 
                lineHeight: 1.45, 
                border: '1px solid #dcdcdc'
              }}
            >
            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Bruk kun på privat enhet</div>
            <div style={{ marginBottom: 6 }}>Lengre innloggingssesjon. Ikke på offentlig / delt maskin.</div>
            <ul style={{ paddingLeft: 18, margin: '0 0 6px' }}>
              <li>Unngå offentlig PC</li>
              <li>Lås skjermen</li>
              <li>Logg ut ved tvil</li>
            </ul>
            <div style={{ position: 'absolute', top: -6, left: 14, width: 12, height: 12, background: '#ffffff', transform: 'rotate(45deg)', borderLeft: '1px solid #dcdcdc', borderTop: '1px solid #dcdcdc' }} aria-hidden="true" />
          </div>
        )}
        </button>
      </div>
      {error && <div className="CwAdminLogin-login-error">{error}</div>}
      {info && <div className="CwAdminLogin-login-info">{info}</div>}
      {showSignupLink && (
        <div className="CwAdminLogin-login-signup">
          <a
            href={getCognitoSignupUrl(login)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Vennligst opprett en konto
          </a>
        </div>
      )}
    </form>
  );
};
