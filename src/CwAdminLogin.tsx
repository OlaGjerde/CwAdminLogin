import { useState } from 'react';
import React from 'react';
import axios from 'axios';
import { CW_AUTH_ENDPOINT, APPINSTALLER_URLS, PROTOCOL_CALWIN, PROTOCOL_CALWIN_TEST, PROTOCOL_CALWIN_DEV, INSTALLATIONS_ENDPOINT } from './config';
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
  // Authorized installations (links fetched after login)
  const [authorizedInstallations, setAuthorizedInstallations] = useState<NormalizedInstallation[] | null>(null);
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
        `${CW_AUTH_ENDPOINT}/auth/VerifyEmail?email=${encodeURIComponent(login)}`,
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
      const response = await axios.post(`${CW_AUTH_ENDPOINT}/auth/LoginUser`, payload);
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
        // Fetch authorized installations (async, fire and forget)
        fetchAuthorizedInstallations(accessToken).catch(err => console.warn('fetchAuthorizedInstallations failed', err));
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
        fetchAuthorizedInstallations(accessTokenRaw).catch(err => console.warn('fetchAuthorizedInstallations failed', err));
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
  const response = await axios.post(`${CW_AUTH_ENDPOINT}/auth/RespondToMfa`, payload);
      console.log("Respond to MFA:", response.data);

        if (response.data.Cognito && response.data.Cognito.AccessToken && response.data.Cognito.RefreshToken && response.data.Cognito.uid) {
          setError(null);
          const accessToken = response.data.Cognito.AccessToken;
          const refreshToken = response.data.Cognito.RefreshToken;
          setTokens({
            accessToken: btoa(accessToken),
            refreshToken: btoa(refreshToken)
          });
          fetchAuthorizedInstallations(accessToken).catch(err => console.warn('fetchAuthorizedInstallations failed', err));
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


  // Fetch authorized installations using raw (un-Base64) token
  interface InstallationItem { AppType?: number; Type?: number; DisplayName?: string; Name?: string; Title?: string; LaunchUrl?: string; Url?: string; Link?: string; InstallerUrl?: string; AppInstallerUrl?: string; ProtocolUrl?: string; Id?: string | number; InstallationId?: string | number; [k: string]: unknown }
  interface NormalizedInstallation { id: string; name: string; link: string; hasRealLink: boolean; raw: InstallationItem | string; oneTimeToken?: string }
  const fetchAuthorizedInstallations = async (rawAccessToken: string) => {
    try {
      const resp = await axios.get(INSTALLATIONS_ENDPOINT, {
        headers: {
          Authorization: `Bearer ${rawAccessToken}`
        },
        validateStatus: s => s < 500
      });
      if (resp.status === 401) {
        console.warn('Unauthorized fetching installations');
        return;
      }
      const data = resp.data;
      if (!Array.isArray(data)) {
        console.warn('Unexpected installations response shape', data);
        return;
      }
      console.log('Authorized installations:', data);
      console.log('Raw access token:', rawAccessToken);

      // Utility: extract a one-time token from various possible response shapes
      const extractOneTimeToken = (respData: unknown): string | undefined => {
        if (!respData) return undefined;
        if (typeof respData === 'string') return respData; // backend might return plain token
        if (typeof respData === 'object') {
          const r = respData as Record<string, unknown>;
          return (
            (typeof r.oneTimeToken === 'string' && r.oneTimeToken) ||
            (typeof r.OneTimeToken === 'string' && r.OneTimeToken) ||
            (typeof r.token === 'string' && r.token) ||
            (typeof r.Token === 'string' && r.Token) ||
            (typeof r.linkToken === 'string' && r.linkToken) ||
            (typeof r.LinkToken === 'string' && r.LinkToken) ||
            undefined
          );
        }
        return undefined;
      };

      // Collect one-time tokens for each installation id
      const oneTimeTokenMap: Record<string, string> = {};
      for (const item of data) {
        const instId = typeof item === 'string'
          ? item
          : (item.Id !== undefined
            ? String(item.Id)
            : (item.InstallationId !== undefined ? String(item.InstallationId) : null));
        if (!instId) continue;
        try {
          const tokenResp = await axios.post(
            `${CW_AUTH_ENDPOINT}/desktop/CreateOneTimeToken?installationId=${encodeURIComponent(instId)}`,
            null,
            {
              headers: { Authorization: `Bearer ${rawAccessToken}` },
              validateStatus: s => s < 500
            }
          );
            if (tokenResp.status === 200) {
              const ot = extractOneTimeToken(tokenResp.data);
              if (ot) {
                oneTimeTokenMap[instId] = ot;
                console.log('Created one-time token for installation:', instId);
              } else {
                console.warn('Token response missing expected token field for installation', instId, tokenResp.data);
              }
            } else {
              console.warn('Failed to create one-time token:', tokenResp.status, tokenResp.data);
            }
        } catch (err) {
          console.error('Error creating one-time token:', err);
        }
      }

      // (appendQueryParam removed: token links are now fully constructed via buildTokenLink)
  // buildTokenLink removed: now constructing custom protocol URLs directly

      const normalized: NormalizedInstallation[] = data.map((item: InstallationItem | string, idx: number) => {
        // Helper to choose protocol from (App)Type
        const chooseProtocol = (appType?: number) => {
          switch (appType) {
            case 0: return PROTOCOL_CALWIN;
            case 1: return PROTOCOL_CALWIN_TEST;
            case 2: return PROTOCOL_CALWIN_DEV;
            default: return PROTOCOL_CALWIN_DEV;
          }
        };

        if (typeof item === 'string') {
          const instId = item;
          const ot = oneTimeTokenMap[instId];
          // Build a custom protocol link if token present; else fall back to original string (may be URL)
          const protocol = chooseProtocol(undefined);
          const linkWithToken = ot
            ? `${protocol}?oneTimeToken=${encodeURIComponent(ot)}&installationId=${encodeURIComponent(instId)}`
            : instId;
          return {
            id: String(idx),
            name: extractNameFromUrl(instId) || `Installation ${idx + 1}`,
            link: linkWithToken,
            hasRealLink: !!ot || /^\w+:\/\//.test(instId), // true if token (custom protocol) or looks like URL
            raw: item,
            oneTimeToken: ot
          };
        }
        const linkCandidate = item.LaunchUrl || item.Url || item.Link || item.ProtocolUrl || item.InstallerUrl || item.AppInstallerUrl;
        const id = item.Id !== undefined ? String(item.Id) : (item.InstallationId !== undefined ? String(item.InstallationId) : `${idx}`);
        const name = item.DisplayName || item.Name || item.Title || (linkCandidate && extractNameFromUrl(linkCandidate)) || `Installation ${idx + 1}`;
        let hasRealLink = !!linkCandidate;
        let link = linkCandidate || `#installation-${id}`; // placeholder until token resolves
        const ot = oneTimeTokenMap[id];
        if (ot) {
          const appType = typeof item.AppType === 'number' ? item.AppType : (typeof item.Type === 'number' ? item.Type : undefined);
          const protocol = chooseProtocol(appType);
          // Build proper custom protocol URL with query parameters so the desktop app can parse them.
          link = `${protocol}${encodeURIComponent(ot)}`;
          hasRealLink = true; // token-based protocol link is valid
        }
        return { id, name, link, hasRealLink, raw: item, oneTimeToken: ot };
      });
      setAuthorizedInstallations(normalized);
      // If installation objects carry an AppType, still merge numeric types for legacy app grid
      const appTypes = data
        .map(i => (typeof i === 'object' && i && typeof (i as InstallationItem).AppType === 'number') ? (i as InstallationItem).AppType : undefined)
        .filter((v): v is number => typeof v === 'number');
      if (appTypes.length) {
        setUserData(prev => {
          if (!prev) return prev;
          const merged = new Set([...(prev.CalWinAppTypes || []), ...appTypes]);
          return { ...prev, CalWinAppTypes: Array.from(merged).sort() };
        });
      }
    } catch (e) {
      console.warn('Error fetching installations', e);
    }
  };

  // Helper to derive a readable name from a URL
  const extractNameFromUrl = (url?: string): string | undefined => {
    if (!url) return undefined;
    try {
      const u = new URL(url);
      const last = u.pathname.split('/').filter(Boolean).pop();
      return last || u.host;
    } catch {
      return undefined;
    }
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
          {authorizedInstallations && authorizedInstallations.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <div className="CwAdminLogin-login-subtitle" style={{ marginBottom: 8 }}>Tilgjengelige installasjoner</div>
              <ul className="CwAdminLogin-installation-list" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                {authorizedInstallations.map(inst => {
                  const isProtocol = /^calwin(dev|test)?/i.test(inst.link);
                  const disabled = !inst.hasRealLink;
                  const handleClick = (e: React.MouseEvent) => {
                    if (disabled) {
                      e.preventDefault();
                      return;
                    }
                    e.preventDefault();
                    try {
                      if (isProtocol) {
                        window.location.href = inst.link;
                      } else if (/^https?:\/\//i.test(inst.link)) {
                        window.open(inst.link, '_blank', 'noopener');
                      }
                    } catch (err) {
                      console.warn('Installation launch failed', err);
                    }
                  };
                  const iconText = (inst.name && inst.name.replace(/[^A-Za-z0-9]/g,'').slice(0,2).toUpperCase()) || 'IN';
                  return (
                    <li key={inst.id} style={{ width: '100%', maxWidth: 520 }}>
                      <button
                        className="CwAdminLogin-app-card"
                        style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                        onClick={handleClick}
                        disabled={disabled}
                        aria-label={disabled ? `Ingen link for ${inst.name}` : `Åpne ${inst.name}`}
                      >
                        <div className="CwAdminLogin-app-card-icon">{iconText}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="CwAdminLogin-app-card-title" style={{ fontWeight: 600 }}>{inst.name}</div>
                          {disabled && (
                            <div style={{ fontSize: 12, opacity: 0.55 }}>
                              Ingen link tilgjengelig (InstallationId: {inst.id})
                            </div>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          
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
              {/* Demo apps button removed */}
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
              {/* Demo apps button removed */}
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
