/**
 * Store URL & Slug Helper Utilities
 * Handles slug generation, relative paths, and custom subdomain URLs (e.g. storename.devico.online)
 */

export const RESERVED_PATHS = new Set([
  "",
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
 * - If on devico.online: returns `https://${slug}.devico.online`
 * - If on localhost: returns `http://${slug}.localhost:3000` (or `http://localhost:3000/${slug}`)
 * - In SSR/default: `https://${slug}.${mainDomain}`
 */
export function getStoreFullUrl(
  storeOrSlug: string | { slug?: string; name: string },
  customHost?: string
): string {
  const slug = typeof storeOrSlug === "string" ? slugifyStoreName(storeOrSlug) : getStoreSlug(storeOrSlug);
  const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || "devico.online";

  let host = customHost;
  if (!host && typeof window !== "undefined") {
    host = window.location.host;
  }

  if (host) {
    const hostname = host.split(":")[0].toLowerCase();
    const port = host.split(":")[1] ? `:${host.split(":")[1]}` : "";

    // If on localhost
    if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1") {
      return `http://${slug}.localhost${port}`;
    }

    // If on devico.online or custom production domain
    if (hostname === mainDomain || hostname.endsWith(`.${mainDomain}`)) {
      return `https://${slug}.${mainDomain}`;
    }

    // Fallback to origin path
    if (typeof window !== "undefined") {
      return `${window.location.origin}/${slug}`;
    }
  }

  return `https://${slug}.${mainDomain}`;
}

/**
 * Checks if a path segment is a reserved application route
 */
export function isReservedRoute(slug: string): boolean {
  if (!slug) return true;
  const clean = slug.toLowerCase().trim().replace(/^@+/, "");
  return RESERVED_PATHS.has(clean);
}
