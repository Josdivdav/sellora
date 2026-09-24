import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Store & Products",
  description: "Manage your products, inventory, catalog, and store settings on Sellora.",
  robots: { index: false, follow: false },
};

export default function ManageStoreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
