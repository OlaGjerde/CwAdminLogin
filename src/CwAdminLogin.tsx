import { useState } from 'react';
import React from 'react';
import axios from 'axios';
import { CW_AUTH_ENDPOINT, APPINSTALLER_URLS, PROTOCOL_CALWIN, PROTOCOL_CALWIN_TEST, PROTOCOL_CALWIN_DEV } from './config';
import './CwAdminLogin.css';
import { TextBox } from 'devextreme-react/text-box';
import { Button } from 'devextreme-react/button';

interface UserData {
  Username?: string;
  Email?: string;
  PreferredLoginType?: number;
  CalWinAppTypes?: number[];
  // Add other fields as needed based on your API response
}

const CwAdminLogin = () => {
  const [step, setStep] = useState<'login' | 'password' | 'mfa' | 'signup'>('login');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSession, setMfaSession] = useState<string | null>(null);
  const [mfaChallengeName, setMfaChallengeName] = useState<string>('SMS_MFA');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // Removed unused preferredLoginType state
  const [userData, setUserData] = useState<UserData | null>(null);
  const [tokens, setTokens] = useState<{ accessToken: string; refreshToken: string } | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchMessage, setLaunchMessage] = useState<string | null>(null);
  const [downloadAvailableUrl, setDownloadAvailableUrl] = useState<string | null>(null);
  const [downloadAvailableType, setDownloadAvailableType] = useState<number | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const fallbackRefs = React.useRef<Record<number, HTMLDivElement | null>>({});

  // When a per-card fallback is shown, scroll it into view and add a quick entrance animation.
  React.useEffect(() => {
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

  // API check function
  const handleNext = async () => {
    setError(null);
    setInfo(null);
    try {
      // Get user info from API; treat 404 as a handled response (not an exception)
      const response = await axios.get(
        `${CW_AUTH_ENDPOINT}/VerifyEmail?email=${encodeURIComponent(login)}`,
        { validateStatus: (status) => status < 500 }
      );
      console.log('API response:', response.data);
      // If user not found (404), present signup flow
      if (response.status === 404) {
        setUserData(null);
        setInfo('Fant ingen bruker med denne e-posten. Opprett en konto nedenfor.');
        setStep('signup');
        return;
      }

      const rawStatus: string | undefined = (response.data && (response.data.UserStatus || response.data.userStatus)) as string | undefined;
      const userStatus = rawStatus ? String(rawStatus).toUpperCase() : undefined;
      // Map numeric PreferredLoginType to string
      const loginTypeMap = {
        0: 'Password',
        1: 'Azure',
        2: 'AWS Cognito'
      };

      const typeValue: number = response.data.PreferredLoginType;
      const typeString = loginTypeMap[typeValue as keyof typeof loginTypeMap] || String(typeValue);
      // If user is UNCONFIRMED/UNKNOWN, direct them to sign up
      if (userStatus === 'UNCONFIRMED' || userStatus === 'UNKNOWN') {
        setUserData({
          Username: response.data.Username,
          Email: login,
          PreferredLoginType: response.data.PreferredLoginType,
          CalWinAppTypes: response.data.CalWinAppTypes
        });
        setInfo('Brukeren er ikke bekreftet. Fullfør registreringen nedenfor.');
        setStep('signup');
        return;
      }

      if (response.data && typeString) {  
        setLogin(login);
        setUserData({
          Username: response.data.Username,
          Email: login,
          PreferredLoginType: response.data.PreferredLoginType,
          CalWinAppTypes: response.data.CalWinAppTypes
        });
        setStep('password');
      } else {
        setError('Login not found or missing preferredLoginType.');
        setUserData(null);
      }
    } catch {
      // Network/5xx or unexpected
      setError('Login not found.');
      setUserData(null);
    }
  };

  // Minimal sign-up handler. Assumes backend endpoint /SignUp accepts { email, password } or { username, password }.
  const handleSignUp = async () => {
    setError(null);
    setInfo(null);
    try {
      if (!login) {
        setError('E-post er påkrevd.');
        return;
      }
      if (!password || password.length < 8) {
        setError('Passord må være minst 8 tegn.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passordene stemmer ikke.');
        return;
      }

      const payload = { email: login, username: login, password };
      const resp = await axios.post(`${CW_AUTH_ENDPOINT}/SignUp`, payload);
      console.log('SignUp response:', resp.data);
      setInfo('Registrering startet. Sjekk e-posten din for en bekreftelseskode.');
      // Optionally navigate back to login after a short delay
      // setStep('login');
    } catch (e) {
      if (axios.isAxiosError(e) && e.response && e.response.data && (e.response.data.message || e.response.data.error)) {
        setError(e.response.data.message || e.response.data.error);
      } else {
        setError('Registrering feilet.');
      }
    }
  };

  const handleLogin = async () => {
    setError(null);
    console.log('Attempting login for:', login);
    try {
      const usernameToUse = userData?.Email || login;
      const payload = {
        username: usernameToUse,
        password
      };
      console.log('Login payload:', payload);
      const response = await axios.post(`${CW_AUTH_ENDPOINT}/LoginUser`, payload);
      console.log('Login response:', response.data);
      if (response.data && response.data.ChallengeRequired) {
        setMfaSession(response.data.Session);
        setMfaChallengeName(response.data.ChallengeName || 'SMS_MFA');
        setStep('mfa');
        return;
      }
      // Legacy: Cognito object nested in response
      if (response.data && response.data.Cognito && !response.data.Cognito.ChallengeName) {
        setError(null);
        const accessToken = response.data.Cognito.AccessToken;
        const refreshToken = response.data.Cognito.RefreshToken;
        setTokens({
          accessToken: btoa(accessToken),
          refreshToken: btoa(refreshToken)
        });
        setStep('login'); // or show app links

      } else if (response.data && response.data.Cognito && response.data.Cognito.ChallengeName) {
        // MFA required (legacy Cognito challenge)
        setMfaSession(response.data.Cognito.Session);
        setMfaChallengeName(response.data.Cognito.ChallengeName || 'SMS_MFA');
        setStep('mfa');
        return;
      }

      // Newer/alternate backend: tokens returned at top-level (AccessToken / RefreshToken)
      if (response.data && (response.data.AccessToken || response.data.accessToken) && (response.data.RefreshToken || response.data.refreshToken)) {
        setError(null);
        const accessTokenRaw = response.data.AccessToken || response.data.accessToken;
        const refreshTokenRaw = response.data.RefreshToken || response.data.refreshToken;
        // try to extract a uid (sub or username) from the JWT access token
        setTokens({
          accessToken: btoa(accessTokenRaw),
          refreshToken: btoa(refreshTokenRaw)
        });
        setStep('login');
        return;
      } else {
        setError(response.data && response.data.message ? response.data.message : 'Login failed.');
      }
    } catch (err) {
      // Try to get error message from response, fallback to generic
      if (axios.isAxiosError(err) && err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Login failed.');
      }
    }
  };

  // Handle MFA code submit
  const handleMfaSubmit = async () => {
    setError(null);
    try {
      const usernameToUse = userData?.Username || login;
      const payload = {
        username: usernameToUse,
        mfaCode,
        session: mfaSession,
        challengeName: mfaChallengeName
      };
  const response = await axios.post(`${CW_AUTH_ENDPOINT}/RespondToMfa`, payload);
      console.log("Respond to MFA:", response.data);

        if (response.data.Cognito && response.data.Cognito.AccessToken && response.data.Cognito.RefreshToken && response.data.Cognito.uid) {
          setError(null);
          const accessToken = response.data.Cognito.AccessToken;
          const refreshToken = response.data.Cognito.RefreshToken;
          setTokens({
            accessToken: btoa(accessToken),
            refreshToken: btoa(refreshToken)
          });
          setStep('login'); // or show app links
        } else {
          setError(response.data && response.data.message ? response.data.message : 'MFA failed.');
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('MFA failed.');
      }
    }
  };

  // Render custom protocol links after successful login
  const appTypeMap = {
    0: 'CalWin Prod',
    1: 'CalWin Test',
    2: 'CalWin Dev'
  };

  // Attempt to open a URI and detect whether the browser successfully launched an external app.
  // Uses visibility / blur heuristics with a timeout; not 100% reliable but common pattern.
  const tryLaunchUri = (uri: string, timeout = 1500): Promise<boolean> => {
    return new Promise((resolve) => {
      let handled = false;

      const onVisibilityChange = () => {
        if (document.hidden) {
          handled = true;
        }
      };

      const onBlur = () => {
        handled = true;
      };

      document.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('blur', onBlur);

      // Try to open via iframe (older technique) and location as fallback
      try {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        iframe.src = uri;
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch (removeErr) {
            // non-fatal
            console.warn('remove iframe failed', removeErr);
          }
        }, timeout + 100);
      } catch (createErr) {
        // if iframe creation fails, fallback to location change
        console.warn('iframe create failed, falling back to location.href', createErr);
        try {
          window.location.href = uri;
        } catch (locErr) {
          console.warn('location.href fallback failed', locErr);
        }
      }

      // After timeout decide
      setTimeout(() => {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('blur', onBlur);
        resolve(handled);
      }, timeout);
    });
  };

  // Launch sequence: try app protocol, then ms-appinstaller, then direct download URL
  const launchAppWithFallback = async (appUri: string, downloadUrl: string, type?: number) => {
    setLaunching(true);
    setLaunchMessage('Opening application...');
    try {
      const opened = await tryLaunchUri(appUri);
      if (opened) {
        setLaunchMessage('Application opened.');
        setTimeout(() => { setLaunching(false); setLaunchMessage(null); }, 1200);
        return;
      }

      // If custom protocol didn't open, do NOT attempt ms-appinstaller protocol.
      // Instead present the .appinstaller file for manual download and show instructions.
  setLaunchMessage('Application not installed. You can download the installer below.');
  setDownloadAvailableUrl(downloadUrl);
  setDownloadAvailableType(typeof type === 'number' ? type : null);
      setLaunching(false);
      return;
    } catch (err) {
      console.warn('launchAppWithFallback error', err);
      setLaunchMessage('Failed to open application. You can download the installer below.');
      setDownloadAvailableUrl(downloadUrl);
      setDownloadAvailableType(typeof type === 'number' ? type : null);
      setLaunching(false);
    } finally {
      // Clear transient launch message only if no download fallback is shown
      if (!downloadAvailableUrl) {
        setTimeout(() => { setLaunching(false); setLaunchMessage(null); }, 2000);
      }
    }
  };

  // Demo helper: populate userData with sample app types so apps can be shown for testing/demo
  const showDemoApps = () => {
    // If no tokens exist, create harmless demo tokens so the UI can render.
    if (!tokens) {
      setTokens({ accessToken: btoa('demo-access-token'), refreshToken: btoa('demo-refresh-token') });
    }
    setUserData({
      Username: 'demo.user',
      Email: 'demo@example.com',
      PreferredLoginType: 0,
      CalWinAppTypes: [0, 1, 2]
    });
    // stay on the same step; once tokens & userData are present the app list will render
  };
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
          />
          <div className="CwAdminLogin-login-button">
            <Button
              text="Verifiser"
              type="success"
              onClick={handleMfaSubmit}
            />
          </div>
          {error && <div className="CwAdminLogin-login-error">{error}</div>}
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
                launchAppWithFallback(appProtocolUrl, directDownloadUrl, type);
              };

              return (
                <div key={type} className="CwAdminLogin-app-item">
                  <button
                    className="CwAdminLogin-app-card"
                    onClick={onClick}
                    disabled={launching}
                    aria-label={`Open ${appName}`}
                  >
                    <div className="CwAdminLogin-app-card-icon">CW</div>
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
          
        </div>
      ) : (
        <>
          {step === 'login' ? (
            <>
              <div className="CwAdminLogin-login-title">Velkommen</div>
              <div className="CwAdminLogin-login-subtitle">Vennligst skriv inn epost for å fortsette</div>
              <TextBox
                value={login}
                onValueChanged={e => setLogin(e.value)}
                placeholder="E-post"
                className="CwAdminLogin-login-input"
              />
              <div className="CwAdminLogin-login-button">
                <Button
                  text="Neste"
                  type="default"
                  onClick={handleNext}
                />
              </div>
              <div style={{ marginTop: 8 }}>
                <Button text="Vis demoapper" type="normal" onClick={showDemoApps} />
              </div>
              {error && <div className="CwAdminLogin-login-error">{error}</div>}
              {info && <div className="CwAdminLogin-login-info">{info}</div>}
            </>
          ) : step === 'signup' ? (
            <>
              <div className="CwAdminLogin-login-title">Opprett konto</div>
              <div className="CwAdminLogin-login-subtitle">Registrer deg for e-posten {login}</div>
              <TextBox
                value={login}
                onValueChanged={e => setLogin(e.value)}
                placeholder="E-post"
                className="CwAdminLogin-login-input"
              />
              <TextBox
                value={password}
                mode="password"
                onValueChanged={e => setPassword(e.value)}
                placeholder={'Passord'}
                className="CwAdminLogin-login-input"
              />
              <TextBox
                value={confirmPassword}
                mode="password"
                onValueChanged={e => setConfirmPassword(e.value)}
                placeholder={'Bekreft passord'}
                className="CwAdminLogin-login-input"
              />
              <div className="CwAdminLogin-login-button" style={{ display: 'flex', gap: 8 }}>
                <Button
                  text="Opprett konto"
                  type="success"
                  onClick={handleSignUp}
                />
                <Button
                  text="Tilbake"
                  type="normal"
                  onClick={() => { setStep('login'); setError(null); setInfo(null); }}
                />
              </div>
              {error && <div className="CwAdminLogin-login-error">{error}</div>}
              {info && <div className="CwAdminLogin-login-info">{info}</div>}
            </>
          ) : (
            <>
              <div className="CwAdminLogin-login-title">Hei {userData?.Username}</div>
              <div className="CwAdminLogin-login-subtitle">Vennligst skriv inn passordet ditt for å fortsette</div>
              <TextBox
                value={password}
                mode="password"
                onValueChanged={e => setPassword(e.value)}
                placeholder={'Password'}
                className="CwAdminLogin-login-input"
              />
              <div className="CwAdminLogin-login-button">
                <Button
                  text="Login"
                  type="success"
                  onClick={handleLogin}
                />
              </div>
              <div style={{ marginTop: 8 }}>
                <Button text="Show demo apps" type="normal" onClick={showDemoApps} />
              </div>
              {error && <div className="CwAdminLogin-login-error">{error}</div>}
              {info && <div className="CwAdminLogin-login-info">{info}</div>}
            </>
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
