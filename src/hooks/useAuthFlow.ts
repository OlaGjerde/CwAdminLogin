import { useState, useCallback } from 'react';
import { verifyEmail, signUp, login as apiLogin, respondToMfa, extractTokens, type VerifyEmailResult, type CognitoLikeResponse } from '../api/auth';
// getCognitoSignupUrl no longer used for automatic redirects; user now explicitly clicks signup link in UI

export type AuthStep = 'login' | 'password' | 'mfa' | 'signup';

export interface UserData {
  Username?: string;
  Email?: string;
  PreferredLoginType?: number;
  CalWinAppTypes?: number[];
}

export interface TokensEncoded {
  accessToken: string; // base64 encoded
  refreshToken: string; // base64 encoded
}

export function useAuthFlow() {
  const [step, setStep] = useState<AuthStep>('login');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [tokens, setTokens] = useState<TokensEncoded | null>(null);
  const [mfaSession, setMfaSession] = useState<string | null>(null);
  const [mfaChallengeName, setMfaChallengeName] = useState<string>('SMS_MFA');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const resetMessages = useCallback(() => { setError(null); setInfo(null); }, []);

  const handleVerifyEmail = useCallback(async (email: string) => {
    resetMessages();
    if (!email) { setError('E-post er påkrevd.'); return; }
    const response = await verifyEmail(email);

    // 404: Bruker finnes ikke – instruer bruker til å klikke opprett-konto lenken
    if (response.status === 404) {
      setUserData(null);
      setError('Bruker finnes ikke.');
      return;
    }

    const data = response.data as VerifyEmailResult;
    const userStatus = data.UserStatus?.toUpperCase();

    // UNCONFIRMED / UNKNOWN: fortell bruker hva som skjer uten redirect
    if (userStatus === 'UNCONFIRMED') {
      setUserData({
        Username: data.Username,
        Email: email,
        PreferredLoginType: data.PreferredLoginType,
        CalWinAppTypes: data.CalWinAppTypes
      });
      // Do NOT suggest creating a new account here; simply instruct the user to confirm existing one
      setInfo('Kontoen er opprettet men ikke bekreftet. Sjekk e-post (inkl. spam) for bekreftelse eller be administrator om å aktivere kontoen.');
      return;
    }
    if (userStatus === 'UNKNOWN') {
      setUserData(null);
      setError('Fant ikke konto. Bruk lenken for å opprette en ny.');
      return;
    }

    // Hvis vi har tilstrekkelig brukerdata, gå til passordsteg
    if (data && (data.Username || data.Email || typeof data.PreferredLoginType !== 'undefined')) {
      setUserData({
        Username: data.Username,
        Email: email,
        PreferredLoginType: data.PreferredLoginType,
        CalWinAppTypes: data.CalWinAppTypes
      });
      setStep('password');
      return;
    }

    // Fallback: ingen gyldig bruker
    setUserData(null);
    setError('Kunne ikke verifisere bruker. Opprett ny konto via lenken.');
  }, [resetMessages]);

  const handleSignUp = useCallback(async (email: string, password: string, confirm: string) => {
    resetMessages();
    if (!email) { setError('E-post er påkrevd.'); return; }
    if (password.length < 8) { setError('Passord må være minst 8 tegn.'); return; }
    if (password !== confirm) { setError('Passordene stemmer ikke.'); return; }
    await signUp(email, password);
    setInfo('Registrering startet. Sjekk e-posten din for en bekreftelseskode.');
  }, [resetMessages]);

  const handleLogin = useCallback(async (emailOrUser: string, password: string) => {
    resetMessages();
    const resp = await apiLogin(emailOrUser, password);
    const data = resp.data as CognitoLikeResponse;
    if (data.ChallengeRequired) {
      setMfaSession(data.Session || null);
      setMfaChallengeName(data.ChallengeName || 'SMS_MFA');
      setStep('mfa');
      return null;
    }
    const tokensExtracted = extractTokens(data);
    if (tokensExtracted) {
      const enc = { accessToken: btoa(tokensExtracted.accessToken), refreshToken: btoa(tokensExtracted.refreshToken) };
      setTokens(enc);
      setStep('login');
      return enc;
    }
    if (data && data.Cognito && data.Cognito.ChallengeName) {
      setMfaSession(data.Cognito.Session || null);
      setMfaChallengeName(data.Cognito.ChallengeName || 'SMS_MFA');
      setStep('mfa');
      return null;
    }
  const msg = (data as unknown as { message?: string }).message;
  setError(msg || 'Login feilet.');
    return null;
  }, [resetMessages]);

  const handleMfa = useCallback(async (username: string, code: string) => {
    resetMessages();
    const resp = await respondToMfa({ username, mfaCode: code, session: mfaSession, challengeName: mfaChallengeName });
    const data = resp.data as CognitoLikeResponse;
    const tokenPair = extractTokens(data);
    if (tokenPair) {
      setTokens({ accessToken: btoa(tokenPair.accessToken), refreshToken: btoa(tokenPair.refreshToken) });
      setStep('login');
      return true;
    }
  const msg = (data as unknown as { message?: string }).message;
  setError(msg || 'MFA feilet.');
    return false;
  }, [resetMessages, mfaSession, mfaChallengeName]);

  const logout = useCallback(() => {
    setTokens(null);
    setUserData(null);
    setStep('login');
    setMfaSession(null);
    setError(null);
    setInfo(null);
  }, []);

  const setRawTokens = useCallback((accessToken: string, refreshToken: string) => {
    setTokens({ accessToken: btoa(accessToken), refreshToken: btoa(refreshToken) });
  }, []);

  return {
    step,
    setStep,
    userData,
    setUserData,
    tokens,
    setTokens,
    mfaSession,
    mfaChallengeName,
    error,
    info,
    setError,
    setInfo,
    handleVerifyEmail,
    handleSignUp,
    handleLogin,
    handleMfa
    ,logout
    ,setRawTokens
  };
}
