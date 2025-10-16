import axios from 'axios';
import { CW_AUTH_ENDPOINT, INSTALLATIONS_ENDPOINT } from '../config';

/**
 * Backend API functions for authenticated operations
 * Note: Authentication is now handled by AWS Cognito Hosted UI.
 * These functions are for backend operations that require an access token.
 */

/**
 * Fetch user's installations from backend
 */
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
