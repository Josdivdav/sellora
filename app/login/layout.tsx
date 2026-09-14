import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#2563EB",
};

export const metadata: Metadata = {
  title: "Sellora - Sign in | Create Your Online Store in Minutes",
  description:
    "Sellora helps you create a beautiful online store in minutes. Upload products, accept payments, generate invoices, and grow your business without coding.",
  keywords: [
    "Sellora",
    "ecommerce",
    "online store",
    "website builder",
    "sell online",
    "business",
    "shop",
    "payments",
    "invoice",
    "Nigeria",
  ],
  authors: [{ name: "Sellora" }],
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://selloraa.web.app/",
  },
  openGraph: {
    type: "website",
    title: "Sellora | Create Your Online Store in Minutes",
    description:
      "Launch your online business in minutes. Upload products, receive orders, accept payments, and generate invoices automatically.",
    url: "https://selloraa.web.app/",
    siteName: "Sellora",
    images: [
      {
        url: "https://selloraa.web.app/assets/images/favicon.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sellora | Create Your Online Store in Minutes",
    description: "Start selling online with Sellora. No coding required.",
    images: ["https://selloraa.web.app/assets/images/favicon.png"],
  },
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
