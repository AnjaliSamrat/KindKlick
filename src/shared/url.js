export function extractDomain(url) {
  try {
    const u = new URL(url);
    const host = (u.hostname || '').toLowerCase();
    if (!host) return null;

    // normalize common subdomain: treat www.example.com as example.com
    if (host.startsWith('www.')) return host.slice(4);
    return host;
  } catch {
    return null;
  }
}
