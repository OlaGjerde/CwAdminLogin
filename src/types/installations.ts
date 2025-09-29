export interface InstallationItem {
  AppType?: number;
  Type?: number;
  DisplayName?: string;
  Name?: string;
  Title?: string;
  Id?: string | number;
  InstallationId?: string | number;
  [k: string]: unknown;
}

export interface NormalizedInstallation {
  id: string;
  name: string;
  appType?: number;
  raw: InstallationItem | string;
}
