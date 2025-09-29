import { useState } from 'react';
import { verifyEmail, signUp, login as apiLogin, respondToMfa, extractTokens, type VerifyEmailResult, type CognitoLikeResponse } from '../api/auth';

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

  const resetMessages = () => { setError(null); setInfo(null); };

  const handleVerifyEmail = async (email: string) => {
    resetMessages();
    const response = await verifyEmail(email);
    if (response.status === 404) {
      setUserData(null);
      setInfo('Fant ingen bruker med denne e-posten. Opprett en konto nedenfor.');
      setStep('signup');
      return;
    }
    const data = response.data as VerifyEmailResult;
    const userStatus = data.UserStatus?.toUpperCase();

    if (userStatus === 'UNCONFIRMED' || userStatus === 'UNKNOWN') {
      setUserData({
        Username: data.Username,
        Email: email,
        PreferredLoginType: data.PreferredLoginType,
        CalWinAppTypes: data.CalWinAppTypes
      });
      setInfo('Brukeren er ikke bekreftet. Fullfør registreringen nedenfor.');
      setStep('signup');
      return;
    }

    // PreferredLoginType is optional for now; proceed if we got a user record at all
    if (data && (data.Username || data.Email || typeof data.PreferredLoginType !== 'undefined')) {
      setUserData({
        Username: data.Username,
        Email: email,
        PreferredLoginType: data.PreferredLoginType, // may be undefined
        CalWinAppTypes: data.CalWinAppTypes
      });
      setStep('password');
      return;
    }
    setError('Login ikke funnet.');
    setUserData(null);
  };

  const handleSignUp = async (email: string, password: string, confirm: string) => {
    resetMessages();
    if (!email) { setError('E-post er påkrevd.'); return; }
    if (password.length < 8) { setError('Passord må være minst 8 tegn.'); return; }
    if (password !== confirm) { setError('Passordene stemmer ikke.'); return; }
    await signUp(email, password);
    setInfo('Registrering startet. Sjekk e-posten din for en bekreftelseskode.');
  };

  const handleLogin = async (emailOrUser: string, password: string) => {
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
  };

  const handleMfa = async (username: string, code: string) => {
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
  };

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
  };
}
