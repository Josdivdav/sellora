import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Product Details | Sellora",
  description: "View product specifications, merchant ratings, and order online with fast delivery on Sellora.",
};

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
