import type { Metadata } from "next";
import { AboutClient } from "@/components/about";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://devico.online";

export const metadata: Metadata = {
  title: "About Sellora & How to Get Started | Modern Marketplace Nigeria",
  description:
    "Learn about Sellora, the modern peer-to-peer marketplace built for Nigerian merchants and shoppers, developed by Divine David (https://divinie.web.app). Step-by-step tutorial on how to buy, create a storefront, receive direct bank transfers, and confirm orders via WhatsApp.",
  authors: [
    { name: "Divine David", url: "https://divinie.web.app" },
    { name: "Sellora", url: siteUrl },
  ],
  creator: "Divine David",
  publisher: "Divine David",
  keywords: [
    "Sellora About",
    "Divine David",
    "How to Sell on Sellora",
    "Sellora Tutorial",
    "Nigerian ecommerce",
    "Create store Nigeria",
    "Peer-to-peer marketplace Nigeria",
    "Direct bank transfer shopping",
    "Sell online Nigeria tutorial",
  ],
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    type: "article",
    url: `${siteUrl}/about`,
    siteName: "Sellora",
    locale: "en_NG",
    title: "About Sellora & How to Get Started — Built by Divine David",
    description:
      "Sellora is built by Divine David (https://divinie.web.app) for Nigerian merchants and shoppers. Zero gateway fees, instant WhatsApp confirmation, and nationwide delivery.",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "About Sellora — Nigeria's Premier Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Sellora & How to Get Started",
    description:
      "Built by Divine David (https://divinie.web.app). Zero gateway fees, direct bank transfers, and WhatsApp order fulfillment.",
    images: ["/logo.png"],
    creator: "@divinedavid",
  },
};

export default function AboutPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": `${siteUrl}/about/#webpage`,
        url: `${siteUrl}/about`,
        name: "About Sellora & How to Get Started",
        description:
          "Learn about Sellora, developed by Divine David (https://divinie.web.app), and explore our step-by-step tutorial for sellers and buyers.",
        isPartOf: {
          "@type": "WebSite",
          "@id": `${siteUrl}/#website`,
          name: "Sellora",
          url: siteUrl,
        },
        author: {
          "@type": "Person",
          name: "Divine David",
          url: "https://divinie.web.app",
        },
      },
      {
        "@type": "HowTo",
        name: "How to Start Selling on Sellora",
        description: "A fast step-by-step guide to opening a store and selling products on Sellora.",
        step: [
          {
            "@type": "HowToStep",
            position: 1,
            name: "Create an Account",
            text: "Sign up on Sellora with your name, email, and password to access the Merchant Hub.",
          },
          {
            "@type": "HowToStep",
            position: 2,
            name: "Set Up Your Storefront",
            text: "Choose your unique store name, upload your brand logo and banner, and enter your payout bank account.",
          },
          {
            "@type": "HowToStep",
            position: 3,
            name: "List Your Products",
            text: "Upload product photos, set your price in Nigerian Naira (₦), write descriptions, and manage stock.",
          },
          {
            "@type": "HowToStep",
            position: 4,
            name: "Share Store Link & Receive Orders",
            text: "Share your dedicated store URL with customers and confirm incoming orders directly over WhatsApp.",
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AboutClient />
    </>
  );
}
