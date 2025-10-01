import { useState, useEffect, useRef } from 'react';
import { buildAuthUrl, exchangeCodeForTokens, getHostedConfig } from './auth/cognitoHosted';
import { obfuscate, deobfuscate } from './utils/tokens';
import { useAuthFlow } from './hooks/useAuthFlow';
import { useInstallations } from './hooks/useInstallations';
import { useLauncher } from './hooks/useLauncher';
import { useTokenRefresh } from './hooks/useTokenRefresh';
import { LoginEmailForm } from './components/LoginEmailForm';
import { SignupForm } from './components/SignupForm';
import { PasswordForm } from './components/PasswordForm';
import { AppGrid } from './components/AppGrid';
import { InstallationsList } from './components/InstallationsList';
import './CwAdminLogin.css';
import { TextBox } from 'devextreme-react/text-box';
import { Button } from 'devextreme-react/button';

// UserData shape handled internally by useAuthFlow; no local interface needed

const CwAdminLogin = () => {
  // Cognito Hosted UI mode toggle (env driven)
  const hostedCfg = getHostedConfig();
  const hostedEnabled = !!hostedCfg;
  // Form inputs (unused in hosted mode for signup/forgot password, still used for direct login if desired)
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  // Download fallback & modal state
  const [downloadAvailableUrl, setDownloadAvailableUrl] = useState<string | null>(null);
  const [downloadAvailableType, setDownloadAvailableType] = useState<number | null>(null);
  // Fallback specifically for installations (since multiple installations can share same appType)
  const [installationFallbackId, setInstallationFallbackId] = useState<string | null>(null);
  const [installationFallbackUrl, setInstallationFallbackUrl] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const fallbackRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Hooks: auth, installations, launcher
  const {
    step, setStep, userData, setUserData, tokens, error, info, setError, setInfo,
    handleVerifyEmail, handleSignUp, handleLogin, handleMfa, logout, setRawTokens
  } = useAuthFlow();
  const { installations, refresh: refreshInstallations, refreshIfStale, generateLaunchToken } = useInstallations();
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

  // If we return from Cognito Hosted UI with a code, exchange it.
  useEffect(() => {
    if (!hostedEnabled) return;
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (code) {
      let validState = true;
      try {
        const stored = sessionStorage.getItem('cog_state');
        if (stored && state && stored !== state) validState = false;
      } catch { /* ignore */ }
      if (!validState) return;
      // Clean URL before async to avoid re-exchange on re-render
      window.history.replaceState({}, document.title, url.pathname + url.hash);
      (async () => {
        const tokenSet = await exchangeCodeForTokens(code);
        if (tokenSet?.access_token) {
          // In hosted mode we don't have userData yet; decode id_token minimally for email/username if available.
          try {
            const idTok = tokenSet.id_token;
            if (idTok) {
              const payload = JSON.parse(atob(idTok.split('.')[1] || '')) as Record<string, unknown>;
              const email = (payload.email as string) || (payload['cognito:username'] as string);
              setUserData(prev => ({ ...(prev||{}), Username: email, Email: email }));
            }
          } catch { /* ignore */ }
          setRawTokens(tokenSet.access_token, tokenSet.refresh_token || tokenSet.access_token);
        }
      })();
    }
  }, [hostedEnabled, setRawTokens, setUserData]);

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
  const handleNext = async () => { 
    if (hostedEnabled) {
      // In hosted mode we don't do email pre-verification; redirect to Cognito login flow.
      const url = buildAuthUrl('login');
      if (url) window.location.href = url;
      return;
    }
    await handleVerifyEmail(login); 
  };

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

  // appTypeMap now handled inside AppGrid component

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
    // intentionally exclude refreshInstallations to avoid re-run loops; function is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens]);

  // On tab becoming visible again after idle, refresh if stale but keep cached list visible
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible' && tokens?.accessToken) {
        try { const raw = atob(tokens.accessToken); refreshIfStale(raw); } catch { /* ignore */ }
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [tokens, refreshIfStale]);

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
  // deobfuscate imported statically
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
  // Token refresh scheduling (encapsulated in hook)
  useTokenRefresh({ stayLoggedIn, tokens, setRawTokens, logout });

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
          <AppGrid
            appTypes={userData.CalWinAppTypes}
            tokens={tokens}
            launching={launching}
            launchMessage={launchMessage}
            downloadAvailableUrl={downloadAvailableUrl}
            downloadAvailableType={downloadAvailableType}
            requestLaunch={requestLaunch}
            clearPerTypeFallback={(type:number) => { setDownloadAvailableUrl(null); setDownloadAvailableType(null); fallbackRefs.current[type] = null; }}
            setShowDownloadModal={setShowDownloadModal}
            fallbackRefs={fallbackRefs}
          />
          <InstallationsList
            installations={installations}
            tokens={tokens}
            installationLoading={installationLoading}
            setInstallationLoading={setInstallationLoading}
            generateLaunchToken={generateLaunchToken}
            launchWithFallback={launchWithFallback}
            setError={setError}
            installationFallbackId={installationFallbackId}
            installationFallbackUrl={installationFallbackUrl}
            setInstallationFallbackId={setInstallationFallbackId}
            setInstallationFallbackUrl={setInstallationFallbackUrl}
            setShowDownloadModal={setShowDownloadModal}
          />
          <div style={{ marginTop: 48, display: 'flex', justifyContent: 'flex-end', width: '100%', maxWidth: 520 }}>
            <button
              type="button"
              className="CwAdminLogin-session-btn"
              onClick={() => {
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
            hostedEnabled ? (
              <div className="CwAdminLogin-hosted-signup-redirect">
                <p>Registrering håndteres av vår sikre Cognito-side.</p>
                <button
                  type="button"
                  className="CwAdminLogin-primary-btn"
                  onClick={() => { const u = buildAuthUrl('signup'); if (u) window.location.href = u; }}
                >Fortsett til Opprett konto</button>
                <button
                  type="button"
                  className="CwAdminLogin-link-btn"
                  onClick={() => { setStep('login'); setError(null); setInfo(null); }}
                >Tilbake</button>
              </div>
            ) : (
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
                backToLogin={() => { setStep('login'); setError(null); setInfo(null); }}
                error={error}
                info={info}
              />
            )
          ) : (
            <PasswordForm
              userName={userData?.Username}
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
          {hostedEnabled && step === 'login' && !tokens && (
            <div className="CwAdminLogin-hosted-extra">
              <button type="button" className="CwAdminLogin-primary-btn" onClick={() => { const u = buildAuthUrl('login'); if (u) window.location.href = u; }}>Logg inn via Cognito</button>
              <button type="button" className="CwAdminLogin-link-btn" onClick={() => { const u = buildAuthUrl('signup'); if (u) window.location.href = u; }}>Opprett konto</button>
            </div>
          )}
        </>
      )}
    </div>
    {showDownloadModal && (
      <div className="dl-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="installer-modal-title" onClick={() => setShowDownloadModal(false)}>
        <div
          className="dl-modal"
          onClick={e => e.stopPropagation()}
          tabIndex={-1}
        >
          <button
            type="button"
            className="dl-modal-close"
            aria-label="Lukk"
            onClick={() => setShowDownloadModal(false)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <h3 id="installer-modal-title">Installasjonsinstruksjoner</h3>
          <p>Hvis protokollen ikke åpner applikasjonen, installer eller oppdater CalWin-klienten ved å følge trinnene:</p>
          <ol>
            <li>Klikk «Last ned .appinstaller» på kortet.</li>
            <li>Åpne filen du lastet ned (App Installer starter).</li>
            <li>Klikk Install / Oppdater og vent til ferdig.</li>
            <li>Gå tilbake hit og klikk applikasjonen igjen.</li>
          </ol>
          <p style={{ marginTop: 18, color: '#39566c' }}>Tips: Hvis ingenting skjer etter installasjon, prøv å lukke alle CalWin-vinduer og start på nytt.</p>
          <div className="dl-modal-actions">
            <Button text="Lukk" type="normal" onClick={() => setShowDownloadModal(false)} />
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default CwAdminLogin;
