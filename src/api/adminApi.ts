/**
 * Admin Service API Client
 * Handles all administrative API calls
 */

import { adminClient } from './axiosConfig';
import { ADMIN_API } from '../config';
import type { InstallationItem } from '../types/installations';

interface OneTimeTokenResponse {
  oneTimeToken?: string;
  OneTimeToken?: string;
  token?: string;
  Token?: string;
  linkToken?: string;
  LinkToken?: string;
}

/**
 * Get authorized installations for the current user
 */
export async function getAuthorizedInstallations(): Promise<InstallationItem[]> {
  const response = await adminClient.get<InstallationItem[]>(ADMIN_API.INSTALLATIONS);
  return response.data;
}

/**
 * Generate a one-time token for launching an installation
 */
export async function createOneTimeToken(installationId: string): Promise<string> {
  const response = await adminClient.post<OneTimeTokenResponse | string>(
    `${ADMIN_API.BASE}${ADMIN_API.CREATE_ONE_TIME_TOKEN}`,
    null,
    { params: { installationId } }
  );
  const data = response.data;
  
  // Handle direct string response
  if (typeof data === 'string') {
    return data;
  }
  
  // Handle object response with various property names
  const token = data.oneTimeToken || data.OneTimeToken || data.token || data.Token || data.linkToken || data.LinkToken;
  if (!token) {
    throw new Error('Invalid token response from server');
  }
  return token;
}

/**
 * Check admin service health
 */
export async function checkAdminHealth(): Promise<boolean> {
  try {
    await adminClient.get('/health');
    return true;
  } catch {
    return false;
  }
}