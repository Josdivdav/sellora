import { Suspense } from "react";
import type { Metadata } from "next";
import { getAllProducts } from "@/lib/getProduct";
import HomeClient from "@/components/home/HomeClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sellora — Discover Verified Stores & Quality Products in Nigeria",
  description:
    "Browse verified Nigerian merchants, discover top-rated fashion, electronics, and lifestyle products with fast express delivery across Nigeria.",
  openGraph: {
    title: "Sellora — Discover Verified Stores & Quality Products in Nigeria",
    description:
      "Shop verified Nigerian stores with secure payments and fast delivery.",
    url: "https://sellora.ng",
    siteName: "Sellora",
    type: "website",
  },
  alternates: {
    canonical: "/",
  },
};

export default async function HomePage() {
  const { products, categories, stores } = await getAllProducts();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Sellora",
    url: "https://sellora.ng",
    description: "Browse verified Nigerian merchants and quality products.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://sellora.ng/?search={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={null}>
        <HomeClient
          initialProducts={products}
          initialCategories={categories}
          initialStores={stores}
        />
      </Suspense>
    </>
  );
}
