import React, { useState, useEffect, useRef } from 'react';
import { APPINSTALLER_URLS, PROTOCOL_CALWIN, PROTOCOL_CALWIN_TEST, PROTOCOL_CALWIN_DEV } from './config';
import { useAuthFlow } from './hooks/useAuthFlow';
import { refreshTokens } from './api/auth';
import { useInstallations } from './hooks/useInstallations';
import { useLauncher } from './hooks/useLauncher';
import type { NormalizedInstallation } from './types/installations';
import './CwAdminLogin.css';
import { TextBox } from 'devextreme-react/text-box';
import { Button } from 'devextreme-react/button';

// UserData shape handled internally by useAuthFlow; no local interface needed

const CwAdminLogin = () => {
  // Form inputs
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  // Download fallback & modal state
  const [downloadAvailableUrl, setDownloadAvailableUrl] = useState<string | null>(null);
  const [downloadAvailableType, setDownloadAvailableType] = useState<number | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const fallbackRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Hooks: auth, installations, launcher
  const {
    step, setStep, userData, setUserData, tokens, error, info, setError, setInfo,
    handleVerifyEmail, handleSignUp, handleLogin, handleMfa, logout, setRawTokens
  } = useAuthFlow();
  const { installations, refresh: refreshInstallations, generateLaunchToken } = useInstallations();
  const { launching, launchMessage, launchWithFallback } = useLauncher();
  const [installationLoading, setInstallationLoading] = useState<Record<string, boolean>>({});
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{ score: number; label: string; percent: number }>({ score: 0, label: 'Svært svakt', percent: 0 });
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const [isSignupSubmitting, setIsSignupSubmitting] = useState(false);
  const [lastLoginAttempt, setLastLoginAttempt] = useState(0);
  // Stay logged in (only UI placement for now)
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [showStayInfoModal, setShowStayInfoModal] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  // Session control simplified: single click logout button (lock badge)

  // When a per-card fallback is shown, scroll it into view and add a quick entrance animation.
  useEffect(() => {
    if (downloadAvailableUrl && typeof downloadAvailableType === 'number') {
      const el = fallbackRefs.current[downloadAvailableType];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // add animation class then remove after animation ends
        el.classList.add('CwAdminLogin-fallback-entrance');
        const handle = setTimeout(() => el.classList.remove('CwAdminLogin-fallback-entrance'), 900);
        return () => clearTimeout(handle);
      }
    }
  }, [downloadAvailableUrl, downloadAvailableType]);

  // ...existing code...

  // Email verification step
  const handleNext = async () => { await handleVerifyEmail(login); };

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
    // basic throttle: ignore if last attempt < 900ms ago
    const now = Date.now();
    if (now - lastLoginAttempt < 900) return;
    setLastLoginAttempt(now);
    if (step !== 'password') return; // safety guard
    if (isLoginSubmitting) return;
    setIsLoginSubmitting(true);
    try {
      const usernameToUse = userData?.Email || login;
      const result = await handleLogin(usernameToUse, password);
      if (result) {
        // decoded raw tokens
        try {
          const rawAccess = atob(result.accessToken);
          const rawRefresh = atob(result.refreshToken);
          if (stayLoggedIn) {
            localStorage.setItem('cw_stay', '1');
            // Obfuscate with reversible XOR over char codes + base64.
            const obfuscate = (str: string) => btoa(String.fromCharCode(...str.split('').map((c, i) => c.charCodeAt(0) ^ (13 + (i % 7)))));
            localStorage.setItem('cw_tokens', JSON.stringify({ a: obfuscate(rawAccess), r: obfuscate(rawRefresh), ts: Date.now() }));
            if (userData?.Username || userData?.Email) {
              localStorage.setItem('cw_user', JSON.stringify({ u: userData?.Username, e: userData?.Email }));
            }
          } else {
            localStorage.removeItem('cw_stay');
            localStorage.removeItem('cw_tokens');
            localStorage.removeItem('cw_user');
          }
        } catch { /* ignore */ }
      }
    } finally {
      setIsLoginSubmitting(false);
    }
  };

  const handleMfaSubmit = async () => {
    const username = userData?.Username || login;
    await handleMfa(username || '', mfaCode);
  };

  // Render custom protocol links after successful login
  const appTypeMap = {
    0: 'CalWin Prod',
    1: 'CalWin Test',
    2: 'CalWin Dev'
  };

  // Hook-based launch wrapper
  const requestLaunch = (appUri: string, downloadUrl: string, type?: number) => {
    launchWithFallback(appUri, () => {
      setDownloadAvailableUrl(downloadUrl);
      setDownloadAvailableType(typeof type === 'number' ? type : null);
    });
  };

  // Refresh installations when tokens appear
  useEffect(() => {
    if (tokens?.accessToken) {
      try { const raw = atob(tokens.accessToken); refreshInstallations(raw); } catch { /* ignore */ }
    }
  }, [tokens, refreshInstallations]);

  // Merge installation app types into userData legacy appTypes
  useEffect(() => {
    if (installations.length && userData) {
      const appTypes = installations.map(i => i.appType).filter((v): v is number => typeof v === 'number');
      if (appTypes.length) {
        setUserData(prev => {
          if (!prev) return prev;
          const merged = new Set([...(prev.CalWinAppTypes || []), ...appTypes]);
          return { ...prev, CalWinAppTypes: Array.from(merged).sort() };
        });
      }
    }
  }, [installations, userData, setUserData]);

  // Autofocus relevant field when step changes
  useEffect(() => {
    const id = step === 'login'
      ? 'login-email'
      : step === 'signup'
        ? 'signup-email'
        : step === 'password'
          ? 'login-password'
          : step === 'mfa'
            ? 'mfa-code'
            : null;
    if (id) {
      // Delay slightly to allow DevExtreme to mount input
      requestAnimationFrame(() => {
        const el = document.getElementById(id) as HTMLInputElement | null;
        if (el) el.focus();
      });
    }
  }, [step]);

  // Evaluate password strength (simple heuristic)
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

  // Hydrate persisted session once
  useEffect(() => {
    if (hydrated) return;
    try {
      const stay = localStorage.getItem('cw_stay') === '1';
      if (stay) {
        const deobfuscate = (enc: string) => {
          try {
            const bin = atob(enc);
            return Array.from(bin).map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ (13 + (i % 7)))).join('');
          } catch { return ''; }
        };
        const tokensStr = localStorage.getItem('cw_tokens');
        if (tokensStr) {
          const parsed = JSON.parse(tokensStr) as { a?: string; r?: string };
          if (parsed.a && parsed.r) {
            const rawA = deobfuscate(parsed.a);
            const rawR = deobfuscate(parsed.r);
            if (rawA && rawR) {
              setRawTokens(rawA, rawR);
              setStayLoggedIn(true);
            }
          }
        }
        const userStr = localStorage.getItem('cw_user');
        if (userStr) {
          try {
            const uObj = JSON.parse(userStr) as { u?: string; e?: string };
            if (uObj.u || uObj.e) {
              setUserData(prev => ({ ...(prev || {}), Username: uObj.u, Email: uObj.e }));
            }
          } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, [hydrated, setRawTokens, setUserData]);

  // Basic refresh interval (placeholder – adjust endpoint/logic if needed)
  // Schedule refresh based on JWT exp minus safety margin
  useEffect(() => {
    if (!stayLoggedIn || !tokens?.accessToken || !tokens.refreshToken) return;
    let canceled = false;
    const rawAccess = (() => { try { return atob(tokens.accessToken); } catch { return null; } })();
    const rawRefresh = (() => { try { return atob(tokens.refreshToken); } catch { return null; } })();
    if (!rawAccess || !rawRefresh) return;

    const decodeJwt = (jwt: string) => {
      const parts = jwt.split('.');
      if (parts.length < 2) return null;
      try {
        const json = decodeURIComponent(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')).split('').map(c=> '%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        return JSON.parse(json) as { exp?: number };
      } catch { return null; }
    };
    const payload = decodeJwt(rawAccess);
    if (!payload?.exp) return; // fallback: no scheduling
    const nowSec = Math.floor(Date.now()/1000);
    const marginSec = 120; // refresh 2 minutes early
    let delayMs = (payload.exp - marginSec - nowSec) * 1000;
    if (delayMs < 5000) delayMs = 5000; // minimum delay 5s

    const timer = setTimeout(async () => {
      if (canceled) return;
      try {
        const resp = await refreshTokens(rawRefresh);
        const dataObj = resp.data as Record<string, unknown> & { Cognito?: Record<string, unknown> };
        const at = (dataObj['AccessToken'] || dataObj['accessToken'] || dataObj.Cognito?.['AccessToken']) as string | undefined;
        const rt = (dataObj['RefreshToken'] || dataObj['refreshToken'] || dataObj.Cognito?.['RefreshToken']) as string | undefined;
        if (at && rt) {
          setRawTokens(at, rt);
          // Re-obfuscate
            const obfuscate = (str: string) => btoa(String.fromCharCode(...str.split('').map((c, i) => c.charCodeAt(0) ^ (13 + (i % 7)))));
          localStorage.setItem('cw_tokens', JSON.stringify({ a: obfuscate(at), r: obfuscate(rt), ts: Date.now() }));
        } else if (resp.status === 401) {
          localStorage.removeItem('cw_stay');
          localStorage.removeItem('cw_tokens');
          localStorage.removeItem('cw_user');
          logout();
        }
      } catch { /* ignore transient errors; next effect run will reschedule */ }
    }, delayMs);
    return () => { canceled = true; clearTimeout(timer); };
  }, [stayLoggedIn, tokens, setRawTokens, logout]);

  // handleLogout removed (logic now inline with lock button click)

  // No dropdown menu needed now.

  // ...existing code...
  return (<>
    <div className="CwAdminLogin-login-container">
      {step === 'mfa' ? (
        <div className="CwAdminLogin-login-mfa">
          <div className="CwAdminLogin-login-title">Multifaktor Login</div>
          <div className="CwAdminLogin-login-subtitle">Skriv inn MFA-koden din</div>
          <TextBox
            value={mfaCode}
            onValueChanged={e => setMfaCode(e.value)}
            placeholder="MFA Code"
            className="CwAdminLogin-login-input"
            inputAttr={{ id: 'mfa-code', autoComplete: 'one-time-code', inputmode: 'numeric' }}
          />
          <div className="CwAdminLogin-login-button">
            <Button
              text="Verifiser"
              type="success"
              onClick={handleMfaSubmit}
            />
          </div>
          {error && <div className="CwAdminLogin-login-error" role="alert" aria-live="assertive">{error}</div>}
        </div>
      ) : tokens && userData ? (
        <div className="CwAdminLogin-login-app-list">
          <div className="CwAdminLogin-login-title">CalWin Apps</div>
          {launching && (
            <div className="CwAdminLogin-login-launch-banner">
              <div className="CwAdminLogin-login-launch-spinner" aria-hidden />
              <div className="CwAdminLogin-login-launch-message">{launchMessage}</div>
            </div>
          )}
          <div className="CwAdminLogin-app-grid">
            {userData.CalWinAppTypes?.map((type: number) => {
              const appName = appTypeMap[type as keyof typeof appTypeMap] || `AppType${type}`;
              // Choose protocol per app type
              const protocolMap: Record<number, string> = {
                0: PROTOCOL_CALWIN,
                1: PROTOCOL_CALWIN_TEST,
                2: PROTOCOL_CALWIN_DEV
              };
              const protocol = protocolMap[type] || PROTOCOL_CALWIN_DEV;
              const appProtocolUrl = `${protocol}?accessToken=${encodeURIComponent(tokens.accessToken)}&refreshToken=${encodeURIComponent(tokens.refreshToken)}`;
              // Provide URLs for installer and direct download (adjust paths as needed)
              const appinstallerFileUrl = APPINSTALLER_URLS[type] || APPINSTALLER_URLS[2];
              const directDownloadUrl = appinstallerFileUrl;

              const onClick = (e: React.MouseEvent) => {
                e.preventDefault();
                if (launching) return; // disable while launching
                requestLaunch(appProtocolUrl, directDownloadUrl, type);
              };

              return (
                <div key={type} className="CwAdminLogin-app-item">
                  <button
                    className="CwAdminLogin-app-card"
                    onClick={onClick}
                    disabled={launching}
                    aria-label={`Open ${appName}`}
                  >
                    <div className="CwAdminLogin-app-card-icon">{appName.replace(/[^A-Za-z0-9]/g,'').slice(0,2).toUpperCase() || 'CW'}</div>
                    <div className="CwAdminLogin-app-card-body">
                      <div className="CwAdminLogin-app-card-title">{appName}</div>
                    </div>
                  </button>
                  {downloadAvailableUrl && downloadAvailableType === type && (
                    <div style={{ marginTop: 10 }} ref={r => { fallbackRefs.current[type] = r; }}>
                      <div className="CwAdminLogin-login-download-fallback" role="region" aria-live="polite">
                        <div style={{ marginBottom: 8 }}>Kan ikke installere via protokoll? Last ned installasjonsprogrammet manuelt:</div>
                        <div className="CwAdminLogin-download-actions">
                          <Button
                            text="Last ned .appinstaller"
                            type="default"
                            onClick={() => {
                              // start download/navigation
                              window.location.href = downloadAvailableUrl!;
                              // clear fallback so the UI element is removed
                              setDownloadAvailableUrl(null);
                              setDownloadAvailableType(null);
                              if (typeof type === 'number') {
                                fallbackRefs.current[type] = null;
                              }
                            }}
                          />
                          <Button
                            text="Vis installasjonsinstruksjoner"
                            type="normal"
                            onClick={() => setShowDownloadModal(true)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {installations && installations.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <div className="CwAdminLogin-login-subtitle" style={{ marginBottom: 8 }}>Tilgjengelige installasjoner</div>
              <ul className="CwAdminLogin-installation-list" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                {installations.map((inst: NormalizedInstallation) => {
                  const loading = installationLoading[inst.id];
                  const disabled = loading || !tokens; // need tokens to request
                  const handleClick = async (e: React.MouseEvent) => {
                    e.preventDefault();
                    if (!tokens) return;
                    if (loading) return;
                    setInstallationLoading(prev => ({ ...prev, [inst.id]: true }));
                    try {
                      // decode stored base64 access token
                      const rawAccessToken = atob(tokens.accessToken);
                      const token = await generateLaunchToken(rawAccessToken, inst.id);
                      if (token) {
                        const protocol = inst.appType === 0 ? PROTOCOL_CALWIN : inst.appType === 1 ? PROTOCOL_CALWIN_TEST : PROTOCOL_CALWIN_DEV;
                        const uri = `${protocol}${encodeURIComponent(token)}`;
                        requestLaunch(uri, '', inst.appType);
                      } else {
                        setError('Feil ved generering av engangstoken.');
                      }
                    } catch (err) {
                      console.warn('Lazy token generation failed', err);
                      setError('Uventet feil ved token generering.');
                    } finally {
                      setInstallationLoading(prev => ({ ...prev, [inst.id]: false }));
                    }
                  };
                  const iconText = (inst.name && inst.name.replace(/[^A-Za-z0-9]/g,'').slice(0,2).toUpperCase()) || 'IN';
                  return (
                    <li key={inst.id} style={{ width: '100%', maxWidth: 520 }}>
                      <button
                        className="CwAdminLogin-app-card"
                        style={disabled ? { opacity: 0.6, cursor: 'default' } : undefined}
                        onClick={handleClick}
                        disabled={disabled}
                        aria-label={disabled ? `Kan ikke åpne ${inst.name}` : `Åpne ${inst.name}`}
                      >
                        <div className="CwAdminLogin-app-card-icon">{iconText}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="CwAdminLogin-app-card-title" style={{ fontWeight: 600 }}>{inst.name}</div>
                          {loading && (
                            <div style={{ fontSize: 12, opacity: 0.65 }}>Genererer token...</div>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <div style={{ marginTop: 48, display: 'flex', justifyContent: 'flex-end', width: '100%', maxWidth: 520 }}>
            <button
              type="button"
              className="CwAdminLogin-session-btn"
              onClick={() => {
                // Turning off persistence and logging out in one click
                try {
                  localStorage.removeItem('cw_stay');
                  localStorage.removeItem('cw_tokens');
                  localStorage.removeItem('cw_user');
                } catch {/* ignore */}
                setStayLoggedIn(false);
                logout();
              }}
              title="Logg ut (deaktiver Forbli innlogget)"
              aria-label="Logg ut"
            >
              <span aria-hidden="true" className={stayLoggedIn ? 'CwAdminLogin-lock-badge active' : 'CwAdminLogin-lock-badge'}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Logg ut</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {step === 'login' ? (
            <form autoComplete="on" onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
              <div className="CwAdminLogin-login-title">Velkommen</div>
              <div className="CwAdminLogin-login-subtitle">Vennligst skriv inn epost for å fortsette</div>
              <TextBox
                value={login}
                onValueChanged={e => setLogin(e.value)}
                placeholder="E-post"
                mode="email"
                inputAttr={{
                  autoComplete: 'username email',
                  name: 'username',
                  id: 'login-email'
                }}
                className="CwAdminLogin-login-input"
              />
              <div className="CwAdminLogin-login-button">
                <Button
                  text="Neste"
                  type="default"
                  onClick={handleNext}
                />
              </div>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0 10px', maxWidth: 360, position: 'relative' }}
                onMouseEnter={() => setShowStayInfoModal(true)}
                onMouseLeave={() => setShowStayInfoModal(false)}
                onFocus={() => setShowStayInfoModal(true)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowStayInfoModal(false);
                }}
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
                  style={{ border: 'none', background: 'transparent', cursor: 'help', padding: 2, lineHeight: 1, display: 'flex', alignItems: 'center' }}
                  aria-expanded={showStayInfoModal}
                  aria-haspopup="dialog"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </button>
                {showStayInfoModal && (
                  <div
                    role="dialog"
                    aria-label="Informasjon om Forbli innlogget"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      zIndex: 1000,
                      background: '#ffffff',
                      color: '#111',
                      fontSize: 12,
                      padding: '10px 12px 12px',
                      borderRadius: 8,
                      marginTop: 6,
                      maxWidth: 300,
                      boxShadow: '0 4px 14px rgba(0,0,0,.18)',
                      lineHeight: 1.45,
                      border: '1px solid #dcdcdc'
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Bruk kun på privat enhet</div>
                    <div style={{ marginBottom: 6 }}>
                      Lengre innloggingssesjon. Ikke på offentlig / delt maskin.
                    </div>
                    <ul style={{ paddingLeft: 18, margin: '0 0 6px' }}>
                      <li>Unngå offentlig PC</li>
                      <li>Lås skjermen</li>
                      <li>Logg ut ved tvil</li>
                    </ul>
                    <div style={{ position: 'absolute', top: -6, left: 14, width: 12, height: 12, background: '#ffffff', transform: 'rotate(45deg)', borderLeft: '1px solid #dcdcdc', borderTop: '1px solid #dcdcdc' }} aria-hidden="true" />
                  </div>
                )}
              </div>
              {/* Demo apps button removed */}
              {error && <div className="CwAdminLogin-login-error">{error}</div>}
              {info && <div className="CwAdminLogin-login-info">{info}</div>}
            </form>
          ) : step === 'signup' ? (
            <form autoComplete="on" onSubmit={(e) => { e.preventDefault(); submitSignup(); }}>
              <div className="CwAdminLogin-login-title">Opprett konto</div>
              <div className="CwAdminLogin-login-subtitle">Registrer deg for e-posten {login}</div>
              <TextBox
                value={login}
                onValueChanged={e => setLogin(e.value)}
                placeholder="E-post"
                mode="email"
                inputAttr={{
                  autoComplete: 'username email',
                  name: 'username',
                  id: 'signup-email'
                }}
                className="CwAdminLogin-login-input"
              />
              <div style={{ position: 'relative', width: '100%', maxWidth: 350 }}>
                <TextBox
                  value={password}
                  mode={showSignupPassword ? 'text' : 'password'}
                  onValueChanged={e => setPassword(e.value)}
                  placeholder={'Passord'}
                  inputAttr={{
                    autoComplete: 'new-password',
                    name: 'new-password',
                    id: 'signup-password'
                  }}
                  className="CwAdminLogin-login-input"
                />
                <button
                  type="button"
                  aria-label={showSignupPassword ? 'Skjul passord' : 'Vis passord'}
                  className="CwAdminLogin-eye-btn"
                  onClick={() => setShowSignupPassword(s => !s)}
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
                  inputAttr={{
                    autoComplete: 'new-password',
                    name: 'confirm-password',
                    id: 'signup-confirm-password'
                  }}
                  className="CwAdminLogin-login-input"
                />
                <button
                  type="button"
                  aria-label={showSignupConfirm ? 'Skjul bekreftelse' : 'Vis bekreftelse'}
                  className="CwAdminLogin-eye-btn"
                  onClick={() => setShowSignupConfirm(s => !s)}
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
                <Button
                  text={isSignupSubmitting ? 'Oppretter…' : 'Opprett konto'}
                  type="success"
                  useSubmitBehavior={true}
                  disabled={isSignupSubmitting}
                />
                <Button
                  text="Tilbake"
                  type="normal"
                  onClick={() => { setStep('login'); setError(null); setInfo(null); }}
                />
              </div>
              {error && <div className="CwAdminLogin-login-error">{error}</div>}
              {info && <div className="CwAdminLogin-login-info">{info}</div>}
            </form>
          ) : (
            <form autoComplete="on" onSubmit={(e) => { e.preventDefault(); submitLogin(); }}>
              <div className="CwAdminLogin-login-title">Hei {userData?.Username}</div>
              <div className="CwAdminLogin-login-subtitle">Vennligst skriv inn passordet ditt for å fortsette</div>
              <div style={{ position: 'relative', width: '100%', maxWidth: 350 }}>
                <TextBox
                  value={password}
                  mode={showLoginPassword ? 'text' : 'password'}
                  onValueChanged={e => setPassword(e.value)}
                  placeholder={'Password'}
                  inputAttr={{
                    autoComplete: 'current-password',
                    name: 'current-password',
                    id: 'login-password'
                  }}
                  className="CwAdminLogin-login-input"
                />
                <button
                  type="button"
                  aria-label={showLoginPassword ? 'Skjul passord' : 'Vis passord'}
                  className="CwAdminLogin-eye-btn"
                  onClick={() => setShowLoginPassword(s => !s)}
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
                <Button
                  text={isLoginSubmitting ? 'Logger inn…' : 'Login'}
                  type="success"
                  useSubmitBehavior={true}
                  disabled={isLoginSubmitting}
                  aria-busy={isLoginSubmitting}
                />
              </div>
              {/* Demo apps button removed */}
              {error && <div className="CwAdminLogin-login-error">{error}</div>}
              {info && <div className="CwAdminLogin-login-info">{info}</div>}
            </form>
          )}
        </>
      )}
    </div>
    {showDownloadModal && (
      <div className="dl-modal-backdrop" onClick={() => setShowDownloadModal(false)}>
        <div className="dl-modal" onClick={e => e.stopPropagation()}>
          <h3>Installasjonsinstruksjoner</h3>
          <p>Hvis App Installer sier at protokollen er deaktivert, last ned .appinstaller-filen og dobbeltklikk for å åpne den i App Installer.</p>
          <ol>
            <li>Klikk «Last ned .appinstaller» for å lagre filen.</li>
            <li>Åpne mappen der filen er lagret.</li>
            <li>Dobbeltklikk på filen for å starte App Installer.</li>
            <li>Følg instruksjonene i App Installer for å fullføre installasjonen.</li>
          </ol>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Button text="Lukk" onClick={() => setShowDownloadModal(false)} />
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default CwAdminLogin;
