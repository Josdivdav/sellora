import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStoreBySlug } from "@/lib/getStore";
import { isReservedRoute, getStoreFullUrl } from "@/lib/storeUrl";
import StoreFrontClient from "@/components/storefront/StoreFrontClient";

interface StorePageProps {
  params: Promise<{ store: string }>;
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

  return {
    title: `${store.name} — Verified Merchant Storefront | Sellora`,
    description:
      store.description ||
      `Shop high-quality products directly from ${store.name} on Sellora with fast delivery and verified merchant protection.`,
    alternates: {
      canonical: fullUrl,
    },
    openGraph: {
      title: `${store.name} — Verified Merchant Storefront`,
      description: store.description,
      images: store.banner ? [{ url: store.banner }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${store.name} — Storefront`,
      description: store.description,
      images: store.banner ? [store.banner] : undefined,
    },
  };
}

export default async function StorePage({ params }: StorePageProps) {
  const { store: rawSlug } = await params;

  if (!rawSlug || isReservedRoute(rawSlug)) {
    notFound();
  }

  const { store, products } = await getStoreBySlug(rawSlug);

  if (!store) {
    notFound();
  }

  return (
    <StoreFrontClient
      initialStore={store}
      initialProducts={products}
      storeSlug={rawSlug}
    />
  );
}
