// Light obfuscation helpers for storing tokens. NOT cryptographically secure.

const xorMask = (i: number) => 13 + (i % 7);

export function obfuscate(str: string): string {
  try {
    return btoa(String.fromCharCode(...str.split('').map((c, i) => c.charCodeAt(0) ^ xorMask(i))));
  } catch { return ''; }
}

export function deobfuscate(enc: string): string {
  try {
    const bin = atob(enc);
    return Array.from(bin).map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ xorMask(i))).join('');
  } catch { return ''; }
}
