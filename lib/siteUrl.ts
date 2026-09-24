/**
 * Returns the site's base URL, resolved in priority order:
 *  1. NEXT_PUBLIC_SITE_URL env var (set in production)
 *  2. On the server: the incoming request's Host header  ← sitemap / robots
 *  3. On the client: window.location.origin
 *  4. Fallback: http://localhost:3000
 */

/** Server-side: derive base URL from a Headers object (e.g. from Next.js `headers()`). */
export function getBaseUrlFromHeaders(headersList: Headers): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https';
  return `${protocol}://${host}`;
}

/** Client-side: derive base URL from window.location. */
export function getBaseUrlClient(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:3000';
}

/** Client-side: just the hostname (e.g. "sellora.ng" or "localhost:3000"). */
export function getHostnameClient(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    try {
      return new URL(process.env.NEXT_PUBLIC_SITE_URL).host;
    } catch {
      // fall through
    }
  }
  if (typeof window !== 'undefined') {
    return window.location.host;
  }
  return 'localhost:3000';
}
