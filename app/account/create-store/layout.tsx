import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Storefront",
  description: "Set up and customize your verified merchant storefront on Sellora with live preview, branding, and instant dispatch fulfillment.",
  robots: { index: false, follow: false },
};

export default function CreateStoreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
