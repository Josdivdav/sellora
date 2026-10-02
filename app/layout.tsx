import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://devico.online";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Sellora — Discover Verified Stores & Quality Products in Nigeria",
    template: "%s | Sellora",
  },
  description:
    "Discover and shop high-quality products from verified Nigerian merchants on Sellora. Fast direct bank transfers, WhatsApp order tracking, and peer-to-peer commerce. Built by Divine David (https://divinie.web.app).",
  keywords: [
    "Sellora",
    "Divine David",
    "online shopping Nigeria",
    "Nigerian marketplace",
    "ecommerce Nigeria",
    "buy online Lagos",
    "verified merchants Nigeria",
    "peer to peer marketplace",
    "direct bank transfer store",
    "WhatsApp shopping Nigeria",
  ],
  authors: [
    { name: "Divine David", url: "https://divinie.web.app" },
    { name: "Sellora", url: siteUrl },
  ],
  creator: "Divine David",
  publisher: "Divine David",
  applicationName: "Sellora",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: siteUrl,
    siteName: "Sellora",
    title: "Sellora — Discover Verified Stores & Quality Products in Nigeria",
    description:
      "Discover and shop high-quality products from verified Nigerian merchants on Sellora. Fast direct bank transfers, WhatsApp order tracking, and peer-to-peer commerce. Built by Divine David (https://divinie.web.app).",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Sellora Marketplace — Built by Divine David",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sellora — Discover Verified Stores & Quality Products in Nigeria",
    description:
      "Discover and shop high-quality products from verified Nigerian merchants on Sellora. Fast direct bank transfers, WhatsApp order tracking, and peer-to-peer commerce. Built by Divine David (https://divinie.web.app).",
    images: ["/logo.png"],
    creator: "@divinedavid",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Sellora",
  alternateName: "Sellora Marketplace",
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
  founder: {
    "@type": "Person",
    name: "Divine David",
    url: "https://divinie.web.app",
    jobTitle: "Founder & Lead Software Engineer",
  },
  sameAs: ["https://divinie.web.app"],
  description:
    "Peer-to-peer Nigerian ecommerce marketplace empowering verified merchants and shoppers with direct bank transfers and WhatsApp confirmations. Created by Divine David.",
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Sellora",
  alternateName: "Sellora Nigeria",
  url: siteUrl,
  creator: {
    "@type": "Person",
    name: "Divine David",
    url: "https://divinie.web.app",
  },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${siteUrl}/?search={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({ children }: React.PropsWithChildren) {
  return (
    <html lang="en" className={poppins.variable}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/icon?family=Material+Icons+Round"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body>
        <AuthProvider>
          <CartProvider>{children}</CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}