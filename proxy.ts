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

  // If a store subdomain is present (e.g. storename.devico.online)
  if (subdomain && !isReservedRoute(subdomain)) {
    // If request is root path on the subdomain (e.g. `https://storename.devico.online/`),
    // rewrite internally to the storefront page `/${subdomain}`
    if (pathname === '/' || pathname === '') {
      const rewriteUrl = new URL(`/${subdomain}${search}`, request.url);
      return NextResponse.rewrite(rewriteUrl);
    }

    // If navigating to a product or asset directly on the subdomain (e.g. `/products/123`),
    // keep the path so the product page loads seamlessly
    if (
      pathname.startsWith('/products/') ||
      pathname.startsWith('/api/') ||
      pathname.startsWith('/account/') ||
      pathname.startsWith('/cart')
    ) {
      return NextResponse.next();
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
