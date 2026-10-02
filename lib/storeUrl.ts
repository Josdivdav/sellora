/**
 * Store URL & Slug Helper Utilities
 * Handles slug generation, relative paths, and custom subdomain URLs (e.g. storename.devico.online)
 */

export const RESERVED_PATHS = new Set([
  "",
  "about",
  "search",
  "login",
  "register",
  "signup",
  "cart",
  "checkout",
  "account",
  "products",
  "api",
  "_next",
  "favicon.ico",
  "favicon.png",
  "robots.txt",
  "sitemap.xml",
  "images",
  "assets",
  "public",
]);

/**
 * Normalizes a store name into a URL-safe kebab-case slug.
 * e.g. "UV Store" -> "uv-store", "Chronos Studio" -> "chronos-studio"
 */
export function slugifyStoreName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "") // Remove apostrophes: e.g. "Joshua's" -> "Joshuas"
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ""); // Trim leading/trailing hyphens
}

/**
 * Returns the store slug, prioritizing existing slug property or generating one from store name.
 */
export function getStoreSlug(store: { slug?: string; name: string }): string {
  if (store.slug && store.slug.trim()) {
    return slugifyStoreName(store.slug);
  }
  return slugifyStoreName(store.name);
}

/**
 * Returns relative path for in-app navigation: e.g. "/uv-store"
 */
export function getStoreRelativePath(storeOrSlug: string | { slug?: string; name: string }): string {
  const slug = typeof storeOrSlug === "string" ? slugifyStoreName(storeOrSlug) : getStoreSlug(storeOrSlug);
  return `/${slug}`;
}

/**
 * Returns the full store URL:
 * - If Premium: `https://${slug}.devico.online` (or `http://${slug}.localhost:3000` in dev)
 * - If Free (Default): `https://devico.online/${slug}` (or `http://localhost:3000/${slug}` in dev)
 */
export function getStoreFullUrl(
  storeOrSlug: string | { slug?: string; name: string; isPremium?: boolean; plan?: string },
  customHost?: string,
  isPremiumOverride?: boolean
): string {
  const slug = typeof storeOrSlug === "string" ? slugifyStoreName(storeOrSlug) : getStoreSlug(storeOrSlug);
  const isPremium = typeof isPremiumOverride === "boolean"
    ? isPremiumOverride
    : typeof storeOrSlug === "object" && Boolean(storeOrSlug?.isPremium || storeOrSlug?.plan === "premium");

  const mainDomain = (process.env.NEXT_PUBLIC_MAIN_DOMAIN || "devico.online").toLowerCase();

  let host = customHost;
  if (!host && typeof window !== "undefined") {
    host = window.location.host;
  }

  if (host) {
    const hostname = host.split(":")[0].toLowerCase();
    const port = host.split(":")[1] ? `:${host.split(":")[1]}` : "";

    // If on localhost
    if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1") {
      if (isPremium) {
        return `http://${slug}.localhost${port}`;
      }
      return `http://localhost${port}/${slug}`;
    }

    // If on devico.online or custom production domain
    if (hostname === mainDomain || hostname.endsWith(`.${mainDomain}`)) {
      if (isPremium) {
        return `https://${slug}.${mainDomain}`;
      }
      return `https://${mainDomain}/${slug}`;
    }

    // Fallback using origin path
    if (typeof window !== "undefined") {
      if (isPremium) {
        return `https://${slug}.${mainDomain}`;
      }
      return `${window.location.origin}/${slug}`;
    }
  }

  // SSR default fallback
  if (isPremium) {
    return `https://${slug}.${mainDomain}`;
  }
  return `https://${mainDomain}/${slug}`;
}

/**
 * Checks if a path segment is a reserved application route
 */
export function isReservedRoute(slug: string): boolean {
  if (!slug) return true;
  const clean = slug.toLowerCase().trim().replace(/^@+/, "");
  return RESERVED_PATHS.has(clean);
}
