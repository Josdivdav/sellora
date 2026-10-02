import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up — Create Your Free Storefront",
  description:
    "Create your free Sellora account. Start your online store, upload products, accept payments, and grow your business in Nigeria. Built by Divine David (https://divinie.web.app).",
  authors: [{ name: "Divine David", url: "https://divinie.web.app" }],
  creator: "Divine David",
  alternates: {
    canonical: "/register",
  },
  openGraph: {
    type: "website",
    siteName: "Sellora",
    locale: "en_NG",
    title: "Sign Up — Create Your Free Storefront | Sellora",
    description:
      "Create your free Sellora account and start selling online in minutes. Developed by Divine David (https://divinie.web.app).",
    images: [{ url: "/logo.png", width: 1200, height: 630, alt: "Sellora Sign Up" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sign Up | Sellora",
    description:
      "Create your free Sellora account and start selling online. Built by Divine David (https://divinie.web.app).",
    images: ["/logo.png"],
    creator: "@divinedavid",
  },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
