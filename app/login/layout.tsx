import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#2563EB",
};

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your Sellora account to manage your store, track orders, and shop from verified Nigerian merchants.",
  alternates: {
    canonical: "/login",
  },
  openGraph: {
    type: "website",
    title: "Sign In | Sellora",
    description:
      "Sign in to your Sellora account to manage your store, track orders, and shop.",
    images: [{ url: "/logo.png", alt: "Sellora" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sign In | Sellora",
    description: "Sign in to your Sellora account.",
    images: ["/logo.png"],
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
