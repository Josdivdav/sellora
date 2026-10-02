import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#2563EB",
};

export const metadata: Metadata = {
  title: "Register — Start Selling Online in Nigeria",
  description:
    "Create your free Sellora merchant account. Open your online store, list products, accept direct bank payments, and receive WhatsApp orders. Built by Divine David (https://divinie.web.app).",
  authors: [{ name: "Divine David", url: "https://divinie.web.app" }],
  creator: "Divine David",
  alternates: {
    canonical: "/register",
  },
  openGraph: {
    type: "website",
    siteName: "Sellora",
    locale: "en_NG",
    title: "Register — Start Selling Online in Nigeria | Sellora",
    description:
      "Create your free Sellora merchant account and start selling online in minutes with direct bank transfers and WhatsApp confirmations. Built by Divine David (https://divinie.web.app).",
    images: [{ url: "/logo.png", width: 1200, height: 630, alt: "Sellora Register" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Register — Start Selling Online | Sellora",
    description:
      "Create your free Sellora account and start selling online. Developed by Divine David (https://divinie.web.app).",
    images: ["/logo.png"],
    creator: "@divinedavid",
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
