interface BuildInfoJson {
  version: string;
  commit?: string;
  branch?: string;
  timestamp?: string;
  buildNumber?: string;
  node?: string;
}
declare module '../build-info.json' {
  const value: BuildInfoJson;
  export default value;
}