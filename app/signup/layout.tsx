import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Create your free Sellora account. Start your online store, upload products, accept payments, and grow your business.",
  alternates: {
    canonical: "/register",
  },
  openGraph: {
    type: "website",
    title: "Sign Up | Sellora",
    description: "Create your free Sellora account and start selling online in minutes.",
    images: [{ url: "/logo.png", alt: "Sellora" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sign Up | Sellora",
    description: "Create your free Sellora account and start selling online.",
    images: ["/logo.png"],
  },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
