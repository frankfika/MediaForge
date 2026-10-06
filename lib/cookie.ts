// Client-only. base64 is obfuscation (keeps the cookie from being readable at a glance in devtools), NOT encryption.
const KEY = "mediaforge.xhsCookie";

export const getXhsCookie = (): string | undefined => {
  try {
    const v = localStorage.getItem(KEY);
    return v ? new TextDecoder().decode(Uint8Array.from(atob(v), (c) => c.charCodeAt(0))) : undefined;
  } catch {
    return undefined;
  }
};

export function setXhsCookie(cookie: string) {
  const v = cookie.trim();
  if (!v) return localStorage.removeItem(KEY);
  localStorage.setItem(KEY, btoa(String.fromCharCode(...new TextEncoder().encode(v))));
}

export const isXhsUrl = (s: string) => /xiaohongshu\.com|xhslink\.com/.test(s);
