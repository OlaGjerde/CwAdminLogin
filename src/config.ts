// Centralized configuration for URLs and endpoints
export const API_BASE = 'https://adminapi-dev.calwincloud.com';
//export const API_BASE = 'https://localhost:7059';
export const CW_AUTH_ENDPOINT = `${API_BASE}/api`;
// Per-type installer URLs. Keys correspond to app type numbers (0,1,2).
// Update these URLs to the correct installer files for each environment as needed.
export const APPINSTALLER_URLS: Record<number, string> = {
  0: 'https://calwinmedia.calwincloud.com/CalWin8.appinstaller',
  1: 'https://calwinmedia-test.calwincloud.com/CalWin8.appinstaller',
  2: 'https://calwinmedia-dev.calwincloud.com/CalWin8.appinstaller'
};
// Supported app protocols
export const PROTOCOL_CALWIN = 'calwin://';
export const PROTOCOL_CALWIN_TEST = 'calwintest://';
export const PROTOCOL_CALWIN_DEV = 'calwindev://';
export const INSTALLATIONS_ENDPOINT = `${CW_AUTH_ENDPOINT}/installation/GetAuthorizedInstallations`;
// Refresh scheduling margin (seconds before access token exp when we attempt refresh)
export const REFRESH_MARGIN_SECONDS = 120;

export default {
  API_BASE,
  CW_AUTH_ENDPOINT,
  APPINSTALLER_URLS,
  PROTOCOL_CALWIN,
  PROTOCOL_CALWIN_TEST,
  PROTOCOL_CALWIN_DEV,
  INSTALLATIONS_ENDPOINT,
  REFRESH_MARGIN_SECONDS
};
