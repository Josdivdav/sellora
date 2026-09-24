import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "Sellora — Shop the Best Products Online",
    template: "%s | Sellora",
  },
  description:
    "Discover and buy products from verified Nigerian merchants on Sellora. Fast delivery, secure payments, and a seamless shopping experience.",
  keywords: [
    "Sellora",
    "online shopping",
    "Nigerian marketplace",
    "ecommerce Nigeria",
    "buy online",
    "verified merchants",
    "fast delivery",
  ],
  authors: [{ name: "Sellora" }],
  creator: "Sellora",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    siteName: "Sellora",
    title: "Sellora — Shop the Best Products Online",
    description:
      "Discover and buy products from verified Nigerian merchants. Fast delivery, secure payments.",
    images: [{ url: "/logo.png", width: 800, height: 600, alt: "Sellora" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sellora — Shop the Best Products Online",
    description:
      "Discover and buy products from verified Nigerian merchants. Fast delivery, secure payments.",
    images: ["/logo.png"],
  },
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
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
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}