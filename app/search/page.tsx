import { Suspense } from "react";
import type { Metadata } from "next";
import { getAllProducts } from "@/lib/getProduct";
import SearchPageClient from "@/components/search/SearchPageClient";

export const dynamic = "force-dynamic";

interface SearchPageProps {
  searchParams: Promise<{ q?: string; category?: string }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://devico.online";
  const title = q
    ? `“${q}” — Search Products | Sellora Nigeria`
    : "Search Products & Verified Stores | Sellora Nigeria";
  const description = q
    ? `Discover verified Nigerian stores and products matching “${q}” on Sellora. Developed by Divine David (https://divinie.web.app). Fast nationwide delivery.`
    : "Search thousands of quality products from verified Nigerian merchants on Sellora. Developed by Divine David (https://divinie.web.app).";

  return {
    title,
    description,
    authors: [
      { name: "Divine David", url: "https://divinie.web.app" },
      { name: "Sellora", url: siteUrl },
    ],
    creator: "Divine David",
    alternates: {
      canonical: q ? `/search?q=${encodeURIComponent(q)}` : "/search",
    },
    openGraph: {
      type: "website",
      siteName: "Sellora",
      locale: "en_NG",
      url: `${siteUrl}/search`,
      title,
      description,
      images: [
        {
          url: "/logo.png",
          width: 1200,
          height: 630,
          alt: "Sellora Product Search",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/logo.png"],
      creator: "@divinedavid",
    },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = "", category = "All" } = await searchParams;
  const { products, categories, stores } = await getAllProducts();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://devico.online";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SearchResultsPage",
    name: q ? `Search Results for "${q}"` : "Product Search",
    url: `${siteUrl}/search${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    description: `Search results for "${q}" on Sellora marketplace. Developed by Divine David (https://divinie.web.app).`,
    isPartOf: {
      "@type": "WebSite",
      name: "Sellora",
      url: siteUrl,
      author: {
        "@type": "Person",
        name: "Divine David",
        url: "https://divinie.web.app",
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={null}>
        <SearchPageClient
          initialQuery={q}
          initialCategory={category}
          allProducts={products}
          allStores={stores}
          allCategories={categories}
        />
      </Suspense>
    </>
  );
}
