export function extractNameFromUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').filter(Boolean).pop();
    return last || u.host;
  } catch {
    return undefined;
  }
}
