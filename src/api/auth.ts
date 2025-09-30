import axios from 'axios';
import { CW_AUTH_ENDPOINT, INSTALLATIONS_ENDPOINT } from '../config';

export interface VerifyEmailResult {
  Username?: string;
  Email?: string;
  PreferredLoginType?: number;
  CalWinAppTypes?: number[];
  UserStatus?: string;
}

export interface LoginResponseTokens {
  accessToken: string;
  refreshToken: string;
}

export interface CognitoLikeResponse {
  Cognito?: {
    AccessToken?: string;
    RefreshToken?: string;
    ChallengeName?: string;
    Session?: string;
    uid?: string;
  };
  ChallengeRequired?: boolean;
  Session?: string;
  ChallengeName?: string;
  AccessToken?: string;
  RefreshToken?: string;
  accessToken?: string;
  refreshToken?: string;
  message?: string;
  [k: string]: unknown;
}

export async function verifyEmail(email: string) {
  const resp = await axios.get<VerifyEmailResult>(`${CW_AUTH_ENDPOINT}/auth/VerifyEmail`, {
    params: { email },
    validateStatus: s => s < 500
  });
  return resp;
}

export async function signUp(email: string, password: string) {
  return axios.post(`${CW_AUTH_ENDPOINT}/SignUp`, { email, username: email, password });
}

export async function login(username: string, password: string) {
  return axios.post<CognitoLikeResponse>(`${CW_AUTH_ENDPOINT}/auth/LoginUser`, { username, password });
}

export async function respondToMfa(payload: { username: string; mfaCode: string; session: string | null; challengeName: string }) {
  return axios.post(`${CW_AUTH_ENDPOINT}/auth/RespondToMfa`, payload);
}

export async function fetchInstallations(rawAccessToken: string) {
  return axios.get(INSTALLATIONS_ENDPOINT, {
    headers: { Authorization: `Bearer ${rawAccessToken}` },
    validateStatus: s => s < 500
  });
}

export async function createOneTimeToken(rawAccessToken: string, installationId: string) {
  return axios.post(`${CW_AUTH_ENDPOINT}/desktop/CreateOneTimeToken`, null, {
    params: { installationId },
    headers: { Authorization: `Bearer ${rawAccessToken}` },
    validateStatus: s => s < 500
  });
}

export function extractTokens(data: CognitoLikeResponse): LoginResponseTokens | null {
  // Legacy nested
  if (data.Cognito && data.Cognito.AccessToken && data.Cognito.RefreshToken && !data.Cognito.ChallengeName) {
    return { accessToken: data.Cognito.AccessToken, refreshToken: data.Cognito.RefreshToken };
  }
  // Top level
  const at = data.AccessToken || data.accessToken;
  const rt = data.RefreshToken || data.refreshToken;
  if (at && rt) return { accessToken: at, refreshToken: rt };
  return null;
}

/**
 * Refresh access/refresh token pair using a refresh token.
 * Backend expects the refresh token as a query string (NOT request body).
 * Endpoint: /api/auth/GetNewRefreshTokenFromCognito?refreshToken=...
 */
export async function refreshTokens(refreshToken: string) {
  // Backend expects POST on this endpoint, with refreshToken passed as query string (no JSON body required)
  return axios.post<CognitoLikeResponse>(`${CW_AUTH_ENDPOINT}/auth/GetNewRefreshTokenFromCognito`, null, {
    params: { refreshToken },
    validateStatus: s => s < 500
  });
}
