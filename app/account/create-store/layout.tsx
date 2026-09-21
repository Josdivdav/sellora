import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Storefront | Sellora Merchant Hub",
  description: "Set up and customize your verified merchant storefront on Sellora with live preview, branding, and instant dispatch fulfillment.",
};

export default function CreateStoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
