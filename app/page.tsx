import { Suspense } from "react";
import type { Metadata } from "next";
import { getAllProducts } from "@/lib/getProduct";
import HomeClient from "@/components/home/HomeClient";

export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://devico.online";

export const metadata: Metadata = {
  title: "Sellora — Discover Verified Stores & Quality Products in Nigeria",
  description:
    "Browse verified Nigerian merchants, discover top-rated fashion, electronics, and lifestyle products. Developed by Divine David (https://divinie.web.app) with fast express delivery across Nigeria.",
  keywords: [
    "Sellora",
    "Divine David",
    "Nigerian ecommerce",
    "online shopping Nigeria",
    "verified stores Lagos",
    "peer to peer marketplace",
    "direct WhatsApp shopping",
  ],
  authors: [
    { name: "Divine David", url: "https://divinie.web.app" },
    { name: "Sellora", url: siteUrl },
  ],
  creator: "Divine David",
  openGraph: {
    title: "Sellora — Discover Verified Stores & Quality Products in Nigeria",
    description:
      "Shop verified Nigerian stores with secure payments and fast delivery. Built by Divine David (https://divinie.web.app).",
    url: siteUrl,
    siteName: "Sellora",
    locale: "en_NG",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Sellora — Nigerian Marketplace Built by Divine David",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sellora — Discover Verified Stores & Quality Products in Nigeria",
    description:
      "Browse verified Nigerian merchants and quality products. Developed by Divine David (https://divinie.web.app).",
    images: ["/logo.png"],
    creator: "@divinedavid",
  },
  alternates: {
    canonical: "/",
  },
};

export default async function HomePage() {
  const { products, categories, stores } = await getAllProducts();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: "Sellora",
        url: siteUrl,
        description:
          "Browse verified Nigerian merchants and quality products. Developed by Divine David (https://divinie.web.app).",
        author: {
          "@type": "Person",
          name: "Divine David",
          url: "https://divinie.web.app",
        },
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/?search={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "ItemList",
        "@id": `${siteUrl}/#top-products`,
        name: "Featured Products on Sellora",
        itemListElement: products.slice(0, 10).map((prod, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: prod.name,
          url: `${siteUrl}/products/${prod.slug || prod.id}`,
        })),
      },
    ],
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
