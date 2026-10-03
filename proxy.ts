import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isReservedRoute } from '@/lib/storeUrl';

/**
 * Next.js 16 Request Proxy
 * Handles subdomain multi-tenancy for merchant storefronts:
 * - In production: `storename.devico.online` -> rewrites internally to `/storename`
 * - In local dev: `storename.localhost:3000` -> rewrites internally to `/storename`
 * - Standard path: `devico.online/storename` -> routed directly to `app/[store]/page.tsx`
 */
export function proxy(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0].toLowerCase();
  const { pathname, search } = request.nextUrl;

  const mainDomain = (process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'devico.online').toLowerCase();

  let subdomain: string | null = null;

  // Check 1: Local development with *.localhost (e.g. uv-store.localhost:3000)
  if (hostname.endsWith('.localhost')) {
    const parts = hostname.split('.');
    if (parts.length >= 2 && parts[0] !== 'www') {
      subdomain = parts[0];
    }
  }
  // Check 2: Production or custom domain (e.g. uv-store.devico.online)
  else if (hostname.endsWith(`.${mainDomain}`)) {
    const sub = hostname.slice(0, -(mainDomain.length + 1));
    if (sub && sub !== 'www' && !sub.includes('.')) {
      subdomain = sub;
    }
  }
  // Check 3: Generic multi-level subdomain fallback (excluding naked domain / IPs)
  else if (!hostname.includes('localhost') && !/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    const parts = hostname.split('.');
    if (parts.length > 2) {
      const sub = parts[0];
      if (sub !== 'www' && sub !== 'api' && sub !== 'app' && sub !== 'mail') {
        subdomain = sub;
      }
    }
  }

  // ── SPECIAL SUBDOMAIN: ADMIN / DEVELOPER CONSOLE ──
  // Matches admin.devico.online, admin.localhost, or any admin.* host
  const isAdminDomain =
    subdomain === 'admin' ||
    hostname === 'admin.localhost' ||
    hostname.startsWith('admin.');

  if (isAdminDomain) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-is-admin-domain', 'true');

    // On admin subdomain, root / or /admin rewrites directly to /developer
    if (pathname === '/' || pathname === '' || pathname === '/admin') {
      const rewriteUrl = new URL(`/developer${search}`, request.url);
      return NextResponse.rewrite(rewriteUrl, {
        request: { headers: requestHeaders },
      });
    }

    // Allow all other routes on admin domain (e.g. /developer, static files, auth)
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // ── SECRECY GUARD: HIDE /developer ON MAIN / PUBLIC DOMAIN ──
  // If anyone tries to access /developer directly on the main public site without authorization:
  if (pathname === '/developer' || pathname.startsWith('/developer/')) {
    const devCookie = request.cookies.get('sellora_dev_auth')?.value;
    const devSecretPass = process.env.DEVELOPER_PASSCODE || process.env.DEV_PASSCODE || 'sellora-dev-2026';
    const isDevSecretParam = request.nextUrl.searchParams.get('key') === devSecretPass;

    // If not on admin domain and without secret auth/cookie, return 404 (Not Found)
    if (!isAdminDomain && !devCookie && !isDevSecretParam) {
      const notFoundUrl = new URL('/_not-found', request.url);
      return NextResponse.rewrite(notFoundUrl);
    }
  }

  // If a store subdomain is present (e.g. storename.devico.online)
  if (subdomain && !isReservedRoute(subdomain)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-store-subdomain', subdomain);

    // Root storefront: rewrite to /storename
    if (pathname === '/' || pathname === '') {
      const rewriteUrl = new URL(`/${subdomain}${search}`, request.url);
      return NextResponse.rewrite(rewriteUrl, {
        request: { headers: requestHeaders },
      });
    }

    // Direct standalone pages on the subdomain
    if (pathname === '/about' || pathname === '/about-us') {
      const rewriteUrl = new URL(`/${subdomain}?tab=about`, request.url);
      return NextResponse.rewrite(rewriteUrl, {
        request: { headers: requestHeaders },
      });
    }

    if (pathname === '/policies' || pathname === '/shipping' || pathname === '/returns') {
      const rewriteUrl = new URL(`/${subdomain}?tab=policies`, request.url);
      return NextResponse.rewrite(rewriteUrl, {
        request: { headers: requestHeaders },
      });
    }

    if (pathname === '/products' || pathname === '/catalog' || pathname === '/shop') {
      const rewriteUrl = new URL(`/${subdomain}?tab=products`, request.url);
      return NextResponse.rewrite(rewriteUrl, {
        request: { headers: requestHeaders },
      });
    }

    // Pass through product detail, search, cart, checkout, and account with store context
    if (
      pathname.startsWith('/products/') ||
      pathname.startsWith('/search') ||
      pathname.startsWith('/api/') ||
      pathname.startsWith('/account/') ||
      pathname.startsWith('/cart') ||
      pathname.startsWith('/checkout')
    ) {
      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images, and static assets
     */
    '/((?!api|_next/static|_next/image|favicon\\.ico|favicon\\.png|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
