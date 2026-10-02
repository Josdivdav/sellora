import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#2563EB",
};

export const metadata: Metadata = {
  title: "Sign In — Access Your Store & Orders",
  description:
    "Sign in to your Sellora account to manage your store, track incoming customer orders, and shop from verified Nigerian merchants. Built by Divine David (https://divinie.web.app).",
  authors: [{ name: "Divine David", url: "https://divinie.web.app" }],
  creator: "Divine David",
  alternates: {
    canonical: "/login",
  },
  openGraph: {
    type: "website",
    siteName: "Sellora",
    locale: "en_NG",
    title: "Sign In — Access Your Store & Orders | Sellora",
    description:
      "Sign in to your Sellora account to manage your storefront, products, and orders. Built by Divine David (https://divinie.web.app).",
    images: [{ url: "/logo.png", width: 1200, height: 630, alt: "Sellora Login" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sign In | Sellora",
    description:
      "Sign in to your Sellora account. Developed by Divine David (https://divinie.web.app).",
    images: ["/logo.png"],
    creator: "@divinedavid",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
