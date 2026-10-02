import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getStoreBySlug } from "@/lib/getStore";
import { isReservedRoute, getStoreFullUrl } from "@/lib/storeUrl";
import StoreFrontClient from "@/components/storefront/StoreFrontClient";

interface StorePageProps {
  params: Promise<{ store: string }>;
  searchParams?: Promise<{ tab?: string; category?: string; search?: string }>;
}

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const { store: rawSlug } = await params;

  if (!rawSlug || isReservedRoute(rawSlug)) {
    return { title: "Store Not Found" };
  }

  const { store } = await getStoreBySlug(rawSlug);

  if (!store) {
    return { title: "Store Not Found | Sellora" };
  }

  const fullUrl = getStoreFullUrl(store);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://devico.online";
  const storeImage = store.banner || store.logo || `${siteUrl}/logo.png`;

  const headerList = await headers();
  const host = headerList.get("host") || "";
  const hostname = host.split(":")[0].toLowerCase();
  const mainDomain = (process.env.NEXT_PUBLIC_MAIN_DOMAIN || "devico.online").toLowerCase();

  const isSubdomainRequest =
    (hostname.endsWith(`.${mainDomain}`) && hostname !== `www.${mainDomain}`) ||
    (hostname.endsWith(".localhost") && !hostname.startsWith("localhost"));

  const pageTitle = isSubdomainRequest
    ? `${store.name} — Official Online Store`
    : `${store.name} — Verified Merchant Storefront | Sellora Nigeria`;

  return {
    title: pageTitle,
    icons: store.logo ? { icon: store.logo, apple: store.logo } : undefined,
    description:
      store.description ||
      `Shop high-quality products directly from ${store.name} with fast nationwide delivery and verified merchant protection. Developed by Divine David (https://divinie.web.app).`,
    authors: [
      { name: store.name },
      { name: "Divine David", url: "https://divinie.web.app" },
    ],
    alternates: {
      canonical: fullUrl,
    },
    openGraph: {
      type: "website",
      siteName: "Sellora",
      locale: "en_NG",
      url: fullUrl,
      title: `${store.name} — Verified Merchant Storefront`,
      description:
        store.description ||
        `Shop verified products directly from ${store.name} on Sellora. Developed by Divine David (https://divinie.web.app).`,
      images: [
        {
          url: storeImage,
          width: 1200,
          height: 630,
          alt: `${store.name} Storefront`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${store.name} — Storefront`,
      description:
        store.description ||
        `Shop products from ${store.name} on Sellora. Developed by Divine David (https://divinie.web.app).`,
      images: [storeImage],
      creator: "@divinedavid",
    },
  };
}

export default async function StorePage({ params, searchParams }: StorePageProps) {
  const { store: rawSlug } = await params;
  const searchParamsResolved = searchParams ? await searchParams : {};
  const rawTab = searchParamsResolved.tab;
  const initialTab =
    rawTab === "about" || rawTab === "policies" || rawTab === "products"
      ? rawTab
      : "products";

  if (!rawSlug || isReservedRoute(rawSlug)) {
    notFound();
  }

  const { store, products } = await getStoreBySlug(rawSlug);

  if (!store) {
    notFound();
  }

  // Subdomain Premium Protection Check:
  // If visitor navigated to `storename.devico.online`, verify store is paid/premium.
  // If not premium, redirect to standard path `devico.online/storename`.
  const headerList = await headers();
  const host = headerList.get("host") || "";
  const hostname = host.split(":")[0].toLowerCase();
  const mainDomain = (process.env.NEXT_PUBLIC_MAIN_DOMAIN || "devico.online").toLowerCase();

  const isSubdomainRequest =
    (hostname.endsWith(`.${mainDomain}`) && hostname !== `www.${mainDomain}`) ||
    (hostname.endsWith(".localhost") && !hostname.startsWith("localhost"));

  const isStorePremium = Boolean(store.isPremium || store.plan === "premium");

  if (isSubdomainRequest && !isStorePremium) {
    const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
    const port = host.split(":")[1] ? `:${host.split(":")[1]}` : "";
    const rootHost = host.includes("localhost") ? `localhost${port}` : mainDomain;
    redirect(`${protocol}://${rootHost}/${store.slug}`);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://devico.online";
  const fullUrl = getStoreFullUrl(store, host);
  const storeImage = store.banner || store.logo || `${siteUrl}/logo.png`;

  const storeJsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `${fullUrl}/#store`,
    name: store.name,
    description: store.description || `Shop authentic items from ${store.name} on Sellora.`,
    url: fullUrl,
    image: storeImage,
    currenciesAccepted: "NGN",
    paymentAccepted: "Bank Transfer, Cash",
    priceRange: "₦₦",
    parentOrganization: {
      "@type": "Organization",
      name: "Sellora",
      url: siteUrl,
      founder: {
        "@type": "Person",
        name: "Divine David",
        url: "https://divinie.web.app",
      },
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `${store.name} Product Catalog`,
      itemListElement: products.slice(0, 12).map((p, idx) => ({
        "@type": "Offer",
        position: idx + 1,
        name: p.name,
        price: p.price,
        priceCurrency: "NGN",
        url: `${siteUrl}/products/${p.slug || p.id}`,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }}
      />
      <StoreFrontClient
        initialStore={store}
        initialProducts={products}
        storeSlug={rawSlug}
        isSubdomain={isSubdomainRequest}
        initialTab={initialTab}
      />
    </>
  );
}
