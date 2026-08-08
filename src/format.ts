export const hex = (n: number, pad = 0): string => `0x${n.toString(16).padStart(pad, "0")}`;

export function bytes(n: number): string {
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v % 1 === 0 ? v : v.toFixed(1)} ${units[i]}`;
}

export const count = (n: number): string => n.toLocaleString("en-US");

export function elapsed(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/** Time portion only — the date is already on the image bar. */
export const clock = (iso: string): string => iso.slice(11);

/** Decodes the UTF-16LE base64 that PowerShell's -enc flag takes. */
export function decodePowerShellEnc(cmdline: string): string | null {
  const m = /-e(?:nc|ncodedcommand)?\s+([A-Za-z0-9+/=]{16,})/i.exec(cmdline);
  if (!m?.[1]) return null;
  try {
    const raw = atob(m[1]);
    let out = "";
    for (let i = 0; i + 1 < raw.length; i += 2) {
      out += String.fromCharCode(raw.charCodeAt(i) | (raw.charCodeAt(i + 1) << 8));
    }
    return out;
  } catch {
    return null;
  }
}
